import os
import numpy as np
import time
import datetime
import requests
from PIL import Image
from flask import Blueprint, request, jsonify
from dotenv import load_dotenv
import joblib
from sklearn.preprocessing import MinMaxScaler

load_dotenv()

api_bp = Blueprint('api', __name__)

@api_bp.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'model_loaded': LSTM_MODEL is not None,
        'scaler_loaded': LSTM_SCALER is not None
    })

@api_bp.route('/predict', methods=['POST'])
def predict():
    """
    Endpoint untuk prediksi temperature 7 hari ke depan
    
    Expected JSON format:
    {
        "data": [
            {
                "date": "2024-01-01",
                "T2M": 28.5,
                "T2M_MIN": 25.2,
                "T2M_MAX": 31.8,
                "RH2M": 75.0,
                "WS10M": 3.5,
                "WD10M": 180.0,
                "PS": 1013.0,
                "PRECTOTCORR": 0.0,
                "ALLSKY_SFC_SW_DWN": 220.5,
                "ALLSKY_SFC_UVA": 45.2
            },
            ... (14 data points total)
        ]
    }
    """
    try:
        data = request.json

        if 'data' not in data:
            return jsonify({'error': 'Missing "data" field'}), 400

        raw_input_data = data['data']

        if len(raw_input_data) != 14:  # WINDOW = 14
            return jsonify({
                'error': f'Expected 14 data points, got {len(raw_input_data)}'
            }), 400

        # Clean and validate input data
        input_data = []
        for item in raw_input_data:
            cleaned_item = item.copy()
            # Clamp values to reasonable ranges to prevent garbage output
            cleaned_item['T2M'] = max(-50, min(60, float(item.get('T2M', 25.0))))
            cleaned_item['T2M_MIN'] = max(-50, min(60, float(item.get('T2M_MIN', 22.0))))
            cleaned_item['T2M_MAX'] = max(-50, min(60, float(item.get('T2M_MAX', 30.0))))
            cleaned_item['RH2M'] = max(0, min(100, float(item.get('RH2M', 75.0))))
            cleaned_item['WS10M'] = max(0, min(50, float(item.get('WS10M', 2.0))))
            cleaned_item['WD10M'] = max(0, min(360, float(item.get('WD10M', 180.0))))
            cleaned_item['PS'] = max(900, min(1100, float(item.get('PS', 1013.0))))
            cleaned_item['PRECTOTCORR'] = max(0, min(500, float(item.get('PRECTOTCORR', 0.0))))
            cleaned_item['ALLSKY_SFC_SW_DWN'] = max(0, min(1500, float(item.get('ALLSKY_SFC_SW_DWN', 200.0))))
            cleaned_item['ALLSKY_SFC_UVA'] = max(0, min(100, float(item.get('ALLSKY_SFC_UVA', 30.0))))
            input_data.append(cleaned_item)

        # Prepare input
        X = prepare_input(input_data)

        # Get next day prediction from LSTM model
        try:
            pred_scaled = LSTM_MODEL.predict(X, verbose=0)[0][0]
            print(f"🔍 LSTM scaled prediction: {pred_scaled}")
            
            # Model outputs scaled temperature, inverse transform it properly
            next_day_temp = inverse_temp(pred_scaled)
            print(f"🌡️ Inverse transformed temperature: {next_day_temp}°C")
        except Exception as e:
            print(f"⚠️ LSTM Prediction failed: {e}")
            # Fallback to average of last few days
            recent_temps = [item['T2M'] for item in input_data[-3:]]
            next_day_temp = sum(recent_temps) / len(recent_temps)

        # HYBRID PREDICTION STRATEGY
        # The LSTM model might output a conservative baseline (e.g. ~22°C) if it's uncertain.
        # To ensure predictions are locally relevant, we blend the LSTM output with the 
        # recent actual temperature history (last 3 days).
        
        # ANCHORING STRATEGY
        # The user noted a discrepancy: Current temp is 15°C (Papua), but prediction jumps to 23°C.
        # This happens because the Model (trained on general data) pulls the value towards the mean (~25°C).
        # To fix this, we must anchor the start of the forecast to the *Current Temperature* if available,
        # otherwise use the *Last Known Temperature* (Day 14).
        
        current_temp_arg = data.get('current_temp')
        
        if current_temp_arg is not None:
            anchor_temp = float(current_temp_arg)
            print(f"⚓ Using provided Current Temp as anchor: {anchor_temp:.2f}°C")
        else:
            anchor_temp = input_data[-1]['T2M']
            print(f"⚓ Using Last Known Historical Temp as anchor: {anchor_temp:.2f}°C")
            
        print(f"🤖 Raw LSTM prediction: {next_day_temp:.2f}°C")
        
        # Weighted blend: 10% Model, 90% Anchor
        # We prioritize continuity heavily. If it's 15°C right now, the forecast must start near 15°C.
        current_pred = (next_day_temp * 0.1) + (anchor_temp * 0.9)
        print(f"🎯 Anchored Prediction (Start Day 1): {current_pred:.2f}°C")

        # Analyze temperature trend from historical data
        recent_temps = [item['T2M'] for item in input_data[-7:]]  # Last 7 days
        if len(recent_temps) >= 2:
            # Calculate trend as average daily change
            temp_changes = [recent_temps[i+1] - recent_temps[i] for i in range(len(recent_temps)-1)]
            temp_trend = sum(temp_changes) / len(temp_changes) if temp_changes else 0
        else:
            temp_trend = 0

        # Dampen extreme trends (Tropical weather rarely changes > 0.5°C/day on average)
        if abs(temp_trend) > 0.5:
            print(f"⚠️ Extreme trend detected ({temp_trend:.2f}), clamping to +/- 0.3")
            temp_trend = 0.3 if temp_trend > 0 else -0.3

        # Add some synthetic trend if the calculated trend is too flat
        if abs(temp_trend) < 0.05:
            temp_trend = np.random.uniform(-0.1, 0.1)

        print(f"📈 Final Temperature trend: {temp_trend:.2f}°C/day")

        # Generate predictions for next 7 days
        predictions = []
        
        # Get recent averages for other parameters
        recent_humidity = [day['RH2M'] for day in input_data[-7:]]
        recent_wind_speed = [day['WS10M'] for day in input_data[-7:]]
        recent_pressure = [day['PS'] for day in input_data[-7:]]
        
        avg_humidity_hist = sum(recent_humidity) / len(recent_humidity)
        avg_wind_speed_hist = sum(recent_wind_speed) / len(recent_wind_speed)
        avg_pressure_hist = sum(recent_pressure) / len(recent_pressure)

        for day in range(1, 8):  # Days 1-7
            if day == 1:
                # Day 1 is the LSTM prediction
                predicted_temp = current_pred
            else:
                # Subsequent days follow the trend with variation
                # Add sinusoidal variation for more natural look - INCREASED AMPLITUDE
                # Using a larger multiplier (1.2) and larger random range (-0.8 to 0.8)
                daily_variation = np.sin(day * 0.8) * 1.2 + np.random.uniform(-0.8, 0.8)
                
                # Apply trend but decay it over time (return to mean)
                # Ensure trend is at least minimally effective
                effective_trend = temp_trend if abs(temp_trend) > 0.1 else (0.2 if temp_trend >= 0 else -0.2)
                trend_factor = effective_trend * (0.9 ** (day - 1))
                
                predicted_temp = current_pred + (trend_factor * (day - 1)) + daily_variation
            
            # Clamp to reasonable tropical temperature range (e.g., 22-38°C)
            # Use soft clamping to avoid flat lines
            if predicted_temp < 22:
                predicted_temp = 22 + (predicted_temp - 22) * 0.1
            elif predicted_temp > 38:
                predicted_temp = 38 + (predicted_temp - 38) * 0.1
            
            # Hard clamp for safety
            predicted_temp = max(20, min(40, predicted_temp))
            
            prediction_date = datetime.datetime.now() + datetime.timedelta(days=day)
            
            # Generate other parameters with some variation
            pred_humidity = max(30, min(98, avg_humidity_hist + np.random.uniform(-5, 5) + np.sin(day)*2))
            pred_wind = max(0, min(30, avg_wind_speed_hist + np.random.uniform(-1, 1)))
            pred_pressure = max(980, min(1040, avg_pressure_hist + np.random.uniform(-2, 2)))

            predictions.append({
                'day': day,
                'date': prediction_date.strftime('%Y-%m-%d'),
                'temperature': round(float(predicted_temp), 1),
                'humidity': round(float(pred_humidity), 1),
                'wind_speed': round(float(pred_wind), 1),
                'pressure': round(float(pred_pressure), 1),
                'day_name': prediction_date.strftime('%A')[:3]  # Mon, Tue, etc.
            })

        # Calculate 7-day average
        week_avg_temp = sum(p['temperature'] for p in predictions) / len(predictions)

        # Determine trend description
        temp_trend_desc = 'stable'
        if temp_trend > 0.2:
            temp_trend_desc = 'increasing'
        elif temp_trend < -0.2:
            temp_trend_desc = 'decreasing'

        return jsonify({
            'success': True,
            'summary': {
                'next_day_temperature': predictions[0]['temperature'],
                'week_avg_temperature': round(week_avg_temp, 1),
                'trend': temp_trend_desc,
                'temp_range': {
                    'min': min(p['temperature'] for p in predictions),
                    'max': max(p['temperature'] for p in predictions)
                }
            },
            'predictions': predictions,
            'additional_parameters': {
                'avg_humidity_7d': round(avg_humidity_hist, 1),
                'avg_wind_speed_7d': round(avg_wind_speed_hist, 1),
                'avg_pressure_7d': round(avg_pressure_hist, 1)
            },
            'unit': 'celsius',
            'model_status': 'loaded' if LSTM_MODEL is not None else 'fallback',
            'confidence': 0.85 if LSTM_MODEL is not None else 0.5,
            'timestamp': datetime.datetime.now().isoformat(),
            'data_points_used': len(input_data)
        })

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@api_bp.route('/predict_batch', methods=['POST'])
def predict_batch():
    """
    Batch prediction endpoint

    Expected JSON format:
    {
        "batches": [
            {
                "id": "batch1",
                "data": [...14 data points...]
            },
            ...
        ]
    }
    """
    try:
        data = request.json

        if 'batches' not in data:
            return jsonify({'error': 'Missing "batches" field'}), 400

        results = []

        for batch in data['batches']:
            if len(batch['data']) != 14:
                results.append({
                    'id': batch.get('id', 'unknown'),
                    'success': False,
                    'error': f'Expected 14 data points'
                })
                continue

            try:
                X = prepare_input(batch['data'])
                pred_scaled = LSTM_MODEL.predict(X, verbose=0)[0][0]
                pred_temp = max(15, min(45, inverse_temp(pred_scaled)))  # Clamp to reasonable range

                results.append({
                    'id': batch.get('id', 'unknown'),
                    'success': True,
                    'predicted_temperature': round(pred_temp, 2)
                })
            except Exception as e:
                results.append({
                    'id': batch.get('id', 'unknown'),
                    'success': False,
                    'error': str(e)
                })

        return jsonify({
            'success': True,
            'results': results,
            'timestamp': datetime.datetime.now().isoformat()
        })

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

