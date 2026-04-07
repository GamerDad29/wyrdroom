// Obsidian Local REST API integration
// Plugin: https://github.com/coddingtonbear/obsidian-local-rest-api
// Default endpoint: https://127.0.0.1:27124 (self-signed cert)
// The plugin also supports non-encrypted HTTP if enabled in settings.

// Try HTTPS first (default), fall back to HTTP
const VAULT_URLS = ['http://127.0.0.1:27123', 'https://127.0.0.1:27124', 'http://127.0.0.1:27124'];
let activeVaultUrl: string | null = null;

let apiKey = localStorage.getItem('apoc_vault_key') || '';

export function setVaultApiKey(key: string): void {
  apiKey = key;
  localStorage.setItem('apoc_vault_key', key);
}

export function getVaultApiKey(): string {
  return apiKey;
}

async function discoverVaultUrl(): Promise<string | null> {
  if (activeVaultUrl) return activeVaultUrl;

  for (const url of VAULT_URLS) {
    try {
      const response = await fetch(`${url}/`, {
        headers: apiKey ? { 'Authorization': `Bearer ${apiKey}` } : {},
      });
      if (response.ok || response.status === 401) {
        activeVaultUrl = url;
        return url;
      }
    } catch {
      // This URL didn't work, try next
    }
  }
  return null;
}

async function vaultFetch(path: string, options: RequestInit = {}): Promise<Response> {
  if (!apiKey) {
    throw new Error('Vault API key not set. Use /vault key <your-key> to configure.');
  }

  const url = await discoverVaultUrl();
  if (!url) {
    throw new Error('Cannot reach Obsidian. If using HTTPS, open https://127.0.0.1:27124 in your browser and accept the certificate first. Or enable "Non-encrypted (HTTP) server" in the Local REST API plugin settings.');
  }

  const response = await fetch(`${url}${path}`, {
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
  const url = await discoverVaultUrl();
  return url !== null;
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
