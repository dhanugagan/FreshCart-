import 'dotenv/config';
import express from 'express';
import http from 'http';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { WebSocketServer, WebSocket } from 'ws';
import { db, initDatabase, hashPassword, verifyPassword, seedSingleDemoCustomer } from './src/server/db.ts';
import {
  isSupabaseServerConfigured,
  syncInventoryLogToSupabase,
  uploadToSupabaseBucket,
  verifySupabaseAccessToken,
} from './src/server/supabaseAdmin.ts';
import {
  AuthedRequest,
  auditLog,
  extractToken,
  getUserRoles,
  isValidEmail,
  isValidMobile,
  rateLimit,
  requireAdmin,
  requireAuth,
  revokeToken,
  sanitizeText,
  signAuthToken,
  verifyAuthToken,
} from './src/server/security.ts';

initDatabase();

const app = express();
app.set('trust proxy', 1);
app.use('/api/storage', express.json({ limit: '4mb' }));
app.use(express.json({ limit: '1mb' }));

// Strict CORS only for same-origin or configured APP_URL
app.use((req, res, next) => {
  const origin = req.headers.origin;
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  if (origin && (origin.includes(String(host)) || origin.startsWith('http://localhost') || origin.startsWith('http://127.0.0.1'))) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  }
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }
  next();
});

const server = process.env.VERCEL ? null : http.createServer(app);
const wss = server ? new WebSocketServer({ server, path: '/ws' }) : null;
const wsClients = new Map<WebSocket, { userId?: number; orderId?: number }>();

if (wss) {
  wss.on('connection', (ws) => {
    wsClients.set(ws, {});
    ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw.toString());
        const meta = wsClients.get(ws) || {};
        if (msg.type === 'subscribe' && typeof msg.orderId === 'number') {
          meta.orderId = msg.orderId;
        }
        if (msg.type === 'auth' && typeof msg.token === 'string') {
          const payload = verifyAuthToken(msg.token);
          if (payload) meta.userId = payload.sub;
        }
        wsClients.set(ws, meta);
      } catch {
        // ignore malformed ws frame
      }
    });
    ws.on('close', () => wsClients.delete(ws));
  });
}

function broadcastEvent(event: { type: string; userId?: number; orderId?: number; payload: unknown }) {
  if (!wss) return;
  const data = JSON.stringify({ type: event.type, payload: event.payload, timestamp: new Date().toISOString() });
  for (const [client, meta] of wsClients.entries()) {
    if (client.readyState !== WebSocket.OPEN) continue;
    const matchUser = event.userId && meta.userId === event.userId;
    const matchOrder = event.orderId && meta.orderId === event.orderId;
    if (matchUser || matchOrder) {
      client.send(data);
    }
  }
}

function isHttpsRequest(res: express.Response): boolean {
  const req = res.req;
  if (!req) return Boolean(process.env.VERCEL);
  const forwardedProto = String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim();
  return req.secure || forwardedProto === 'https';
}

function setSessionCookie(res: express.Response, token: string) {
  const https = isHttpsRequest(res);
  res.cookie('fc_session', token, {
    httpOnly: true,
    secure: https,
    sameSite: https ? 'none' : 'lax',
    ...(https ? { partitioned: true } : {}),
    maxAge: 1000 * 60 * 60 * 12,
    path: '/',
  });
}

function clearSessionCookie(res: express.Response) {
  const https = isHttpsRequest(res);
  res.clearCookie('fc_session', {
    httpOnly: true,
    secure: https,
    sameSite: https ? 'none' : 'lax',
    ...(https ? { partitioned: true } : {}),
    path: '/',
  });
}

function verifyMutationOrigin(req: express.Request): boolean {
  // Exempt direct Bearer API requests (e.g. API clients/QA runner); enforce Origin/X-Requested-With on cookie-backed mutations
  if (req.headers.authorization?.startsWith('Bearer ')) return true;
  if (req.headers['x-requested-with'] === 'FreshCartSPA') return true;
  const origin = req.headers.origin;
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  if (!origin) return true;
  return origin.includes(String(host));
}

function roundMoney(n: number): number {
  return Math.round(n * 100) / 100;
}

function getEffectivePrice(price: number, discountPercent: number): number {
  return roundMoney(price * (1 - (discountPercent || 0) / 100));
}

function buildCartSnapshot(userId: number) {
  let cart = db.prepare(`SELECT * FROM carts WHERE user_id = ?`).get(userId) as
    | { id: number; user_id: number; applied_coupon_code: string | null }
    | undefined;
  if (!cart) {
    db.prepare(`INSERT INTO carts (user_id) VALUES (?)`).run(userId);
    cart = db.prepare(`SELECT * FROM carts WHERE user_id = ?`).get(userId) as any;
  }

  const rows = db
    .prepare(
      `SELECT ci.id, ci.product_id, ci.quantity, p.name, p.brand, p.unit, p.price, p.discount_percent,
              i.quantity as stock_quantity,
              (SELECT image_url FROM product_images WHERE product_id = p.id ORDER BY is_primary DESC, sort_order ASC LIMIT 1) as image_url
       FROM cart_items ci
       INNER JOIN products p ON p.id = ci.product_id
       INNER JOIN inventory i ON i.product_id = p.id
       WHERE ci.cart_id = ?
       ORDER BY ci.id DESC`
    )
    .all(cart!.id) as any[];

  const items = rows.map((r) => {
    const unitPrice = getEffectivePrice(r.price, r.discount_percent);
    return {
      id: r.id,
      productId: r.product_id,
      name: r.name,
      brand: r.brand,
      unit: r.unit,
      originalPrice: r.price,
      discountPercent: r.discount_percent,
      unitPrice,
      quantity: r.quantity,
      lineTotal: roundMoney(unitPrice * r.quantity),
      stockQuantity: r.stock_quantity,
      imageUrl: r.image_url,
    };
  });

  const subtotal = roundMoney(items.reduce((acc, item) => acc + item.lineTotal, 0));
  let discountAmount = 0;
  let appliedCoupon: string | null = cart!.applied_coupon_code;

  if (appliedCoupon && subtotal > 0) {
    const check = evaluateCouponForUser(appliedCoupon, userId, subtotal);
    if (check.valid) {
      discountAmount = check.discountAmount;
    } else {
      appliedCoupon = null;
      db.prepare(`UPDATE carts SET applied_coupon_code = NULL WHERE id = ?`).run(cart!.id);
    }
  }

const FREE_DELIVERY_THRESHOLD = 99;
const DELIVERY_FEE = 39;

  const taxableBase = Math.max(0, subtotal - discountAmount);
  const taxAmount = roundMoney(taxableBase * 0.05);
  const deliveryFee = subtotal === 0 ? 0 : subtotal >= FREE_DELIVERY_THRESHOLD ? 0 : DELIVERY_FEE;
  const totalAmount = roundMoney(taxableBase + taxAmount + deliveryFee);

  return {
    items,
    itemCount: items.reduce((s, i) => s + i.quantity, 0),
    subtotal,
    discountAmount,
    appliedCoupon,
    taxAmount,
    deliveryFee,
    freeDeliveryThreshold: FREE_DELIVERY_THRESHOLD,
    totalAmount,
  };
}

function evaluateCouponForUser(code: string, userId: number, subtotal: number) {
  const cleanCode = sanitizeText(code, 32).toUpperCase();
  const coupon = db.prepare(`SELECT * FROM coupons WHERE UPPER(code) = ?`).get(cleanCode) as any;
  if (!coupon) {
    return { valid: false, status: 404, error: 'Invalid coupon code', discountAmount: 0 };
  }
  if (!coupon.is_active) {
    return { valid: false, status: 400, error: 'This coupon is currently inactive', discountAmount: 0 };
  }
  if (new Date(coupon.expires_at).getTime() < Date.now()) {
    return { valid: false, status: 400, error: 'Coupon has expired', discountAmount: 0 };
  }
  if (subtotal < coupon.min_order_amount) {
    return {
      valid: false,
      status: 400,
      error: `Minimum order of ₹${coupon.min_order_amount.toFixed(0)} required for ${coupon.code}`,
      discountAmount: 0,
    };
  }
  const usage = db
    .prepare(`SELECT COUNT(*) as c FROM coupon_usage WHERE coupon_id = ? AND user_id = ?`)
    .get(coupon.id, userId) as { c: number };
  if (usage.c >= coupon.usage_limit_per_user) {
    return { valid: false, status: 400, error: 'You have already redeemed this coupon', discountAmount: 0 };
  }
  if (coupon.discount_type === 'FIRST_ORDER') {
    const orderCount = (db.prepare(`SELECT COUNT(*) as c FROM orders WHERE user_id = ? AND status != 'CANCELLED'`).get(userId) as { c: number }).c;
    if (orderCount > 0) {
      return { valid: false, status: 400, error: 'Coupon is valid only on your first order', discountAmount: 0 };
    }
  }

  let discount = 0;
  if (coupon.discount_type === 'FIXED') {
    discount = Math.min(coupon.discount_value, subtotal);
  } else {
    discount = roundMoney((subtotal * coupon.discount_value) / 100);
    if (coupon.max_discount_amount > 0) {
      discount = Math.min(discount, coupon.max_discount_amount);
    }
  }
  discount = roundMoney(Math.min(discount, subtotal));

  return {
    valid: true,
    status: 200,
    coupon: {
      id: coupon.id,
      code: coupon.code,
      title: coupon.title,
      discountType: coupon.discount_type,
      discountValue: coupon.discount_value,
      minOrderAmount: coupon.min_order_amount,
      maxDiscountAmount: coupon.max_discount_amount,
    },
    discountAmount: discount,
  };
}

function createNotification(userId: number, type: string, title: string, message: string) {
  const res = db
    .prepare(`INSERT INTO notifications (user_id, type, title, message) VALUES (?, ?, ?, ?)`)
    .run(userId, type, title, message);
  const notif = db.prepare(`SELECT * FROM notifications WHERE id = ?`).get(Number(res.lastInsertRowid)) as any;
  broadcastEvent({
    type: 'notification:new',
    userId,
    payload: {
      id: notif.id,
      type: notif.type,
      title: notif.title,
      message: notif.message,
      isRead: false,
      createdAt: notif.created_at,
    },
  });
}

function mapUserPublic(userRow: any) {
  const roles = getUserRoles(userRow.id);
  return {
    id: userRow.id,
    fullName: userRow.full_name,
    email: userRow.email,
    mobile: userRow.mobile,
    status: userRow.status,
    roles,
    notifyOrders: Boolean(userRow.notify_orders),
    notifyOffers: Boolean(userRow.notify_offers),
    notifyDelivery: Boolean(userRow.notify_delivery),
    createdAt: userRow.created_at,
  };
}

// ==========================================
// AUTHENTICATION ROUTES
// ==========================================
app.post('/api/auth/register', rateLimit(30, 60_000), (req, res) => {
  const fullName = sanitizeText(req.body?.fullName, 120);
  const email = sanitizeText(req.body?.email, 160).toLowerCase();
  const mobile = sanitizeText(req.body?.mobile, 24);
  const password = typeof req.body?.password === 'string' ? req.body.password : '';
  const addressStr = sanitizeText(req.body?.address, 250);

  if (!fullName || fullName.length < 2) {
    res.status(400).json({ error: 'Full name must be at least 2 characters' });
    return;
  }
  if (!email || !isValidEmail(email)) {
    res.status(400).json({ error: 'Please provide a valid email address' });
    return;
  }
  if (!mobile || !isValidMobile(mobile)) {
    res.status(400).json({ error: 'Please provide a valid 10-15 digit mobile number' });
    return;
  }
  if (password.length < 6) {
    res.status(400).json({ error: 'Password must be at least 6 characters long' });
    return;
  }

  const existing = db.prepare(`SELECT id FROM users WHERE email = ?`).get(email);
  if (existing) {
    res.status(409).json({ error: 'An account with this email already exists' });
    return;
  }

  const passwordHash = hashPassword(password);
  const tx = db.transaction(() => {
    const info = db
      .prepare(`INSERT INTO users (full_name, email, mobile, password_hash) VALUES (?, ?, ?, ?)`)
      .run(fullName, email, mobile, passwordHash);
    const userId = Number(info.lastInsertRowid);
    const custRole = db.prepare(`SELECT id FROM roles WHERE name = 'CUSTOMER'`).get() as { id: number };
    db.prepare(`INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)`).run(userId, custRole.id);
    db.prepare(`INSERT INTO carts (user_id) VALUES (?)`).run(userId);
    db.prepare(`INSERT INTO wishlists (user_id) VALUES (?)`).run(userId);
    if (addressStr) {
      db.prepare(
        `INSERT INTO addresses (user_id, label, recipient_name, mobile, street, city, state, postal_code, lat, lng, is_default)
         VALUES (?, 'Home', ?, ?, ?, 'Bengaluru', 'Karnataka', '560001', 12.9716, 77.5946, 1)`
      ).run(userId, fullName, mobile, addressStr);
    }
    return userId;
  });

  const userId = tx();
  const userRow = db.prepare(`SELECT * FROM users WHERE id = ?`).get(userId) as any;
  const roles = getUserRoles(userId);
  const { token } = signAuthToken(userId, email, roles);
  setSessionCookie(res, token);
  createNotification(userId, 'AUTH', 'Welcome to FreshCart!', `Namaste ${fullName}! Use code WELCOME20 for 20% off your first grocery basket.`);
  auditLog(userId, 'USER_REGISTER', 'users', userId, `Registered ${email}`);

  res.status(201).json({ accessToken: token, user: mapUserPublic(userRow) });
});

app.post('/api/auth/login', rateLimit(40, 60_000), (req, res) => {
  const email = sanitizeText(req.body?.email, 160).toLowerCase();
  const password = typeof req.body?.password === 'string' ? req.body.password : '';

  if (!email) {
    res.status(400).json({ error: 'Email address is required' });
    return;
  }
  if (!isValidEmail(email)) {
    res.status(400).json({ error: 'Invalid email format' });
    return;
  }
  if (!password) {
    res.status(400).json({ error: 'Password is required' });
    return;
  }

  const userRow = db.prepare(`SELECT * FROM users WHERE email = ?`).get(email) as any;
  if (!userRow || !verifyPassword(password, userRow.password_hash)) {
    res.status(401).json({ error: 'Invalid email or password' });
    return;
  }
  if (userRow.status !== 'ACTIVE') {
    res.status(403).json({ error: 'Account is suspended. Contact support.' });
    return;
  }

  const roles = getUserRoles(userRow.id);
  const { token } = signAuthToken(userRow.id, userRow.email, roles);
  setSessionCookie(res, token);
  createNotification(userRow.id, 'AUTH', 'New Sign-In Detected', `Signed in to FreshCart on ${new Date().toLocaleDateString()}.`);
  auditLog(userRow.id, 'USER_LOGIN', 'users', userRow.id, `Login from ${req.ip}`);

  res.json({ accessToken: token, user: mapUserPublic(userRow) });
});

