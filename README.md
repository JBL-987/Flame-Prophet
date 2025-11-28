# Flame Prophet - Forest Fire Prediction System

## BINUS University Assurance of Learning Project

**Course:** Artificial Intelligence (COMP6853004)  
**Institution:** BINUS University  
**Project Type:** Assurance of Learning - Comprehensive AI Implementation

---

## Project Overview

Flame Prophet is an educational project developed as part of the Artificial Intelligence course at BINUS University. This comprehensive system demonstrates practical application of machine learning and data science concepts to address real-world environmental challenges - specifically forest fire prediction and prevention in Indonesia.

The project serves as an Assurance of Learning initiative, showcasing students' ability to integrate advanced technologies, implement complex algorithms, and deliver production-ready AI solutions.

---

## Learning Objectives

This project demonstrates mastery of:

- **Machine Learning Implementation**: LSTM neural networks, CNN models, and ensemble methods
- **Full-Stack Development**: Modern web technologies and scalable architecture
- **Data Engineering**: ETL pipelines, API integration, and real-time data processing
- **Geospatial Analysis**: Coordinate systems, mapping technologies, and spatial algorithms
- **Production Deployment**: Containerization, environment management, and DevOps practices

---

## System Architecture

### Frontend (Next.js + React + TypeScript)
- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript for type safety
- **Styling**: Tailwind CSS with custom animations
- **Mapping**: OpenStreetMap integration with Leaflet
- **State Management**: React hooks and context API
- **UI Components**: Custom component library with shadcn/ui

### Backend (Python + Flask)
- **Framework**: Flask with RESTful API design
- **Language**: Python 3.11+
- **ML Framework**: TensorFlow/Keras for model inference
- **Data Processing**: NumPy, Pandas for data manipulation
- **API Integration**: NASA POWER API, OpenWeatherMap

### Machine Learning Models
- **LSTM Network**: Time series forecasting for temperature prediction
- **CNN Model**: Satellite image classification for fire detection
- **Ensemble Methods**: Combined prediction algorithms
- **Data Sources**: NASA POWER meteorological data, satellite imagery

---

## Key Features

### AI-Powered Fire Prediction
- **Real-time Analysis**: Live satellite imagery processing
- **Weather Integration**: Meteorological data from NASA POWER API
- **Predictive Modeling**: 7-day temperature forecasting with LSTM
- **Risk Assessment**: Dynamic fire risk calculation

### Interactive Geospatial Platform
- **Map Visualization**: Interactive maps with fire hotspots
- **Location Intelligence**: GPS-based location analysis
- **Data Overlay**: Historical fire patterns and predictions
- **Responsive Design**: Mobile and desktop optimized

### Advanced Analytics Dashboard
- **Real-time Monitoring**: Live data streams and updates
- **Historical Analysis**: Trend analysis and pattern recognition
- **Weather Forecasting**: AI-powered meteorological predictions
- **Alert System**: Automated notifications and warnings

---

## Technology Stack

### Core Technologies
- **Frontend**: Next.js, React, TypeScript, Tailwind CSS
- **Backend**: Python, Flask, TensorFlow
- **Deployment**: Docker, Vercel, cloud infrastructure

### Machine Learning & Data Science
- **Deep Learning**: TensorFlow, Keras
- **Data Processing**: NumPy, Pandas, Scikit-learn
- **Geospatial**: GeoPandas, Folium
- **Visualization**: Matplotlib, Plotly

---

## Data Sources & APIs

- **NASA POWER API**: Meteorological and climatic data
- **OpenWeatherMap**: Current weather conditions
- **Satellite Imagery**: Remote sensing data for fire detection
- **Geospatial Data**: Coordinate systems and mapping data
- **Historical Records**: Past fire incidents and weather patterns

---

## Installation & Setup

### Prerequisites
- Node.js 18+
- Python 3.11+
- Git

### Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

### Backend Setup
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
python main.py
```

### Environment Variables
Create `.env` files in both frontend and backend directories:

```bash
# Backend .env
MODEL_LSTM_PATH=ai/lstm.h5
MODEL_CNN_PATH=ai/cnn.h5
MODEL_SCALER_PATH=ai/scaler.joblib

# Frontend .env.local
NEXT_PUBLIC_API_URL=http://localhost:5000/api
NEXT_PUBLIC_BACKEND_URL=http://localhost:5000
```

---

## Machine Learning Models

### LSTM Temperature Prediction
- **Architecture**: Bidirectional LSTM with attention mechanism
- **Input**: 7 days of meteorological data (10 features each)
- **Output**: Next-day temperature prediction
- **Training Data**: Historical weather patterns from NASA POWER
- **Accuracy**: RMSE < 2.0°C on validation set

### CNN Fire Detection
- **Architecture**: ResNet-based convolutional network
- **Input**: Satellite imagery (224x224 RGB)
- **Output**: Binary classification (fire/no-fire)
- **Training Data**: Labeled satellite images
- **Accuracy**: F1-score > 0.85 on test set

---

## Educational Value

This project demonstrates:

1. **End-to-End AI Development**: From data collection to model deployment
2. **Real-World Problem Solving**: Applying AI to environmental challenges
3. **Modern Development Practices**: Full-stack development with best practices
4. **Team Collaboration**: Version control, code review, and project management
5. **Production-Ready Code**: Scalable architecture and error handling

---

## Course Alignment

**COMP6853004 - Artificial Intelligence**

This project covers all major topics in the AI curriculum:
- Machine Learning algorithms and implementation
- Deep Learning with neural networks
- Data preprocessing and feature engineering
- Model evaluation and validation
- Real-world AI application development
- Ethical considerations in AI deployment

---

## Team & Contributors

This project was developed by BINUS University students as part of the Artificial Intelligence course assessment. The implementation demonstrates practical skills in AI development, software engineering, and collaborative problem-solving.

---

## License

This educational project is developed for academic purposes as part of BINUS University's Artificial Intelligence course curriculum.

---

## Acknowledgments

- **BINUS University** for providing the educational framework
- **NASA POWER** for weather data access
- **Kaggle** for fire monitoring dataset
- **Open-source Community** for development tools and libraries
- **Environmental Agencies** for fire monitoring data and insights

---

*This project represents the culmination of theoretical AI knowledge applied to practical environmental monitoring and prediction systems.*
