"""
ML Model Loader for Flame Prophet
Handles loading and preprocessing for various ML models
"""

import os
import logging
import joblib
import numpy as np
from typing import Any, Dict, Optional, Union, Tuple
import json
from dataclasses import dataclass
import pickle

# ML Libraries
try:
    import tensorflow as tf
    TF_AVAILABLE = True
except ImportError:
    TF_AVAILABLE = False

try:
    import torch
    import torch.nn as nn
    TORCH_AVAILABLE = True
except ImportError:
    TORCH_AVAILABLE = False

try:
    from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor
    from sklearn.linear_model import LogisticRegression, LinearRegression
    from sklearn.svm import SVC, SVR
    from sklearn.preprocessing import StandardScaler
    SKLEARN_AVAILABLE = True
except ImportError:
    SKLEARN_AVAILABLE = False

logger = logging.getLogger(__name__)

@dataclass
class ModelConfig:
    """Configuration for model loading"""
    model_type: str
    model_path: str
    scaler_path: Optional[str] = None
    feature_names: Optional[list] = None
    target_names: Optional[list] = None
    framework: str = "sklearn"  # sklearn, tensorflow, pytorch

class ModelLoader:
    """Handles loading of ML models from various frameworks"""

    def __init__(self, models_dir: str = "models"):
        self.models_dir = models_dir
        self.loaded_models = {}
        self.scalers = {}

        # Create models directory if it doesn't exist
        os.makedirs(self.models_dir, exist_ok=True)

    def load_model(self, model_name: str, config: ModelConfig) -> Any:
        """
        Load a model based on configuration

        Args:
            model_name: Name identifier for the model
            config: Model configuration

        Returns:
            Loaded model object
        """
        try:
            if config.framework == "sklearn":
                return self._load_sklearn_model(config)
            elif config.framework == "tensorflow" and TF_AVAILABLE:
                return self._load_tensorflow_model(config)
            elif config.framework == "pytorch" and TORCH_AVAILABLE:
                return self._load_pytorch_model(config)
            else:
                raise ValueError(f"Unsupported framework: {config.framework}")

        except Exception as e:
            logger.error(f"Failed to load model {model_name}: {e}")
            raise

    def _load_sklearn_model(self, config: ModelConfig) -> Any:
        """Load sklearn-based model"""
        if not SKLEARN_AVAILABLE:
            raise ImportError("scikit-learn is not available")

        model_path = os.path.join(self.models_dir, config.model_path)

        if not os.path.exists(model_path):
            logger.warning(f"Model file not found: {model_path}. Creating default model.")
            return self._create_default_sklearn_model(config)

        # Load model
        with open(model_path, 'rb') as f:
            model = pickle.load(f)

        # Load scaler if specified
        if config.scaler_path:
            scaler_path = os.path.join(self.models_dir, config.scaler_path)
            if os.path.exists(scaler_path):
                with open(scaler_path, 'rb') as f:
                    self.scalers[config.model_path] = pickle.load(f)

        logger.info(f"Loaded sklearn model: {config.model_path}")
        return model

    def _load_tensorflow_model(self, config: ModelConfig) -> Any:
        """Load TensorFlow/Keras model"""
        if not TF_AVAILABLE:
            raise ImportError("TensorFlow is not available")

        model_path = os.path.join(self.models_dir, config.model_path)

        if not os.path.exists(model_path):
            logger.warning(f"Model file not found: {model_path}")
            return None

        model = tf.keras.models.load_model(model_path)
        logger.info(f"Loaded TensorFlow model: {config.model_path}")
        return model

    def _load_pytorch_model(self, config: ModelConfig) -> Any:
        """Load PyTorch model"""
        if not TORCH_AVAILABLE:
            raise ImportError("PyTorch is not available")

        model_path = os.path.join(self.models_dir, config.model_path)

        if not os.path.exists(model_path):
            logger.warning(f"Model file not found: {model_path}")
            return None

        # This is a placeholder - you would implement your specific model loading logic
        # based on your PyTorch model architecture
        model = torch.load(model_path, map_location=torch.device('cpu'))
        model.eval()
        logger.info(f"Loaded PyTorch model: {config.model_path}")
        return model

    def _create_default_sklearn_model(self, config: ModelConfig) -> Any:
        """Create a default sklearn model for testing"""
        logger.info(f"Creating default {config.model_type} model")

        if config.model_type == "classifier":
            model = RandomForestClassifier(n_estimators=100, random_state=42)
        elif config.model_type == "regressor":
            model = RandomForestRegressor(n_estimators=100, random_state=42)
        else:
            model = LogisticRegression(random_state=42)

        # Create a simple scaler
        self.scalers[config.model_path] = StandardScaler()

        return model

    def save_model(self, model: Any, model_name: str, config: ModelConfig) -> bool:
        """
        Save a trained model

        Args:
            model: Trained model object
            model_name: Name for the model
            config: Model configuration

        Returns:
            Success status
        """
        try:
            model_path = os.path.join(self.models_dir, config.model_path)

            if config.framework == "sklearn":
                with open(model_path, 'wb') as f:
                    pickle.dump(model, f)

                # Save scaler if available
                scaler_key = f"{model_name}_scaler"
                if scaler_key in self.scalers:
                    scaler_path = os.path.join(self.models_dir, config.scaler_path or f"{model_name}_scaler.pkl")
                    with open(scaler_path, 'wb') as f:
                        pickle.dump(self.scalers[scaler_key], f)

            elif config.framework == "tensorflow" and TF_AVAILABLE:
                model.save(model_path)

            elif config.framework == "pytorch" and TORCH_AVAILABLE:
                torch.save(model, model_path)

            logger.info(f"Saved model: {model_name}")
            return True

        except Exception as e:
            logger.error(f"Failed to save model {model_name}: {e}")
            return False

# Global model loader instance
model_loader = ModelLoader()

def load_ml_model(model_name: str = "flame_prophet_model") -> Any:
    """
    Load the main ML model for Flame Prophet

    Args:
        model_name: Name of the model to load

    Returns:
        Loaded model object
    """
    try:
        # Default configuration for flame detection model
        config = ModelConfig(
            model_type="classifier",
            model_path=f"{model_name}.pkl",
            scaler_path=f"{model_name}_scaler.pkl",
            feature_names=[
                'temperature', 'humidity', 'wind_speed', 'vegetation_density',
                'soil_moisture', 'historical_fires', 'urban_distance', 'latitude', 'longitude'
            ],
            framework="sklearn"
        )

        model = model_loader.load_model(model_name, config)
        logger.info(f"Successfully loaded {model_name}")
        return model

    except Exception as e:
        logger.error(f"Failed to load ML model: {e}")
        # Return a default model for testing
        config = ModelConfig(
            model_type="classifier",
            model_path="default_model.pkl",
            framework="sklearn"
        )
        return model_loader.load_model("default", config)

def get_model_info() -> Dict[str, Any]:
    """Get information about the loaded models"""
    return {
        "loaded_models": list(model_loader.loaded_models.keys()),
        "frameworks": {
            "tensorflow": TF_AVAILABLE,
            "pytorch": TORCH_AVAILABLE,
            "sklearn": SKLEARN_AVAILABLE
        },
        "models_directory": model_loader.models_dir,
        "available_scalers": list(model_loader.scalers.keys())
    }
