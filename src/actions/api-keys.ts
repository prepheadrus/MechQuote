'use server';

import { 
  getAPIKeys as getAPIKeysService,
  saveAPIKey as saveAPIKeyService,
  toggleAPIKey as toggleAPIKeyService,
  deleteAPIKey as deleteAPIKeyService,
  getAPIKeyStats
} from '@/services/api-key-service';

export async function getAPIKeys(provider?: string) {
  return await getAPIKeysService(provider);
}

export async function saveAPIKey(name: string, provider: string, key: string) {
  return await saveAPIKeyService(name, provider, key);
}

export async function toggleAPIKey(id: string, isActive: boolean) {
  return await toggleAPIKeyService(id, isActive);
}

export async function deleteAPIKey(id: string) {
  return await deleteAPIKeyService(id);
}

export async function getAPIKeyStatsData() {
  return await getAPIKeyStats();
}