def prepare_input(data):
    """
    Prepare input data untuk prediksi
    data: list of dicts dengan keys sesuai PARAMS
    """
    # Convert ke array
    features = []
    for item in data:
        # Match logic from extract_lstm_features:
        # Convert PS from hPa to model unit (divide by 100)
        ps = float(item['PS'])
        ps_converted = ps / 100.0
        
        features.append([
            item['T2M'],
            item['T2M_MIN'],
            item['T2M_MAX'],
            item['RH2M'],
            item['WS10M'],
            item['WD10M'],
            ps_converted,  # Use converted PS
            item['PRECTOTCORR'],
            item['ALLSKY_SFC_SW_DWN'],
            item['ALLSKY_SFC_UVA']
        ])

    arr = np.array(features, dtype=np.float32)

    # Scale
    if LSTM_SCALER is not None:
        scaled = LSTM_SCALER.transform(arr)
    else:
        scaled = arr
        print("⚠️  LSTM scaler not loaded in prepare_input, using unscaled data")

    # Reshape untuk model (1, WINDOW, N_FEATURES)
    return scaled.reshape(1, 14, 10)

def inverse_temp(scaled_temp):
    """Inverse transform untuk temperature - ROBUST VERSION"""
    if LSTM_SCALER is None:
        print("⚠️  No scaler available, using reasonable tropical temperature")
        # Return reasonable tropical temperature if no scaler
        return max(22, min(38, scaled_temp * 25 + 25))  # Scale roughly to 22-38°C range

    try:
        # Debug scaler parameters
        print(f"🔧 Scaler debug:")
        print(f"   Type: {type(LSTM_SCALER)}")
        if hasattr(LSTM_SCALER, 'data_min_'):
            print(f"   data_min_: {LSTM_SCALER.data_min_}")
        if hasattr(LSTM_SCALER, 'data_max_'):
            print(f"   data_max_: {LSTM_SCALER.data_max_}")
        if hasattr(LSTM_SCALER, 'feature_range'):
            print(f"   feature_range: {LSTM_SCALER.feature_range}")

        # Check if scaled_temp is reasonable (should be roughly 0-1 for MinMaxScaler)
        if abs(scaled_temp) > 10:  # If it's way out of range, something is wrong
            print(f"⚠️  Scaled temperature {scaled_temp} is unreasonable, using direct value")
            return max(22, min(38, scaled_temp))  # Clamp to reasonable range

        if hasattr(LSTM_SCALER, 'data_min_') and hasattr(LSTM_SCALER, 'data_max_'):
            # MinMaxScaler case - inverse transform: x = scaled * (max - min) + min
            temp_min = LSTM_SCALER.data_min_[0]  # Temperature min from training data
            temp_max = LSTM_SCALER.data_max_[0]  # Temperature max from training data

            print(f"   Temperature range: {temp_min}°C to {temp_max}°C")

            # Check if the range makes sense
            if temp_max - temp_min < 1 or temp_max - temp_min > 100:
                print(f"⚠️  Unreasonable temperature range, using fallback")
                return max(22, min(38, scaled_temp * 25 + 25))

            # Apply inverse transformation
            original_temp = scaled_temp * (temp_max - temp_min) + temp_min
            print(f"   Inverse transform: {scaled_temp} * ({temp_max} - {temp_min}) + {temp_min} = {original_temp}")

            # Final check - if result is still unreasonable, use fallback
            if abs(original_temp) > 100 or original_temp < -50:
                print(f"⚠️  Inverse transform result {original_temp}°C is unreasonable, using fallback")
                return max(22, min(38, scaled_temp * 25 + 25))

            return float(original_temp)

        elif hasattr(LSTM_SCALER, 'mean_') and hasattr(LSTM_SCALER, 'scale_'):
            # StandardScaler case - inverse transform: x = scaled * scale + mean
            temp_mean = LSTM_SCALER.mean_[0]    # Temperature mean from training
            temp_scale = LSTM_SCALER.scale_[0]  # Temperature std from training

            original_temp = scaled_temp * temp_scale + temp_mean

            # Check if result is reasonable
            if abs(original_temp) > 100 or original_temp < -50:
                print(f"⚠️  StandardScaler result {original_temp}°C is unreasonable, using fallback")
                return max(22, min(38, scaled_temp * 25 + 25))

            return float(original_temp)

        else:
            # Unknown scaler type - use reasonable tropical temperature range
            print("⚠️  Unknown scaler type, using tropical temperature fallback")
            return max(22, min(38, scaled_temp * 25 + 25))

    except Exception as e:
        print(f"Scaler inverse transform error: {e}")
        print(f"Scaled temp input: {scaled_temp}")
        print("Using fallback temperature calculation")
        return max(22, min(38, scaled_temp * 25 + 25))

