/**
 * Test AI Semantic Matching API
 */

import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function POST(request: NextRequest) {
    try {
        const { productName } = await request.json();

        if (!productName) {
            return NextResponse.json(
                { success: false, error: 'Product name required' },
                { status: 400 }
            );
        }

        // Check API key
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return NextResponse.json(
                { success: false, error: 'GEMINI_API_KEY not configured' },
                { status: 500 }
            );
        }

        // Simple test: Just check if API responds
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

        const result = await model.generateContent('Test connection - respond with "OK"');
        const responseText = result.response.text();

        if (responseText.toLowerCase().includes('ok')) {
            return NextResponse.json({ success: true });
        } else {
            return NextResponse.json(
                { success: false, error: 'Unexpected API response' },
                { status: 500 }
            );
        }
    } catch (error: any) {
        console.error('[AI Test] Error:', error);
        return NextResponse.json(
            { success: false, error: error.message || 'API test failed' },
            { status: 500 }
        );
    }
}
