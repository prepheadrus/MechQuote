/**
 * ML Service Manager
 * Automatically starts/stops Python ML service
 * Runs in background with Node.js
 */

import { spawn, ChildProcess } from 'child_process';
import { existsSync } from 'fs';
import { join } from 'path';

export interface MLServiceStatus {
  running: boolean;
  url: string;
  pid?: number;
  error?: string;
}

export class MLServiceManager {
  private pythonProcess: ChildProcess | null = null;
  private status: MLServiceStatus = {
    running: false,
    url: process.env.ML_SERVICE_URL || 'http://localhost:8001'  // Changed to 8001
  };
  private checkInterval: NodeJS.Timeout | null = null;

  /**
   * Start Python ML service automatically
   */
  async startMLService(): Promise<boolean> {
    console.log('[ML Service] Starting Python ML service...');

    // Check if already running
    if (this.status.running) {
      console.log('[ML Service] Already running');
      return true;
    }

    // Check if Python is available
    const pythonAvailable = await this.checkPython();
    if (!pythonAvailable) {
      console.warn('[ML Service] Python not found, using fallback (rule-based)');
      this.status.error = 'Python not installed';
      return false;
    }

    // Check if ML service directory exists
    const mlServicePath = join(process.cwd(), 'python-ml-service', 'main.py');
    if (!existsSync(mlServicePath)) {
      console.warn('[ML Service] ML service not found, using fallback');
      this.status.error = 'ML service not found';
      return false;
    }

    // Check if port 8001 is already in use
    const portInUse = await this.checkPort(8001);
    if (portInUse) {
      console.log('[ML Service] Port 8001 in use, checking if service is healthy...');
      // Actually check if the service is responding
      const isHealthy = await this.checkHealth();
      if (isHealthy) {
        console.log('[ML Service] Service already running and healthy');
        this.status.running = true;
        this.status.error = undefined;
        this.startHealthCheck();
        return true;
      } else {
        console.log('[ML Service] Port 8001 in use but service not responding, killing old process...');
        // Kill the process using port 8001
        await this.killPortProcess(8001);
        // Wait a bit for port to be freed
        console.log('[ML Service] Waiting 3 seconds for port to be freed...');
        await new Promise(resolve => setTimeout(resolve, 3000));

        // Check again
        const stillInUse = await this.checkPort(8001);
        if (stillInUse) {
          console.warn('[ML Service] Port 8001 still in use after cleanup, using fallback (rule-based)');
          this.status.error = 'Port 8001 blocked by another process';
          return false;
        }
      }
    }

    try {
      // Start Python process
      this.pythonProcess = spawn('python', [mlServicePath], {
        cwd: join(process.cwd(), 'python-ml-service'),
        detached: false,
        stdio: ['ignore', 'pipe', 'pipe']
      });

      this.pythonProcess.stdout?.on('data', (data) => {
        console.log(`[ML Service] ${data.toString().trim()}`);
      });

      this.pythonProcess.stderr?.on('data', (data) => {
        console.error(`[ML Service Error] ${data.toString().trim()}`);
      });

      this.pythonProcess.on('close', (code) => {
        console.log(`[ML Service] Process exited with code ${code}`);
        this.status.running = false;
        this.stopHealthCheck();
      });

      // Wait for service to start
      await this.waitForService();

      // Start health check
      this.startHealthCheck();

      console.log('[ML Service] Started successfully');
      return true;

    } catch (error) {
      console.error('[ML Service] Failed to start:', error);
      this.status.error = error instanceof Error ? error.message : 'Unknown error';
      return false;
    }
  }

  /**
   * Check if port is in use
   */
  private async checkPort(port: number): Promise<boolean> {
    return new Promise((resolve) => {
      const { exec } = require('child_process');
      exec(`netstat -ano | findstr :${port}`, (error: any, stdout: string) => {
        resolve(!error && stdout.trim().length > 0);
      });
    });
  }

