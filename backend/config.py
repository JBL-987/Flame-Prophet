import os
from dotenv import load_dotenv
import secrets
from supabase import create_client, Client
from flask import Flask
from flask_cors import CORS
from werkzeug.middleware.proxy_fix import ProxyFix
from authlib.integrations.flask_client import OAuth

load_dotenv()

DEBUG_MODE = os.getenv('FLASK_DEBUG', 'False').lower() == 'true'

# Supabase Configuration
SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_ANON_KEY = os.getenv('SUPABASE_ANON_KEY')
SUPABASE_SERVICE_KEY = os.getenv('SUPABASE_SERVICE_KEY')

# Supabase Client
supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

def setup_app():
    """Setup and configure Flask application"""
    app = Flask(__name__)

    # Apply proxy fix for production deployments
    app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_proto=1, x_host=1, x_prefix=1)

    CORS(app, origins=["http://localhost:3000", "http://127.0.0.1:3000", "https://localhost:3000"])

    # Configuration
    app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', secrets.token_hex(32))
    app.config['JWT_SECRET_KEY'] = os.getenv('JWT_SECRET_KEY', secrets.token_hex(32))
    # Extended session durations for better user experience
    app.config['JWT_ACCESS_TOKEN_EXPIRE_MINUTES'] = int(os.getenv('JWT_ACCESS_TOKEN_EXPIRE_MINUTES', '240'))  # 4 hours instead of 15 minutes
    app.config['JWT_REFRESH_TOKEN_EXPIRE_DAYS'] = int(os.getenv('JWT_REFRESH_TOKEN_EXPIRE_DAYS', '30'))

    # OAuth Configuration
    app.config['GOOGLE_CLIENT_ID'] = os.getenv('GOOGLE_CLIENT_ID')
    app.config['GOOGLE_CLIENT_SECRET'] = os.getenv('GOOGLE_CLIENT_SECRET')

    return app

def load_config():
    """Load environment configuration"""
    return {
        'DEBUG_MODE': os.getenv('FLASK_DEBUG', 'False').lower() == 'true',
        'SUPABASE_URL': os.getenv('SUPABASE_URL'),
        'SUPABASE_ANON_KEY': os.getenv('SUPABASE_ANON_KEY'),
        'SUPABASE_SERVICE_KEY': os.getenv('SUPABASE_SERVICE_KEY'),
        'SECRET_KEY': os.getenv('SECRET_KEY', secrets.token_hex(32)),
        'JWT_SECRET_KEY': os.getenv('JWT_SECRET_KEY', secrets.token_hex(32)),
        'JWT_ACCESS_TOKEN_EXPIRE_MINUTES': int(os.getenv('JWT_ACCESS_TOKEN_EXPIRE_MINUTES', '240')),
        'JWT_REFRESH_TOKEN_EXPIRE_DAYS': int(os.getenv('JWT_REFRESH_TOKEN_EXPIRE_DAYS', '30')),
        'GOOGLE_CLIENT_ID': os.getenv('GOOGLE_CLIENT_ID'),
        'GOOGLE_CLIENT_SECRET': os.getenv('GOOGLE_CLIENT_SECRET'),
        'FRONTEND_URL': os.getenv('FRONTEND_URL', 'http://localhost:3000'),
        'GOOGLE_REDIRECT_URI': os.getenv('GOOGLE_REDIRECT_URI', 'http://localhost:3000/auth/callback'),
        # Database connection now handled by Supabase client
    }

# OAuth setup
def setup_oauth(app):
    oauth = OAuth(app)
    google = oauth.register(
        name='google',
        client_id=app.config['GOOGLE_CLIENT_ID'],
        client_secret=app.config['GOOGLE_CLIENT_SECRET'],
        server_metadata_url='https://accounts.google.com/.well-known/openid-configuration',
        client_kwargs={'scope': 'openid email profile'}
    )
    # Attach to app for easy access
    app.oauth = oauth
    app.google = google
    return oauth, google