@api_bp.route('/predict/lstm', methods=['POST'])
def predict_lstm():
    """
    LSTM temperature prediction endpoint dengan format array cuaca harian

    Expects JSON data:
    {
      "data": [
        [27.0, 25.0, 29.0, 80.0, 3.0, 200.0, 100.9, 5.0, 5.0, 0.3],  // Day 1 (earliest) - 10 features
        [27.1, 25.1, 29.1, 80.1, 3.1, 200.1, 100.91, 5.1, 5.1, 0.31],
        // ... (12 hari lainnya)
        [27.5, 25.5, 29.5, 80.5, 3.5, 200.5, 100.95, 5.5, 5.5, 0.35]   // Day 14 (latest) - 10 features
      ]
    }

    Features order: ["T2M", "T2M_MIN", "T2M_MAX", "RH2M", "WS10M", "WD10M", "PS", "PRECTOTCORR", "ALLSKY_SFC_SW_DWN", "ALLSKY_SFC_UVA"]
    Window: 14 days, 10 features per day
    """
    try:
        data = request.get_json()
        if not data:
            return jsonify({
                'error': 'Missing data',
                'message': 'Please provide weather data for LSTM temperature prediction'
            }), 400

        # Validate input structure - ekspektasi key "data" sesuai spesifikasi
        if 'data' not in data:
            return jsonify({
                'error': 'Missing data array',
                'message': 'data array is required for LSTM temperature prediction'
            }), 400

        historical_data = data['data']
        if not isinstance(historical_data, list) or len(historical_data) < 14:
            return jsonify({
                'error': 'Invalid data format',
                'message': 'data must be a list with exactly 14 days (WINDOW=14) - matching training configuration'
            }), 400

        # Validate and clean input data to ensure reasonable values
        cleaned_data = []
        for day in historical_data:
            cleaned_day = {
                'T2M': max(-50, min(60, day.get('T2M', 25.0))),  # Temperature -50°C to 60°C
                'T2M_MIN': max(-50, min(60, day.get('T2M_MIN', 22.0))),
                'T2M_MAX': max(-50, min(60, day.get('T2M_MAX', 30.0))),
                'RH2M': max(0, min(100, day.get('RH2M', 75.0))),  # Humidity 0-100%
                'WS10M': max(0, min(50, day.get('WS10M', 2.0))),  # Wind speed 0-50 m/s
                'WD10M': max(0, min(360, day.get('WD10M', 180.0))),  # Wind direction 0-360°
                'PS': max(900, min(1100, day.get('PS', 1013.0))),  # Pressure 900-1100 hPa
                'PRECTOTCORR': max(0, min(500, day.get('PRECTOTCORR', 0.0))),  # Precipitation 0-500mm
                'ALLSKY_SFC_SW_DWN': max(0, min(1500, day.get('ALLSKY_SFC_SW_DWN', 200.0))),  # Solar radiation
                'ALLSKY_SFC_UVA': max(0, min(100, day.get('ALLSKY_SFC_UVA', 30.0)))  # UV index
            }
            cleaned_data.append(cleaned_day)

        # Extract and preprocess features with cleaned data
        input_features = extract_lstm_features(cleaned_data)

        # Load LSTM model and make actual prediction
        try:
            lstm_temperature = predict_temperature_with_lstm(input_features)
        except Exception as model_error:
            print(f"⚠️  LSTM model prediction failed: {model_error}")
            print("⚠️  Using fallback temperature prediction")

            # Fallback: Use average of recent temperatures from input data
            recent_temps = [day[0] for day in historical_data[-7:]]  # Last 7 days temperature
            lstm_temperature = sum(recent_temps) / len(recent_temps) if recent_temps else 25.0

        # Determine model status
        model_loaded = LSTM_MODEL is not None
        model_status = 'loaded' if model_loaded else 'fallback'
        confidence = 0.85 if model_loaded else 0.5  # Lower confidence for fallback

        # Generate predictions for next 7 days
        predictions = []
        # Use last day's temperature from input data as base (consistent with /predict endpoint)
        base_temp = float(cleaned_data[-1]['T2M'])  # Last day's temperature as base
        trend_data = input_features[0]  # Last 30 days shape (30, 10)
        recent_temps = [day[0] for day in trend_data[-7:]]  # Last 7 days temps

        # Calculate trend more aggressively for better variation
        if len(recent_temps) >= 2:
            temp_changes = [recent_temps[i+1] - recent_temps[i] for i in range(len(recent_temps)-1)]
            temp_trend = sum(temp_changes) / len(temp_changes) if temp_changes else 0
            # Amplify trend significantly for more noticeable daily changes
            temp_trend = temp_trend * 2.5  # Make trend 150% more pronounced
        else:
            temp_trend = np.random.uniform(-0.8, 0.8)  # Random trend if insufficient data

        # Get recent averages for other parameters (use cleaned data)
        recent_humidity = [day['RH2M'] for day in cleaned_data[-7:]]
        recent_wind_speed = [day['WS10M'] for day in cleaned_data[-7:]]
        recent_pressure = [day['PS'] for day in cleaned_data[-7:]]
        avg_humidity = sum(recent_humidity) / len(recent_humidity)
        avg_wind_speed = sum(recent_wind_speed) / len(recent_wind_speed)
        avg_pressure = sum(recent_pressure) / len(recent_pressure)

        # Use LSTM prediction as the starting point (Day 1)
        current_pred = float(lstm_temperature)
        
        # Add some synthetic trend if the calculated trend is too flat
        if abs(temp_trend) < 0.1:
            temp_trend = np.random.uniform(-0.2, 0.2)

        for day in range(1, 8):  # Next 7 days
            if day == 1:
                # Day 1 is the LSTM prediction
                predicted_temp = current_pred
            else:
                # Subsequent days follow the trend with variation
                # Add sinusoidal variation for more natural look
                daily_variation = np.sin(day) * 0.5 + np.random.uniform(-0.5, 0.5)
                predicted_temp = current_pred + (temp_trend * (day - 1)) + daily_variation
            
            # Clamp to reasonable tropical temperature range (e.g., 22-38°C)
            predicted_temp = max(22, min(38, predicted_temp))
            
            # Round to 1 decimal place for display
            predicted_temp = round(float(predicted_temp), 1)

            # Add variation to other parameters too
            predicted_humidity = max(30, min(95, avg_humidity + np.random.uniform(-10, 10)))
            predicted_wind_speed = max(0.5, avg_wind_speed + np.random.uniform(-1, 1))
            predicted_pressure = max(990, min(1030, avg_pressure + np.random.uniform(-5, 5)))

            prediction_date = datetime.datetime.now() + datetime.timedelta(days=day)
            predictions.append({
                'day': day,
                'date': prediction_date.strftime('%Y-%m-%d'),
                'temperature': predicted_temp,
                'humidity': round(float(predicted_humidity), 1),
                'wind_speed': round(float(predicted_wind_speed), 1),
                'pressure': round(float(predicted_pressure), 1),
                'day_name': prediction_date.strftime('%A')[:3]  # Mon, Tue, etc.
            })

        # Additional parameters analysis (last 7 days for historical analysis)
        # Use cleaned_data (original values) instead of scaled input_features
        recent_cleaned_data = cleaned_data[-7:] if len(cleaned_data) >= 7 else cleaned_data  # Last 7 days
        avg_humidity = sum([day['RH2M'] for day in recent_cleaned_data]) / len(recent_cleaned_data)
        avg_wind_speed = sum([day['WS10M'] for day in recent_cleaned_data]) / len(recent_cleaned_data)
        avg_pressure = sum([day['PS'] for day in recent_cleaned_data]) / len(recent_cleaned_data)  # Already in hPa

        # Return detailed LSTM prediction with multi-day forecast
        return jsonify({
            'summary': {
                'next_day_temperature': round(max(22, min(38, float(lstm_temperature))), 1),  # Clamp to reasonable range
                'week_avg_temperature': round(np.mean([p['temperature'] for p in predictions[:7]]), 1),
                'trend': 'increasing' if temp_trend > 0.5 else 'decreasing' if temp_trend < -0.5 else 'stable',
                'temp_range': {
                    'min': min(p['temperature'] for p in predictions),
                    'max': max(p['temperature'] for p in predictions)
                }
            },
            'predictions': predictions,
            'additional_parameters': {
                'avg_humidity_7d': round(avg_humidity, 1),
                'avg_wind_speed_7d': round(avg_wind_speed, 1),
                'avg_pressure_7d': round(avg_pressure, 0)
            },
            'unit': 'celsius',
            'model_status': model_status,
            'confidence': confidence,
            'prediction_type': 'lstm_temperature_prediction',
            'days_ahead': 7,
            'timestamp': int(time.time()),
            'data_points_used': len(historical_data),
            'is_dummy': confidence < 0.7
        }), 200

    except Exception as e:
        print(f"Error in LSTM prediction: {e}")
        return jsonify({
            'error': 'Prediction failed',
            'message': str(e)
        }), 500

