import os
import numpy as np
from PIL import Image
from flask import Blueprint, request, jsonify
from dotenv import load_dotenv

load_dotenv()

api_bp = Blueprint('api', __name__)

# Load CNN model on startup (lazy loading)
CNN_MODEL = None

def load_cnn_model():
    """Load CNN model if not already loaded"""
    global CNN_MODEL
    if CNN_MODEL is None:
        try:
            import tensorflow as tf
            CNN_MODEL = tf.keras.models.load_model(os.getenv('MODEL_CNN_PATH'))
            print("✅ CNN model loaded successfully")
        except Exception as e:
            print(f"❌ Failed to load CNN model: {e}")
            CNN_MODEL = None

# ==================== PREPROCESSING ====================

def preprocess_image(image_file):
    """Process image directly from uploaded file (no saving to disk)"""
    img = Image.open(image_file.stream).convert('RGB')
    img = img.resize((224, 224))
    img_array = np.array(img, dtype=np.float32) / 255.0
    return np.expand_dims(img_array, axis=0)

# ==================== ENDPOINTS ====================

@api_bp.route('/classify', methods=['POST'])
def classify():
    """
    Wildfire classification endpoint - classify if image contains wildfire

    Expects:
    - image: file (satellite imagery)
    """
    try:
        # Load CNN model only
        global CNN_MODEL
        if CNN_MODEL is None:
            load_cnn_model()
            if CNN_MODEL is None:
                return jsonify({
                    'error': 'Model not loaded',
                    'message': 'CNN model is not available'
                }), 500

        # Validate image
        if 'image' not in request.files:
            return jsonify({
                'error': 'No image file provided',
                'message': 'Please upload a satellite image file'
            }), 400

        image_file = request.files['image']

        if image_file.filename == '':
            return jsonify({
                'error': 'No file selected',
                'message': 'Please select an image file'
            }), 400

        # Validate file type
        allowed_extensions = {'png', 'jpg', 'jpeg'}
        file_ext = image_file.filename.rsplit('.', 1)[1].lower() if '.' in image_file.filename else ''

        if file_ext not in allowed_extensions:
            return jsonify({
                'error': 'Invalid file type',
                'message': 'Please upload PNG, JPG, or JPEG only'
            }), 400

        # Preprocess image
        img_array = preprocess_image(image_file)

        # Get CNN classification
        cnn_pred = float(CNN_MODEL.predict(img_array, verbose=0)[0][0])

        # Determine classification (high score = wildfire, low = no wildfire)
        is_wildfire = cnn_pred >= 0.5

        return jsonify({
            'is_wildfire': is_wildfire,
            'confidence': cnn_pred,
            'classification': 'wildfire' if is_wildfire else 'no_wildfire'
        }), 200

    except Exception as e:
        print(f"Error: {e}")
        return jsonify({
            'error': 'Classification failed',
            'message': str(e)
        }), 500