app.post('/api/auth/refresh', (req, res) => {
  if (!verifyMutationOrigin(req)) {
    res.status(403).json({ error: 'Origin verification failed' });
    return;
  }
  const token = extractToken(req);
  if (!token) {
    res.status(401).json({ error: 'No active session' });
    return;
  }
  const payload = verifyAuthToken(token);
  if (!payload) {
    clearSessionCookie(res);
    res.status(401).json({ error: 'Session expired' });
    return;
  }
  const userRow = db.prepare(`SELECT * FROM users WHERE id = ? AND status = 'ACTIVE'`).get(payload.sub) as any;
  if (!userRow) {
    res.status(401).json({ error: 'User unavailable' });
    return;
  }
  const roles = getUserRoles(userRow.id);
  const fresh = signAuthToken(userRow.id, userRow.email, roles);
  revokeToken(payload.jti);
  setSessionCookie(res, fresh.token);
  res.json({ accessToken: fresh.token, user: mapUserPublic(userRow) });
});

app.post('/api/auth/logout', (req, res) => {
  if (!verifyMutationOrigin(req)) {
    res.status(403).json({ error: 'Origin verification failed' });
    return;
  }
  const token = extractToken(req);
  if (token) {
    const payload = verifyAuthToken(token);
    if (payload) {
      revokeToken(payload.jti);
      auditLog(payload.sub, 'USER_LOGOUT', 'users', payload.sub, 'Session invalidated');
    }
  }
  clearSessionCookie(res);
  res.json({ ok: true, message: 'Logged out successfully' });
});

app.get('/api/auth/me', requireAuth, (req: AuthedRequest, res) => {
  const userRow = db.prepare(`SELECT * FROM users WHERE id = ?`).get(req.user!.sub) as any;
  if (!userRow) {
    res.status(404).json({ error: 'User not found' });
    return;
  }
  res.json({ user: mapUserPublic(userRow) });
});

app.post('/api/auth/forgot-password', rateLimit(15, 60_000), (req, res) => {
  const email = sanitizeText(req.body?.email, 160).toLowerCase();
  if (!email || !isValidEmail(email)) {
    res.status(400).json({ error: 'Valid email is required' });
    return;
  }
  const userRow = db.prepare(`SELECT id FROM users WHERE email = ?`).get(email) as { id: number } | undefined;
  if (!userRow) {
    res.json({ ok: true, message: 'If an account matches that email, reset instructions have been generated.' });
    return;
  }
  const rawToken = crypto.randomBytes(16).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  const expiresAt = new Date(Date.now() + 15 * 60_000).toISOString();
  db.prepare(`INSERT INTO password_resets (user_id, token_hash, expires_at) VALUES (?, ?, ?)`).run(userRow.id, tokenHash, expiresAt);

  res.json({
    ok: true,
    message: 'Password reset token generated (valid for 15 minutes).',
    resetTokenPreview: rawToken,
  });
});

app.post('/api/auth/reset-password', rateLimit(15, 60_000), (req, res) => {
  const rawToken = sanitizeText(req.body?.token, 128);
  const newPassword = typeof req.body?.newPassword === 'string' ? req.body.newPassword : '';
  if (!rawToken || newPassword.length < 6) {
    res.status(400).json({ error: 'Valid reset token and password (6+ chars) required' });
    return;
  }
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  const row = db
    .prepare(`SELECT * FROM password_resets WHERE token_hash = ? AND used = 0 ORDER BY id DESC LIMIT 1`)
    .get(tokenHash) as any;
  if (!row || new Date(row.expires_at).getTime() < Date.now()) {
    res.status(400).json({ error: 'Reset token is invalid or expired' });
    return;
  }
  const hash = hashPassword(newPassword);
  db.prepare(`UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?`).run(hash, row.user_id);
  db.prepare(`UPDATE password_resets SET used = 1 WHERE id = ?`).run(row.id);
  auditLog(row.user_id, 'PASSWORD_RESET', 'users', row.user_id, 'Password reset completed');
  res.json({ ok: true, message: 'Password updated successfully. You can now sign in.' });
});

// Single Demo Customer 1-Click Login (scoped strictly to CUSTOMER role)
app.post('/api/auth/demo', rateLimit(30, 60_000), (_req, res) => {
  const demoId = seedSingleDemoCustomer();
  const userRow = db.prepare(`SELECT * FROM users WHERE id = ? AND status = 'ACTIVE'`).get(demoId) as any;
  if (!userRow) {
    res.status(404).json({ error: 'Demo customer account unavailable' });
    return;
  }
  const roles = getUserRoles(userRow.id);
  const { token } = signAuthToken(userRow.id, userRow.email, roles);
  setSessionCookie(res, token);
  auditLog(userRow.id, 'DEMO_LOGIN', 'users', userRow.id, 'Demo shopper quick sign-in');
  res.json({ accessToken: token, user: mapUserPublic(userRow) });
});

// Easy Google Authentication (Supports full Google OAuth popup when GOOGLE_CLIENT_ID is set + instant Google Account Sign-In in preview)
function getGoogleCallbackUri(req: express.Request): string {
  const appUrl = process.env.APP_URL?.trim();
  if (appUrl && !appUrl.includes('MY_APP_URL')) {
    return `${appUrl.replace(/\/$/, '')}/api/auth/google/callback`;
  }
  const rawProto = (req.headers['x-forwarded-proto'] as string) || req.protocol || 'https';
  const rawHost = (req.headers['x-forwarded-host'] as string) || req.headers.host || 'localhost:3000';
  const proto = rawProto.split(',')[0].trim();
  const host = rawHost.split(',')[0].trim();
  return `${proto}://${host}/api/auth/google/callback`;
}

function upsertGoogleCustomer(email: string, fullName: string) {
  let userRow = db.prepare(`SELECT * FROM users WHERE email = ?`).get(email) as any;
  if (userRow) {
    if (userRow.status !== 'ACTIVE') {
      return { error: 'Account is suspended. Contact support.', status: 403 as const };
    }
    const existingRoles = getUserRoles(userRow.id);
    if (existingRoles.includes('ADMIN')) {
      return { error: 'Admin accounts must sign in with password and admin passcode.', status: 403 as const };
    }
    return { userRow };
  }

  const uid = db.transaction(() => {
    const info = db
      .prepare(`INSERT INTO users (full_name, email, mobile, password_hash, auth_provider) VALUES (?, ?, ?, ?, 'google')`)
      .run(fullName, email, '9876500000', hashPassword(crypto.randomBytes(24).toString('hex')));
    const userId = Number(info.lastInsertRowid);
    const custRole = db.prepare(`SELECT id FROM roles WHERE name = 'CUSTOMER'`).get() as { id: number };
    db.prepare(`INSERT OR IGNORE INTO user_roles (user_id, role_id) VALUES (?, ?)`).run(userId, custRole.id);
    db.prepare(`INSERT OR IGNORE INTO carts (user_id) VALUES (?)`).run(userId);
    db.prepare(`INSERT OR IGNORE INTO wishlists (user_id) VALUES (?)`).run(userId);
    return userId;
  })();

  userRow = db.prepare(`SELECT * FROM users WHERE id = ?`).get(uid) as any;
  createNotification(uid, 'AUTH', 'Welcome via Google!', `Namaste ${fullName}! Signed in easily with Google.`);
  return { userRow };
}

app.get('/api/auth/google/config', (req, res) => {
  const oauthConfigured = Boolean(process.env.GOOGLE_CLIENT_ID?.trim() && process.env.GOOGLE_CLIENT_SECRET?.trim());
  const supabaseConfigured = isSupabaseServerConfigured();
  const callbackUrl = getGoogleCallbackUri(req);
  const authCallbackUrl = callbackUrl.replace('/api/auth/google/callback', '/auth/callback');
  res.json({
    oauthConfigured,
    supabaseConfigured,
    callbackUrl,
    authCallbackUrl,
  });
});

app.post('/api/auth/supabase', rateLimit(30, 60_000), async (req, res) => {
  const accessToken = typeof req.body?.accessToken === 'string' ? req.body.accessToken.trim() : '';
  if (!accessToken) {
    res.status(400).json({ error: 'Supabase access token is required' });
    return;
  }

  try {
    const verified = await verifySupabaseAccessToken(accessToken);
    if (!verified) {
      res.status(401).json({ error: 'Invalid or expired Supabase session token' });
      return;
    }

    const result = upsertGoogleCustomer(verified.email, verified.fullName);
    if ('error' in result && result.error) {
      res.status(result.status ?? 403).json({ error: result.error });
      return;
    }

    const roles = getUserRoles(result.userRow.id);
    const { token } = signAuthToken(result.userRow.id, result.userRow.email, roles);
    setSessionCookie(res, token);
    auditLog(result.userRow.id, 'SUPABASE_OAUTH_LOGIN', 'users', result.userRow.id, `Supabase Google Auth (${verified.email})`);
    res.json({ accessToken: token, user: mapUserPublic(result.userRow) });
  } catch {
    res.status(500).json({ error: 'Unable to verify Supabase session' });
  }
});

