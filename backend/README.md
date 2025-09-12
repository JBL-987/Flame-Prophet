# Flame Prophet Backend Template

Basic Flask template for ML project - Clean starting point for your API.

## 🚀 Quick Start

### 1. Setup Environment
```bash
# Create virtual environment
python -m venv venv

# Activate (Windows)
venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

### 2. Configure
```bash
# Copy template
cp .env.example .env

# Edit .env with your settings
FLASK_DEBUG=True
SECRET_KEY=your-secret-key-here
```

### 3. Run
```bash
# Start the server
python app.py

# Visit: http://localhost:5000
```

## 📁 Project Structure

```
backend/
├── app.py                 # Main Flask application
├── requirements.txt       # Python dependencies
├── .env.example          # Environment template
└── ml/                   # ML modules (ready for your models)
    ├── __init__.py
    ├── model_loader.py      # Model loading utilities
    └── prediction_service.py # Prediction handling
```

## 🛠 Adding Your ML Code

The template is ready for your ML models. Here's where to add your code:

### 1. In `app.py` - Add API Endpoints
```python
@app.route('/api/predict', methods=['POST'])
def predict():
    data = request.get_json()
    # Your ML prediction logic here
    result = your_ml_function(data)
    return jsonify({'prediction': result})
```

### 2. In `requirements.txt` - Add ML Libraries
```
Flask==2.3.3
Flask-CORS==4.0.0
python-dotenv==1.0.0
scikit-learn==1.3.0
pandas==2.0.3
numpy==1.24.3
```

### 3. Use ML Modules in `ml/` Folder
- `model_loader.py` - Load your trained models
- `prediction_service.py` - Handle predictions
- Place your model files in `models/` directory

## 📡 API Examples

### Current Endpoints
- `GET /` - Hello world (test endpoint)

### Add Your Endpoints Here
```python
# Classification prediction
@app.route('/api/classify', methods=['POST'])
def classify():
    data = request.get_json()
    prediction = your_classifier.predict([data['features']])
    return jsonify({'result': prediction.tolist()})

# Regression prediction
@app.route('/api/regress', methods=['POST'])
def regress():
    data = request.get_json()
    prediction = your_regressor.predict([data['features']])
    return jsonify({'value': prediction[0]})
```

## 🧪 Testing Your API

```bash
# Test basic endpoint
curl http://localhost:5000/

# Test your ML endpoint (after you add it)
curl -X POST http://localhost:5000/api/predict \
  -H "Content-Type: application/json" \
  -d '{"data": [1,2,3,4,5]}'
```

## 🔧 Configuration

### Environment Variables
- `FLASK_DEBUG` - Enable debug mode
- `SECRET_KEY` - Flask secret key
- `FLASK_PORT` - Server port (optional)

### CORS
Already configured for frontend on `localhost:3000`

## 📚 Next Steps

1. **Add your ML models** to the `ml/` folder
2. **Create API endpoints** for your specific use case
3. **Add authentication** if needed (integrate with frontend auth)
4. **Add database connections** for data persistence
5. **Add logging** for production monitoring
6. **Add tests** for your API endpoints

## 🎯 Template Features

- ✅ Basic Flask setup
- ✅ CORS configured for frontend
- ✅ Environment variable support
- ✅ ML folder structure ready
- ✅ Error handling ready
- ✅ Debug mode enabled
- ✅ Easy to extend

This is a clean, minimal template - perfect starting point for your ML project! 🚀
