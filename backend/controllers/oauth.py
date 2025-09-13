import uuid
from datetime import datetime, timezone, timedelta
import os
from flask import Blueprint, request, jsonify, g, current_app
from middleware import create_access_token, create_refresh_token

oauth_bp = Blueprint('oauth', __name__)

@oauth_bp.route('/auth/google/login')
def google_login():
    """Initiate Google OAuth login"""
    from flask import current_app
    google = getattr(current_app, 'google', None) or current_app.extensions.get('authlib.client.google')
    if not google:
        return jsonify({'error': 'Google OAuth not configured'}), 500
    redirect_uri = os.getenv('GOOGLE_REDIRECT_URI', 'http://localhost:3000/auth/callback')
    return google.authorize_redirect(redirect_uri)

@oauth_bp.route('/auth/google/callback')
def google_callback():
    """Handle Google OAuth callback - Temporarily disabled"""
    return jsonify({'error': 'OAuth temporarily disabled - use Supabase Auth instead'}), 503
