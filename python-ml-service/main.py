"""
MechQuote ML Service - Matching Engine
Enterprise ML Microservice for Product Matching

Phase 1: Matching Engine (Invoice → Product)
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split
import joblib
import os
from pathlib import Path

# ============================================================================
# CONFIGURATION
# ============================================================================

app = FastAPI(
    title="MechQuote ML Service",
    description="Enterprise ML Microservice for Product Matching",
    version="1.0.0"
)

# CORS (allow Node.js frontend)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Model paths
MODEL_DIR = Path(__file__).parent / "ml-models"
MODEL_DIR.mkdir(exist_ok=True)

MATCHING_MODEL_PATH = MODEL_DIR / "matching-model.pkl"
SCALER_PATH = MODEL_DIR / "scaler.pkl"

# ============================================================================
# DATA MODELS
# ============================================================================

class ProductFeatures(BaseModel):
    name: str
    nameLength: int
    wordCount: int
    hasNumbers: bool
    hasSpecialChars: bool
    brand: Optional[str] = None
    brandConfidence: float = 0.0
    hasDimensions: bool = False
    hasSize: bool = False
    hasPressure: bool = False
    hasMaterial: bool = False
    hasCode: bool = False
    codePattern: Optional[str] = None
    numericValues: List[float] = []

class MatchingRequest(BaseModel):
    invoiceItemName: str
    invoiceFeatures: Dict[str, Any]
    productName: str
    productFeatures: Dict[str, Any]

class TrainingData(BaseModel):
    invoiceFeatures: Dict[str, Any]
    productFeatures: Dict[str, Any]
    label: int  # 1 = match, 0 = no match
    confidence: float

class PredictionResponse(BaseModel):
    match: bool
    confidence: float
    probability: float

# ============================================================================
# FEATURE ENGINEERING
# ============================================================================

KNOWN_BRANDS = [
    'GMV', 'Gree', 'Midea', 'Daikin', 'Firat', 'Vesbo', 'Pilsa',
    'Demirdöküm', 'Eca', 'Grundfos', 'Wilo', 'Bosch', 'Vaillant'
]

def extract_features(name: str) -> Dict[str, Any]:
    """Extract features from product name"""
    words = name.split()
    numbers = [int(n) for n in name.split() if n.isdigit()]
    
    # Brand detection
    brand = None
    for b in KNOWN_BRANDS:
        if b.upper() in name.upper():
            brand = b
            break
    
    # Pattern detection
    has_dimensions = bool(any(p in name for p in ['x', 'X', '*']))
    has_size = bool("'" in name or 'lik' in name.lower())
    has_pressure = bool('PN' in name.upper() or 'BAR' in name.upper())
    has_material = bool(any(m in name.lower() for m in ['çelik', 'paslanmaz', 'plastik', 'bakır', 'pvc', 'pprc']))
    
    # Code detection
    code_match = None
    import re
    code_pattern = re.search(r'[A-Z]{2,}-[A-Z0-9]+', name, re.IGNORECASE)
    if code_pattern:
        code_match = code_pattern.group()
    
    return {
        'name': name,
        'nameLength': len(name),
        'wordCount': len(words),
        'hasNumbers': len(numbers) > 0,
        'hasSpecialChars': any(c in name for c in '-+/*'),
        'brand': brand,
        'brandConfidence': 1.0 if brand else 0.0,
        'hasDimensions': has_dimensions,
        'hasSize': has_size,
        'hasPressure': has_pressure,
        'hasMaterial': has_material,
        'hasCode': code_match is not None,
        'codePattern': code_match,
        'numericValues': numbers
    }

def features_to_vector(features: Dict[str, Any]) -> np.ndarray:
    """Convert features dict to numeric vector for ML"""
    return np.array([
        features.get('nameLength', 0),
        features.get('wordCount', 0),
        1.0 if features.get('hasNumbers') else 0.0,
        1.0 if features.get('hasSpecialChars') else 0.0,
        features.get('brandConfidence', 0.0),
        1.0 if features.get('hasDimensions') else 0.0,
        1.0 if features.get('hasSize') else 0.0,
        1.0 if features.get('hasPressure') else 0.0,
        1.0 if features.get('hasMaterial') else 0.0,
        1.0 if features.get('hasCode') else 0.0,
        len(features.get('numericValues', [])),
        sum(features.get('numericValues', [0]))  # Sum of numbers
    ], dtype=np.float64)

def calculate_similarity(features1: Dict[str, Any], features2: Dict[str, Any]) -> float:
    """Calculate similarity score between two products"""
    # Brand match (critical)
    if features1.get('brand') and features2.get('brand'):
        if features1['brand'] != features2['brand']:
            return 0.0  # Different brands = no match
    
    # Feature overlap
    overlap = 0
    total = 0
    
    for key in ['hasDimensions', 'hasSize', 'hasPressure', 'hasMaterial', 'hasCode']:
        if features1.get(key) or features2.get(key):
            total += 1
            if features1.get(key) and features2.get(key):
                overlap += 1
    
    if total == 0:
        return 0.5
    
    return overlap / total

# ============================================================================
# ML MODEL
# ============================================================================

class MatchingModel:
    def __init__(self):
        self.model = RandomForestClassifier(
            n_estimators=100,
            max_depth=10,
            random_state=42,
            class_weight='balanced'
        )
        self.scaler = StandardScaler()
        self.is_trained = False
    
    def prepare_features(self, invoice_features: Dict, product_features: Dict) -> np.ndarray:
        """Prepare feature vector for prediction"""
        # Individual features
        invoice_vec = features_to_vector(invoice_features)
        product_vec = features_to_vector(product_features)
        
        # Similarity features
        similarity = calculate_similarity(invoice_features, product_features)
        
        # Combine
        combined = np.concatenate([
            invoice_vec,
            product_vec,
            [similarity]
        ])
        
        return combined
    
    def train(self, X: np.ndarray, y: np.ndarray):
        """Train the model"""
        print(f"🤖 Training model with {len(X)} samples...")
        
        # Split for validation
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42
        )
        
        # Scale features
        X_train_scaled = self.scaler.fit_transform(X_train)
        X_test_scaled = self.scaler.transform(X_test)
        
        # Train
        self.model.fit(X_train_scaled, y_train)
        
        # Evaluate
        train_score = self.model.score(X_train_scaled, y_train)
        test_score = self.model.score(X_test_scaled, y_test)
        
        print(f"✅ Training accuracy: {train_score:.4f}")
        print(f"✅ Test accuracy: {test_score:.4f}")
        
        self.is_trained = True
        
        # Save model
        self.save()
    
    def predict(self, invoice_features: Dict, product_features: Dict) -> tuple:
        """Predict if invoice item matches product"""
        if not self.is_trained:
            # Fallback to rule-based
            similarity = calculate_similarity(invoice_features, product_features)
            return similarity > 0.5, similarity
        
        # Prepare features
        X = self.prepare_features(invoice_features, product_features)
        X_scaled = self.scaler.transform([X])
        
        # Predict
        prediction = self.model.predict(X_scaled)[0]
        probability = self.model.predict_proba(X_scaled)[0][1]
        
        return prediction == 1, probability
    
    def save(self):
        """Save model to disk"""
        joblib.dump(self.model, MATCHING_MODEL_PATH)
        joblib.dump(self.scaler, SCALER_PATH)
        print(f"💾 Model saved to {MATCHING_MODEL_PATH}")
    
    def load(self):
        """Load model from disk"""
        if MATCHING_MODEL_PATH.exists() and SCALER_PATH.exists():
            self.model = joblib.load(MATCHING_MODEL_PATH)
            self.scaler = joblib.load(SCALER_PATH)
            self.is_trained = True
            print(f"📦 Model loaded from {MATCHING_MODEL_PATH}")
            return True
        return False

# Global model instance
model = MatchingModel()

# ============================================================================
# API ENDPOINTS
# ============================================================================

@app.get("/")
async def root():
    return {
        "service": "MechQuote ML Service",
        "version": "1.0.0",
        "status": "running",
        "model_loaded": model.is_trained
    }

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "model_trained": model.is_trained
    }

@app.post("/match", response_model=PredictionResponse)
async def predict_match(request: MatchingRequest):
    """
    Predict if invoice item matches product
    """
    try:
        # Predict
        match, probability = model.predict(
            request.invoiceFeatures,
            request.productFeatures
        )
        
        return PredictionResponse(
            match=match,
            confidence=probability if match else 1.0 - probability,
            probability=float(probability)
        )
    
    except Exception as e:
        # Fallback to rule-based
        similarity = calculate_similarity(
            request.invoiceFeatures,
            request.productFeatures
        )
        return PredictionResponse(
            match=similarity > 0.5,
            confidence=similarity if similarity > 0.5 else 1.0 - similarity,
            probability=float(similarity)
        )

@app.post("/train")
async def train_model(training_data: List[TrainingData]):
    """
    Train or update the model with new data
    """
    try:
        print(f"📊 Received {len(training_data)} training samples")
        
        # Prepare training data
        X = []
        y = []
        
        for sample in training_data:
            features = model.prepare_features(
                sample.invoiceFeatures,
                sample.productFeatures
            )
            X.append(features)
            y.append(sample.label)
        
        X = np.array(X)
        y = np.array(y)
        
        # Train
        model.train(X, y)
        
        return {
            "status": "success",
            "samples": len(training_data),
            "accuracy": model.model.score(model.scaler.transform(X), y)
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/load-model")
async def load_model():
    """Load trained model from disk"""
    if model.load():
        return {"status": "success", "message": "Model loaded"}
    else:
        return {"status": "not_found", "message": "No trained model found"}

@app.get("/model-info")
async def model_info():
    """Get model information"""
    return {
        "model_type": "RandomForestClassifier",
        "n_estimators": 100,
        "max_depth": 10,
        "feature_count": 25,  # 12 + 12 + 1
        "trained": model.is_trained,
        "model_path": str(MATCHING_MODEL_PATH) if MATCHING_MODEL_PATH.exists() else None
    }

# ============================================================================
# STARTUP
# ============================================================================

@app.on_event("startup")
async def startup_event():
    """Load model on startup"""
    print("Starting MechQuote ML Service...")
    model.load()
    print("Service ready!")

if __name__ == "__main__":
    import uvicorn
    # Use port 8001 instead of 8000 to avoid conflicts
    uvicorn.run(app, host="0.0.0.0", port=8001)
