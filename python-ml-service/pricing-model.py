"""
MechQuote ML Service - Pricing Model
Predicts optimal product pricing based on features
"""

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestRegressor
from sklearn.preprocessing import StandardScaler
import joblib
from pathlib import Path

# ============================================================================
# CONFIGURATION
# ============================================================================

app = FastAPI(
    title="MechQuote ML Service - Pricing Model",
    description="Predicts optimal product pricing",
    version="1.0.0"
)

MODEL_DIR = Path(__file__).parent / "ml-models"
MODEL_DIR.mkdir(exist_ok=True)

PRICING_MODEL_PATH = MODEL_DIR / "pricing-model.pkl"
SCALER_PATH = MODEL_DIR / "pricing-scaler.pkl"

# ============================================================================
# DATA MODELS
# ============================================================================

class PricingFeatures(BaseModel):
    productName: str
    category: Optional[str] = None
    brand: Optional[str] = None
    unitPrice: Optional[float] = None
    quantity: Optional[int] = None
    customerType: Optional[str] = None  # 'retail', 'wholesale', 'contractor'
    region: Optional[str] = None  # 'istanbul', 'ankara', 'izmir', etc.
    season: Optional[str] = None  # 'winter', 'spring', 'summer', 'fall'
    competitorPrice: Optional[float] = None

class PricingPrediction(BaseModel):
    predictedPrice: float
    confidence: float
    minPrice: float
    maxPrice: float
    recommendation: str

# ============================================================================
# FEATURE ENGINEERING
# ============================================================================

def extract_pricing_features(data: Dict[str, Any]) -> np.ndarray:
    """Extract features for pricing prediction"""
    
    # Text features
    name_length = len(data.get('productName', ''))
    word_count = len(data.get('productName', '').split())
    
    # Category encoding
    category_map = {
        'hvac': 0, 'plumbing': 1, 'electrical': 2,
        'valves': 3, 'pipes': 4, 'fittings': 5, 'other': 6
    }
    category = data.get('category', 'other').lower()
    category_encoded = category_map.get(category, 6)
    
    # Brand encoding
    brand_map = {
        'firat': 0, 'vesbo': 1, 'pilsa': 2, 'grundfos': 3,
        'wilo': 4, 'bosch': 5, 'vaillant': 6, 'other': 7
    }
    brand = data.get('brand', 'other').lower()
    brand_encoded = brand_map.get(brand, 7)
    
    # Numeric features
    unit_price = data.get('unitPrice', 0.0) or 0.0
    quantity = data.get('quantity', 1) or 1
    competitor_price = data.get('competitorPrice', 0.0) or 0.0
    
    # Customer type encoding
    customer_map = {'retail': 0, 'wholesale': 1, 'contractor': 2}
    customer_encoded = customer_map.get(data.get('customerType', 'retail').lower(), 0)
    
    # Region encoding
    region_map = {'istanbul': 0, 'ankara': 1, 'izmir': 2, 'other': 3}
    region_encoded = region_map.get(data.get('region', 'other').lower(), 3)
    
    # Season encoding
    season_map = {'winter': 0, 'spring': 1, 'summer': 2, 'fall': 3}
    season_encoded = season_map.get(data.get('season', 'spring').lower(), 1)
    
    # Derived features
    price_per_unit = unit_price / quantity if quantity > 0 else 0.0
    has_competitor = 1.0 if competitor_price > 0 else 0.0
    price_diff = competitor_price - unit_price if competitor_price > 0 else 0.0
    
    return np.array([
        name_length,
        word_count,
        category_encoded,
        brand_encoded,
        unit_price,
        quantity,
        competitor_price,
        customer_encoded,
        region_encoded,
        season_encoded,
        price_per_unit,
        has_competitor,
        price_diff
    ], dtype=np.float64)

# ============================================================================
# ML MODEL
# ============================================================================