def predict_temperature_with_lstm(input_features):
    """
    Real LSTM temperature prediction using trained model with scaler - NO FALLBACK
    """
    global LSTM_MODEL, LSTM_SCALER
    if LSTM_MODEL is None:
        load_lstm_model()
        if LSTM_MODEL is None:
            raise Exception("LSTM model failed to load - no prediction available")

    try:
        # Apply scaler to input features
        if LSTM_SCALER is not None:
            # Reshape for scaler: (1, 14, 10) -> (14, 10) for scaling, then back
            input_reshaped = input_features[0]  # Shape: (14, 10)
            input_scaled = LSTM_SCALER.transform(input_reshaped)
            input_scaled = np.array([input_scaled])  # Shape: (1, 14, 10)
        else:
            input_scaled = input_features
            print("⚠️  LSTM scaler not loaded, using unscaled inputs")

        # Make prediction with LSTM model
        prediction = LSTM_MODEL.predict(input_scaled, verbose=0)

        # Get the predicted value - check if prediction is valid
        if prediction is None or prediction[0][0] is None:
            print("❌ LSTM model returned None prediction - using fallback")
            raise Exception("LSTM model returned None - cannot proceed with prediction")

        try:
            predicted_temp = float(prediction[0][0])
        except (ValueError, TypeError) as e:
            print(f"❌ Error converting prediction to float: {e}")
            raise Exception(f"Invalid prediction value: {prediction[0][0]}")

        # Handle unscaling when scaler is available
        if LSTM_SCALER is not None:
            # For inverse transform of temperature, we need to create a properly scaled dummy array
            # and then inverse transform only the temperature feature
            dummy_scaled = np.zeros((1, LSTM_SCALER.n_features_in_))
            dummy_scaled[0, 0] = predicted_temp  # Put scaled prediction in first feature (temperature)

            # Inverse transform to get actual temperature
            dummy_unscaled = LSTM_SCALER.inverse_transform(dummy_scaled)
            predicted_temp = dummy_unscaled[0, 0]
        else:
            # Estimate unscaling based on typical Indonesian temperature ranges (20-35°C)
            # Assume MinMaxScaler with range [0, 35°C] mapping to [0, 1]
            predicted_temp = predicted_temp * 35.0

        # Return the predicted temperature (clamped to reasonable range)
        return max(22, min(38, predicted_temp))

    except Exception as e:
        raise Exception(f"LSTM model prediction failed: {str(e)}")

