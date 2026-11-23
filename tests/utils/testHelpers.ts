import fs from 'fs';
import path from 'path';
import type { APIRequestContext, Page } from '@playwright/test';

export const TEMP_DIR = path.resolve(process.cwd(), 'tests/temp');
export const STORAGE_STATE_PATH = path.join(TEMP_DIR, 'auth-storage.json');

export function ensureTempDir(): void {
  if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true });
  }
}

export async function loginViaDemoApiAndSaveState(
  request: APIRequestContext,
  page?: Page
): Promise<string> {
  ensureTempDir();
  const res = await request.post('/api/auth/demo');
  if (!res.ok()) {
    throw new Error(`Demo login API failed with status ${res.status()}`);
  }
  const body = (await res.json()) as { accessToken: string };
  if (page) {
    await page.context().storageState({ path: STORAGE_STATE_PATH });
  }
  return body.accessToken;
}

export async function mockOfflineCatalogFailure(page: Page): Promise<void> {
  await page.route('**/api/products*', async (route) => {
    await route.fulfill({
      status: 503,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'Mocked Maintenance Window' }),
    });
  });
}
