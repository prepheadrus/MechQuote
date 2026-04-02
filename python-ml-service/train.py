"""
MechQuote ML Training Script
Load data from CSV and train the model
"""

import pandas as pd
import requests
import json
from pathlib import Path

# Configuration
ML_SERVICE_URL = "http://localhost:8000"
CSV_PATH = Path(__file__).parent.parent / "ml-data" / "training_dataset.csv"

def load_training_data():
    """Load training data from CSV"""
    print(f"📊 Loading training data from {CSV_PATH}...")
    
    if not CSV_PATH.exists():
        print(f"❌ CSV file not found: {CSV_PATH}")
        return []
    
    df = pd.read_csv(CSV_PATH)
    print(f"✅ Loaded {len(df)} samples")
    
    return df

def prepare_training_sample(row):
    """Prepare a single training sample"""
    invoice_features = {
        'nameLength': row['invoice_name_length'],
        'wordCount': row['invoice_word_count'],
        'hasNumbers': bool(row['invoice_has_brand']),  # Approximation
        'hasSpecialChars': False,
        'brandConfidence': 1.0 if row['invoice_has_brand'] else 0.0,
        'hasDimensions': bool(row['invoice_has_dimensions']),
        'hasSize': False,
        'hasPressure': False,
        'hasMaterial': False,
        'hasCode': bool(row['invoice_has_code']),
        'numericValues': []
    }
    
    product_features = {
        'nameLength': row['product_name_length'],
        'wordCount': row['product_word_count'],
        'hasNumbers': bool(row['product_has_brand']),
        'hasSpecialChars': False,
        'brandConfidence': 1.0 if row['product_has_brand'] else 0.0,
        'hasDimensions': bool(row['product_has_dimensions']),
        'hasSize': False,
        'hasPressure': False,
        'hasMaterial': False,
        'hasCode': bool(row['product_has_code']),
        'numericValues': []
    }
    
    return {
        'invoiceFeatures': invoice_features,
        'productFeatures': product_features,
        'label': int(row['label']),
        'confidence': float(row['confidence'])
    }

def train_model(samples):
    """Send training data to ML service"""
    print(f"\n🤖 Training model with {len(samples)} samples...")
    
    try:
        response = requests.post(
            f"{ML_SERVICE_URL}/train",
            json=samples,
            timeout=60
        )
        
        if response.ok:
            result = response.json()
            print(f"✅ Training successful!")
            print(f"   Accuracy: {result.get('accuracy', 'N/A')}")
            return True
        else:
            print(f"❌ Training failed: {response.status_code}")
            print(f"   {response.text}")
            return False
    
    except requests.exceptions.ConnectionError:
        print("❌ ML Service not running! Start it first:")
        print("   cd python-ml-service")
        print("   python -m uvicorn main:app --port 8000")
        return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def main():
    print("=" * 60)
    print("MechQuote ML Training Script")
    print("=" * 60)
    print()
    
    # Load data
    df = load_training_data()
    
    if len(df) == 0:
        print("\n❌ No training data found!")
        print("   Please run collect-training-data.ts first")
        return
    
    # Prepare samples
    samples = [prepare_training_sample(row) for _, row in df.iterrows()]
    
    # Train model
    success = train_model(samples)
    
    if success:
        print("\n✅ Model training complete!")
        print("\nNext steps:")
        print("1. Test prediction: POST /match")
        print("2. Integrate with Node.js")
    else:
        print("\n❌ Training failed!")
        print("   Make sure ML service is running:")
        print("   python -m uvicorn main:app --port 8000")

if __name__ == "__main__":
    main()