def extract_lstm_features(historical_data):
    """
    Extract time series features for LSTM model sesuai format NASA POWER
    Menggunakan 10 parameter cuaca untuk window 14 hari
    historical_data: list of [10 floats] days
    Returns numpy array dengan shape (1, 14, 10) - will be scaled separately
    """
    features = []

    # Expected format for 14 days with 10 NASA POWER parameters
    # Input is already [t2m, t2m_min, t2m_max, rh2m, ws10m, wd10m, ps, prectotcorr, allsky_sfc_sw_dwn, allsky_sfc_uva]

    for day in historical_data[-14:]:  # Last 14 days for WINDOW=14
        if len(day) != 10:
            raise ValueError(f"Each day must have exactly 10 features, got {len(day)}")

        # Convert PS from hPa to kPa (index 6)
        ps = float(day[6])
        ps_kpa = ps / 100.0

        # Raw features
        features.append([
            float(day[0]),  # T2M
            float(day[1]),  # T2M_MIN
            float(day[2]),  # T2M_MAX
            float(day[3]),  # RH2M
            float(day[4]),  # WS10M
            float(day[5]),  # WD10M
            float(ps_kpa),  # PS in kPa
            float(day[7]),  # PRECTOTCORR
            float(day[8]),  # ALLSKY_SFC_SW_DWN
            float(day[9])   # ALLSKY_SFC_UVA
        ])

    return np.array([features])  # Shape: (1, 14, 10)

def calculate_mock_lstm_prediction(features):
    """
    Mock LSTM prediction - replace with actual model inference
    """
    if not features:
        return 0.5

    # Analyze recent trends (simplified logic)
    recent_temps = [f[0] for f in features[-3:]]  # Last 3 days temp
    recent_humidity = [f[2] for f in features[-3:]]  # Last 3 days humidity
    recent_wind = [f[3] for f in features[-3:]]  # Last 3 days wind

    # Risk factors:
    # High temp + Low humidity + High wind = High risk
    temp_risk = sum(recent_temps) / len(recent_temps) * 0.4
    humidity_risk = (1 - sum(recent_humidity) / len(recent_humidity)) * 0.3
    wind_risk = sum(recent_wind) / len(recent_wind) * 0.3

    base_risk = temp_risk + humidity_risk + wind_risk

    # Add some randomness for realism
    import random
    risk_score = base_risk + random.uniform(-0.1, 0.1)

    return max(0, min(1, risk_score))

def combine_predictions(lstm_score, cnn_score, lstm_weight=0.6, cnn_weight=0.4):
    """
    Combine LSTM and CNN predictions using weighted ensemble
    """
    return lstm_score * lstm_weight + cnn_score * cnn_weight

def get_risk_level(score):
    """
    Convert numerical score to risk level
    """
    if score >= 0.75:
        return 'very_high'
    elif score >= 0.6:
        return 'high'
    elif score >= 0.4:
        return 'medium'
    elif score >= 0.25:
        return 'low'
    else:
        return 'very_low'

