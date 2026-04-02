/**
 * Python ML Service Client
 * Communicates with Python ML microservice
 */

// Use global fetch (Node 18+)
const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8001';

interface MLPrediction {
  match: boolean;
  confidence: number;
  probability: number;
}

interface MLTrainingData {
  invoiceFeatures: Record<string, any>;
  productFeatures: Record<string, any>;
  label: number;
  confidence: number;
}

export class MLServiceClient {
  private baseUrl: string;

  constructor(baseUrl: string = ML_SERVICE_URL) {
    this.baseUrl = baseUrl;
  }

  /**
   * Check if ML service is healthy
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/health`);
      const data = await response.json();
      return data.status === 'healthy';
    } catch (error) {
      console.error('[ML Service] Health check failed:', error);
      return false;
    }
  }
}

// Singleton instance
export const mlService = new MLServiceClient();
