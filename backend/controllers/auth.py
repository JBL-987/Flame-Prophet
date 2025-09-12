import uuid
import bcrypt
from datetime import datetime, timezone, timedelta
from flask import Blueprint, request, jsonify, g, current_app
from config import supabase
from middleware import require_auth, create_access_token, create_refresh_token, check_rate_limit

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/auth/register', methods=['POST'])
def register():
    """User registration endpoint"""
    data = request.get_json()

    if not data or not all(k in data for k in ('email', 'password', 'username')):
        return jsonify({'error': 'Missing required fields'}), 400

    email = data['email'].strip()
    password = data['password']
    username = data['username'].strip()

    # Check rate limit
    if not check_rate_limit(action='register', max_attempts=3, window_minutes=60):
        return jsonify({'error': 'Too many registration attempts. Please try again later.'}), 429

    try:
        # For now, we're using custom auth instead of Supabase Auth
        # This keeps your existing auth system while using Supabase for database
        # You could also use Supabase's auth.signUp() instead

        # Check if user already exists
        user_check = supabase.table('users').select('id').eq('email', email).execute()
        if user_check.data and len(user_check.data) > 0:
            return jsonify({'error': 'Email already registered'}), 409

        profile_check = supabase.table('profiles').select('id').eq('username', username).execute()
        if profile_check.data and len(profile_check.data) > 0:
            return jsonify({'error': 'Username already taken'}), 409

        # Hash password
        password_hash = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

        # Create user
        user_id = str(uuid.uuid4())
        user_data = {
            'id': user_id,
            'email': email,
            'password_hash': password_hash,
            'email_verified': True,  # Set to True for auto-verification
            'is_active': True,
            'created_at': datetime.now(timezone.utc).isoformat(),
            'updated_at': datetime.now(timezone.utc).isoformat()
        }

        supabase.table('users').insert(user_data).execute()

        # Create profile
        profile_data = {
            'id': user_id,
            'username': username,
            'full_name': data.get('full_name', ''),
            'created_at': datetime.now(timezone.utc).isoformat(),
            'updated_at': datetime.now(timezone.utc).isoformat()
        }

        supabase.table('profiles').insert(profile_data).execute()

        # TODO: Send verification email
        # For now, just return success message

        return jsonify({
            'message': 'User registered successfully.',
            'user_id': user_id,
            'email_verification_required': False  # You can implement email verification later
        }), 201

    except Exception as e:
        current_app.logger.error(f"Registration error: {str(e)}")
        return jsonify({'error': 'Registration failed'}), 500

@auth_bp.route('/auth/login', methods=['POST'])
def login():
    """User login endpoint"""
    data = request.get_json()

    if not data or not all(k in data for k in ('email', 'password')):
        return jsonify({'error': 'Missing email or password'}), 400

    email = data['email'].strip()
    password = data['password']

    # Check rate limit
    if not check_rate_limit(action='login', max_attempts=5, window_minutes=15):
        return jsonify({'error': 'Too many login attempts. Please try again later.'}), 429

    try:
        # Get user from Supabase
        user_result = supabase.table('users').select('*').eq('email', email).execute()

        if not user_result.data or len(user_result.data) == 0:
            return jsonify({'error': 'Invalid credentials'}), 401

        user = user_result.data[0]
        user_id = user['id']
        password_hash = user['password_hash']
        is_active = user['is_active']
        email_verified = user['email_verified']

        if not is_active:
            return jsonify({'error': 'Account is deactivated'}), 403

        # For now, skip email verification check
        # if not email_verified:
        #     return jsonify({'error': 'Please verify your email before logging in'}), 403

        # Check password
        if not bcrypt.checkpw(password.encode('utf-8'), password_hash.encode('utf-8')):
            return jsonify({'error': 'Invalid credentials'}), 401

        # Create session data
        session_token = str(uuid.uuid4())
        refresh_token = str(uuid.uuid4())
        expires_at = datetime.now(timezone.utc) + timedelta(hours=1)

        # Insert session data
        session_data = {
            'user_id': user_id,
            'session_token': session_token,
            'refresh_token': refresh_token,
            'ip_address': request.remote_addr or 'unknown',
            'expires_at': expires_at.isoformat(),
            'status': 'active'
        }

        supabase.table('user_sessions').insert(session_data).execute()

        # Update last seen
        supabase.table('profiles').update({
            'last_seen': datetime.now(timezone.utc).isoformat()
        }).eq('id', user_id).execute()

        # Create tokens
        access_token = create_access_token(user_id)
        refresh_tok = create_refresh_token(user_id)

        return jsonify({
            'message': 'Login successful',
            'access_token': access_token,
            'refresh_token': refresh_tok,
            'token_type': 'Bearer',
            'expires_in': 900,  # 15 minutes
            'user': {
                'id': user_id,
                'email': email
            }
        }), 200

    except Exception as e:
        current_app.logger.error(f"Login error: {str(e)}")
        return jsonify({'error': 'Login failed'}), 500

