import time
from datetime import datetime, timedelta, timezone
from functools import wraps
import jwt
import os
from flask import request, jsonify, g, current_app

# Rate limiting store
rate_limits = {}

def check_rate_limit(user_id=None, action='login', max_attempts=5, window_minutes=15):
    """Check if user has exceeded rate limit"""
    current_time = time.time()
    key = f"{user_id or request.remote_addr}_{action}"

    if key not in rate_limits:
        rate_limits[key] = []

    # Clean old attempts
    rate_limits[key] = [t for t in rate_limits[key] if current_time - t < (window_minutes * 60)]

    if len(rate_limits[key]) >= max_attempts:
        return False

    rate_limits[key].append(current_time)
    return True

def require_auth(f):
    """Decorator to require authentication"""
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get('Authorization', '')
        if not auth_header.startswith('Bearer '):
            return jsonify({'error': 'Missing or invalid authorization header'}), 401

        token = auth_header.split(' ')[1]
        try:
            payload = jwt.decode(token, current_app.config['JWT_SECRET_KEY'], algorithms=['HS256'])
            g.user_id = payload['user_id']
        except jwt.ExpiredSignatureError:
            return jsonify({'error': 'Token expired'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'error': 'Invalid token'}), 401

        return f(*args, **kwargs)
    return decorated

def create_access_token(user_id):
    """Create JWT access token"""
    expires = datetime.now(timezone.utc) + timedelta(minutes=current_app.config['JWT_ACCESS_TOKEN_EXPIRE_MINUTES'])
    return jwt.encode({
        'user_id': user_id,
        'exp': expires,
        'iat': datetime.now(timezone.utc),
        'type': 'access'
    }, current_app.config['JWT_SECRET_KEY'], algorithm='HS256')

def create_refresh_token(user_id):
    """Create JWT refresh token"""
    expires = datetime.now(timezone.utc) + timedelta(days=current_app.config['JWT_REFRESH_TOKEN_EXPIRE_DAYS'])
    return jwt.encode({
        'user_id': user_id,
        'exp': expires,
        'iat': datetime.now(timezone.utc),
        'type': 'refresh'
    }, current_app.config['JWT_SECRET_KEY'], algorithm='HS256')
