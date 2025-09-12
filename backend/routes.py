from controllers.auth import auth_bp
from controllers.oauth import oauth_bp

def register_routes(app):
    """Register all blueprints with the Flask app"""

    # Register authentication routes
    app.register_blueprint(auth_bp, url_prefix='/api')

    # Register OAuth routes
    app.register_blueprint(oauth_bp, url_prefix='/api')

    print("✅ Authentication blueprints registered")
