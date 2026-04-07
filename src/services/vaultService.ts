// Obsidian Local REST API integration
// Plugin: https://github.com/coddingtonbear/obsidian-local-rest-api
// Default endpoint: http://localhost:27124

const VAULT_URL = 'https://127.0.0.1:27124';

let apiKey = localStorage.getItem('apoc_vault_key') || '';

export function setVaultApiKey(key: string): void {
  apiKey = key;
  localStorage.setItem('apoc_vault_key', key);
}

export function getVaultApiKey(): string {
  return apiKey;
}

async function vaultFetch(path: string, options: RequestInit = {}): Promise<Response> {
  if (!apiKey) {
    throw new Error('Vault API key not set. Use /vault key <your-key> to configure.');
  }

  const response = await fetch(`${VAULT_URL}${path}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`Vault API error ${response.status}: ${text}`);
  }

  return response;
}

export async function isVaultAvailable(): Promise<boolean> {
  try {
    const response = await fetch(`${VAULT_URL}/`, {
      headers: apiKey ? { 'Authorization': `Bearer ${apiKey}` } : {},
    });
    return response.ok || response.status === 401;
  } catch {
    return false;
  }
}

export async function vaultSearch(query: string): Promise<{ filename: string; score: number }[]> {
  const response = await vaultFetch('/search/simple/', {
    method: 'POST',
    body: JSON.stringify({ query }),
  });
  const results = await response.json();
  return Array.isArray(results) ? results.slice(0, 15) : [];
}

export async function vaultRead(path: string): Promise<string> {
  const response = await vaultFetch(`/vault/${encodeURIComponent(path)}`, {
    headers: { 'Accept': 'text/markdown' },
  });
  return response.text();
}

export async function vaultWrite(path: string, content: string): Promise<void> {
  await vaultFetch(`/vault/${encodeURIComponent(path)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'text/markdown' },
    body: content,
  });
}

export async function vaultAppend(path: string, content: string): Promise<void> {
  await vaultFetch(`/vault/${encodeURIComponent(path)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'text/markdown' },
    body: content,
  });
}

export async function vaultList(folder?: string): Promise<{ files: string[] }> {
  const path = folder ? `/vault/${encodeURIComponent(folder)}/` : '/vault/';
  const response = await vaultFetch(path);
  return response.json();
}
