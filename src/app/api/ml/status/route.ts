/**
 * ML Service API Routes
 * Next.js App Router API
 */

import { NextRequest, NextResponse } from 'next/server';
import { mlServiceManager } from '@/ml/ml-service-manager';
import { mlService } from '@/ml/ml-service-client';

/**
 * GET /api/ml/status
 * Get ML service status
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const action = searchParams.get('action');

    if (action === 'start') {
      const success = await mlServiceManager.startMLService();
      return NextResponse.json({
        success,
        status: mlServiceManager.getStatus()
      });
    }

    if (action === 'stop') {
      await mlServiceManager.stopMLService();
      return NextResponse.json({
        success: true,
        status: mlServiceManager.getStatus()
      });
    }

    // Get status from manager (which checks Python health)
    const status = mlServiceManager.getStatus();

    // Also check Python health directly
    try {
      // Use global fetch (Node 18+)
      const healthResponse = await fetch(`${status.url}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(2000)
      });
      if (healthResponse.ok) {
        const healthData = await healthResponse.json();
        console.log('[ML API] Python health check passed:', healthData);
        return NextResponse.json({
          running: true,
          url: status.url,
          model_trained: healthData.model_trained || false,
          status: healthData.status || 'healthy'
        });
      }
    } catch (error) {
      console.log('[ML API] Python health check failed:', error instanceof Error ? error.message : error);
      // Python not responding
    }

    // Return manager status
    return NextResponse.json(status);
  } catch (error) {
    console.error('[ML API] GET error:', error);
    return NextResponse.json({
      running: false,
      url: '',
      error: 'Service not available'
    }, { status: 503 });
  }
}

/**
 * POST /api/ml/status
 * Start/Stop ML service
 */
export async function POST(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const action = searchParams.get('action');

    if (action === 'start') {
      const success = await mlServiceManager.startMLService();
      return NextResponse.json({
        success,
        status: mlServiceManager.getStatus()
      });
    }

    if (action === 'stop') {
      await mlServiceManager.stopMLService();
      return NextResponse.json({
        success: true,
        status: mlServiceManager.getStatus()
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('[ML API] POST error:', error);
    return NextResponse.json({ error: 'Service error' }, { status: 500 });
  }
}
