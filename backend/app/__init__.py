from flask import Flask
from flask_cors import CORS
from dotenv import load_dotenv
import os

def create_app():
    load_dotenv()

    app = Flask(__name__)
    app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB

    # Enable CORS
    CORS(app, resources={r"/api/*": {"origins": "*"}})

    # Register routes
    from app.routes import api_bp, load_cnn_model, load_lstm_model
    app.register_blueprint(api_bp, url_prefix='/api')

    # Auto-load models on startup (moved here so models load immediately)
    with app.app_context():
        print("🚀 Initializing Flame Prophet AI Models...")
        load_cnn_model()
        load_lstm_model()
        print("✅ Model initialization complete!")

    return app
