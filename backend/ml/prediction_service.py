"""
Prediction Service for Flame Prophet ML models
Handles preprocessing, prediction, and postprocessing
"""

import numpy as np
import pandas as pd
import logging
from typing import Any, Dict, List, Optional, Union, Tuple
import json
from datetime import datetime
import traceback

logger = logging.getLogger(__name__)

class PredictionService:
    """
    Service for making predictions with ML models
    Handles data preprocessing, prediction, and result formatting
    """

    def __init__(self, model: Any, scaler: Optional[Any] = None):
        """
        Initialize the prediction service

        Args:
            model: Trained ML model
            scaler: Optional scaler for preprocessing
        """
        self.model = model
        self.scaler = scaler
        self.model_type = self._detect_model_type()
        self.feature_names = [
            'temperature', 'humidity', 'wind_speed', 'vegetation_density',
            'soil_moisture', 'historical_fires', 'urban_distance', 'latitude', 'longitude'
        ]

        logger.info(f"Initialized prediction service with {self.model_type} model")

    def _detect_model_type(self) -> str:
        """Detect the type of model (classifier/regressor)"""
        try:
            model_name = self.model.__class__.__name__.lower()
            if 'regressor' in model_name or 'regressor' in str(type(self.model)).lower():
                return 'regressor'
            elif 'classifier' in model_name or 'classifier' in str(type(self.model)).lower():
                return 'classifier'
            else:
                # Try to determine from predict method
                return 'classifier'  # Default assumption
        except Exception as e:
            logger.warning(f"Could not detect model type: {e}")
            return 'unknown'

    def preprocess_data(self, input_data: Union[Dict, List[Dict], pd.DataFrame, np.ndarray]) -> np.ndarray:
        """
        Preprocess input data for prediction

        Args:
            input_data: Input data in various formats

        Returns:
            Preprocessed numpy array ready for prediction
        """
        try:
            # Convert to DataFrame first
            if isinstance(input_data, dict):
                df = pd.DataFrame([input_data])
            elif isinstance(input_data, list):
                df = pd.DataFrame(input_data)
            elif isinstance(input_data, pd.DataFrame):
                df = input_data.copy()
            elif isinstance(input_data, np.ndarray):
                df = pd.DataFrame(input_data, columns=self.feature_names[:input_data.shape[1]])
            else:
                raise ValueError(f"Unsupported input data type: {type(input_data)}")

            # Ensure all feature columns exist
            for feature in self.feature_names:
                if feature not in df.columns:
                    df[feature] = 0.0  # Default value

            # Select only the expected features
            df = df[self.feature_names]

            # Handle missing values
            df = df.fillna(df.mean())

            # Convert to numpy array
            features = df.values.astype(np.float32)

            # Apply scaling if scaler is available
            if self.scaler is not None:
                features = self.scaler.transform(features)

            return features

        except Exception as e:
            logger.error(f"Data preprocessing error: {e}")
            logger.error(traceback.format_exc())
            raise

    def predict(self, input_data: Union[Dict, List[Dict], pd.DataFrame, np.ndarray]) -> Dict[str, Any]:
        """
        Make prediction with the loaded model

        Args:
            input_data: Input data for prediction

        Returns:
            Prediction results as dictionary
        """
        try:
            start_time = datetime.now()

            # Preprocess data
            processed_data = self.preprocess_data(input_data)

            # Make prediction
            if hasattr(self.model, 'predict_proba') and self.model_type == 'classifier':
                # Classification with probabilities
                prediction_proba = self.model.predict_proba(processed_data)
                prediction_class = self.model.predict(processed_data)

                # For multi-class, return top prediction
                if len(prediction_class.shape) > 1:
                    prediction_class = prediction_class.argmax(axis=1)
                    prediction_proba = prediction_proba.max(axis=1)
                else:
                    prediction_class = prediction_class[0] if len(prediction_class) == 1 else prediction_class[0]
                    prediction_proba = prediction_proba[0] if len(prediction_proba.shape) > 1 and prediction_proba.shape[0] == 1 else prediction_proba

                result = {
                    'prediction': int(prediction_class),
                    'probability': float(prediction_proba.max()) if hasattr(prediction_proba, 'max') else float(prediction_proba),
                    'prediction_type': 'classification',
                    'model_type': self.model_type,
                    'processing_time_ms': (datetime.now() - start_time).total_seconds() * 1000
                }

            elif hasattr(self.model, 'predict'):
                # Standard prediction (classification or regression)
                prediction = self.model.predict(processed_data)

                if self.model_type == 'classifier':
                    # Classification without probabilities
                    if len(prediction.shape) > 1:
                        prediction = prediction.argmax(axis=1)

                    result = {
                        'prediction': int(prediction[0] if len(prediction) == 1 else prediction[0]),
                        'prediction_type': 'classification',
                        'model_type': self.model_type,
                        'processing_time_ms': (datetime.now() - start_time).total_seconds() * 1000
                    }
                else:
                    # Regression
                    result = {
                        'prediction': float(prediction[0] if len(prediction) == 1 else prediction[0]),
                        'prediction_type': 'regression',
                        'model_type': self.model_type,
                        'processing_time_ms': (datetime.now() - start_time).total_seconds() * 1000
                    }
            else:
                # Fallback for models without predict method
                result = {
                    'prediction': 'model_prediction_unavailable',
                    'prediction_type': 'unknown',
                    'model_type': self.model_type,
                    'processing_time_ms': (datetime.now() - start_time).total_seconds() * 1000
                }

            # Add metadata
            result.update({
                'timestamp': datetime.now().isoformat(),
                'model_info': str(type(self.model).__name__),
                'features_used': self.feature_names,
                'input_shape': processed_data.shape,
            })

            logger.info(".2f")
            return result

        except Exception as e:
            logger.error(f"Prediction error: {e}")
            logger.error(traceback.format_exc())

            return {
                'error': str(e),
                'prediction_type': 'error',
                'model_type': self.model_type,
                'timestamp': datetime.now().isoformat(),
                'processing_time_ms': 0
            }

    def batch_predict(self, input_data_list: List[Union[Dict, pd.DataFrame, np.ndarray]]) -> List[Dict[str, Any]]:
        """
        Make batch predictions for multiple inputs

        Args:
            input_data_list: List of input data items

        Returns:
            List of prediction results
        """
        results = []
        for i, input_data in enumerate(input_data_list):
            try:
                result = self.predict(input_data)
                result['batch_index'] = i
                results.append(result)
            except Exception as e:
                logger.error(f"Batch prediction error for item {i}: {e}")
                results.append({
                    'error': str(e),
                    'batch_index': i,
                    'prediction_type': 'error',
                    'timestamp': datetime.now().isoformat()
                })

        return results

    def get_model_info(self) -> Dict[str, Any]:
        """
        Get information about the loaded model

        Returns:
            Model information dictionary
        """
        try:
            info = {
                'model_type': str(type(self.model).__name__),
                'prediction_type': self.model_type,
                'feature_names': self.feature_names,
                'has_scaler': self.scaler is not None,
                'scaler_type': str(type(self.scaler).__name__) if self.scaler else None,
            }

            # Add model-specific attributes if available
            if hasattr(self.model, 'n_features_in_'):
                info['n_features'] = self.model.n_features_in_
            if hasattr(self.model, 'classes_'):
                info['classes'] = self.model.classes_.tolist() if hasattr(self.model.classes_, 'tolist') else list(self.model.classes_)
            if hasattr(self.model, 'feature_importances_'):
                feature_importance = dict(zip(self.feature_names, self.model.feature_importances_.tolist()))
                info['feature_importance'] = feature_importance

            return info

        except Exception as e:
            logger.error(f"Error getting model info: {e}")
            return {
                'model_type': str(type(self.model).__name__),
                'prediction_type': self.model_type,
                'error': str(e)
            }

    def validate_input_data(self, input_data: Union[Dict, List[Dict], pd.DataFrame, np.ndarray]) -> Tuple[bool, str]:
        """
        Validate input data format and required fields

        Args:
            input_data: Input data to validate

        Returns:
            Tuple of (is_valid, error_message)
        """
        try:
            if isinstance(input_data, dict):
                # Check for required fields
                missing_fields = []
                for field in ['latitude', 'longitude']:  # Required fields
                    if field not in input_data:
                        missing_fields.append(field)

                if missing_fields:
                    return False, f"Missing required fields: {missing_fields}"

                # Check data types
                for field in self.feature_names:
                    if field in input_data and not isinstance(input_data[field], (int, float)):
                        try:
                            float(input_data[field])
                        except (ValueError, TypeError):
                            return False, f"Invalid data type for field '{field}': {type(input_data[field])}"

            elif isinstance(input_data, list):
                if len(input_data) == 0:
                    return False, "Input list is empty"

                # Validate first item
                return self.validate_input_data(input_data[0])

            elif isinstance(input_data, (pd.DataFrame, np.ndarray)):
                if len(input_data) == 0:
                    return False, "Input data is empty"

                # Check shape
                if hasattr(input_data, 'shape'):
                    if len(input_data.shape) != 2:
                        return False, f"Expected 2D array, got {len(input_data.shape)}D"

            return True, "Valid"

        except Exception as e:
            return False, f"Validation error: {str(e)}"

    def explain_prediction(self, input_data: Union[Dict, pd.DataFrame, np.ndarray], prediction: Any) -> Dict[str, Any]:
        """
        Provide explanation for a prediction (if supported by the model)

        Args:
            input_data: Input data for the prediction
            prediction: Prediction result

        Returns:
            Explanation dictionary
        """
        try:
            explanation = {
                'input_summary': {},
                'prediction_summary': {},
                'confidence_factors': []
            }

            # Summarize input data
            if isinstance(input_data, dict):
                explanation['input_summary'] = {
                    'latitude': input_data.get('latitude', 'N/A'),
                    'longitude': input_data.get('longitude', 'N/A'),
                    'temperature': input_data.get('temperature', 'N/A'),
                    'humidity': input_data.get('humidity', 'N/A'),
                    'wind_speed': input_data.get('wind_speed', 'N/A')
                }

            # Summarize prediction
            if isinstance(prediction, dict):
                explanation['prediction_summary'] = {
                    'result': prediction.get('prediction'),
                    'type': prediction.get('prediction_type'),
                    'confidence': prediction.get('probability', 'N/A')
                }

                # Add confidence factors based on feature importance
                if hasattr(self.model, 'feature_importances_'):
                    feature_importance = dict(zip(self.feature_names, self.model.feature_importances_))
                    top_features = sorted(feature_importance.items(), key=lambda x: x[1], reverse=True)[:3]

                    explanation['confidence_factors'] = [
                        {
                            'feature': feature,
                            'importance': float(importance),
                            'description': self._get_feature_description(feature)
                        }
                        for feature, importance in top_features
                    ]

            return explanation

        except Exception as e:
            logger.error(f"Explanation error: {e}")
            return {
                'error': str(e),
                'explanation_available': False
            }

    def _get_feature_description(self, feature: str) -> str:
        """Get human-readable description for a feature"""
        descriptions = {
            'temperature': 'Air temperature in Celsius',
            'humidity': 'Relative humidity percentage',
            'wind_speed': 'Wind speed in km/h',
            'vegetation_density': 'Vegetation density index (0-1)',
            'soil_moisture': 'Soil moisture content percentage',
            'historical_fires': 'Number of historical fires in the area',
            'urban_distance': 'Distance to nearest urban area in km',
            'latitude': 'Geographic latitude coordinate',
            'longitude': 'Geographic longitude coordinate'
        }

        return descriptions.get(feature, f"{feature} value")