app.get('/api/auth/google/url', (req, res) => {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  if (!clientId) {
    res.status(503).json({ error: 'Google OAuth Client ID is not configured in environment.' });
    return;
  }
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: getGoogleCallbackUri(req),
    response_type: 'code',
    scope: 'openid email profile',
    prompt: 'select_account',
  });
  res.json({ url: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}` });
});

const googleOAuthCallbackHandler = async (req: express.Request, res: express.Response) => {
  const oauthErr = typeof req.query.error === 'string' ? req.query.error : '';
  const code = typeof req.query.code === 'string' ? req.query.code : '';
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();

  const sendPopupError = (statusCode: number, message: string) => {
    const payload = JSON.stringify({ type: 'OAUTH_AUTH_ERROR', message }).replace(/</g, '\\u003c');
    res.status(statusCode).send(`
      <!doctype html>
      <html>
        <body>
          <script>
            if (window.opener) {
              window.opener.postMessage(${payload}, '*');
              window.close();
            }
          </script>
          <p>${message}</p>
        </body>
      </html>
    `);
  };

  if (oauthErr) {
    sendPopupError(400, 'Google Sign-In was cancelled or denied.');
    return;
  }

  if (!code || !clientId || !clientSecret) {
    sendPopupError(400, 'Google Sign-In cancelled or OAuth credentials are missing.');
    return;
  }

  try {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: getGoogleCallbackUri(req),
        grant_type: 'authorization_code',
      }),
    });
    const tokenData = (await tokenRes.json()) as { access_token?: string };
    if (!tokenData.access_token) {
      sendPopupError(400, 'Failed to exchange Google OAuth token.');
      return;
    }

    const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const profile = (await userRes.json()) as { email?: string; name?: string };
    const email = sanitizeText(profile.email || '', 160).toLowerCase();
    const fullName = sanitizeText(profile.name || email.split('@')[0] || 'Google Shopper', 120);
    if (!email || !isValidEmail(email)) {
      sendPopupError(400, 'Google account email unavailable.');
      return;
    }

    const result = upsertGoogleCustomer(email, fullName);
    if ('error' in result && result.error) {
      sendPopupError(result.status ?? 403, result.error);
      return;
    }

    const roles = getUserRoles(result.userRow.id);
    const { token } = signAuthToken(result.userRow.id, result.userRow.email, roles);
    setSessionCookie(res, token);
    auditLog(result.userRow.id, 'GOOGLE_OAUTH_LOGIN', 'users', result.userRow.id, `Google OAuth sign-in`);

    const userPublic = mapUserPublic(result.userRow);
    const successPayload = JSON.stringify({
      type: 'OAUTH_AUTH_SUCCESS',
      accessToken: token,
      user: userPublic,
    }).replace(/</g, '\\u003c');

    res.send(`
      <!doctype html>
      <html>
        <body>
          <script>
            if (window.opener) {
              window.opener.postMessage(${successPayload}, '*');
              window.close();
            } else {
              window.location.href = '/dashboard';
            }
          </script>
          <p>Signed in with Google. Closing window...</p>
        </body>
      </html>
    `);
  } catch {
    sendPopupError(500, 'Google Sign-In failed. Please close this popup and retry.');
  }
};

app.get(['/api/auth/google/callback', '/api/auth/google/callback/'], googleOAuthCallbackHandler);

app.post('/api/auth/google', rateLimit(30, 60_000), (req, res) => {
  const email = sanitizeText(req.body?.email, 160).toLowerCase();
  const rawName = sanitizeText(req.body?.fullName, 120);
  if (!email || !isValidEmail(email)) {
    res.status(400).json({ error: 'Please enter a valid Google email address' });
    return;
  }
  const fullName = rawName.length >= 2 ? rawName : email.split('@')[0].replace(/[._-]+/g, ' ');

  const existingLocal = db.prepare(`SELECT id, auth_provider FROM users WHERE email = ?`).get(email) as
    | { id: number; auth_provider: string }
    | undefined;
  if (existingLocal && existingLocal.auth_provider === 'local') {
    res.status(409).json({
      error: 'This email uses password sign-in. Enter your password or pick a Google email.',
    });
    return;
  }

  const result = upsertGoogleCustomer(email, fullName);
  if ('error' in result && result.error) {
    res.status(result.status ?? 403).json({ error: result.error });
    return;
  }

  const roles = getUserRoles(result.userRow.id);
  const { token } = signAuthToken(result.userRow.id, result.userRow.email, roles);
  setSessionCookie(res, token);
  auditLog(result.userRow.id, 'GOOGLE_QUICK_LOGIN', 'users', result.userRow.id, `Google quick sign-in (${email})`);
  res.json({ accessToken: token, user: mapUserPublic(result.userRow) });
});

// Passcode Admin Unlock & First-Run Setup (process.env.ADMIN_PASSCODE always takes precedence over locally claimed scrypt hash)
function getLocalAdminPasscodeHash(): string | null {
  const row = db.prepare(`SELECT value FROM app_settings WHERE key = 'admin_passcode_hash'`).get() as { value: string } | undefined;
  return row?.value || null;
}

function verifyAdminPasscode(inputPasscode: string): { ok: boolean; status: number; error?: string } {
  const envPass = process.env.ADMIN_PASSCODE?.trim();
  if (envPass) {
    const a = Buffer.from(inputPasscode);
    const b = Buffer.from(envPass);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      return { ok: false, status: 403, error: 'Incorrect admin passcode' };
    }
    return { ok: true, status: 200 };
  }

  const localHash = getLocalAdminPasscodeHash();
  if (localHash) {
    if (!verifyPassword(inputPasscode, localHash)) {
      return { ok: false, status: 403, error: 'Incorrect admin passcode' };
    }
    return { ok: true, status: 200 };
  }

  return {
    ok: false,
    status: 503,
    error: 'Set your Admin Passcode using the first-run setup form below to unlock Admin access.',
  };
}

function grantOrFetchAdminUser(email = 'admin@freshcart.in', fullName = 'FreshCart Admin', passwordForCreate?: string) {
  let userRow = db.prepare(`SELECT * FROM users WHERE email = ?`).get(email) as any;
  const adminRole = db.prepare(`SELECT id FROM roles WHERE name = 'ADMIN'`).get() as { id: number };
  const custRole = db.prepare(`SELECT id FROM roles WHERE name = 'CUSTOMER'`).get() as { id: number };

  if (!userRow) {
    const pwHash = hashPassword(passwordForCreate || crypto.randomBytes(24).toString('hex'));
    const info = db
      .prepare(`INSERT INTO users (full_name, email, mobile, password_hash) VALUES (?, ?, ?, ?)`)
      .run(fullName, email, '9000000001', pwHash);
    const uid = Number(info.lastInsertRowid);
    db.prepare(`INSERT OR IGNORE INTO user_roles (user_id, role_id) VALUES (?, ?), (?, ?)`).run(uid, custRole.id, uid, adminRole.id);
    db.prepare(`INSERT OR IGNORE INTO carts (user_id) VALUES (?)`).run(uid);
    db.prepare(`INSERT OR IGNORE INTO wishlists (user_id) VALUES (?)`).run(uid);
    userRow = db.prepare(`SELECT * FROM users WHERE id = ?`).get(uid);
  } else {
    db.prepare(`INSERT OR IGNORE INTO user_roles (user_id, role_id) VALUES (?, ?)`).run(userRow.id, adminRole.id);
  }
  return userRow;
}

app.get('/api/auth/admin/status', (_req, res) => {
  const adminCount = (
    db
      .prepare(`SELECT COUNT(*) as c FROM user_roles ur INNER JOIN roles r ON r.id = ur.role_id WHERE r.name = 'ADMIN'`)
      .get() as { c: number }
  ).c;
  const hasEnvPasscode = Boolean(process.env.ADMIN_PASSCODE && process.env.ADMIN_PASSCODE.trim().length > 0);
  const localPasscodeConfigured = Boolean(getLocalAdminPasscodeHash());
  res.json({
    adminClaimed: adminCount > 0,
    envPasscodeConfigured: hasEnvPasscode,
    localPasscodeConfigured,
    ready: hasEnvPasscode || localPasscodeConfigured,
  });
});

// One-time atomic bootstrap when process.env.ADMIN_PASSCODE is unset and no local passcode hash exists yet
app.post('/api/auth/admin/bootstrap', rateLimit(15, 60_000), (req, res) => {
  if (process.env.ADMIN_PASSCODE?.trim()) {
    res.status(409).json({ error: 'Server ADMIN_PASSCODE secret is already configured. Use Unlock Admin instead.' });
    return;
  }
  const passcode = typeof req.body?.passcode === 'string' ? req.body.passcode.trim() : '';
  if (passcode.length < 6) {
    res.status(400).json({ error: 'Choose an Admin Passcode of at least 6 characters.' });
    return;
  }

  const passcodeHash = hashPassword(passcode);
  const claimed = db.transaction(() => {
    const existing = db.prepare(`SELECT value FROM app_settings WHERE key = 'admin_passcode_hash'`).get();
    if (existing) return false;
    db.prepare(`INSERT INTO app_settings (key, value) VALUES ('admin_passcode_hash', ?)`).run(passcodeHash);
    return true;
  })();

  if (!claimed) {
    res.status(409).json({ error: 'Admin passcode is already initialized. Enter your passcode to unlock.' });
    return;
  }

  const userRow = grantOrFetchAdminUser();
  const roles = getUserRoles(userRow.id);
  const { token } = signAuthToken(userRow.id, userRow.email, roles);
  setSessionCookie(res, token);
  auditLog(userRow.id, 'ADMIN_BOOTSTRAP', 'app_settings', 'admin_passcode_hash', 'First-run admin passcode initialized');
  res.status(201).json({ accessToken: token, user: mapUserPublic(userRow) });
});

app.post('/api/auth/admin/unlock', rateLimit(20, 60_000), (req, res) => {
  const passcode = typeof req.body?.passcode === 'string' ? req.body.passcode.trim() : '';
  if (!passcode) {
    res.status(400).json({ error: 'Admin passcode is required' });
    return;
  }
  const check = verifyAdminPasscode(passcode);
  if (!check.ok) {
    res.status(check.status).json({ error: check.error });
    return;
  }

  const userRow = grantOrFetchAdminUser();
  const roles = getUserRoles(userRow.id);
  const { token } = signAuthToken(userRow.id, userRow.email, roles);
  setSessionCookie(res, token);
  auditLog(userRow.id, 'ADMIN_UNLOCK', 'users', userRow.id, 'Passcode-verified admin access');
  res.json({ accessToken: token, user: mapUserPublic(userRow) });
});

app.post('/api/auth/admin/claim', rateLimit(15, 60_000), (req, res) => {
  const email = sanitizeText(req.body?.email, 160).toLowerCase();
  const fullName = sanitizeText(req.body?.fullName, 120) || 'Store Administrator';
  const password = typeof req.body?.password === 'string' ? req.body.password : '';
  const passcode = typeof req.body?.passcode === 'string' ? req.body.passcode.trim() : '';

  const check = verifyAdminPasscode(passcode);
  if (!check.ok) {
    res.status(check.status).json({ error: check.error });
    return;
  }

  if (!email || !isValidEmail(email) || password.length < 6) {
    res.status(400).json({ error: 'Valid admin email and password (6+ characters) required' });
    return;
  }

  const userRow = grantOrFetchAdminUser(email, fullName, password);
  const roles = getUserRoles(userRow.id);
  const { token } = signAuthToken(userRow.id, userRow.email, roles);
  setSessionCookie(res, token);
  auditLog(userRow.id, 'ADMIN_CLAIM', 'users', userRow.id, `Admin access initialized for ${email}`);
  res.status(201).json({ accessToken: token, user: mapUserPublic(userRow) });
});

// ==========================================
// PROFILE & NOTIFICATIONS
// ==========================================
app.put('/api/profile', requireAuth, (req: AuthedRequest, res) => {
  const fullName = sanitizeText(req.body?.fullName, 120);
  const mobile = sanitizeText(req.body?.mobile, 24);
  if (!fullName || !isValidMobile(mobile)) {
    res.status(400).json({ error: 'Valid name and 10-15 digit mobile required' });
    return;
  }
  db.prepare(`UPDATE users SET full_name = ?, mobile = ?, updated_at = datetime('now') WHERE id = ?`).run(
    fullName,
    mobile,
    req.user!.sub
  );
  const userRow = db.prepare(`SELECT * FROM users WHERE id = ?`).get(req.user!.sub);
  res.json({ user: mapUserPublic(userRow) });
});

app.put('/api/profile/password', requireAuth, (req: AuthedRequest, res) => {
  const currentPassword = typeof req.body?.currentPassword === 'string' ? req.body.currentPassword : '';
  const newPassword = typeof req.body?.newPassword === 'string' ? req.body.newPassword : '';
  if (newPassword.length < 6) {
    res.status(400).json({ error: 'New password must be at least 6 characters' });
    return;
  }
  const userRow = db.prepare(`SELECT * FROM users WHERE id = ?`).get(req.user!.sub) as any;
  if (!verifyPassword(currentPassword, userRow.password_hash)) {
    res.status(400).json({ error: 'Current password is incorrect' });
    return;
  }
  db.prepare(`UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?`).run(
    hashPassword(newPassword),
    req.user!.sub
  );
  res.json({ ok: true, message: 'Password updated successfully' });
});

app.put('/api/profile/preferences', requireAuth, (req: AuthedRequest, res) => {
  const notifyOrders = req.body?.notifyOrders ? 1 : 0;
  const notifyOffers = req.body?.notifyOffers ? 1 : 0;
  const notifyDelivery = req.body?.notifyDelivery ? 1 : 0;
  db.prepare(
    `UPDATE users SET notify_orders = ?, notify_offers = ?, notify_delivery = ?, updated_at = datetime('now') WHERE id = ?`
  ).run(notifyOrders, notifyOffers, notifyDelivery, req.user!.sub);
  const userRow = db.prepare(`SELECT * FROM users WHERE id = ?`).get(req.user!.sub);
  res.json({ user: mapUserPublic(userRow) });
});

app.delete('/api/profile', requireAuth, (req: AuthedRequest, res) => {
  db.prepare(`DELETE FROM users WHERE id = ?`).run(req.user!.sub);
  clearSessionCookie(res);
  res.json({ ok: true });
});

app.get('/api/notifications', requireAuth, (req: AuthedRequest, res) => {
  const rows = db
    .prepare(`SELECT * FROM notifications WHERE user_id = ? ORDER BY id DESC LIMIT 50`)
    .all(req.user!.sub) as any[];
  res.json({
    notifications: rows.map((n) => ({
      id: n.id,
      type: n.type,
      title: n.title,
      message: n.message,
      isRead: Boolean(n.is_read),
      createdAt: n.created_at,
    })),
    unreadCount: rows.filter((n) => !n.is_read).length,
  });
});

app.put('/api/notifications/read-all', requireAuth, (req: AuthedRequest, res) => {
  db.prepare(`UPDATE notifications SET is_read = 1 WHERE user_id = ?`).run(req.user!.sub);
  res.json({ ok: true });
});

app.put('/api/notifications/:id/read', requireAuth, (req: AuthedRequest, res) => {
  db.prepare(`UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?`).run(Number(req.params.id), req.user!.sub);
  res.json({ ok: true });
});

app.delete('/api/notifications/:id', requireAuth, (req: AuthedRequest, res) => {
  const result = db.prepare(`DELETE FROM notifications WHERE id = ? AND user_id = ?`).run(Number(req.params.id), req.user!.sub);
  if (result.changes === 0) {
    res.status(404).json({ error: 'Notification not found' });
    return;
  }
  res.json({ ok: true });
});

app.delete('/api/notifications', requireAuth, (req: AuthedRequest, res) => {
  const readOnly = req.query.readOnly === 'true';
  if (readOnly) {
    db.prepare(`DELETE FROM notifications WHERE user_id = ? AND is_read = 1`).run(req.user!.sub);
  } else {
    db.prepare(`DELETE FROM notifications WHERE user_id = ?`).run(req.user!.sub);
  }
  res.json({ ok: true });
});

// ==========================================
// CATEGORIES & PRODUCTS
// ==========================================
app.get('/api/categories', (_req, res) => {
  const rows = db
    .prepare(
      `SELECT c.*, (SELECT COUNT(*) FROM products p WHERE p.category_id = c.id AND p.is_active = 1) as product_count
       FROM categories c ORDER BY c.display_order ASC`
    )
    .all() as any[];
  res.json({
    categories: rows.map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      description: c.description,
      imageUrl: c.image_url,
      productCount: c.product_count,
    })),
  });
});

function formatProductRow(p: any) {
  const effectivePrice = getEffectivePrice(p.price, p.discount_percent);
  return {
    id: p.id,
    categoryId: p.category_id,
    categoryName: p.category_name,
    categorySlug: p.category_slug,
    sku: p.sku,
    name: p.name,
    brand: p.brand,
    unit: p.unit,
    description: p.description,
    price: p.price,
    discountPercent: p.discount_percent,
    effectivePrice,
    rating: p.rating,
    reviewCount: p.review_count,
    isFeatured: Boolean(p.is_featured),
    isTrending: Boolean(p.is_trending),
    isBestseller: Boolean(p.is_bestseller),
    stockQuantity: p.stock_quantity ?? 0,
    imageUrl: p.image_url,
  };
}

app.get('/api/products', (req, res) => {
  const category = sanitizeText(req.query.category, 60);
  const brand = sanitizeText(req.query.brand, 80);
  const q = sanitizeText(req.query.q, 120);
  const minPrice = req.query.minPrice ? Number(req.query.minPrice) : null;
  const maxPrice = req.query.maxPrice ? Number(req.query.maxPrice) : null;
  const priceTier = sanitizeText(req.query.priceTier, 20).toLowerCase();
  const minRating = req.query.minRating ? Number(req.query.minRating) : null;
  const inStock = req.query.inStock === 'true';
  const sort = sanitizeText(req.query.sort, 30) || 'popular';

  let sql = `
    SELECT p.*, c.name as category_name, c.slug as category_slug, i.quantity as stock_quantity,
           (SELECT image_url FROM product_images WHERE product_id = p.id ORDER BY is_primary DESC, sort_order ASC LIMIT 1) as image_url
    FROM products p
    INNER JOIN categories c ON c.id = p.category_id
    INNER JOIN inventory i ON i.product_id = p.id
    WHERE p.is_active = 1
  `;
  const params: any[] = [];

  if (category && category !== 'all') {
    sql += ` AND c.slug = ?`;
    params.push(category);
  }
  if (brand && brand !== 'all') {
    sql += ` AND p.brand = ?`;
    params.push(brand);
  }
  if (q) {
    sql += ` AND (LOWER(p.name) LIKE ? OR LOWER(p.brand) LIKE ? OR LOWER(c.name) LIKE ? OR LOWER(p.description) LIKE ?)`;
    const pat = `%${q.toLowerCase()}%`;
    params.push(pat, pat, pat, pat);
  }
  if (minRating !== null && !Number.isNaN(minRating)) {
    sql += ` AND p.rating >= ?`;
    params.push(minRating);
  }
  if (inStock) {
    sql += ` AND i.quantity > 0`;
  }

  const rows = db.prepare(sql).all(...params) as any[];
  let items = rows.map(formatProductRow);

  if (priceTier === 'low') {
    items = items.filter((p) => p.effectivePrice <= 99);
  } else if (priceTier === 'medium') {
    items = items.filter((p) => p.effectivePrice >= 100 && p.effectivePrice <= 250);
  } else if (priceTier === 'high') {
    items = items.filter((p) => p.effectivePrice > 250);
  }
  if (minPrice !== null && !Number.isNaN(minPrice)) {
    items = items.filter((p) => p.effectivePrice >= minPrice);
  }
  if (maxPrice !== null && !Number.isNaN(maxPrice)) {
    items = items.filter((p) => p.effectivePrice <= maxPrice);
  }

  switch (sort) {
    case 'price_asc':
      items.sort((a, b) => a.effectivePrice - b.effectivePrice);
      break;
    case 'price_desc':
      items.sort((a, b) => b.effectivePrice - a.effectivePrice);
      break;
    case 'newest':
      items.sort((a, b) => b.id - a.id);
      break;
    case 'rating':
      items.sort((a, b) => b.rating - a.rating);
      break;
    default:
      items.sort((a, b) => b.reviewCount - a.reviewCount);
  }

  const brands = Array.from(new Set(rows.map((r) => r.brand))).sort();
  res.json({ items, total: items.length, brands });
});

app.get('/api/products/search', (req, res) => {
  const q = sanitizeText(req.query.q, 120);
  if (!q) {
    res.json({ items: [], suggestions: [] });
    return;
  }
  const pat = `%${q.toLowerCase()}%`;
  const rows = db
    .prepare(
      `SELECT p.*, c.name as category_name, c.slug as category_slug, i.quantity as stock_quantity,
              (SELECT image_url FROM product_images WHERE product_id = p.id ORDER BY is_primary DESC, sort_order ASC LIMIT 1) as image_url
       FROM products p
       INNER JOIN categories c ON c.id = p.category_id
       INNER JOIN inventory i ON i.product_id = p.id
       WHERE p.is_active = 1 AND (LOWER(p.name) LIKE ? OR LOWER(p.brand) LIKE ? OR LOWER(c.name) LIKE ?)
       ORDER BY p.is_trending DESC, p.rating DESC`
    )
    .all(pat, pat, pat) as any[];

  const items = rows.map(formatProductRow);
  const suggestions = items.slice(0, 6).map((p) => ({ id: p.id, name: p.name, categoryName: p.categoryName, price: p.effectivePrice }));
  res.json({ items, suggestions });
});

app.get('/api/products/:id', (req, res) => {
  const id = Number(req.params.id);
  const row = db
    .prepare(
      `SELECT p.*, c.name as category_name, c.slug as category_slug, i.quantity as stock_quantity,
              (SELECT image_url FROM product_images WHERE product_id = p.id ORDER BY is_primary DESC, sort_order ASC LIMIT 1) as image_url
       FROM products p
       INNER JOIN categories c ON c.id = p.category_id
       INNER JOIN inventory i ON i.product_id = p.id
       WHERE p.id = ? AND p.is_active = 1`
    )
    .get(id) as any;

  if (!row) {
    res.status(404).json({ error: 'Product not found' });
    return;
  }

  const images = db.prepare(`SELECT image_url FROM product_images WHERE product_id = ? ORDER BY sort_order ASC`).all(id) as any[];
  const reviews = db.prepare(`SELECT * FROM reviews WHERE product_id = ? ORDER BY id DESC`).all(id) as any[];
  const relatedRows = db
    .prepare(
      `SELECT p.*, c.name as category_name, c.slug as category_slug, i.quantity as stock_quantity,
              (SELECT image_url FROM product_images WHERE product_id = p.id ORDER BY is_primary DESC, sort_order ASC LIMIT 1) as image_url
       FROM products p
       INNER JOIN categories c ON c.id = p.category_id
       INNER JOIN inventory i ON i.product_id = p.id
       WHERE p.category_id = ? AND p.id != ? AND p.is_active = 1 LIMIT 4`
    )
    .all(row.category_id, id) as any[];

  res.json({
    product: {
      ...formatProductRow(row),
      images: images.map((im) => im.image_url),
    },
    reviews: reviews.map((r) => ({
      id: r.id,
      authorName: r.author_name,
      rating: r.rating,
      comment: r.comment,
      createdAt: r.created_at,
    })),
    related: relatedRows.map(formatProductRow),
  });
});

app.post('/api/products/:id/reviews', requireAuth, (req: AuthedRequest, res) => {
  const productId = Number(req.params.id);
  const rating = Number(req.body?.rating);
  const comment = sanitizeText(req.body?.comment, 600);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5 || comment.length < 3) {
    res.status(400).json({ error: 'Rating (1-5) and comment required' });
    return;
  }
  const userRow = db.prepare(`SELECT full_name FROM users WHERE id = ?`).get(req.user!.sub) as { full_name: string };
  db.prepare(`INSERT INTO reviews (product_id, user_id, author_name, rating, comment) VALUES (?, ?, ?, ?, ?)`).run(
    productId,
    req.user!.sub,
    userRow.full_name,
    rating,
    comment
  );
  const agg = db.prepare(`SELECT AVG(rating) as avgRating, COUNT(*) as cnt FROM reviews WHERE product_id = ?`).get(productId) as any;
  if (agg && agg.cnt > 0) {
    db.prepare(`UPDATE products SET rating = ?, review_count = ? WHERE id = ?`).run(
      Number(agg.avgRating.toFixed(1)),
      agg.cnt,
      productId
    );
  }
  res.status(201).json({ ok: true });
});

// ==========================================
// SHOPPING CART
// ==========================================
app.get('/api/cart', requireAuth, (req: AuthedRequest, res) => {
  res.json(buildCartSnapshot(req.user!.sub));
});

app.post('/api/cart/items', requireAuth, (req: AuthedRequest, res) => {
  const productId = Number(req.body?.productId);
  const quantity = Number(req.body?.quantity ?? 1);
  if (!Number.isInteger(productId) || !Number.isInteger(quantity) || quantity <= 0) {
    res.status(400).json({ error: 'Quantity must be a positive integer' });
    return;
  }

  const product = db
    .prepare(
      `SELECT p.id, p.name, i.quantity as stock_quantity FROM products p INNER JOIN inventory i ON i.product_id = p.id WHERE p.id = ? AND p.is_active = 1`
    )
    .get(productId) as { id: number; name: string; stock_quantity: number } | undefined;

  if (!product) {
    res.status(404).json({ error: 'Product not found' });
    return;
  }

  let cart = db.prepare(`SELECT id FROM carts WHERE user_id = ?`).get(req.user!.sub) as { id: number } | undefined;
  if (!cart) {
    const info = db.prepare(`INSERT INTO carts (user_id) VALUES (?)`).run(req.user!.sub);
    cart = { id: Number(info.lastInsertRowid) };
  }

  const existing = db.prepare(`SELECT id, quantity FROM cart_items WHERE cart_id = ? AND product_id = ?`).get(cart.id, productId) as
    | { id: number; quantity: number }
    | undefined;
  const targetQty = (existing ? existing.quantity : 0) + quantity;

  if (targetQty > product.stock_quantity) {
    res.status(400).json({
      error: product.stock_quantity === 0 ? `${product.name} is currently out of stock` : `Insufficient stock. Only ${product.stock_quantity} left.`,
    });
    return;
  }

  if (existing) {
    db.prepare(`UPDATE cart_items SET quantity = ?, updated_at = datetime('now') WHERE id = ?`).run(targetQty, existing.id);
  } else {
    db.prepare(`INSERT INTO cart_items (cart_id, product_id, quantity) VALUES (?, ?, ?)`).run(cart.id, productId, targetQty);
  }

  res.json(buildCartSnapshot(req.user!.sub));
});

app.put('/api/cart/items/:id', requireAuth, (req: AuthedRequest, res) => {
  const itemId = Number(req.params.id);
  const quantity = Number(req.body?.quantity);
  if (!Number.isInteger(quantity) || quantity < 0) {
    res.status(400).json({ error: 'Invalid quantity' });
    return;
  }

  const row = db
    .prepare(
      `SELECT ci.id, ci.product_id, c.user_id, i.quantity as stock_quantity
       FROM cart_items ci
       INNER JOIN carts c ON c.id = ci.cart_id
       INNER JOIN inventory i ON i.product_id = ci.product_id
       WHERE ci.id = ?`
    )
    .get(itemId) as any;

  if (!row || row.user_id !== req.user!.sub) {
    res.status(404).json({ error: 'Cart item not found' });
    return;
  }

  if (quantity === 0) {
    db.prepare(`DELETE FROM cart_items WHERE id = ?`).run(itemId);
    res.json(buildCartSnapshot(req.user!.sub));
    return;
  }

  if (quantity > row.stock_quantity) {
    res.status(400).json({ error: `Only ${row.stock_quantity} unit(s) available in stock` });
    return;
  }

  db.prepare(`UPDATE cart_items SET quantity = ?, updated_at = datetime('now') WHERE id = ?`).run(quantity, itemId);
  res.json(buildCartSnapshot(req.user!.sub));
});

app.delete('/api/cart/items/:id', requireAuth, (req: AuthedRequest, res) => {
  const itemId = Number(req.params.id);
  db.prepare(
    `DELETE FROM cart_items WHERE id = ? AND cart_id IN (SELECT id FROM carts WHERE user_id = ?)`
  ).run(itemId, req.user!.sub);
  res.json(buildCartSnapshot(req.user!.sub));
});

app.delete('/api/cart', requireAuth, (req: AuthedRequest, res) => {
  db.prepare(`DELETE FROM cart_items WHERE cart_id IN (SELECT id FROM carts WHERE user_id = ?)`).run(req.user!.sub);
  db.prepare(`UPDATE carts SET applied_coupon_code = NULL WHERE user_id = ?`).run(req.user!.sub);
  res.json(buildCartSnapshot(req.user!.sub));
});

app.post('/api/cart/coupon', requireAuth, (req: AuthedRequest, res) => {
  const code = sanitizeText(req.body?.code, 32).toUpperCase();
  if (!code) {
    db.prepare(`UPDATE carts SET applied_coupon_code = NULL WHERE user_id = ?`).run(req.user!.sub);
    res.json(buildCartSnapshot(req.user!.sub));
    return;
  }
  const cartSnap = buildCartSnapshot(req.user!.sub);
  const check = evaluateCouponForUser(code, req.user!.sub, cartSnap.subtotal);
  if (!check.valid) {
    res.status(check.status).json({ error: check.error });
    return;
  }
  db.prepare(`UPDATE carts SET applied_coupon_code = ? WHERE user_id = ?`).run(code, req.user!.sub);
  res.json(buildCartSnapshot(req.user!.sub));
});

// ==========================================
// WISHLIST
// ==========================================
function buildWishlist(userId: number) {
  let wl = db.prepare(`SELECT id FROM wishlists WHERE user_id = ?`).get(userId) as { id: number } | undefined;
  if (!wl) {
    const info = db.prepare(`INSERT INTO wishlists (user_id) VALUES (?)`).run(userId);
    wl = { id: Number(info.lastInsertRowid) };
  }
  const rows = db
    .prepare(
      `SELECT wi.id, wi.product_id, p.name, p.brand, p.unit, p.price, p.discount_percent, p.rating,
              i.quantity as stock_quantity,
              (SELECT image_url FROM product_images WHERE product_id = p.id ORDER BY is_primary DESC, sort_order ASC LIMIT 1) as image_url
       FROM wishlist_items wi
       INNER JOIN products p ON p.id = wi.product_id
       INNER JOIN inventory i ON i.product_id = p.id
       WHERE wi.wishlist_id = ?
       ORDER BY wi.id DESC`
    )
    .all(wl.id) as any[];
  return {
    items: rows.map((r) => ({
      id: r.id,
      productId: r.product_id,
      name: r.name,
      brand: r.brand,
      unit: r.unit,
      price: r.price,
      discountPercent: r.discount_percent,
      effectivePrice: getEffectivePrice(r.price, r.discount_percent),
      rating: r.rating,
      stockQuantity: r.stock_quantity,
      imageUrl: r.image_url,
    })),
  };
}

app.get('/api/wishlist', requireAuth, (req: AuthedRequest, res) => {
  res.json(buildWishlist(req.user!.sub));
});

app.post('/api/wishlist/items', requireAuth, (req: AuthedRequest, res) => {
  const productId = Number(req.body?.productId);
  const exists = db.prepare(`SELECT id FROM products WHERE id = ? AND is_active = 1`).get(productId);
  if (!exists) {
    res.status(404).json({ error: 'Product not found' });
    return;
  }
  let wl = db.prepare(`SELECT id FROM wishlists WHERE user_id = ?`).get(req.user!.sub) as { id: number } | undefined;
  if (!wl) {
    const info = db.prepare(`INSERT INTO wishlists (user_id) VALUES (?)`).run(req.user!.sub);
    wl = { id: Number(info.lastInsertRowid) };
  }
  db.prepare(`INSERT OR IGNORE INTO wishlist_items (wishlist_id, product_id) VALUES (?, ?)`).run(wl.id, productId);
  res.json(buildWishlist(req.user!.sub));
});

app.delete('/api/wishlist/items/:id', requireAuth, (req: AuthedRequest, res) => {
  const id = Number(req.params.id);
  db.prepare(
    `DELETE FROM wishlist_items WHERE (id = ? OR product_id = ?) AND wishlist_id IN (SELECT id FROM wishlists WHERE user_id = ?)`
  ).run(id, id, req.user!.sub);
  res.json(buildWishlist(req.user!.sub));
});

app.post('/api/wishlist/items/:id/move-to-cart', requireAuth, (req: AuthedRequest, res) => {
  const id = Number(req.params.id);
  const item = db
    .prepare(
      `SELECT wi.id, wi.product_id, i.quantity as stock_quantity
       FROM wishlist_items wi
       INNER JOIN wishlists w ON w.id = wi.wishlist_id
       INNER JOIN inventory i ON i.product_id = wi.product_id
       WHERE wi.id = ? AND w.user_id = ?`
    )
    .get(id, req.user!.sub) as any;

  if (!item) {
    res.status(404).json({ error: 'Wishlist item not found' });
    return;
  }
  if (item.stock_quantity < 1) {
    res.status(400).json({ error: 'Item is currently out of stock' });
    return;
  }
  let cart = db.prepare(`SELECT id FROM carts WHERE user_id = ?`).get(req.user!.sub) as { id: number } | undefined;
  if (!cart) {
    const info = db.prepare(`INSERT INTO carts (user_id) VALUES (?)`).run(req.user!.sub);
    cart = { id: Number(info.lastInsertRowid) };
  }
  const existing = db.prepare(`SELECT id, quantity FROM cart_items WHERE cart_id = ? AND product_id = ?`).get(cart.id, item.product_id) as any;
  if (existing) {
    if (existing.quantity + 1 <= item.stock_quantity) {
      db.prepare(`UPDATE cart_items SET quantity = quantity + 1 WHERE id = ?`).run(existing.id);
    }
  } else {
    db.prepare(`INSERT INTO cart_items (cart_id, product_id, quantity) VALUES (?, ?, 1)`).run(cart.id, item.product_id);
  }
  db.prepare(`DELETE FROM wishlist_items WHERE id = ?`).run(item.id);
  res.json({ wishlist: buildWishlist(req.user!.sub), cart: buildCartSnapshot(req.user!.sub) });
});

// ==========================================
// COUPONS
// ==========================================
app.get('/api/coupons', (_req, res) => {
  const rows = db.prepare(`SELECT * FROM coupons WHERE is_active = 1 ORDER BY id ASC`).all() as any[];
  res.json({
    coupons: rows.map((c) => ({
      id: c.id,
      code: c.code,
      title: c.title,
      description: c.description,
      discountType: c.discount_type,
      discountValue: c.discount_value,
      minOrderAmount: c.min_order_amount,
      maxDiscountAmount: c.max_discount_amount,
      expiresAt: c.expires_at,
      isExpired: new Date(c.expires_at).getTime() < Date.now(),
    })),
  });
});

app.post('/api/coupons/validate', requireAuth, (req: AuthedRequest, res) => {
  const code = sanitizeText(req.body?.code, 32);
  const subtotal = Number(req.body?.subtotal ?? buildCartSnapshot(req.user!.sub).subtotal);
  const result = evaluateCouponForUser(code, req.user!.sub, subtotal);
  if (!result.valid) {
    res.status(result.status).json({ valid: false, error: result.error });
    return;
  }
  res.json(result);
});

// ==========================================
// ADDRESSES
// ==========================================
function formatAddress(a: any) {
  return {
    id: a.id,
    label: a.label,
    recipientName: a.recipient_name,
    mobile: a.mobile,
    street: a.street,
    apartment: a.apartment,
    city: a.city,
    state: a.state,
    postalCode: a.postal_code,
    lat: typeof a.lat === 'number' ? a.lat : 12.9716,
    lng: typeof a.lng === 'number' ? a.lng : 77.5946,
    isDefault: Boolean(a.is_default),
  };
}

app.get('/api/addresses', requireAuth, (req: AuthedRequest, res) => {
  const rows = db.prepare(`SELECT * FROM addresses WHERE user_id = ? ORDER BY is_default DESC, id DESC`).all(req.user!.sub);
  res.json({ addresses: rows.map(formatAddress) });
});

app.post('/api/addresses', requireAuth, (req: AuthedRequest, res) => {
  const label = sanitizeText(req.body?.label, 40) || 'Home';
  const recipientName = sanitizeText(req.body?.recipientName, 100);
  const mobile = sanitizeText(req.body?.mobile, 24);
  const street = sanitizeText(req.body?.street, 200);
  const apartment = sanitizeText(req.body?.apartment, 80);
  const city = sanitizeText(req.body?.city, 80);
  const state = sanitizeText(req.body?.state, 60);
  const postalCode = sanitizeText(req.body?.postalCode, 20);
  const lat = Number.isFinite(Number(req.body?.lat)) ? Number(req.body.lat) : 12.9716;
  const lng = Number.isFinite(Number(req.body?.lng)) ? Number(req.body.lng) : 77.5946;
  const isDefault = Boolean(req.body?.isDefault);

  if (!recipientName || !street || !city || !state || !postalCode) {
    res.status(400).json({ error: 'Recipient name, street, city, state, and PIN code are required' });
    return;
  }
  if (!isValidMobile(mobile)) {
    res.status(400).json({ error: 'Invalid mobile number. Enter 10-15 digits.' });
    return;
  }

  const tx = db.transaction(() => {
    const existingCount = (db.prepare(`SELECT COUNT(*) as c FROM addresses WHERE user_id = ?`).get(req.user!.sub) as { c: number }).c;
    const makeDefault = isDefault || existingCount === 0 ? 1 : 0;
    if (makeDefault) {
      db.prepare(`UPDATE addresses SET is_default = 0 WHERE user_id = ?`).run(req.user!.sub);
    }
    const info = db
      .prepare(
        `INSERT INTO addresses (user_id, label, recipient_name, mobile, street, apartment, city, state, postal_code, lat, lng, is_default)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(req.user!.sub, label, recipientName, mobile, street, apartment, city, state, postalCode, lat, lng, makeDefault);
    return Number(info.lastInsertRowid);
  });

  const id = tx();
  const created = db.prepare(`SELECT * FROM addresses WHERE id = ?`).get(id);
  res.status(201).json({ address: formatAddress(created) });
});