  /**
   * Check if ML service is healthy
   */
  private async checkHealth(): Promise<boolean> {
    try {
      const fetch = require('node-fetch');
      const response = await fetch(`${this.status.url}/health`, {
        method: 'GET',
        timeout: 2000
      });
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  /**
   * Kill process using a specific port (Windows only)
   */
  private async killPortProcess(port: number): Promise<void> {
    return new Promise((resolve) => {
      const { exec } = require('child_process');

      // Find PID using the port
      exec(`netstat -ano | findstr :${port}`, (error: any, stdout: string) => {
        if (error || !stdout.trim()) {
          console.log(`[ML Service] No process found on port ${port}`);
          resolve();
          return;
        }

        // Parse PID from output
        const match = stdout.match(/LISTENING\s+(\d+)/);
        if (!match) {
          console.log(`[ML Service] Could not find PID for port ${port}`);
          resolve();
          return;
        }

        const pid = match[1];
        console.log(`[ML Service] Killing process ${pid} on port ${port}...`);

        // Kill the process
        exec(`taskkill /F /PID ${pid}`, (killError: any) => {
          if (killError) {
            console.error(`[ML Service] Failed to kill process ${pid}:`, killError.message);
          } else {
            console.log(`[ML Service] Process ${pid} killed successfully`);
          }
          resolve();
        });
      });
    });
  }

  /**
   * Stop Python ML service
   */
  async stopMLService(): Promise<void> {
    console.log('[ML Service] Stopping...');

    if (this.pythonProcess) {
      this.pythonProcess.kill('SIGTERM');
      this.pythonProcess = null;
    }

    this.status.running = false;
    this.stopHealthCheck();

    console.log('[ML Service] Stopped');
  }

  /**
   * Get current status
   */
  getStatus(): MLServiceStatus {
    return { ...this.status };
  }

  /**
   * Check if Python is available
   */
  private async checkPython(): Promise<boolean> {
    return new Promise((resolve) => {
      const { exec } = require('child_process');
      exec('python --version', (error: any) => {
        resolve(!error);
      });
    });
  }

  /**
   * Wait for ML service to be ready
   */
  private async waitForService(maxAttempts = 30): Promise<boolean> {
    const fetch = require('node-fetch');

    for (let i = 0; i < maxAttempts; i++) {
      try {
        const response = await fetch(`${this.status.url}/health`, {
          method: 'GET',
          timeout: 2000
        });

        if (response.ok) {
          this.status.running = true;
          console.log('[ML Service] Service is ready');
          return true;
        }
      } catch (error) {
        // Service not ready yet, wait and retry
      }

      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.error('[ML Service] Failed to start after 30 seconds');
    return false;
  }

  /**
   * Start health check interval
   */
  private startHealthCheck() {
    const fetch = require('node-fetch');

    this.checkInterval = setInterval(async () => {
      try {
        const response = await fetch(`${this.status.url}/health`, {
          method: 'GET',
          timeout: 2000
        });

        if (response.ok) {
          this.status.running = true;
          this.status.error = undefined;
        } else {
          this.status.running = false;
        }
      } catch (error) {
        this.status.running = false;
        this.status.error = 'Service not responding';
      }
    }, 10000); // Check every 10 seconds
  }

  /**
   * Stop health check interval
   */
  private stopHealthCheck() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  /**
   * Cleanup on app exit
   */
  async cleanup() {
    console.log('[ML Service] Cleaning up...');
    await this.stopMLService();
  }
}

// Singleton instance
export const mlServiceManager = new MLServiceManager();

// Auto-start on module load (for development)
if (process.env.NODE_ENV === 'development' || process.env.AUTO_START_ML === 'true') {
  mlServiceManager.startMLService().catch(console.error);
}

// Cleanup on process exit
process.on('exit', () => {
  mlServiceManager.cleanup();
});

process.on('SIGINT', () => {
  mlServiceManager.cleanup();
  process.exit();
});

process.on('SIGTERM', () => {
  mlServiceManager.cleanup();
  process.exit();
});
