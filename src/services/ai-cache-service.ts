'use server';

import { prisma } from '@/lib/prisma';
import { createHash } from 'crypto';
import { createLogger } from '@/lib/logger';

const logger = createLogger('AICache');

/**
 * PDF dosyasının SHA256 hash'ini hesaplar
 */
export async function calculateFileHash(fileBuffer: ArrayBuffer): Promise<string> {
  const hash = createHash('sha256');
  hash.update(Buffer.from(fileBuffer));
  return hash.digest('hex');
}

/**
 * Cache'den AI sonucunu al
 * Aynı dosya 2. kez işlenmez (30 gün cache)
 */
export async function getCachedAIResult(
  fileHash: string,
  fileType: string = 'invoice'
): Promise<{ success: boolean; data?: any; provider?: string } | null> {
  try {
    const cached = await prisma.aICache.findFirst({
      where: { isDeleted: false,  fileHash },
    });

    // Cache miss - logla
    if (!cached) {
      logger.info(`Cache MISS: ${fileHash.substring(0, 16)}... (${fileType})`);
      await prisma.auditLog.create({
        data: {
          action: 'CACHE_MISS',
          entityType: 'AICache',
          entityId: fileHash,
          details: JSON.stringify({ fileType, fileHash: fileHash.substring(0, 16) })
        }
      });
      return null;
    }

    // Süresi dolmuş mu kontrol et
    if (cached.expiresAt < new Date()) {
      // Cache'i sil
      await prisma.aICache.update({ where: { id: cached.id } });
      logger.warn(`Cache EXPIRED: ${fileHash.substring(0, 16)}... (${fileType})`);
      await prisma.auditLog.create({
        data: {
          action: 'CACHE_EXPIRED',
          entityType: 'AICache',
          entityId: cached.id,
          details: JSON.stringify({ fileType, provider: cached.provider })
        }
      });
      return null;
    }

    // Cache hit - logla
    logger.info(`Cache HIT: ${fileHash.substring(0, 16)}... (${cached.provider})`);
    await prisma.auditLog.create({
      data: {
        action: 'CACHE_HIT',
        entityType: 'AICache',
        entityId: cached.id,
        details: JSON.stringify({
          fileType,
          provider: cached.provider,
          confidence: cached.confidence
        })
      }
    });

    return {
      success: true,
      data: JSON.parse(cached.result),
      provider: cached.provider
    };
  } catch (error: any) {
    logger.error('Cache error:', error.message);
    return null;
  }
}

/**
 * AI sonucunu cache'e kaydet
 */
export async function cacheAIResult(
  fileHash: string,
  fileType: string,
  result: any,
  provider: string,
  apiKeyUsed?: string,
  confidence: number = 1.0,
  ttlDays: number = 30
): Promise<boolean> {
  try {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + ttlDays);

    await prisma.aICache.upsert({
      where: { fileHash },
      update: {
        result: JSON.stringify(result),
        provider,
        apiKeyUsed,
        confidence,
        expiresAt,
      },
      create: {
        fileHash,
        fileType,
        result: JSON.stringify(result),
        provider,
        apiKeyUsed,
        confidence,
        expiresAt,
      },
    });

    logger.info(`💾 Cached for ${ttlDays} days (${provider}): ${fileHash.substring(0, 16)}...`);

    // Cache write log
    await prisma.auditLog.create({
      data: {
        action: 'CACHE_WRITE',
        entityType: 'AICache',
        entityId: fileHash,
        details: JSON.stringify({
          fileType,
          provider,
          confidence,
          ttlDays,
          fileHash: fileHash.substring(0, 16)
        })
      }
    });

    return true;
  } catch (error: any) {
    logger.error('Cache save error:', error.message);
    return false;
  }
}

/**
 * Eski cache'leri temizle (30 günden eski)
 */
export async function cleanupExpiredCache(): Promise<number> {
  try {
    const deleted = await prisma.aICache.updateMany({
    where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    });

    logger.info(`🧹 ${deleted.count} expired cache entries deleted`);
    return deleted.count;
  } catch (error: any) {
    logger.error('Cleanup error:', error.message);
    return 0;
  }
}

/**
 * Cache istatistikleri
 */
export async function getCacheStats(): Promise<{
  total: number;
  hitRate: number;
  expiringSoon: number;
  hits24h: number;
  misses24h: number;
  writes24h: number;
}> {
  try {
    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Cache count
    const total = await prisma.aICache.count({ where: { isDeleted: false } });

    // Expiring soon (7 gün)
    const expiringSoon = await prisma.aICache.count({
      where: { isDeleted: false,
        expiresAt: {
          lt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      },
    });

    // Hit/Miss/Write counts for last 24 hours
    const hits24h = await prisma.auditLog.count({
      where: { isDeleted: false,
        action: 'CACHE_HIT',
        entityType: 'AICache',
        createdAt: { gte: twentyFourHoursAgo }
      }
});

    const misses24h = await prisma.auditLog.count({
      where: { isDeleted: false,
        action: 'CACHE_MISS',
        entityType: 'AICache',
        createdAt: { gte: twentyFourHoursAgo }
      }
    });

    const writes24h = await prisma.auditLog.count({
      where: { isDeleted: false,
        action: 'CACHE_WRITE',
        entityType: 'AICache',
        createdAt: { gte: twentyFourHoursAgo }
      }
    });

    // Hit rate calculation
    const totalRequests = hits24h + misses24h;
    const hitRate = totalRequests > 0 ? (hits24h / totalRequests) * 100 : 0;

    logger.info(`Stats: ${total} total, ${hitRate.toFixed(1)}% hit rate (24h)`);

    return {
      total,
      hitRate: Math.round(hitRate * 100) / 100, // 2 decimal places
      expiringSoon,
      hits24h,
      misses24h,
      writes24h,
    };
  } catch (error: any) {
    logger.error('Stats error:', error.message);
    return {
      total: 0,
      hitRate: 0,
      expiringSoon: 0,
      hits24h: 0,
      misses24h: 0,
      writes24h: 0,
    };
  }
}