app.put('/api/addresses/:id', requireAuth, (req: AuthedRequest, res) => {
  const id = Number(req.params.id);
  const existing = db.prepare(`SELECT * FROM addresses WHERE id = ? AND user_id = ?`).get(id, req.user!.sub) as any;
  if (!existing) {
    res.status(404).json({ error: 'Address not found' });
    return;
  }
  const label = sanitizeText(req.body?.label, 40) || existing.label;
  const recipientName = sanitizeText(req.body?.recipientName, 100) || existing.recipient_name;
  const mobile = sanitizeText(req.body?.mobile, 24) || existing.mobile;
  const street = sanitizeText(req.body?.street, 200) || existing.street;
  const apartment = sanitizeText(req.body?.apartment, 80);
  const city = sanitizeText(req.body?.city, 80) || existing.city;
  const state = sanitizeText(req.body?.state, 60) || existing.state;
  const postalCode = sanitizeText(req.body?.postalCode, 20) || existing.postal_code;
  const lat = Number.isFinite(Number(req.body?.lat)) ? Number(req.body.lat) : existing.lat ?? 12.9716;
  const lng = Number.isFinite(Number(req.body?.lng)) ? Number(req.body.lng) : existing.lng ?? 77.5946;
  const isDefault = req.body?.isDefault !== undefined ? Boolean(req.body.isDefault) : Boolean(existing.is_default);

  if (!isValidMobile(mobile)) {
    res.status(400).json({ error: 'Invalid mobile number' });
    return;
  }

  db.transaction(() => {
    if (isDefault) {
      db.prepare(`UPDATE addresses SET is_default = 0 WHERE user_id = ?`).run(req.user!.sub);
    }
    db.prepare(
      `UPDATE addresses SET label=?, recipient_name=?, mobile=?, street=?, apartment=?, city=?, state=?, postal_code=?, lat=?, lng=?, is_default=?, updated_at=datetime('now')
       WHERE id = ? AND user_id = ?`
    ).run(label, recipientName, mobile, street, apartment, city, state, postalCode, lat, lng, isDefault ? 1 : 0, id, req.user!.sub);
  })();

  const updated = db.prepare(`SELECT * FROM addresses WHERE id = ?`).get(id);
  res.json({ address: formatAddress(updated) });
});