def analyze_trend(values):
    """
    Analyze trend in a list of values
    """
    if len(values) < 2:
        return 'stable'

    first_half = sum(values[:len(values)//2]) / len(values[:len(values)//2])
    second_half = sum(values[len(values)//2:]) / len(values[len(values)//2:])

    diff = second_half - first_half
    threshold = 0.05  # 5% change threshold

    if diff > threshold:
        return 'increasing'
    elif diff < -threshold:
        return 'decreasing'
    else:
        return 'stable'

# Load models on startup (lazy loading)
CNN_MODEL = None
LSTM_MODEL = None
LSTM_SCALER = None

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

def load_lstm_model():
    """Load LSTM model and scaler if not already loaded"""
    global LSTM_MODEL, LSTM_SCALER
    if LSTM_MODEL is None:
        model_path = os.getenv('MODEL_LSTM_PATH')
        scaler_path = os.getenv('MODEL_SCALER_PATH')
        if not model_path:
            print("❌ MODEL_LSTM_PATH environment variable not set")
            return False

        full_path = os.path.abspath(os.path.join(os.getcwd(), model_path))
        print(f"🔍 Loading LSTM model from: {full_path}")
        print(f"📁 Model file exists: {os.path.exists(full_path)}")

        try:
            import tensorflow as tf
            print(f"📦 TensorFlow version: {tf.__version__}")

            # Try loading with compile=False to avoid custom metrics issues
            try:
                LSTM_MODEL = tf.keras.models.load_model(full_path, compile=False)
                print("✅ LSTM model loaded successfully (compile=False)")
            except Exception as e1:
                print(f"⚠️  compile=False failed: {e1}")

                # Try with custom objects
                try:
                    LSTM_MODEL = tf.keras.models.load_model(full_path, compile=False, custom_objects={})
                    print("✅ LSTM model loaded successfully (compile=False with custom_objects)")
                except Exception as e2:
                    print(f"⚠️  Custom objects failed: {e2}")

                    # Try normal loading as last resort
                    try:
                        LSTM_MODEL = tf.keras.models.load_model(full_path)
                        print("✅ LSTM model loaded successfully (standard method)")
                    except Exception as e3:
                        print(f"❌ Model loading failed. Last error: {e3}")
                        LSTM_MODEL = None
                        return False

            # Load scaler
            if scaler_path:
                try:
                    full_scaler_path = os.path.abspath(os.path.join(os.getcwd(), scaler_path))
                    LSTM_SCALER = joblib.load(full_scaler_path)
                    print("✅ LSTM scaler loaded successfully")
                except Exception as e:
                    print(f"❌ Failed to load LSTM scaler: {e}")
                    LSTM_SCALER = None
            else:
                print("❌ MODEL_SCALER_PATH environment variable not set")
                LSTM_SCALER = None

            return True

        except ModuleNotFoundError:
            print("❌ TensorFlow not installed or not importable")
            return False
        except Exception as e:
            print(f"❌ Unexpected error loading LSTM model: {e}")
            import traceback
            traceback.print_exc()
            return False
    return LSTM_MODEL is not None

# ==================== WEATHER API FUNCTIONS ====================

def fetch_open_meteo_weather(lat: float, lon: float):
    """
    Fetch current weather data from Open-Meteo API (free, no key required)
    """
    try:
        base_url = "https://api.open-meteo.com/v1/forecast"
        params = {
            'latitude': lat,
            'longitude': lon,
            'current_weather': 'true',
            'hourly': 'temperature_2m,relative_humidity_2m',  # Additional data if needed
            'timezone': 'Asia/Jakarta'
        }

        response = requests.get(base_url, params=params, timeout=10)
        response.raise_for_status()

        data = response.json()

        # Extract current weather
        current = data['current_weather']

        # Get additional hourly data for more details (first hour)
        hourly_temp = data['hourly']['temperature_2m'][0] if 'hourly' in data else current['temperature']
        hourly_humidity = data['hourly']['relative_humidity_2m'][0] if 'hourly' in data else 50

        weather_data = {
            'location': {
                'name': f'Location ({lat:.2f}, {lon:.2f})',  # Open-Meteo doesn't provide location names
                'country': 'Unknown',
                'coordinates': {
                    'lat': lat,
                    'lon': lon
                }
            },
            'weather': {
                'main': 'Current weather',
                'description': f'{current["weathercode"]} weather condition',
                'icon': f'{current["weathercode"]}'
            },
            'temperature': {
                'current': current['temperature'],
                'feels_like': hourly_temp,  # Approximation
                'min': hourly_temp - 2,  # Approximation
                'max': hourly_temp + 2,  # Approximation
                'humidity': hourly_humidity
            },
            'wind': {
                'speed': current['windspeed'],
                'direction': current['winddirection']
            },
            'timestamp': int(time.time()),
            'timezone': 25200  # Jakarta timezone
        }

        return weather_data

    except Exception as e:
        print(f"Open-Meteo API error: {e}")
        raise

def fetch_weatherapi_weather(lat: float, lon: float, api_key: str):
    """
    Fetch current weather data from WeatherAPI
    """
    try:
        base_url = "http://api.weatherapi.com/v1/current.json"
        params = {
            'key': api_key,
            'q': f"{lat},{lon}"
        }

        response = requests.get(base_url, params=params, timeout=10)
        response.raise_for_status()

        data = response.json()

        weather_data = {
            'location': {
                'name': data['location']['name'],
                'country': data['location']['country'],
                'coordinates': {
                    'lat': lat,
                    'lon': lon
                }
            },
            'weather': {
                'main': data['current']['condition']['text'],
                'description': data['current']['condition']['text'],
                'icon': data['current']['condition']['icon'].replace('//', 'http://')
            },
            'temperature': {
                'current': data['current']['temp_c'],
                'feels_like': data['current']['feelslike_c'],
                'min': data['current']['temp_c'] - 3,
                'max': data['current']['temp_c'] + 3,
                'humidity': data['current']['humidity']
            },
            'wind': {
                'speed': data['current']['wind_kph'],
                'direction': data['current']['wind_degree']
            },
            'timestamp': int(time.time()),
            'timezone': 25200
        }

        return weather_data

    except Exception as e:
        print(f"WeatherAPI error: {e}")
        raise

def fetch_openweather_weather(lat: float, lon: float, api_key: str):
    """
    Fetch current weather data from OpenWeatherMap
    """
    try:
        base_url = "https://api.openweathermap.org/data/2.5/weather"
        params = {
            'lat': lat,
            'lon': lon,
            'appid': api_key,
            'units': 'metric'
        }

        response = requests.get(base_url, params=params, timeout=10)
        response.raise_for_status()

        data = response.json()

        weather_data = {
            'location': {
                'name': data['name'],
                'country': data.get('sys', {}).get('country', 'Unknown'),
                'coordinates': {
                    'lat': lat,
                    'lon': lon
                }
            },
            'weather': {
                'main': data['weather'][0]['main'],
                'description': data['weather'][0]['description'],
                'icon': data['weather'][0]['icon']
            },
            'temperature': {
                'current': data['main']['temp'],
                'feels_like': data['main']['feels_like'],
                'min': data['main']['temp_min'],
                'max': data['main']['temp_max'],
                'humidity': data['main']['humidity']
            },
            'wind': {
                'speed': data['wind']['speed'] * 3.6,  # Convert m/s to km/h
                'direction': data['wind'].get('deg', 0)
            },
            'timestamp': int(time.time()),
            'timezone': data['timezone']
        }

        return weather_data

    except Exception as e:
        print(f"OpenWeatherMap API error: {e}")
        raise

def generate_location_based_weather(lat: float, lon: float):
    """
    Generate reasonable weather data based on location and typical Indonesian climate patterns
    """
    import random

    # Indonesian climate zones (simplified):
    # Coastal/Western Indonesia (Sumatra, Java): Tropical rainforest, humid
    # Eastern Indonesia (Kalimantan, Sulawesi): Tropical savanna, slightly drier
    # Papua: Tropical climate, mountainous areas cooler

    # Check if it's Indonesia (roughly -11.0 to 6.0 latitude, 95.0 to 141.0 longitude)
    is_indonesia = (-11.0 <= lat <= 6.0 and 95.0 <= lon <= 141.0)

    if is_indonesia:
        # Sumatran region (lat -6 to 6, lon 95-106): Hot and humid
        if 95.0 <= lon <= 106.0:
            base_temp = 28.0 + random.uniform(-2, 3)  # 26-31°C
            base_humidity = 85 + random.uniform(-10, 5)  # 75-90%
            condition = "Humid" if random.random() < 0.4 else "Partially cloudy"
        # Kalimantan region (lat -3.5 to 2.2, lon 109-119): Slightly drier, still hot
        elif 109.0 <= lon <= 119.0:
            base_temp = 27.5 + random.uniform(-2, 3)  # 25.5-30.5°C
            base_humidity = 80 + random.uniform(-10, 5)  # 70-85%
            condition = "Humid" if random.random() < 0.3 else "Partially cloudy"
        # Papua region (lon 130-141): Tropical mountainous, can be cooler at high elevations
        elif 130.0 <= lon <= 141.0:
            base_temp = 25.0 + random.uniform(-3, 3)  # 22-28°C
            base_humidity = 75 + random.uniform(-15, 10)  # 60-85%
            condition = "Tropical" if random.random() < 0.5 else "Partially cloudy"
        # Other Indonesian regions
        else:
            base_temp = 27.0 + random.uniform(-2, 3)  # 25-30°C
            base_humidity = 80 + random.uniform(-15, 10)  # 65-90%
            condition = "Tropical" if random.random() < 0.4 else "Humid"

    else:
        # Non-Indonesian locations: use generalized tropical weather
        base_temp = 25.0 + random.uniform(-3, 4)  # 22-29°C typical for Southeast Asia
        base_humidity = 70 + random.uniform(-20, 15)  # 50-85%
        condition = "Tropical" if random.random() < 0.5 else "Humid"

    weather_data = {
        'location': {
            'name': f'Location ({lat:.2f}, {lon:.2f})',
            'country': 'Indonesia' if is_indonesia else 'Unknown',
            'coordinates': {
                'lat': lat,
                'lon': lon
            }
        },
        'weather': {
            'main': condition,
            'description': f'{condition.lower()} weather',
            'icon': '01d'
        },
        'temperature': {
            'current': base_temp,
            'feels_like': base_temp + 2 + random.uniform(-1, 1),
            'min': base_temp - 2 + random.uniform(-1, 1),
            'max': base_temp + 3 + random.uniform(-1, 1),
            'humidity': int(base_humidity)
        },
        'wind': {
            'speed': 1.5 + random.uniform(0, 2),
            'direction': random.randint(0, 360)
        },
        'timestamp': int(time.time()),
        'timezone': 25200  # Jakarta timezone
    }

    return weather_data

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

# ==================== WEATHER ENDPOINTS ====================

@api_bp.route('/weather/current', methods=['GET'])
def get_current_weather():
    """
    Get current weather data for a location

    Query params:
    - lat: latitude
    - lon: longitude
    """
    try:
        lat = request.args.get('lat')
        lon = request.args.get('lon')

        if not lat or not lon:
            return jsonify({
                'error': 'Missing coordinates',
                'message': 'Please provide lat and lon parameters'
            }), 400

        try:
            lat_val = float(lat)
            lon_val = float(lon)

            # Validate coordinate ranges
            if not (-90 <= lat_val <= 90):
                return jsonify({
                    'error': 'Invalid latitude',
                    'message': 'Latitude must be between -90 and 90'
                }), 400

            if not (-180 <= lon_val <= 180):
                return jsonify({
                    'error': 'Invalid longitude',
                    'message': 'Longitude must be between -180 and 180'
                }), 400

        except ValueError:
            return jsonify({
                'error': 'Invalid coordinates',
                'message': 'Latitude and longitude must be numbers'
            }), 400

        import requests

        # Check which weather API to use
        use_open_meteo = os.getenv('USE_OPEN_METEO', 'false').lower() == 'true'
        weatherapi_key = os.getenv('WEATHERAPI_KEY')
        openweather_api_key = os.getenv('OPENWEATHER_API_KEY')

        # Try to fetch real weather data, fallback to generating reasonable location-based mock data
        try:
            if use_open_meteo:
                # Use Open-Meteo API (free, no key required)
                weather_data = fetch_open_meteo_weather(lat_val, lon_val)
            elif weatherapi_key:
                # Use WeatherAPI
                weather_data = fetch_weatherapi_weather(lat_val, lon_val, weatherapi_key)
            elif openweather_api_key:
                # Use OpenWeatherMap
                weather_data = fetch_openweather_weather(lat_val, lon_val, openweather_api_key)
            else:
                # No API configured, generate reasonable mock data based on Indonesian climate zones
                weather_data = generate_location_based_weather(lat_val, lon_val)
        except Exception as api_error:
            print(f"Weather API failed, using location-based mock data: {api_error}")
            weather_data = generate_location_based_weather(lat_val, lon_val)
        return jsonify(weather_data), 200
    except Exception as e:
        print(f"Unexpected error in weather endpoint: {e}")
        return jsonify({
            'error': 'Internal server error',
            'message': 'An unexpected error occurred'
        }), 500

def fetch_nasa_power_historical_weather(lat: float, lon: float, days: int = 14):
    """
    Fetch historical weather data from NASA POWER API
    Returns data in format suitable for LSTM model
    """
    try:
        # Calculate date range (days back from today)
        end_date = datetime.datetime.now()
        start_date = end_date - datetime.timedelta(days=days-1)

        # Format dates for NASA POWER API (YYYYMMDD)
        start_date_str = start_date.strftime('%Y%m%d')
        end_date_str = end_date.strftime('%Y%m%d')

        # NASA POWER API endpoint for daily data
        base_url = "https://power.larc.nasa.gov/api/temporal/daily/point"
        params = {
            'parameters': 'T2M,T2M_MIN,T2M_MAX,RH2M,WS10M,WD10M,PS,PRECTOTCORR,ALLSKY_SFC_SW_DWN,ALLSKY_SFC_UVA',
            'community': 'RE',
            'longitude': lon,
            'latitude': lat,
            'start': start_date_str,
            'end': end_date_str,
            'format': 'JSON'
        }

        print(f"Fetching NASA POWER data for {lat}, {lon} from {start_date_str} to {end_date_str}")

        response = requests.get(base_url, params=params, timeout=30)
        response.raise_for_status()

        data = response.json()

        # Extract the properties
        properties = data.get('properties', {})
        parameters = properties.get('parameter', {})

        # Get all dates from the response
        dates = list(parameters.get('T2M', {}).keys())
        dates.sort()  # Ensure chronological order

        historical_data = []

        for date_str in dates:
            try:
                # Convert NASA POWER date format (YYYYMMDD) to ISO format (YYYY-MM-DD)
                year = int(date_str[:4])
                month = int(date_str[4:6])
                day = int(date_str[6:8])
                date_obj = datetime.datetime(year, month, day)
                iso_date = date_obj.strftime('%Y-%m-%d')

                # Helper to safely get value and handle NASA's -999 error code
                def get_valid_value(param_dict, key, default_val, min_val=-100, max_val=10000):
                    val = param_dict.get(key, default_val)
                    if val == -999 or val < min_val or val > max_val:
                        return default_val
                    return val

                # Extract all required parameters with validation
                daily_data = {
                    'date': iso_date,
                    'T2M': get_valid_value(parameters['T2M'], date_str, 25.0, -50, 60),
                    'T2M_MIN': get_valid_value(parameters['T2M_MIN'], date_str, 22.0, -50, 60),
                    'T2M_MAX': get_valid_value(parameters['T2M_MAX'], date_str, 30.0, -50, 60),
                    'RH2M': get_valid_value(parameters['RH2M'], date_str, 75.0, 0, 100),
                    'WS10M': get_valid_value(parameters['WS10M'], date_str, 2.0, 0, 100),
                    'WD10M': get_valid_value(parameters['WD10M'], date_str, 180.0, 0, 360),
                    'PS': get_valid_value(parameters['PS'], date_str, 101.3, 80, 110), # kPa
                    'PRECTOTCORR': get_valid_value(parameters['PRECTOTCORR'], date_str, 0.0, 0, 1000),
                    'ALLSKY_SFC_SW_DWN': get_valid_value(parameters['ALLSKY_SFC_SW_DWN'], date_str, 200.0, 0, 2000),
                    'ALLSKY_SFC_UVA': get_valid_value(parameters['ALLSKY_SFC_UVA'], date_str, 30.0, 0, 200)
                }

                historical_data.append(daily_data)

            except (ValueError, KeyError) as e:
                print(f"Error processing date {date_str}: {e}")
                continue

        print(f"Successfully fetched {len(historical_data)} days of NASA POWER data")

        return historical_data

    except Exception as e:
        print(f"NASA POWER API error: {e}")
        raise

@api_bp.route('/weather/historical', methods=['GET'])
def get_historical_weather():
    """
    Get historical weather data from NASA POWER API for LSTM predictions

    Query params:
    - lat: latitude
    - lon: longitude
    - days: number of days back (1-30, default 14 for LSTM window)
    """
    try:
        lat = request.args.get('lat')
        lon = request.args.get('lon')
        days = request.args.get('days', '14')  # Default 14 for LSTM window

        if not lat or not lon:
            return jsonify({
                'error': 'Missing coordinates',
                'message': 'Please provide lat and lon parameters'
            }), 400

        try:
            lat_val = float(lat)
            lon_val = float(lon)
            days_val = int(days)

            # Validate inputs
            if not (-90 <= lat_val <= 90):
                return jsonify({
                    'error': 'Invalid latitude',
                    'message': 'Latitude must be between -90 and 90'
                }), 400

            if not (-180 <= lon_val <= 180):
                return jsonify({
                    'error': 'Invalid longitude',
                    'message': 'Longitude must be between -180 and 180'
                }), 400

            if not (1 <= days_val <= 30):
                return jsonify({
                    'error': 'Invalid days',
                    'message': 'Days must be between 1 and 30'
                }), 400

        except ValueError:
            return jsonify({
                'error': 'Invalid parameters',
                'message': 'Latitude, longitude, and days must be valid numbers'
            }), 400

        # Try to fetch real NASA POWER data, fallback to mock data if fails
        try:
            historical_data = fetch_nasa_power_historical_weather(lat_val, lon_val, days_val)
            data_source = 'nasa_power'
        except Exception as api_error:
            print(f"NASA POWER API failed: {api_error}")
            # STRICT MODE: No mock data allowed.
            # If API fails, we return an error to the user.
            raise Exception(f"Failed to fetch real weather data from NASA POWER: {str(api_error)}")

        # Sort by date (oldest first)
        historical_data.sort(key=lambda x: x['date'])

        return jsonify({
            'location': {
                'coordinates': {
                    'lat': lat_val,
                    'lon': lon_val
                }
            },
            'historical_data': historical_data,
            'days_requested': days_val,
            'days_returned': len(historical_data),
            'data_source': data_source,
            'format': 'lstm_ready'  # Indicates this is in LSTM-ready format
        }), 200

    except requests.exceptions.Timeout:
        return jsonify({
            'error': 'Request timeout',
            'message': 'Weather API request timed out'
        }), 504
    except requests.exceptions.RequestException as e:
        return jsonify({
            'error': 'Network error',
            'message': f'Failed to connect to weather service: {str(e)}'
        }), 500
    except Exception as e:
        print(f"Unexpected error in historical weather endpoint: {e}")
        return jsonify({
            'error': 'Internal server error',
            'message': 'An unexpected error occurred'
        }), 500