class PricingModel:
    def __init__(self):
        self.model = RandomForestRegressor(
            n_estimators=100,
            max_depth=15,
            random_state=42,
            n_jobs=-1
        )
        self.scaler = StandardScaler()
        self.is_trained = False
    
    def train(self, X: np.ndarray, y: np.ndarray):
        """Train the pricing model"""
        print(f"[Pricing Model] Training with {len(X)} samples...")
        
        # Scale features
        X_scaled = self.scaler.fit_transform(X)
        
        # Train
        self.model.fit(X_scaled, y)
        self.is_trained = True
        
        # Evaluate
        train_score = self.model.score(X_scaled, y)
        print(f"[Pricing Model] Training R²: {train_score:.4f}")
        
        # Save
        self.save()
    
    def predict(self, features: Dict[str, Any]) -> PricingPrediction:
        """Predict optimal price"""
        if not self.is_trained:
            # Fallback to rule-based
            unit_price = features.get('unitPrice', 100.0)
            return PricingPrediction(
                predictedPrice=unit_price,
                confidence=0.5,
                minPrice=unit_price * 0.9,
                maxPrice=unit_price * 1.1,
                recommendation="Model not trained, using current price"
            )
        
        # Extract features
        X = extract_pricing_features(features).reshape(1, -1)
        X_scaled = self.scaler.transform(X)
        
        # Predict
        predicted = self.model.predict(X_scaled)[0]
        
        # Calculate confidence based on feature importance
        confidence = min(0.95, self.model.score(X_scaled, [predicted]) if hasattr(self.model, 'score') else 0.8)
        
        # Calculate price range
        std = np.std(self.model.predict(X_scaled)) if hasattr(self.model, 'predict') else predicted * 0.1
        min_price = max(0, predicted - 1.96 * std)
        max_price = predicted + 1.96 * std
        
        # Generate recommendation
        current_price = features.get('unitPrice', 0)
        if current_price > 0:
            diff = ((predicted - current_price) / current_price) * 100
            if diff > 10:
                recommendation = f"Consider increasing price by {diff:.1f}%"
            elif diff < -10:
                recommendation = f"Consider decreasing price by {abs(diff):.1f}%"
            else:
                recommendation = "Price is optimal"
        else:
            recommendation = f"Suggested price: ₺{predicted:.2f}"
        
        return PricingPrediction(
            predictedPrice=float(predicted),
            confidence=float(confidence),
            minPrice=float(min_price),
            maxPrice=float(max_price),
            recommendation=recommendation
        )
    
    def save(self):
        """Save model to disk"""
        joblib.dump(self.model, PRICING_MODEL_PATH)
        joblib.dump(self.scaler, SCALER_PATH)
        print(f"[Pricing Model] Saved to {PRICING_MODEL_PATH}")
    
    def load(self):
        """Load model from disk"""
        if PRICING_MODEL_PATH.exists() and SCALER_PATH.exists():
            self.model = joblib.load(PRICING_MODEL_PATH)
            self.scaler = joblib.load(SCALER_PATH)
            self.is_trained = True
            print(f"[Pricing Model] Loaded from {PRICING_MODEL_PATH}")
            return True
        return False

# Global model instance
pricing_model = PricingModel()

# ============================================================================
# API ENDPOINTS
# ============================================================================

@app.get("/")
async def root():
    return {
        "service": "MechQuote ML Service - Pricing Model",
        "version": "1.0.0",
        "status": "running",
        "model_loaded": pricing_model.is_trained
    }

@app.get("/health")
async def health_check():
    return {
        "status": "healthy" if pricing_model.is_trained else "not_trained",
        "model_trained": pricing_model.is_trained
    }

@app.post("/predict", response_model=PricingPrediction)
async def predict_price(features: PricingFeatures):
    """Predict optimal price for a product"""
    try:
        prediction = pricing_model.predict(features.dict())
        return prediction
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/train")
async def train_model(training_data: List[Dict[str, Any]]):
    """Train pricing model with historical data"""
    try:
        print(f"[Pricing Model] Training with {len(training_data)} samples...")
        
        # Prepare training data
        X = []
        y = []
        
        for sample in training_data:
            features = extract_pricing_features(sample)
            X.append(features)
            y.append(sample.get('actualPrice', sample.get('unitPrice', 0)))
        
        X = np.array(X)
        y = np.array(y)
        
        # Train
        pricing_model.train(X, y)
        
        return {
            "status": "success",
            "samples": len(training_data),
            "features": X.shape[1]
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/model-info")
async def model_info():
    """Get model information"""
    return {
        "model_type": "RandomForestRegressor",
        "n_estimators": 100,
        "max_depth": 15,
        "feature_count": 13,
        "trained": pricing_model.is_trained,
        "model_path": str(PRICING_MODEL_PATH) if PRICING_MODEL_PATH.exists() else None
    }

# ============================================================================
# STARTUP
# ============================================================================

@app.on_event("startup")
async def startup_event():
    """Load model on startup"""
    print("Starting MechQuote ML Service - Pricing Model...")
    pricing_model.load()
    print("Service ready!")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8002)  # Port 8002 for Pricing Model