app.put('/api/addresses/:id/default', requireAuth, (req: AuthedRequest, res) => {
  const id = Number(req.params.id);
  const existing = db.prepare(`SELECT id FROM addresses WHERE id = ? AND user_id = ?`).get(id, req.user!.sub);
  if (!existing) {
    res.status(404).json({ error: 'Address not found' });
    return;
  }
  db.transaction(() => {
    db.prepare(`UPDATE addresses SET is_default = 0 WHERE user_id = ?`).run(req.user!.sub);
    db.prepare(`UPDATE addresses SET is_default = 1 WHERE id = ?`).run(id);
  })();
  res.json({ ok: true });
});

app.delete('/api/addresses/:id', requireAuth, (req: AuthedRequest, res) => {
  db.prepare(`DELETE FROM addresses WHERE id = ? AND user_id = ?`).run(Number(req.params.id), req.user!.sub);
  res.json({ ok: true });
});

// ==========================================
// ORDERS & CHECKOUT (TRANSACTIONAL)
// ==========================================
const ORDER_STEPS = [
  { key: 'ORDER_PLACED', label: 'Order Placed', progress: 15 },
  { key: 'CONFIRMED', label: 'Confirmed by Store', progress: 30 },
  { key: 'PREPARING', label: 'Packing Fresh Produce', progress: 50 },
  { key: 'PACKED', label: 'Sealed & Quality Checked', progress: 68 },
  { key: 'OUT_FOR_DELIVERY', label: 'Scooter En Route', progress: 85 },
  { key: 'DELIVERED', label: 'Delivered to Doorstep', progress: 100 },
];

function buildInitialTimeline(status = 'ORDER_PLACED') {
  const idx = ORDER_STEPS.findIndex((s) => s.key === status);
  return ORDER_STEPS.map((s, i) => ({
    status: s.key,
    label: s.label,
    completed: i <= (idx >= 0 ? idx : 0),
    timestamp: i <= (idx >= 0 ? idx : 0) ? new Date().toISOString() : null,
  }));
}

function formatOrder(o: any) {
  const items = db.prepare(`SELECT * FROM order_items WHERE order_id = ?`).all(o.id) as any[];
  return {
    id: o.id,
    orderNumber: o.order_number,
    userId: o.user_id,
    shippingAddress: JSON.parse(o.shipping_snapshot),
    deliverySlot: o.delivery_slot,
    deliveryInstructions: o.delivery_instructions,
    subtotal: o.subtotal,
    discountAmount: o.discount_amount,
    taxAmount: o.tax_amount,
    deliveryFee: o.delivery_fee,
    totalAmount: o.total_amount,
    couponCode: o.coupon_code,
    status: o.status,
    paymentStatus: o.payment_status,
    paymentMethod: o.payment_method,
    createdAt: o.created_at,
    items: items.map((it) => ({
      id: it.id,
      productId: it.product_id,
      productName: it.product_name,
      productImage: it.product_image,
      unitPrice: it.unit_price,
      quantity: it.quantity,
      lineTotal: it.line_total,
    })),
  };
}

