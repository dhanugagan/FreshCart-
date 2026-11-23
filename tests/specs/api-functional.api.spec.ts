import { expect, test } from '@playwright/test';
import { loadTestData } from '../data/loadTestData';

const testData = loadTestData();

test.describe('FreshCart Backend API & SQLite Integration Suite', () => {
  test('TC-API-01: Catalog serves 100 everyday essentials without mismatched image URLs', async ({ request }) => {
    const res = await request.get('/api/products?limit=150');
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.items.length).toBeGreaterThanOrEqual(100);
    for (const item of data.items.slice(0, 20)) {
      expect(item.imageUrl).toBe('');
      expect(item.effectivePrice).toBeGreaterThan(0);
    }
  });

  test('TC-API-02: Price Tier filters (Low <= 99, Medium 100..250, High >= 251) hold exact bounds', async ({
    request,
  }) => {
    const [lowRes, medRes, highRes] = await Promise.all([
      request.get('/api/products?priceTier=low&limit=200'),
      request.get('/api/products?priceTier=medium&limit=200'),
      request.get('/api/products?priceTier=high&limit=200'),
    ]);

    expect(lowRes.ok()).toBeTruthy();
    expect(medRes.ok()).toBeTruthy();
    expect(highRes.ok()).toBeTruthy();

    const low = await lowRes.json();
    const med = await medRes.json();
    const high = await highRes.json();

    expect(low.items.length).toBeGreaterThan(0);
    expect(med.items.length).toBeGreaterThan(0);
    expect(high.items.length).toBeGreaterThan(0);

    for (const item of low.items) {
      expect(item.effectivePrice).toBeLessThanOrEqual(testData.priceTiers.lowMax);
    }
    for (const item of med.items) {
      expect(item.effectivePrice).toBeGreaterThanOrEqual(testData.priceTiers.mediumMin);
      expect(item.effectivePrice).toBeLessThanOrEqual(testData.priceTiers.mediumMax);
    }
    for (const item of high.items) {
      expect(item.effectivePrice).toBeGreaterThanOrEqual(testData.priceTiers.highMin);
    }
  });

  test('TC-API-03: SQL injection probe in product search stays safely parameterized', async ({ request }) => {
    const res = await request.get(`/api/products?q=${encodeURIComponent(testData.searchTerms.sqlInjectionProbe)}`);
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(Array.isArray(data.items)).toBe(true);
    expect(data.items.length).toBe(0);
  });

  test('TC-API-04: Single Demo Customer login issues valid JWT & exposes starter cart, addresses, orders', async ({
    request,
  }) => {
    const loginRes = await request.post('/api/auth/demo');
    expect(loginRes.ok()).toBeTruthy();
    const loginJson = await loginRes.json();
    expect(loginJson.user.email).toBe(testData.demoAccount.email);
    expect(loginJson.user.fullName).toBe(testData.demoAccount.expectedName);
    expect(loginJson.accessToken).toBeTruthy();

    const headers = { Authorization: `Bearer ${loginJson.accessToken}` };
    const [cartRes, addrRes, ordersRes] = await Promise.all([
      request.get('/api/cart', { headers }),
      request.get('/api/addresses', { headers }),
      request.get('/api/orders', { headers }),
    ]);

    expect(cartRes.ok()).toBeTruthy();
    expect(addrRes.ok()).toBeTruthy();
    expect(ordersRes.ok()).toBeTruthy();

    const cart = await cartRes.json();
    const addresses = await addrRes.json();
    const orders = await ordersRes.json();
    expect(cart.itemCount).toBeGreaterThan(0);
    expect(addresses.addresses.length).toBeGreaterThan(0);
    expect(orders.orders.length).toBeGreaterThan(0);
  });

  test('TC-API-05: Google Account sign-in provisions CUSTOMER role only & blocks unauthorized Admin access', async ({
    request,
  }) => {
    const res = await request.post('/api/auth/google', {
      data: testData.googleTestUser,
    });
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.user.email).toBe(testData.googleTestUser.email);
    expect(data.user.roles).toContain('CUSTOMER');
    expect(data.user.roles).not.toContain('ADMIN');

    const adminAttempt = await request.get('/api/admin/analytics', {
      headers: { Authorization: `Bearer ${data.accessToken}` },
    });
    expect(adminAttempt.status()).toBe(403);
  });

  test('TC-API-06: Admin status reports readiness cleanly without throwing unconfigured secret deadlock', async ({
    request,
  }) => {
    const statusRes = await request.get('/api/auth/admin/status');
    expect(statusRes.ok()).toBeTruthy();
    const status = await statusRes.json();
    expect(status).toHaveProperty('adminClaimed');
    expect(status).toHaveProperty('envPasscodeConfigured');
    expect(status).toHaveProperty('localPasscodeConfigured');
    expect(status).toHaveProperty('ready');
  });

  test('TC-API-07: Negative login with invalid credentials returns HTTP 400/401 safely', async ({ request }) => {
    const res = await request.post('/api/auth/login', {
      data: {
        email: testData.invalidCredentials.wrongEmail,
        password: testData.invalidCredentials.password,
      },
    });
    expect([400, 401]).toContain(res.status());
  });

  test('TC-API-08: Google & Supabase OAuth configuration endpoint returns callback URIs safely', async ({ request }) => {
    const cfgRes = await request.get('/api/auth/google/config');
    expect(cfgRes.ok()).toBeTruthy();
    const cfg = await cfgRes.json();
    expect(typeof cfg.oauthConfigured).toBe('boolean');
    expect(typeof cfg.supabaseConfigured).toBe('boolean');
    expect(cfg.callbackUrl).toContain('/api/auth/google/callback');
    expect(cfg.authCallbackUrl).toContain('/auth/callback');

    const badExchange = await request.post('/api/auth/supabase', { data: { accessToken: '' } });
    expect(badExchange.status()).toBe(400);
  });

  test('TC-API-09: Storage documents API supports authenticated upload, owner isolation & delete', async ({
    request,
  }) => {
    const demoRes = await request.post('/api/auth/demo');
    const demoAuth = await demoRes.json();
    const demoHeaders = { Authorization: `Bearer ${demoAuth.accessToken}` };

    const sampleTextB64 = Buffer.from('Leave groceries with gate security guard.').toString('base64');
    const createRes = await request.post('/api/storage/documents', {
      headers: demoHeaders,
      data: {
        title: 'Gate Security Note',
        docType: 'DELIVERY_INSTRUCTION',
        fileName: 'gate-note.txt',
        dataUrl: `data:text/plain;base64,${sampleTextB64}`,
      },
    });
    expect(createRes.status()).toBe(201);
    const created = (await createRes.json()).document;
    expect(created.title).toBe('Gate Security Note');

    const listRes = await request.get('/api/storage/documents', { headers: demoHeaders });
    expect(listRes.ok()).toBeTruthy();
    const listData = await listRes.json();
    expect(listData.documents.some((d: any) => d.id === created.id)).toBe(true);

    // Cross-user isolation: Google customer cannot delete demo customer's uploaded document
    const otherRes = await request.post('/api/auth/google', { data: testData.googleTestUser });
    const otherAuth = await otherRes.json();
    const forbiddenDelete = await request.delete(`/api/storage/documents/${created.id}`, {
      headers: { Authorization: `Bearer ${otherAuth.accessToken}` },
    });
    expect(forbiddenDelete.status()).toBe(404);

    const ownerDelete = await request.delete(`/api/storage/documents/${created.id}`, { headers: demoHeaders });
    expect(ownerDelete.ok()).toBeTruthy();
  });
});
