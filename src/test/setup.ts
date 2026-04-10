import { afterEach, beforeEach, vi } from 'vitest';

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
  vi.resetModules();
  vi.unstubAllEnvs();
});
