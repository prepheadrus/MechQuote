# MechQuote Python ML Service

Enterprise ML Microservice for Product Matching

## 🚀 Quick Start

### 1. Start Service

**Windows:**
```bash
baslat.bat
```

**Manual:**
```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

### 2. Test Service

**Browser:** http://localhost:8000

**Health Check:**
```bash
curl http://localhost:8000/health
```

**API Docs:** http://localhost:8000/docs

## 📊 API Endpoints

- `GET /` - Service info
- `GET /health` - Health check
- `POST /match` - Predict match
- `POST /train` - Train model
- `POST /load-model` - Load from disk
- `GET /model-info` - Model details

## 🔧 Configuration

**Environment Variables:**
```bash
ML_SERVICE_URL=http://localhost:8000
```

## 📝 Example Usage

### Predict Match

```bash
curl -X POST http://localhost:8000/match \
  -H "Content-Type: application/json" \
  -d '{
    "invoiceItemName": "125*45 FIRAT PVC DIRSEK",
    "invoiceFeatures": {...},
    "productName": "125*45 PVC Yeni Residence Acik Dirsek",
    "productFeatures": {...}
  }'
```

### Train Model

```bash
curl -X POST http://localhost:8000/train \
  -H "Content-Type: application/json" \
  -d '[
    {
      "invoiceFeatures": {...},
      "productFeatures": {...},
      "label": 1,
      "confidence": 0.95
    }
  ]'
```

## 🏗️ Architecture

```
Node.js (Frontend/API)
         ↓ HTTP
Python ML Service (FastAPI)
         ↓
RandomForest Classifier
         ↓
Model (.pkl files)
```

## 📦 Dependencies

- FastAPI 0.109.0
- Uvicorn 0.27.0
- scikit-learn 1.3.0
- pandas 2.0.3
- numpy 1.24.3
- joblib 1.3.1

## 🎯 Features

- ✅ RandomForest Classifier (100 trees)
- ✅ 25 features (invoice + product + similarity)
- ✅ StandardScaler normalization
- ✅ Train/test split (80/20)
- ✅ Model persistence (joblib)
- ✅ CORS support
- ✅ Auto-reload for development
- ✅ Fallback to rule-based

## 📊 Model Details

**Features (25 total):**
- Invoice features (12)
- Product features (12)
- Similarity score (1)

**Algorithm:** RandomForestClassifier
- n_estimators: 100
- max_depth: 10
- random_state: 42
- class_weight: 'balanced'

## 🔍 Development

**Test:**
```bash
python -c "from main import app; print('OK')"
```

**Run:**
```bash
uvicorn main:app --reload
```

**Docs:** http://localhost:8000/docs

## 📞 Contact

**Project:** MechQuote ERP  
**Version:** 1.0.0 (ML Service)  
**Date:** 22 Şubat 2026