@auth_bp.route('/auth/refresh', methods=['POST'])
def refresh_token_route():
    """Refresh access token"""
    data = request.get_json()

    if not data or 'refresh_token' not in data:
        return jsonify({'error': 'Missing refresh token'}), 400

    try:
        # Decode refresh token
        from ..middleware import create_access_token
        import jwt
        payload = jwt.decode(data['refresh_token'], current_app.config['JWT_SECRET_KEY'], algorithms=['HS256'])

        if payload['type'] != 'refresh':
            return jsonify({'error': 'Invalid refresh token'}), 401

        user_id = payload['user_id']

        # Verify session is still active in Supabase
        session_result = supabase.table('user_sessions').select('id').eq('user_id', user_id).eq('refresh_token', data['refresh_token']).eq('status', 'active').execute()

        if not session_result.data or len(session_result.data) == 0:
            return jsonify({'error': 'Invalid refresh token'}), 401

        # Create new access token
        access_token = create_access_token(user_id)

        return jsonify({
            'access_token': access_token,
            'token_type': 'Bearer',
            'expires_in': 900
        }), 200

    except jwt.ExpiredSignatureError:
        return jsonify({'error': 'Refresh token expired'}), 401
    except jwt.InvalidTokenError:
        return jsonify({'error': 'Invalid refresh token'}), 401
    except Exception as e:
        current_app.logger.error(f"Token refresh error: {str(e)}")
        return jsonify({'error': 'Token refresh failed'}), 500

@auth_bp.route('/auth/logout', methods=['POST'])
@require_auth
def logout():
    """Logout user"""
    try:
        # Revoke session in Supabase
        supabase.table('user_sessions').update({
            'status': 'revoked',
            'revoked_at': datetime.now(timezone.utc).isoformat()
        }).eq('user_id', g.user_id).eq('status', 'active').execute()

        return jsonify({'message': 'Logged out successfully'}), 200

    except Exception as e:
        current_app.logger.error(f"Logout error: {str(e)}")
        return jsonify({'error': 'Logout failed'}), 500

@auth_bp.route('/auth/profile', methods=['GET'])
@require_auth
def get_profile():
    """Get user profile"""
    try:
        # Get user data from Supabase
        user_result = supabase.table('users').select('*').eq('id', g.user_id).execute()
        if not user_result.data or len(user_result.data) == 0:
            return jsonify({'error': 'User not found'}), 404

        user = user_result.data[0]

        # Get profile data from Supabase
        profile_result = supabase.table('profiles').select('*').eq('id', g.user_id).execute()
        profile = profile_result.data[0] if profile_result.data and len(profile_result.data) > 0 else {}

        return jsonify({
            'user': {
                'id': g.user_id,
                'email': user.get('email'),
                'email_verified': user.get('email_verified', False),
                'is_active': user.get('is_active', True),
                'created_at': user.get('created_at'),
                'profile': {
                    'username': profile.get('username', ''),
                    'full_name': profile.get('full_name', ''),
                    'avatar_url': profile.get('avatar_url'),
                    'bio': profile.get('bio'),
                    'location': profile.get('location'),
                    'website': profile.get('website'),
                    'preferences': profile.get('preferences')
                }
            }
        }), 200

    except Exception as e:
        current_app.logger.error(f"Get profile error: {str(e)}")
        return jsonify({'error': 'Failed to get profile'}), 500

@auth_bp.route('/auth/verify-email', methods=['POST'])
def verify_email():
    """Verify email with token"""
    data = request.get_json()

    if not data or 'token' not in data:
        return jsonify({'error': 'Missing verification token'}), 400

    try:
        # For now, just return success (email verification can be implemented later)
        return jsonify({'message': 'Email verification placeholder - functionality to be implemented'}), 200

    except Exception as e:
        current_app.logger.error(f"Email verification error: {str(e)}")
        return jsonify({'error': 'Email verification failed'}), 500
