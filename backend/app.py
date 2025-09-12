from flask import Flask
from config import setup_app, setup_oauth, DEBUG_MODE
from database import init_db_pool, close_db_pool
from routes import register_routes
from error_handlers import register_error_handlers
import atexit
import os

app = setup_app()

# Setup OAuth (only if Google credentials are available)
oauth, google = None, None
if os.getenv('GOOGLE_CLIENT_ID') and os.getenv('GOOGLE_CLIENT_SECRET'):
    try:
        oauth, google = setup_oauth(app)
        print("✅ Google OAuth configured")
    except Exception as e:
        print(f"⚠️  Google OAuth setup failed (non-critical): {e}")

# Register routes and error handlers
register_routes(app)
register_error_handlers(app)

# Register cleanup function
atexit.register(close_db_pool)

if __name__ == '__main__':
    print("🚀 Starting Flame Prophet Backend with Enhanced Auth")
    print("🌐 Frontend: http://localhost:3000")
    print("🔧 Backend: http://localhost:5000")

    # Initialize database connection pool
    if not init_db_pool():
        print("❌ Failed to initialize database")
        exit(1)

    app.run(
        host='0.0.0.0',
        port=5000,
        debug=DEBUG_MODE
    )
