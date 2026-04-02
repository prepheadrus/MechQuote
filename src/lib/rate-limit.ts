/**
 * Rate Limiting Middleware
 * 
 * Basit in-memory rate limiting implementasyonu
 * Production'da Redis/upstash/ratelimit kullanılması önerilir
 * 
 * Kullanım:
 * import { rateLimit } from '@/lib/rate-limit';
 * 
 * export async function POST(request: NextRequest) {
 *   const limited = await rateLimit(request, { limit: 10, window: 60 });
 *   if (limited) {
 *     return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
 *   }
 *   // ... handler
 * }
 */

import { NextRequest } from 'next/server';

interface RateLimitConfig {
  limit: number;      // İstek limiti
  window: number;     // Pencere (saniye)
}

interface RateLimitData {
  count: number;
  resetTime: number;
}

// In-memory store (production'da Redis kullan!)
const rateLimitStore = new Map<string, RateLimitData>();

/**
 * IP adresini al
 */
function getIP(request: NextRequest): string {
  return (
    (request as any).ip ??
    request.headers.get('x-forwarded-for')?.split(',')[0] ??
    request.headers.get('x-real-ip') ??
    'unknown'
  );
}

/**
 * Rate limit kontrolü
 * @param request - Next.js request
 * @param config - Rate limit konfigürasyonu
 * @returns true if limited, false if OK
 */
export async function rateLimit(
  request: NextRequest,
  config: RateLimitConfig = { limit: 10, window: 60 }
): Promise<boolean> {
  const ip = getIP(request);
  const now = Date.now();
  const windowMs = config.window * 1000;

  const data = rateLimitStore.get(ip);

  // İlk istek veya pencere doldu
  if (!data || now > data.resetTime) {
    rateLimitStore.set(ip, {
      count: 1,
      resetTime: now + windowMs
    });
    return false; // Limit değil
  }

  // Pencere içinde limit kontrolü
  if (data.count >= config.limit) {
    return true; // Limit aşıldı
  }

  // İsteği say
  data.count++;
  rateLimitStore.set(ip, data);
  return false; // Limit değil
}

/**
 * Rate limit bilgisi al
 */
export function getRateLimitInfo(
  request: NextRequest,
  config: RateLimitConfig = { limit: 10, window: 60 }
): {
  remaining: number;
  resetTime: number;
  limited: boolean;
} {
  const ip = getIP(request);
  const now = Date.now();
  const data = rateLimitStore.get(ip);

  if (!data || now > data.resetTime) {
    return {
      remaining: config.limit,
      resetTime: now + config.window * 1000,
      limited: false
    };
  }

  return {
    remaining: Math.max(0, config.limit - data.count),
    resetTime: data.resetTime,
    limited: data.count >= config.limit
  };
}

/**
 * Store'u temizle (test için)
 */
export function clearRateLimitStore(): void {
  rateLimitStore.clear();
}