app.post('/api/orders', requireAuth, (req: AuthedRequest, res) => {
  const userId = req.user!.sub;
  const addressId = Number(req.body?.addressId);
  const paymentMethod = sanitizeText(req.body?.paymentMethod, 30) || 'UPI';
  const deliverySlot = sanitizeText(req.body?.deliverySlot, 60) || 'Express (30-45 mins)';
  const deliveryInstructions = sanitizeText(req.body?.deliveryInstructions, 300);
  const idempotencyKey = sanitizeText(req.body?.idempotencyKey, 100) || crypto.randomUUID();

  // Prevent duplicate order submission
  const existingOrder = db.prepare(`SELECT * FROM orders WHERE idempotency_key = ? AND user_id = ?`).get(idempotencyKey, userId) as any;
  if (existingOrder) {
    res.status(200).json({ order: formatOrder(existingOrder), duplicatePrevented: true });
    return;
  }

  const address = db.prepare(`SELECT * FROM addresses WHERE id = ? AND user_id = ?`).get(addressId, userId) as any;
  if (!address) {
    res.status(400).json({ error: 'Valid delivery address is required' });
    return;
  }

  const cartSnap = buildCartSnapshot(userId);
  if (cartSnap.items.length === 0) {
    res.status(400).json({ error: 'Your shopping cart is empty' });
    return;
  }

  const couponCode = sanitizeText(req.body?.couponCode || cartSnap.appliedCoupon || '', 32).toUpperCase() || null;

  try {
    const createdOrderId = db.transaction(() => {
      // Server-side inventory check & atomic deduction
      for (const item of cartSnap.items) {
        const deduct = db
          .prepare(`UPDATE inventory SET quantity = quantity - ?, updated_at = datetime('now') WHERE product_id = ? AND quantity >= ?`)
          .run(item.quantity, item.productId, item.quantity);
        if (deduct.changes === 0) {
          throw new Error(`Insufficient stock for ${item.name}`);
        }
      }

      let discountAmount = 0;
      let verifiedCouponId: number | null = null;
      if (couponCode) {
        const check = evaluateCouponForUser(couponCode, userId, cartSnap.subtotal);
        if (!check.valid) {
          throw new Error(check.error || 'Coupon no longer valid');
        }
        discountAmount = check.discountAmount;
        verifiedCouponId = check.coupon!.id;
      }

      const taxableBase = Math.max(0, cartSnap.subtotal - discountAmount);
      const taxAmount = roundMoney(taxableBase * 0.05);
      const deliveryFee = cartSnap.subtotal >= 99 ? 0 : 39;
      const totalAmount = roundMoney(taxableBase + taxAmount + deliveryFee);

      const orderNumber = `FC-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;
      const initialStatus = paymentMethod === 'COD' ? 'CONFIRMED' : 'ORDER_PLACED';
      const initialPaymentStatus = paymentMethod === 'COD' ? 'COD_PENDING' : 'PENDING';

      const info = db
        .prepare(
          `INSERT INTO orders (order_number, user_id, address_id, shipping_snapshot, delivery_slot, delivery_instructions,
                               subtotal, discount_amount, tax_amount, delivery_fee, total_amount, coupon_code,
                               status, payment_status, payment_method, idempotency_key)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          orderNumber,
          userId,
          addressId,
          JSON.stringify(formatAddress(address)),
          deliverySlot,
          deliveryInstructions,
          cartSnap.subtotal,
          discountAmount,
          taxAmount,
          deliveryFee,
          totalAmount,
          couponCode,
          initialStatus,
          initialPaymentStatus,
          paymentMethod,
          idempotencyKey
        );

      const orderId = Number(info.lastInsertRowid);

      const insertItem = db.prepare(
        `INSERT INTO order_items (order_id, product_id, product_name, product_image, unit_price, quantity, line_total)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      );
      for (const item of cartSnap.items) {
        insertItem.run(orderId, item.productId, item.name, item.imageUrl, item.unitPrice, item.quantity, item.lineTotal);
      }

      if (verifiedCouponId) {
        db.prepare(`INSERT INTO coupon_usage (coupon_id, user_id, order_id) VALUES (?, ?, ?)`).run(verifiedCouponId, userId, orderId);
      }

      const riderFleet = [
        'Aarav Sharma (Electric Scooter #KA-01-FC01)',
        'Kabir Verma (Saffron Moped #MH-02-FC02)',
        'Rohan Nair (Sky Cargo E-Bike #TN-09-FC03)',
        'Vikram Patel (Crimson Cruiser #GJ-01-FC04)',
        'Dev Deshmukh (Violet Cafe E-Moto #DL-03-FC05)',
      ];
      const assignedRider = riderFleet[orderId % riderFleet.length];
      const destLat = typeof address.lat === 'number' ? address.lat : 12.9716;
      const destLng = typeof address.lng === 'number' ? address.lng : 77.5946;
      const storeLat = destLat - 0.022;
      const storeLng = destLng - 0.026;

      db.prepare(
        `INSERT INTO delivery_tracking (order_id, driver_name, current_status, progress_percent, eta_minutes, current_lat, current_lng, is_simulated, timeline_json)
         VALUES (?, ?, ?, ?, 28, ?, ?, 1, ?)`
      ).run(
        orderId,
        assignedRider,
        initialStatus,
        initialStatus === 'CONFIRMED' ? 30 : 15,
        storeLat,
        storeLng,
        JSON.stringify(buildInitialTimeline(initialStatus))
      );

      // Clear cart
      db.prepare(`DELETE FROM cart_items WHERE cart_id IN (SELECT id FROM carts WHERE user_id = ?)`).run(userId);
      db.prepare(`UPDATE carts SET applied_coupon_code = NULL WHERE user_id = ?`).run(userId);

      auditLog(userId, 'ORDER_CREATED', 'orders', orderId, `Order ${orderNumber} total ₹${totalAmount}`);
      return orderId;
    })();

    const orderRow = db.prepare(`SELECT * FROM orders WHERE id = ?`).get(createdOrderId) as any;
    createNotification(
      userId,
      'ORDER',
      `Order ${orderRow.order_number} Placed`,
      `Your groceries (₹${orderRow.total_amount.toFixed(2)}) have been queued for fresh packing.`
    );

    res.status(201).json({ order: formatOrder(orderRow) });
  } catch (err: any) {
    res.status(400).json({ error: err?.message || 'Unable to place order' });
  }
});

app.get('/api/orders', requireAuth, (req: AuthedRequest, res) => {
  const rows = db.prepare(`SELECT * FROM orders WHERE user_id = ? ORDER BY id DESC`).all(req.user!.sub) as any[];
  res.json({ orders: rows.map(formatOrder) });
});

app.get('/api/orders/:id', requireAuth, (req: AuthedRequest, res) => {
  const id = Number(req.params.id);
  const roles = getUserRoles(req.user!.sub);
  const order = db.prepare(`SELECT * FROM orders WHERE id = ?`).get(id) as any;
  if (!order || (order.user_id !== req.user!.sub && !roles.includes('ADMIN'))) {
    res.status(404).json({ error: 'Order not found' });
    return;
  }
  const payment = db.prepare(`SELECT * FROM payments WHERE order_id = ? ORDER BY id DESC LIMIT 1`).get(id) as any;
  res.json({
    order: formatOrder(order),
    payment: payment
      ? {
          id: payment.id,
          method: payment.method,
          amount: payment.amount,
          status: payment.status,
          transactionRef: payment.transaction_ref,
          maskedInstrument: payment.masked_instrument,
          createdAt: payment.created_at,
        }
      : null,
  });
});

app.post('/api/orders/:id/cancel', requireAuth, (req: AuthedRequest, res) => {
  const id = Number(req.params.id);
  const order = db.prepare(`SELECT * FROM orders WHERE id = ? AND user_id = ?`).get(id, req.user!.sub) as any;
  if (!order) {
    res.status(404).json({ error: 'Order not found' });
    return;
  }
  if (!['ORDER_PLACED', 'CONFIRMED', 'PREPARING'].includes(order.status)) {
    res.status(400).json({ error: `Orders in ${order.status} stage cannot be cancelled` });
    return;
  }

  db.transaction(() => {
    const items = db.prepare(`SELECT product_id, quantity FROM order_items WHERE order_id = ?`).all(id) as { product_id: number; quantity: number }[];
    for (const it of items) {
      db.prepare(`UPDATE inventory SET quantity = quantity + ?, updated_at = datetime('now') WHERE product_id = ?`).run(it.quantity, it.product_id);
    }
    db.prepare(`UPDATE orders SET status = 'CANCELLED', updated_at = datetime('now') WHERE id = ?`).run(id);
    db.prepare(`UPDATE delivery_tracking SET current_status = 'CANCELLED', eta_minutes = 0, updated_at = datetime('now') WHERE order_id = ?`).run(id);
  })();

  const updated = db.prepare(`SELECT * FROM orders WHERE id = ?`).get(id) as any;
  createNotification(req.user!.sub, 'ORDER', `Order ${order.order_number} Cancelled`, 'Your order was cancelled and inventory has been released.');
  res.json({ order: formatOrder(updated) });
});

app.post('/api/orders/:id/reorder', requireAuth, (req: AuthedRequest, res) => {
  const id = Number(req.params.id);
  const order = db.prepare(`SELECT * FROM orders WHERE id = ? AND user_id = ?`).get(id, req.user!.sub) as any;
  if (!order) {
    res.status(404).json({ error: 'Order not found' });
    return;
  }
  const items = db.prepare(`SELECT product_id, quantity FROM order_items WHERE order_id = ?`).all(id) as { product_id: number; quantity: number }[];
  let cart = db.prepare(`SELECT id FROM carts WHERE user_id = ?`).get(req.user!.sub) as { id: number } | undefined;
  if (!cart) {
    const info = db.prepare(`INSERT INTO carts (user_id) VALUES (?)`).run(req.user!.sub);
    cart = { id: Number(info.lastInsertRowid) };
  }
  for (const it of items) {
    const inv = db.prepare(`SELECT quantity FROM inventory WHERE product_id = ?`).get(it.product_id) as { quantity: number } | undefined;
    if (!inv || inv.quantity <= 0) continue;
    const qty = Math.min(it.quantity, inv.quantity);
    const existing = db.prepare(`SELECT id FROM cart_items WHERE cart_id = ? AND product_id = ?`).get(cart.id, it.product_id) as { id: number } | undefined;
    if (existing) {
      db.prepare(`UPDATE cart_items SET quantity = ? WHERE id = ?`).run(qty, existing.id);
    } else {
      db.prepare(`INSERT INTO cart_items (cart_id, product_id, quantity) VALUES (?, ?, ?)`).run(cart.id, it.product_id, qty);
    }
  }
  res.json(buildCartSnapshot(req.user!.sub));
});

// ==========================================
// PAYMENTS — RAZORPAY GATEWAY + INR VERIFICATION (NEVER STORES CARD/CVV)
// ==========================================
const RAZORPAY_RUNTIME_SECRET = process.env.RAZORPAY_KEY_SECRET || crypto.randomBytes(32).toString('hex');

app.post('/api/payments/razorpay/order', requireAuth, async (req: AuthedRequest, res) => {
  const orderId = Number(req.body?.orderId);
  const method = sanitizeText(req.body?.method, 30) || 'UPI';
  const order = db.prepare(`SELECT * FROM orders WHERE id = ? AND user_id = ?`).get(orderId, req.user!.sub) as any;
  if (!order) {
    res.status(404).json({ error: 'Order not found' });
    return;
  }
  if (order.payment_status === 'PAID') {
    res.status(409).json({ error: 'This order has already been paid' });
    return;
  }

  const amountPaise = Math.round(order.total_amount * 100);
  const keyId = process.env.RAZORPAY_KEY_ID?.trim();
  const keySecret = process.env.RAZORPAY_KEY_SECRET?.trim();
  let razorpayOrderId = `order_fc_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
  let gatewayMode: 'live' | 'test_gateway' = 'test_gateway';

  if (keyId && keySecret) {
    try {
      const authHeader = Buffer.from(`${keyId}:${keySecret}`).toString('base64');
      const rzpRes = await fetch('https://api.razorpay.com/v1/orders', {
        method: 'POST',
        headers: {
          Authorization: `Basic ${authHeader}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: amountPaise,
          currency: 'INR',
          receipt: order.order_number,
          notes: { orderId: String(orderId), channel: 'FreshCart' },
        }),
      });
      if (rzpRes.ok) {
        const data = (await rzpRes.json()) as { id?: string };
        if (data.id) {
          razorpayOrderId = data.id;
          gatewayMode = 'live';
        }
      }
    } catch {
      // Fallback cleanly to interactive Razorpay test checkout
    }
  }

  const maskedInstrument = sanitizeText(req.body?.instrumentLabel, 80) || `Razorpay ${method}`;
  db.prepare(
    `INSERT INTO payments (order_id, user_id, method, amount, status, transaction_ref, masked_instrument)
     VALUES (?, ?, ?, ?, 'INITIATED', ?, ?)`
  ).run(orderId, req.user!.sub, method, order.total_amount, razorpayOrderId, maskedInstrument);

  res.status(201).json({
    razorpayOrderId,
    amountPaise,
    amountInr: order.total_amount,
    currency: 'INR',
    keyId: keyId || 'rzp_test_FreshCartIN',
    gatewayMode,
    orderNumber: order.order_number,
  });
});

app.post('/api/payments/razorpay/verify', requireAuth, (req: AuthedRequest, res) => {
  const razorpayOrderId = sanitizeText(req.body?.razorpayOrderId, 100);
  const razorpayPaymentId = sanitizeText(req.body?.razorpayPaymentId, 100) || `pay_fc_${crypto.randomBytes(6).toString('hex')}`;
  const method = sanitizeText(req.body?.method, 30) || 'UPI';
  const maskedInstrument = sanitizeText(req.body?.maskedInstrument, 80) || 'Razorpay UPI';
  const outcome = sanitizeText(req.body?.outcome || 'SUCCESS', 20).toUpperCase();

  const payment = db
    .prepare(`SELECT * FROM payments WHERE transaction_ref = ? AND user_id = ?`)
    .get(razorpayOrderId, req.user!.sub) as any;

  if (!payment) {
    res.status(404).json({ error: 'Razorpay payment session not found' });
    return;
  }
  if (payment.status === 'SUCCESS') {
    res.status(409).json({ error: 'Payment has already been verified' });
    return;
  }

  const signatureInput = `${razorpayOrderId}|${razorpayPaymentId}`;
  const expectedSignature = crypto.createHmac('sha256', RAZORPAY_RUNTIME_SECRET).update(signatureInput).digest('hex');
  const providedSig = sanitizeText(req.body?.razorpaySignature, 150);
  const isLiveKeys = Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);

  if (isLiveKeys && providedSig) {
    const a = Buffer.from(providedSig);
    const b = Buffer.from(expectedSignature);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      res.status(400).json({ error: 'Razorpay HMAC signature mismatch' });
      return;
    }
  }

  const order = db.prepare(`SELECT * FROM orders WHERE id = ?`).get(payment.order_id) as any;
  const finalStatus = ['SUCCESS', 'FAILED', 'CANCELLED'].includes(outcome) ? outcome : 'SUCCESS';

  db.transaction(() => {
    const msg =
      finalStatus === 'SUCCESS'
        ? `Razorpay verified (${razorpayPaymentId})`
        : finalStatus === 'FAILED'
          ? 'Razorpay gateway declined transaction'
          : 'Razorpay checkout cancelled by customer';
    db.prepare(
      `UPDATE payments SET method = ?, status = ?, provider_message = ?, masked_instrument = ?, updated_at = datetime('now') WHERE id = ?`
    ).run(method, finalStatus, msg, maskedInstrument, payment.id);

    if (finalStatus === 'SUCCESS') {
      db.prepare(`UPDATE orders SET payment_status = 'PAID', payment_method = ?, status = 'CONFIRMED', updated_at = datetime('now') WHERE id = ?`).run(
        method,
        payment.order_id
      );
      db.prepare(
        `UPDATE delivery_tracking SET current_status = 'CONFIRMED', progress_percent = 30, timeline_json = ?, updated_at = datetime('now') WHERE order_id = ?`
      ).run(JSON.stringify(buildInitialTimeline('CONFIRMED')), payment.order_id);
    } else if (finalStatus === 'FAILED') {
      db.prepare(`UPDATE orders SET payment_status = 'FAILED', updated_at = datetime('now') WHERE id = ?`).run(payment.order_id);
    } else {
      db.prepare(`UPDATE orders SET payment_status = 'CANCELLED', updated_at = datetime('now') WHERE id = ?`).run(payment.order_id);
    }
  })();

  if (finalStatus === 'SUCCESS') {
    createNotification(
      req.user!.sub,
      'PAYMENT',
      'Razorpay Payment Confirmed',
      `Paid ₹${payment.amount.toFixed(2)} for Order ${order.order_number} via ${maskedInstrument} (${razorpayPaymentId}).`
    );
  } else if (finalStatus === 'FAILED') {
    createNotification(req.user!.sub, 'PAYMENT', 'Payment Declined', `Payment for Order ${order.order_number} failed. Please retry.`);
  }

  const updatedPayment = db.prepare(`SELECT * FROM payments WHERE id = ?`).get(payment.id) as any;
  res.json({
    razorpayPaymentId,
    verifiedSignature: expectedSignature.slice(0, 24),
    payment: {
      id: updatedPayment.id,
      orderId: updatedPayment.order_id,
      method: updatedPayment.method,
      amount: updatedPayment.amount,
      status: updatedPayment.status,
      transactionRef: updatedPayment.transaction_ref,
      providerMessage: updatedPayment.provider_message,
      maskedInstrument: updatedPayment.masked_instrument,
    },
  });
});

app.post('/api/payments/initiate', requireAuth, (req: AuthedRequest, res) => {
  const orderId = Number(req.body?.orderId);
  const method = sanitizeText(req.body?.method, 30) || 'UPI';
  const order = db.prepare(`SELECT * FROM orders WHERE id = ? AND user_id = ?`).get(orderId, req.user!.sub) as any;
  if (!order) {
    res.status(404).json({ error: 'Order not found' });
    return;
  }
  if (order.payment_status === 'PAID') {
    res.status(409).json({ error: 'This order has already been paid' });
    return;
  }

  let maskedInstrument = '';
  if (method === 'UPI') {
    const upi = sanitizeText(req.body?.upiId, 80) || 'customer@okaxis';
    maskedInstrument = upi;
  } else if (method === 'CARD' || method === 'DEBIT_CARD' || method === 'CREDIT_CARD') {
    const last4 = sanitizeText(req.body?.last4, 4).replace(/\D/g, '').slice(-4) || '4242';
    const brand = sanitizeText(req.body?.cardBrand, 24) || 'RuPay/Visa';
    maskedInstrument = `${brand} •••• ${last4}`;
  } else if (method === 'NETBANKING' || method === 'WALLET') {
    maskedInstrument = sanitizeText(req.body?.bankName, 60) || method;
  } else {
    maskedInstrument = 'Cash on Delivery';
  }

  const transactionRef = `FC-RZP-${Date.now()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
  const info = db
    .prepare(
      `INSERT INTO payments (order_id, user_id, method, amount, status, transaction_ref, masked_instrument)
       VALUES (?, ?, ?, ?, 'INITIATED', ?, ?)`
    )
    .run(orderId, req.user!.sub, method, order.total_amount, transactionRef, maskedInstrument);

  res.status(201).json({
    payment: {
      id: Number(info.lastInsertRowid),
      orderId,
      method,
      amount: order.total_amount,
      status: 'INITIATED',
      transactionRef,
      maskedInstrument,
    },
  });
});

app.post('/api/payments/verify', requireAuth, (req: AuthedRequest, res) => {
  const transactionRef = sanitizeText(req.body?.transactionRef, 80);
  const outcome = sanitizeText(req.body?.outcome, 20).toUpperCase();

  if (!['SUCCESS', 'FAILED', 'CANCELLED'].includes(outcome)) {
    res.status(400).json({ error: 'Invalid payment verification outcome' });
    return;
  }

  const payment = db.prepare(`SELECT * FROM payments WHERE transaction_ref = ? AND user_id = ?`).get(transactionRef, req.user!.sub) as any;
  if (!payment) {
    res.status(404).json({ error: 'Payment transaction not found' });
    return;
  }
  if (payment.status === 'SUCCESS') {
    res.status(409).json({ error: 'Payment transaction already verified' });
    return;
  }

  const order = db.prepare(`SELECT * FROM orders WHERE id = ?`).get(payment.order_id) as any;

  db.transaction(() => {
    const msg =
      outcome === 'SUCCESS'
        ? 'Razorpay gateway verification approved'
        : outcome === 'FAILED'
          ? 'Payment declined by bank/issuer'
          : 'Payment cancelled by customer';
    db.prepare(`UPDATE payments SET status = ?, provider_message = ?, updated_at = datetime('now') WHERE id = ?`).run(
      outcome,
      msg,
      payment.id
    );

    if (outcome === 'SUCCESS') {
      db.prepare(`UPDATE orders SET payment_status = 'PAID', status = 'CONFIRMED', updated_at = datetime('now') WHERE id = ?`).run(
        payment.order_id
      );
      db.prepare(
        `UPDATE delivery_tracking SET current_status = 'CONFIRMED', progress_percent = 30, timeline_json = ?, updated_at = datetime('now') WHERE order_id = ?`
      ).run(JSON.stringify(buildInitialTimeline('CONFIRMED')), payment.order_id);
    } else if (outcome === 'FAILED') {
      db.prepare(`UPDATE orders SET payment_status = 'FAILED', updated_at = datetime('now') WHERE id = ?`).run(payment.order_id);
    } else {
      db.prepare(`UPDATE orders SET payment_status = 'CANCELLED', updated_at = datetime('now') WHERE id = ?`).run(payment.order_id);
    }
  })();

  if (outcome === 'SUCCESS') {
    createNotification(
      req.user!.sub,
      'PAYMENT',
      'Payment Confirmed',
      `Payment of ₹${payment.amount.toFixed(2)} for Order ${order.order_number} succeeded (${transactionRef}).`
    );
  } else if (outcome === 'FAILED') {
    createNotification(req.user!.sub, 'PAYMENT', 'Payment Failed', `Payment for Order ${order.order_number} was declined. Please retry.`);
  }

  const updatedPayment = db.prepare(`SELECT * FROM payments WHERE id = ?`).get(payment.id) as any;
  res.json({
    payment: {
      id: updatedPayment.id,
      orderId: updatedPayment.order_id,
      method: updatedPayment.method,
      amount: updatedPayment.amount,
      status: updatedPayment.status,
      transactionRef: updatedPayment.transaction_ref,
      providerMessage: updatedPayment.provider_message,
      maskedInstrument: updatedPayment.masked_instrument,
    },
  });
});

app.get('/api/payments/:id', requireAuth, (req: AuthedRequest, res) => {
  const p = db.prepare(`SELECT * FROM payments WHERE id = ? AND user_id = ?`).get(Number(req.params.id), req.user!.sub) as any;
  if (!p) {
    res.status(404).json({ error: 'Payment not found' });
    return;
  }
  res.json({ payment: p });
});

// ==========================================
// LIVE DELIVERY TRACKING (WEBSOCKETS + COORDINATES)
// ==========================================
function buildTrackingResponse(order: any, tracking: any) {
  const shipping = JSON.parse(order.shipping_snapshot || '{}');
  const destLat = typeof shipping.lat === 'number' ? shipping.lat : 12.9716;
  const destLng = typeof shipping.lng === 'number' ? shipping.lng : 77.5946;
  const storeLat = destLat - 0.022;
  const storeLng = destLng - 0.026;
  const ratio = Math.min(1, Math.max(0, (tracking.progress_percent || 15) / 100));
  const currentLat = typeof tracking.current_lat === 'number' ? tracking.current_lat : storeLat + (destLat - storeLat) * ratio;
  const currentLng = typeof tracking.current_lng === 'number' ? tracking.current_lng : storeLng + (destLng - storeLng) * ratio;

  return {
    orderId: order.id,
    driverName: tracking.driver_name,
    currentStatus: tracking.current_status,
    progressPercent: tracking.progress_percent,
    etaMinutes: tracking.eta_minutes,
    currentLat,
    currentLng,
    storeLat,
    storeLng,
    destLat,
    destLng,
    isSimulated: Boolean(tracking.is_simulated),
    timeline: JSON.parse(tracking.timeline_json),
    updatedAt: tracking.updated_at,
  };
}

app.get('/api/orders/:id/tracking', requireAuth, (req: AuthedRequest, res) => {
  const orderId = Number(req.params.id);
  const roles = getUserRoles(req.user!.sub);
  const order = db.prepare(`SELECT * FROM orders WHERE id = ?`).get(orderId) as any;
  if (!order || (order.user_id !== req.user!.sub && !roles.includes('ADMIN'))) {
    res.status(404).json({ error: 'Order not found' });
    return;
  }
  const tracking = db.prepare(`SELECT * FROM delivery_tracking WHERE order_id = ?`).get(orderId) as any;
  if (!tracking) {
    res.status(404).json({ error: 'Tracking record not found' });
    return;
  }
  res.json({
    order: formatOrder(order),
    tracking: buildTrackingResponse(order, tracking),
  });
});

app.post('/api/orders/:id/tracking/advance', requireAuth, (req: AuthedRequest, res) => {
  const orderId = Number(req.params.id);
  const roles = getUserRoles(req.user!.sub);
  const order = db.prepare(`SELECT * FROM orders WHERE id = ?`).get(orderId) as any;
  if (!order || (order.user_id !== req.user!.sub && !roles.includes('ADMIN'))) {
    res.status(404).json({ error: 'Order not found' });
    return;
  }
  if (order.status === 'CANCELLED' || order.status === 'DELIVERED') {
    res.status(400).json({ error: `Order is already ${order.status}` });
    return;
  }

  const currentIdx = ORDER_STEPS.findIndex((s) => s.key === order.status);
  const nextStep = ORDER_STEPS[Math.min(ORDER_STEPS.length - 1, Math.max(0, currentIdx) + 1)];
  const timeline = buildInitialTimeline(nextStep.key);
  const eta = Math.max(0, Math.round((100 - nextStep.progress) * 0.32));

  const shipping = JSON.parse(order.shipping_snapshot || '{}');
  const destLat = typeof shipping.lat === 'number' ? shipping.lat : 12.9716;
  const destLng = typeof shipping.lng === 'number' ? shipping.lng : 77.5946;
  const storeLat = destLat - 0.022;
  const storeLng = destLng - 0.026;
  const ratio = nextStep.progress / 100;
  const newLat = Number((storeLat + (destLat - storeLat) * ratio).toFixed(6));
  const newLng = Number((storeLng + (destLng - storeLng) * ratio).toFixed(6));

  db.prepare(`UPDATE orders SET status = ?, updated_at = datetime('now') WHERE id = ?`).run(nextStep.key, orderId);
  db.prepare(
    `UPDATE delivery_tracking SET current_status = ?, progress_percent = ?, eta_minutes = ?, current_lat = ?, current_lng = ?, timeline_json = ?, updated_at = datetime('now') WHERE order_id = ?`
  ).run(nextStep.key, nextStep.progress, eta, newLat, newLng, JSON.stringify(timeline), orderId);

  const updatedTracking = db.prepare(`SELECT * FROM delivery_tracking WHERE order_id = ?`).get(orderId) as any;
  const trackingPayload = buildTrackingResponse(order, updatedTracking);

  broadcastEvent({ type: 'tracking:update', orderId, userId: order.user_id, payload: trackingPayload });
  createNotification(order.user_id, 'DELIVERY', `Order ${order.order_number}: ${nextStep.label}`, `Live route update: ${nextStep.label} (${nextStep.progress}%).`);
  res.json({ tracking: trackingPayload });
});

// ==========================================
// ADMIN DASHBOARD & MANAGEMENT
// ==========================================
app.get('/api/admin/dashboard', requireAdmin, (_req, res) => {
  const totalUsers = (db.prepare(`SELECT COUNT(*) as c FROM users`).get() as { c: number }).c;
  const totalProducts = (db.prepare(`SELECT COUNT(*) as c FROM products WHERE is_active = 1`).get() as { c: number }).c;
  const totalOrders = (db.prepare(`SELECT COUNT(*) as c FROM orders`).get() as { c: number }).c;
  const revenue = (db.prepare(`SELECT COALESCE(SUM(total_amount), 0) as r FROM orders WHERE status != 'CANCELLED'`).get() as { r: number }).r;
  const pendingOrders = (db.prepare(`SELECT COUNT(*) as c FROM orders WHERE status IN ('ORDER_PLACED', 'CONFIRMED', 'PREPARING', 'PACKED', 'OUT_FOR_DELIVERY')`).get() as { c: number }).c;
  const deliveredOrders = (db.prepare(`SELECT COUNT(*) as c FROM orders WHERE status = 'DELIVERED'`).get() as { c: number }).c;
  const lowStockCount = (db.prepare(`SELECT COUNT(*) as c FROM inventory WHERE quantity <= low_stock_threshold`).get() as { c: number }).c;

  const recentOrders = db.prepare(`SELECT * FROM orders ORDER BY id DESC LIMIT 6`).all() as any[];

  res.json({
    totalUsers,
    totalProducts,
    totalOrders,
    revenue: roundMoney(revenue),
    pendingOrders,
    deliveredOrders,
    lowStockCount,
    recentOrders: recentOrders.map(formatOrder),
  });
});

app.get('/api/admin/analytics', requireAdmin, (_req, res) => {
  const categoryRevenue = db
    .prepare(
      `SELECT c.name as category, COALESCE(SUM(oi.line_total), 0) as revenue, COALESCE(SUM(oi.quantity), 0) as units
       FROM categories c
       LEFT JOIN products p ON p.category_id = c.id
       LEFT JOIN order_items oi ON oi.product_id = p.id
       GROUP BY c.id
       ORDER BY revenue DESC`
    )
    .all();

  const popularProducts = db
    .prepare(
      `SELECT p.id, p.name, p.brand, p.price, p.rating, i.quantity as stock,
              COALESCE((SELECT SUM(oi.quantity) FROM order_items oi WHERE oi.product_id = p.id), 0) as sold_units
       FROM products p
       INNER JOIN inventory i ON i.product_id = p.id
       WHERE p.is_active = 1
       ORDER BY sold_units DESC, p.review_count DESC
       LIMIT 8`
    )
    .all();

  const dailySales = db
    .prepare(
      `SELECT substr(created_at, 1, 10) as day, COUNT(*) as order_count, COALESCE(SUM(total_amount), 0) as revenue
       FROM orders WHERE status != 'CANCELLED'
       GROUP BY substr(created_at, 1, 10)
       ORDER BY day DESC LIMIT 7`
    )
    .all();

  const lowStockItems = db
    .prepare(
      `SELECT p.id, p.name, p.sku, i.quantity, i.low_stock_threshold
       FROM inventory i INNER JOIN products p ON p.id = i.product_id
       WHERE p.is_active = 1 AND i.quantity <= i.low_stock_threshold
       ORDER BY i.quantity ASC`
    )
    .all();

  res.json({ categoryRevenue, popularProducts, dailySales, lowStockItems });
});

app.post('/api/admin/products', requireAdmin, (req: AuthedRequest, res) => {
  const categoryId = Number(req.body?.categoryId);
  const name = sanitizeText(req.body?.name, 140);
  const brand = sanitizeText(req.body?.brand, 80);
  const unit = sanitizeText(req.body?.unit, 30) || '500 g';
  const description = sanitizeText(req.body?.description, 600);
  const price = Number(req.body?.price);
  const discountPercent = Number(req.body?.discountPercent ?? 0);
  const stockQuantity = Number(req.body?.stockQuantity ?? 25);
  const imageUrl = sanitizeText(req.body?.imageUrl, 300) || '';

  if (!name || !brand || Number.isNaN(price) || price <= 0 || Number.isNaN(stockQuantity) || stockQuantity < 0) {
    res.status(400).json({ error: 'Valid product name, brand, positive price, and non-negative stock required' });
    return;
  }
  const sku = `FC-ADM-${Date.now().toString().slice(-5)}`;
  const id = db.transaction(() => {
    const info = db
      .prepare(
        `INSERT INTO products (category_id, sku, name, brand, unit, description, price, discount_percent, is_featured)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`
      )
      .run(categoryId, sku, name, brand, unit, description || `${brand} ${name}`, price, discountPercent);
    const pid = Number(info.lastInsertRowid);
    db.prepare(`INSERT INTO product_images (product_id, image_url, is_primary, sort_order) VALUES (?, ?, 1, 0)`).run(pid, imageUrl);
    db.prepare(`INSERT INTO inventory (product_id, quantity, low_stock_threshold) VALUES (?, ?, 10)`).run(pid, stockQuantity);
    db.prepare(
      `INSERT INTO inventory_logs (product_id, previous_quantity, new_quantity, delta, reason, actor_user_id)
       VALUES (?, 0, ?, ?, 'initial_product_creation', ?)`
    ).run(pid, stockQuantity, stockQuantity, req.user!.sub);
    return pid;
  })();

  auditLog(req.user!.sub, 'ADMIN_ADD_PRODUCT', 'products', id, `Created ${name}`);
  res.status(201).json({ id });
});

app.put('/api/admin/products/:id', requireAdmin, (req: AuthedRequest, res) => {
  const id = Number(req.params.id);
  const existing = db.prepare(`SELECT * FROM products WHERE id = ?`).get(id) as any;
  if (!existing) {
    res.status(404).json({ error: 'Product not found' });
    return;
  }
  const name = sanitizeText(req.body?.name, 140) || existing.name;
  const brand = sanitizeText(req.body?.brand, 80) || existing.brand;
  const price = req.body?.price !== undefined ? Number(req.body.price) : existing.price;
  const discountPercent = req.body?.discountPercent !== undefined ? Number(req.body.discountPercent) : existing.discount_percent;
  const description = sanitizeText(req.body?.description, 600) || existing.description;

  if (Number.isNaN(price) || price <= 0) {
    res.status(400).json({ error: 'Price must be greater than 0' });
    return;
  }

  db.prepare(`UPDATE products SET name=?, brand=?, price=?, discount_percent=?, description=?, updated_at=datetime('now') WHERE id=?`).run(
    name,
    brand,
    price,
    discountPercent,
    description,
    id
  );
  auditLog(req.user!.sub, 'ADMIN_UPDATE_PRODUCT', 'products', id, `Updated ${name}`);
  res.json({ ok: true });
});

app.delete('/api/admin/products/:id', requireAdmin, (req: AuthedRequest, res) => {
  const id = Number(req.params.id);
  db.prepare(`UPDATE products SET is_active = 0, updated_at = datetime('now') WHERE id = ?`).run(id);
  auditLog(req.user!.sub, 'ADMIN_DELETE_PRODUCT', 'products', id, 'Soft-deleted product');
  res.json({ ok: true });
});

app.get('/api/admin/inventory', requireAdmin, (_req, res) => {
  const rows = db
    .prepare(
      `SELECT p.id as productId, p.sku, p.name, p.brand, p.price, c.name as categoryName, i.quantity, i.low_stock_threshold as lowStockThreshold, i.updated_at as updatedAt
       FROM inventory i
       INNER JOIN products p ON p.id = i.product_id
       INNER JOIN categories c ON c.id = p.category_id
       WHERE p.is_active = 1
       ORDER BY i.quantity ASC, p.name ASC`
    )
    .all();
  res.json({ inventory: rows });
});

app.put('/api/admin/inventory/:productId', requireAdmin, async (req: AuthedRequest, res) => {
  const productId = Number(req.params.productId);
  const quantity = Number(req.body?.quantity);
  const reason = sanitizeText(req.body?.reason, 80) || 'manual_adjustment';
  if (!Number.isInteger(quantity) || quantity < 0) {
    res.status(400).json({ error: 'Inventory quantity must be a non-negative integer' });
    return;
  }
  const prevRow = db.prepare(`SELECT quantity FROM inventory WHERE product_id = ?`).get(productId) as { quantity: number } | undefined;
  if (!prevRow) {
    res.status(404).json({ error: 'Inventory record not found' });
    return;
  }
  const delta = quantity - prevRow.quantity;
  db.prepare(`UPDATE inventory SET quantity = ?, updated_at = datetime('now') WHERE product_id = ?`).run(quantity, productId);
  db.prepare(
    `INSERT INTO inventory_logs (product_id, previous_quantity, new_quantity, delta, reason, actor_user_id)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(productId, prevRow.quantity, quantity, delta, reason, req.user!.sub);

  void syncInventoryLogToSupabase({
    productId,
    previousQuantity: prevRow.quantity,
    newQuantity: quantity,
    delta,
    reason,
  });

  auditLog(req.user!.sub, 'ADMIN_UPDATE_STOCK', 'inventory', productId, `Stock set to ${quantity}`);
  res.json({ ok: true, quantity });
});

app.get('/api/admin/inventory/logs', requireAdmin, (_req, res) => {
  const logs = db
    .prepare(
      `SELECT l.id, l.product_id as productId, p.name as productName, p.sku, l.previous_quantity as previousQuantity,
              l.new_quantity as newQuantity, l.delta, l.reason, l.created_at as createdAt
       FROM inventory_logs l
       INNER JOIN products p ON p.id = l.product_id
       ORDER BY l.id DESC
       LIMIT 40`
    )
    .all();
  res.json({ logs });
});

// ==========================================
// SUPABASE STORAGE + LOCAL FALLBACK UPLOADS
// ==========================================
function parseBase64DataUrl(dataUrl: string, allowedMimes: string[], maxBytes: number) {
  const match = /^data:([a-zA-Z0-9/+.-]+);base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl.trim());
  if (!match) return { error: 'Invalid base64 data URI format' };
  const mimeType = match[1].toLowerCase();
  if (!allowedMimes.includes(mimeType)) {
    return { error: `Unsupported file type (${mimeType}). Allowed: ${allowedMimes.join(', ')}` };
  }
  const buffer = Buffer.from(match[2], 'base64');
  if (buffer.byteLength > maxBytes) {
    return { error: `File size exceeds ${Math.round(maxBytes / (1024 * 1024))} MB limit` };
  }
  return { mimeType, buffer };
}

app.post('/api/storage/product-image', requireAdmin, async (req: AuthedRequest, res) => {
  const productId = Number(req.body?.productId);
  const dataUrl = typeof req.body?.dataUrl === 'string' ? req.body.dataUrl : '';
  const fileName = sanitizeText(req.body?.fileName, 120) || `product-${productId}.png`;

  if (!Number.isInteger(productId) || productId <= 0) {
    res.status(400).json({ error: 'Valid productId is required' });
    return;
  }

  const product = db.prepare(`SELECT id, sku, name FROM products WHERE id = ?`).get(productId) as
    | { id: number; sku: string; name: string }
    | undefined;
  if (!product) {
    res.status(404).json({ error: 'Product not found' });
    return;
  }

  const parsed = parseBase64DataUrl(dataUrl, ['image/png', 'image/jpeg', 'image/webp'], 2.5 * 1024 * 1024);
  if ('error' in parsed) {
    res.status(400).json({ error: parsed.error });
    return;
  }

  const ext = parsed.mimeType === 'image/png' ? 'png' : parsed.mimeType === 'image/webp' ? 'webp' : 'jpg';
  const safePath = `products/${product.sku.toLowerCase()}-${Date.now()}.${ext}`;

  let finalUrl = dataUrl;
  let storageProvider = 'local';

  try {
    const uploaded = await uploadToSupabaseBucket('product-images', safePath, parsed.buffer, parsed.mimeType);
    if (uploaded) {
      finalUrl = uploaded.publicUrl;
      storageProvider = uploaded.provider;
    }
  } catch (err: any) {
    res.status(502).json({ error: err?.message || 'Supabase Storage upload failed' });
    return;
  }

  const existingImg = db.prepare(`SELECT id FROM product_images WHERE product_id = ?`).get(productId) as { id: number } | undefined;
  if (existingImg) {
    db.prepare(`UPDATE product_images SET image_url = ?, is_primary = 1 WHERE product_id = ?`).run(finalUrl, productId);
  } else {
    db.prepare(`INSERT INTO product_images (product_id, image_url, is_primary, sort_order) VALUES (?, ?, 1, 0)`).run(productId, finalUrl);
  }

  auditLog(req.user!.sub, 'UPLOAD_PRODUCT_IMAGE', 'product_images', productId, `${fileName} (${storageProvider})`);
  res.json({ ok: true, imageUrl: finalUrl, storageProvider });
});

app.get('/api/storage/documents', requireAuth, (req: AuthedRequest, res) => {
  const docs = db
    .prepare(
      `SELECT id, title, doc_type as docType, file_name as fileName, mime_type as mimeType,
              file_size as fileSize, storage_url as storageUrl, storage_provider as storageProvider,
              created_at as createdAt
       FROM user_documents
       WHERE user_id = ?
       ORDER BY id DESC`
    )
    .all(req.user!.sub);
  res.json({ documents: docs, supabaseStorageActive: isSupabaseServerConfigured() });
});

app.post('/api/storage/documents', requireAuth, async (req: AuthedRequest, res) => {
  const title = sanitizeText(req.body?.title, 100) || 'Delivery Document';
  const docType = sanitizeText(req.body?.docType, 40) || 'DELIVERY_INSTRUCTION';
  const fileName = sanitizeText(req.body?.fileName, 120) || 'upload.png';
  const dataUrl = typeof req.body?.dataUrl === 'string' ? req.body.dataUrl : '';

  const parsed = parseBase64DataUrl(
    dataUrl,
    ['image/png', 'image/jpeg', 'image/webp', 'application/pdf', 'text/plain'],
    2.5 * 1024 * 1024
  );
  if ('error' in parsed) {
    res.status(400).json({ error: parsed.error });
    return;
  }

  const safeFile = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
  const objectPath = `user-${req.user!.sub}/${Date.now()}-${safeFile}`;
  let storageUrl = dataUrl;
  let storageProvider = 'local';

  try {
    const uploaded = await uploadToSupabaseBucket('user-documents', objectPath, parsed.buffer, parsed.mimeType);
    if (uploaded) {
      storageUrl = uploaded.publicUrl;
      storageProvider = uploaded.provider;
    }
  } catch (err: any) {
    res.status(502).json({ error: err?.message || 'Document upload failed' });
    return;
  }

  const info = db
    .prepare(
      `INSERT INTO user_documents (user_id, title, doc_type, file_name, mime_type, file_size, storage_url, storage_provider)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(req.user!.sub, title, docType, fileName, parsed.mimeType, parsed.buffer.byteLength, storageUrl, storageProvider);

  const created = db
    .prepare(
      `SELECT id, title, doc_type as docType, file_name as fileName, mime_type as mimeType,
              file_size as fileSize, storage_url as storageUrl, storage_provider as storageProvider,
              created_at as createdAt
       FROM user_documents WHERE id = ?`
    )
    .get(Number(info.lastInsertRowid));

  auditLog(req.user!.sub, 'UPLOAD_USER_DOCUMENT', 'user_documents', Number(info.lastInsertRowid), `${fileName} (${storageProvider})`);
  res.status(201).json({ document: created });
});

app.delete('/api/storage/documents/:id', requireAuth, (req: AuthedRequest, res) => {
  const id = Number(req.params.id);
  const r = db.prepare(`DELETE FROM user_documents WHERE id = ? AND user_id = ?`).run(id, req.user!.sub);
  if (r.changes === 0) {
    res.status(404).json({ error: 'Document not found' });
    return;
  }
  res.json({ ok: true });
});

app.get('/api/admin/orders', requireAdmin, (_req, res) => {
  const rows = db.prepare(`SELECT * FROM orders ORDER BY id DESC`).all() as any[];
  res.json({ orders: rows.map(formatOrder) });
});

app.put('/api/admin/orders/:id/status', requireAdmin, (req: AuthedRequest, res) => {
  const id = Number(req.params.id);
  const status = sanitizeText(req.body?.status, 30).toUpperCase();
  const validStatuses = ['ORDER_PLACED', 'CONFIRMED', 'PREPARING', 'PACKED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED'];
  if (!validStatuses.includes(status)) {
    res.status(400).json({ error: 'Invalid order status' });
    return;
  }
  const order = db.prepare(`SELECT * FROM orders WHERE id = ?`).get(id) as any;
  if (!order) {
    res.status(404).json({ error: 'Order not found' });
    return;
  }

  db.prepare(`UPDATE orders SET status = ?, updated_at = datetime('now') WHERE id = ?`).run(status, id);
  const step = ORDER_STEPS.find((s) => s.key === status);
  const progress = step ? step.progress : status === 'CANCELLED' ? 0 : 15;
  const timeline = buildInitialTimeline(status === 'CANCELLED' ? 'ORDER_PLACED' : status);
  const eta = status === 'DELIVERED' || status === 'CANCELLED' ? 0 : Math.max(4, Math.round((100 - progress) * 0.32));

  const shipping = JSON.parse(order.shipping_snapshot || '{}');
  const destLat = typeof shipping.lat === 'number' ? shipping.lat : 12.9716;
  const destLng = typeof shipping.lng === 'number' ? shipping.lng : 77.5946;
  const storeLat = destLat - 0.022;
  const storeLng = destLng - 0.026;
  const ratio = progress / 100;
  const newLat = Number((storeLat + (destLat - storeLat) * ratio).toFixed(6));
  const newLng = Number((storeLng + (destLng - storeLng) * ratio).toFixed(6));

  db.prepare(
    `UPDATE delivery_tracking SET current_status = ?, progress_percent = ?, eta_minutes = ?, current_lat = ?, current_lng = ?, timeline_json = ?, updated_at = datetime('now') WHERE order_id = ?`
  ).run(status, progress, eta, newLat, newLng, JSON.stringify(timeline), id);

  const updatedTracking = db.prepare(`SELECT * FROM delivery_tracking WHERE order_id = ?`).get(id) as any;
  const trackingPayload = buildTrackingResponse(order, updatedTracking);

  broadcastEvent({
    type: 'tracking:update',
    orderId: id,
    userId: order.user_id,
    payload: { ...trackingPayload, isSimulated: false },
  });
  createNotification(order.user_id, 'DELIVERY', `Order ${order.order_number} Updated`, `Status changed to ${status.replace(/_/g, ' ')}.`);
  auditLog(req.user!.sub, 'ADMIN_ORDER_STATUS', 'orders', id, `Status -> ${status}`);
  res.json({ ok: true });
});

app.get('/api/admin/customers', requireAdmin, (_req, res) => {
  const rows = db
    .prepare(
      `SELECT u.id, u.full_name, u.email, u.mobile, u.status, u.created_at,
              (SELECT COUNT(*) FROM orders o WHERE o.user_id = u.id) as order_count,
              (SELECT COALESCE(SUM(o.total_amount), 0) FROM orders o WHERE o.user_id = u.id AND o.status != 'CANCELLED') as total_spent
       FROM users u ORDER BY u.id DESC`
    )
    .all() as any[];
  res.json({
    customers: rows.map((u) => ({
      id: u.id,
      fullName: u.full_name,
      email: u.email,
      mobile: u.mobile,
      status: u.status,
      roles: getUserRoles(u.id),
      orderCount: u.order_count,
      totalSpent: roundMoney(u.total_spent),
      createdAt: u.created_at,
    })),
  });
});

app.put('/api/admin/customers/:id/status', requireAdmin, (req: AuthedRequest, res) => {
  const id = Number(req.params.id);
  const status = req.body?.status === 'SUSPENDED' ? 'SUSPENDED' : 'ACTIVE';
  db.prepare(`UPDATE users SET status = ?, updated_at = datetime('now') WHERE id = ?`).run(status, id);
  res.json({ ok: true });
});

app.get('/api/admin/coupons', requireAdmin, (_req, res) => {
  const rows = db.prepare(`SELECT * FROM coupons ORDER BY id DESC`).all();
  res.json({ coupons: rows });
});

app.post('/api/admin/coupons', requireAdmin, (req: AuthedRequest, res) => {
  const code = sanitizeText(req.body?.code, 32).toUpperCase();
  const title = sanitizeText(req.body?.title, 100);
  const description = sanitizeText(req.body?.description, 250);
  const discountType = ['PERCENTAGE', 'FIXED', 'FIRST_ORDER'].includes(req.body?.discountType) ? req.body.discountType : 'PERCENTAGE';
  const discountValue = Number(req.body?.discountValue);
  const minOrderAmount = Number(req.body?.minOrderAmount ?? 0);
  const maxDiscountAmount = Number(req.body?.maxDiscountAmount ?? 50);
  const expiresAt = sanitizeText(req.body?.expiresAt, 40) || '2028-12-31T23:59:59Z';

  if (!code || !title || Number.isNaN(discountValue) || discountValue <= 0) {
    res.status(400).json({ error: 'Valid code, title, and positive discount value required' });
    return;
  }
  try {
    const info = db
      .prepare(
        `INSERT INTO coupons (code, title, description, discount_type, discount_value, min_order_amount, max_discount_amount, expires_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(code, title, description || title, discountType, discountValue, minOrderAmount, maxDiscountAmount, expiresAt);
    res.status(201).json({ id: Number(info.lastInsertRowid) });
  } catch {
    res.status(409).json({ error: 'Coupon code already exists' });
  }
});

app.delete('/api/admin/coupons/:id', requireAdmin, (req, res) => {
  db.prepare(`DELETE FROM coupons WHERE id = ?`).run(Number(req.params.id));
  res.json({ ok: true });
});

app.get('/api/health', (_req, res) => {
  const supabaseConfigured = Boolean(process.env.SUPABASE_URL?.trim() && process.env.SUPABASE_SERVICE_ROLE_KEY?.trim());
  const oauthConfigured = Boolean(process.env.GOOGLE_CLIENT_ID?.trim() && process.env.GOOGLE_CLIENT_SECRET?.trim());
  res.json({
    ok: true,
    service: 'FreshCart API',
    runtime: process.env.VERCEL ? 'vercel-serverless' : 'node',
    supabaseConfigured,
    oauthConfigured,
    timestamp: new Date().toISOString(),
  });
});

// ==========================================
// VITE DEV MIDDLEWARE / PRODUCTION STATIC
// ==========================================
async function startServer() {
  const port = Number(process.env.PORT || 3000);

  if (!process.env.VERCEL && process.env.NODE_ENV !== 'production') {
    const viteModule = 'vite';
    const { createServer: createViteServer } = await import(/* @vite-ignore */ viteModule);
    const vite = await createViteServer({
      server: { middlewareMode: true, allowedHosts: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else if (!process.env.VERCEL) {
    const distDirName = 'dist';
    const indexName = 'index' + '.html';
    const distPath = path.resolve(process.cwd(), distDirName);
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      const indexFile = path.join(distPath, indexName);
      if (fs.existsSync(indexFile)) {
        res.sendFile(indexFile);
      } else {
        res.status(404).send('Build output not found');
      }
    });
  }

  if (server) {
    server.listen(port, '0.0.0.0', () => {
      console.log(`FreshCart server running on http://0.0.0.0:${port}`);
    });
  }
}

if (!process.env.VERCEL) {
  startServer();
}

export { app };
export default app;
