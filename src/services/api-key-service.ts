'use server';

import { prisma } from '@/lib/prisma';
import { createHash } from 'crypto';

/**
 * API key'i hash'le (güvenlik için)
 */
function hashApiKey(key: string): string {
  return createHash('sha256').update(key).digest('hex');
}

/**
 * API key'in gösterilecek kısmını oluştur (ilk 8 + son 4 karakter)
 */
function maskApiKey(key: string): string {
  if (key.length < 12) return '****';
  return `${key.substring(0, 8)}...${key.substring(key.length - 4)}`;
}

/**
 * API key ekle veya güncelle
 */
export async function saveAPIKey(
  name: string,
  provider: string,
  key: string
): Promise<{ success: boolean; error?: string; id?: string }> {
  try {
    const keyHash = hashApiKey(key);
    const masked = maskApiKey(key);

    // Zaten var mı kontrol et (aynı key)
    const existing = await prisma.aPIKey.findFirst({
      where: { isDeleted: false,  keyHash },
    });

    if (existing) {
      return {
        success: false,
        error: 'Bu API key zaten kayıtlı!',
      };
    }

    // Yeni key ekle
    const result = await prisma.aPIKey.create({
      data: {
        name,
        provider,
        keyHash,
      },
    });

    console.log(`[API Key] ✅ Saved: ${name} (${masked})`);
    return { success: true, id: result.id };
  } catch (error: any) {
    console.error('[API Key] Save error:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Aktif API key'leri listele (masked)
 */
export async function getAPIKeys(provider?: string): Promise<
  Array<{
    id: string;
    name: string;
    provider: string;
    keyMasked: string;
    usageCount: number;
    isActive: boolean;
    lastUsedAt: Date | null;
  }>
> {
  try {
    const keys = await prisma.aPIKey.findMany({
      where: provider ? { provider, isActive: true } : { isActive: true },
      orderBy: { createdAt: 'desc' },
    });

    return keys.map((k) => ({
      id: k.id,
      name: k.name,
      provider: k.provider,
      keyMasked: k.keyHash.substring(0, 8) + '...' + k.keyHash.substring(k.keyHash.length - 4),
      usageCount: k.usageCount,
      isActive: k.isActive,
      lastUsedAt: k.lastUsedAt,
    }));
  } catch (error: any) {
    console.error('[API Key] List error:', error.message);
    return [];
  }
}

/**
 * API key'i aktif/pasif yap
 */
export async function toggleAPIKey(id: string, isActive: boolean): Promise<boolean> {
  try {
    await prisma.aPIKey.update({
      where: { id },
      data: { isActive },
    });
    console.log(`[API Key] ${isActive ? '✅ Activated' : '❌ Deactivated'}: ${id}`);
    return true;
  } catch (error: any) {
    console.error('[API Key] Toggle error:', error.message);
    return false;
  }
}

/**
 * API key'i sil
 */
export async function deleteAPIKey(id: string): Promise<boolean> {
  try {
    await prisma.aPIKey.update({
    where: { id },
    data: { isDeleted: true, deletedAt: new Date() }
});
    console.log(`[API Key] 🗑️ Deleted: ${id}`);
    return true;
  } catch (error: any) {
    console.error('[API Key] Delete error:', error.message);
    return false;
  }
}

/**
 * Kullanılabilir API key al (round-robin)
 * - Aktif olanlar
 * - Günlük limit aşmamış
 * - En az kullanılan
 */
export async function getNextAvailableAPIKey(
  provider: string
): Promise<{ key: string; id: string } | null> {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Aktif key'leri al
    const keys = await prisma.aPIKey.findMany({
      where: { isDeleted: false,
        provider,
        isActive: true,
      },
      orderBy: { usageCount: 'asc' }, // En az kullanılanı seç
    });

    for (const keyRecord of keys) {
      // Günlük limit kontrolü
      const resetDate = keyRecord.resetDate;
      if (!resetDate || resetDate < today) {
        // Yeni gün, sayacı sıfırla
        await prisma.aPIKey.update({
          where: { id: keyRecord.id },
          data: {
            todayCount: 0,
            resetDate: today,
          },
        });
        keyRecord.todayCount = 0;
      }

      if (keyRecord.todayCount < keyRecord.dailyLimit) {
        console.log(`[API Key] 🎯 Selected: ${keyRecord.name} (usage: ${keyRecord.todayCount}/${keyRecord.dailyLimit})`);
        
        // Kullanım sayacını artır
        await prisma.aPIKey.update({
          where: { id: keyRecord.id },
          data: {
            usageCount: keyRecord.usageCount + 1,
            todayCount: keyRecord.todayCount + 1,
            lastUsedAt: new Date(),
          },
        });

        // Gerçek key'i bul (hash'ten geri dönüşüm yok, kullanıcı localStorage'dan alacak)
        // Bu fonksiyon sadece database'deki kayıtları yönetir
        // Gerçek key UI'dan gelecek
        return { key: keyRecord.keyHash, id: keyRecord.id };
      }
    }

    console.warn(`[API Key] ⚠️ No available keys for ${provider}`);
    return null;
  } catch (error: any) {
    console.error('[API Key] Selection error:', error.message);
    return null;
  }
}

/**
 * API key kullanım istatistikleri
 */
export async function getAPIKeyStats(): Promise<{
  total: number;
  active: number;
  totalUsage: number;
  byProvider: Record<string, number>;
}> {
  try {
    const keys = await prisma.aPIKey.findMany({ where: { isDeleted: false } });

    const stats = {
      total: keys.length,
      active: keys.filter((k) => k.isActive).length,
      totalUsage: keys.reduce((sum, k) => sum + k.usageCount, 0),
      byProvider: {} as Record<string, number>,
    };

    keys.forEach((k) => {
      if (!stats.byProvider[k.provider]) {
        stats.byProvider[k.provider] = 0;
      }
      stats.byProvider[k.provider] += k.usageCount;
    });

    return stats;
  } catch (error: any) {
    console.error('[API Key] Stats error:', error.message);
    return { total: 0, active: 0, totalUsage: 0, byProvider: {} };
  }
}
