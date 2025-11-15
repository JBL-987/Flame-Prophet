# Flame Prophet - Wildfire Prediction System

A Flask-based backend service for wildfire risk prediction using CNN (MobileNetV2) and LSTM models. The system combines satellite imagery analysis with time series weather data to provide accurate fire risk assessments.

## 🚀 Features

- **Dual Model Architecture**: Combines CNN for image analysis and LSTM for time series prediction
- **RESTful API**: Clean, well-documented endpoints
- **File Upload Support**: Handles satellite imagery uploads
- **Real-time Processing**: Fast prediction pipeline
- **Error Handling**: Comprehensive error handling and logging
- **CORS Support**: Ready for frontend integration
- **Configurable**: Environment-based configuration

## 📁 Project Structure

```
backend/
├── app/
│   ├── __init__.py          # Flask app initialization
│   ├── config.py            # Configuration settings
│   ├── routes/
│   │   ├── __init__.py
│   │   └── predict.py       # Prediction endpoints
│   ├── services/
│   │   ├── __init__.py
│   │   └── prediction_service.py  # Core prediction logic
│   ├── utils/
│   │   ├── __init__.py
│   │   └── preprocess.py    # Data preprocessing utilities
│   └── models/              # Model files (.h5)
│       ├── mobilenetv2_cnn.h5
│       └── stacked_lstm.h5
├── requirements.txt
├── .env                     # Environment variables
└── run.py                   # Application entry point
```

## 🛠️ Installation

1. **Navigate to the backend directory:**
   ```bash
   cd backend
   ```

2. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

3. **Configure environment variables:**
   ```bash
   cp .env .env.local
   # Edit .env.local with your settings
   ```

4. **Add trained models:**
   - Place your trained `mobilenetv2_cnn.h5` in `app/models/`
   - Place your trained `stacked_lstm.h5` in `app/models/`

## 🚀 Usage

### Start the Server

```bash
python run.py
```

The server will start on `http://localhost:5000` (or the port specified in your `.env` file).

### Health Check

```bash
curl http://localhost:5000/api/health
```

### Make Predictions

```bash
curl -X POST http://localhost:5000/api/predict \
  -F "image=@satellite_image.jpg" \
  -F "temperature=25.5" \
  -F "humidity=45.0" \
  -F "hotspot_frequency=12"
```

**Response:**
```json
{
  "risk_level": "medium",
  "confidence": 0.67,
  "cnn_score": 0.72,
  "lstm_score": 0.62,
  "model_weights": {
    "cnn_weight": 0.6,
    "lstm_weight": 0.4
  }
}
```

## 📊 API Endpoints

### POST /api/predict

Main prediction endpoint that accepts satellite imagery and weather data.

**Request (multipart/form-data):**
- `image`: Satellite image file (PNG, JPG, JPEG)
- `temperature`: Temperature in Celsius (float)
- `humidity`: Humidity percentage (float)
- `hotspot_frequency`: Number of hotspots detected (integer)

**Response:**
- `risk_level`: "low", "medium", or "high"
- `confidence`: Combined confidence score (0-1)
- `cnn_score`: CNN model prediction score
- `lstm_score`: LSTM model prediction score
- `model_weights`: Weight distribution between models

### GET /api/health

Health check endpoint for monitoring service status.

**Response:**
```json
{
  "status": "healthy",
  "service": "Flame Prophet Wildfire Prediction API",
  "version": "1.0.0"
}
```

## ⚙️ Configuration

The application uses environment variables for configuration. Key settings in `.env`:

```env
# Flask Settings
FLASK_ENV=development
SECRET_KEY=your-secret-key

# Model Paths
MODEL_CNN_PATH=app/models/mobilenetv2_cnn.h5
MODEL_LSTM_PATH=app/models/stacked_lstm.h5

# Server Settings
PORT=5000

# Prediction Settings
CNN_INPUT_SIZE=224,224
LSTM_SEQUENCE_LENGTH=30
CONFIDENCE_THRESHOLD=0.5
```

## 🔧 Model Requirements

### CNN Model (MobileNetV2)
- **Input Shape**: (224, 224, 3)
- **Output**: Binary classification probability
- **Architecture**: MobileNetV2 base with custom classification head
- **Training Data**: Satellite imagery with fire/non-fire labels

### LSTM Model
- **Input Shape**: (1, 30, 3) - (batch_size, sequence_length, features)
- **Features**: temperature, humidity, hotspot_frequency
- **Output**: Binary classification probability
- **Architecture**: Stacked LSTM layers with dense output

## 🛠️ Development

### Project Structure Details

- **`run.py`**: Application entry point
- **`app/__init__.py`**: Flask app factory and blueprint registration
- **`app/config.py`**: Configuration management
- **`app/routes/predict.py`**: API endpoints with validation
- **`app/services/prediction_service.py`**: Core prediction logic
- **`app/utils/preprocess.py`**: Data preprocessing utilities

### Key Components

1. **Prediction Service**: Loads and manages ML models
2. **Preprocessing Pipeline**: Handles image and time series data
3. **Combined Prediction**: Weighted ensemble of CNN and LSTM outputs
4. **Error Handling**: Comprehensive logging and error management

## 🔒 Error Handling

The API includes comprehensive error handling:

- **400 Bad Request**: Invalid input data or missing files
- **500 Internal Server Error**: Model loading or prediction failures
- **File Validation**: Image format and size validation
- **Data Validation**: Input parameter range checking

## 📈 Risk Levels

The system classifies wildfire risk into three levels:

- **Low**: Confidence < 0.4
- **Medium**: 0.4 ≤ Confidence < 0.7
- **High**: Confidence ≥ 0.7

## 🚀 Deployment

For production deployment:

1. Set `FLASK_ENV=production` in your environment
2. Update `SECRET_KEY` with a secure random key
3. Configure proper model paths
4. Set up a production WSGI server (e.g., Gunicorn)
5. Configure logging and monitoring

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:
- Check the API documentation
- Review the error logs in the console
- Ensure models are properly trained and placed in the correct directory
- Verify all dependencies are installed correctly

---

**Note**: This is a template implementation. Replace the placeholder model files with your trained models for actual wildfire prediction functionality.
