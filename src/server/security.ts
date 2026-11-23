import crypto from 'crypto';
import type { NextFunction, Request, Response } from 'express';
import { db } from './db.ts';

// Ephemeral secure fallback if SESSION_SECRET is unset (never hardcoded secret string)
const SESSION_SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');

export interface AuthTokenPayload {
  sub: number;
  email: string;
  roles: string[];
  jti: string;
  exp: number;
}

export interface AuthedRequest extends Request {
  user?: AuthTokenPayload;
}

function base64UrlEncode(input: string | Buffer): string {
  return Buffer.from(input)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function base64UrlDecode(input: string): string {
  const padded = input.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((input.length + 3) % 4);
  return Buffer.from(padded, 'base64').toString('utf8');
}

export function signAuthToken(userId: number, email: string, roles: string[], ttlSeconds = 60 * 60 * 12): { token: string; jti: string; expiresAt: string } {
  const jti = crypto.randomUUID();
  const exp = Math.floor(Date.now() / 1000) + ttlSeconds;
  const header = base64UrlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = base64UrlEncode(JSON.stringify({ sub: userId, email, roles, jti, exp }));
  const sig = base64UrlEncode(crypto.createHmac('sha256', SESSION_SECRET).update(`${header}.${payload}`).digest());
  const expiresAt = new Date(exp * 1000).toISOString();

  db.prepare(`INSERT INTO sessions (jti, user_id, revoked, expires_at) VALUES (?, ?, 0, ?)`).run(jti, userId, expiresAt);

  return { token: `${header}.${payload}.${sig}`, jti, expiresAt };
}

export function verifyAuthToken(token: string): AuthTokenPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [header, payload, sig] = parts;
    const expectedSig = base64UrlEncode(crypto.createHmac('sha256', SESSION_SECRET).update(`${header}.${payload}`).digest());
    const sigBuf = Buffer.from(sig);
    const expBuf = Buffer.from(expectedSig);
    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
      return null;
    }

    const decoded = JSON.parse(base64UrlDecode(payload)) as AuthTokenPayload;
    if (!decoded.exp || decoded.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }

    const session = db.prepare(`SELECT revoked FROM sessions WHERE jti = ?`).get(decoded.jti) as { revoked: number } | undefined;
    if (!session || session.revoked === 1) {
      return null;
    }
    return decoded;
  } catch {
    return null;
  }
}

export function revokeToken(jti: string) {
  db.prepare(`UPDATE sessions SET revoked = 1 WHERE jti = ?`).run(jti);
}

export function getUserRoles(userId: number): string[] {
  const rows = db
    .prepare(`SELECT r.name FROM roles r INNER JOIN user_roles ur ON ur.role_id = r.id WHERE ur.user_id = ?`)
    .all(userId) as { name: string }[];
  return rows.map((r) => r.name);
}

export function extractToken(req: Request): string | null {
  const auth = req.headers.authorization;
  if (auth && auth.startsWith('Bearer ')) {
    return auth.slice(7).trim();
  }
  const cookieHeader = req.headers.cookie;
  if (cookieHeader) {
    const cookies = cookieHeader.split(';').map((c) => c.trim());
    for (const c of cookies) {
      if (c.startsWith('fc_session=')) {
        return decodeURIComponent(c.slice('fc_session='.length));
      }
    }
  }
  return null;
}

export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const token = extractToken(req);
  if (!token) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }
  const payload = verifyAuthToken(token);
  if (!payload) {
    res.status(401).json({ error: 'Session expired or invalid' });
    return;
  }
  const user = db.prepare(`SELECT status FROM users WHERE id = ?`).get(payload.sub) as { status: string } | undefined;
  if (!user || user.status !== 'ACTIVE') {
    res.status(403).json({ error: 'Account is inactive or suspended' });
    return;
  }
  req.user = payload;
  next();
}

export function requireAdmin(req: AuthedRequest, res: Response, next: NextFunction) {
  requireAuth(req, res, () => {
    const roles = req.user ? getUserRoles(req.user.sub) : [];
    if (!roles.includes('ADMIN')) {
      res.status(403).json({ error: 'Administrator privileges required' });
      return;
    }
    next();
  });
}

// Lightweight in-memory rate limiter for auth & write routes
const rateBuckets = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(maxRequests: number, windowMs: number) {
  return (req: Request, res: Response, next: NextFunction) => {
    const key = `${req.ip || 'local'}:${req.baseUrl}${req.path}`;
    const now = Date.now();
    const bucket = rateBuckets.get(key);
    if (!bucket || bucket.resetAt <= now) {
      rateBuckets.set(key, { count: 1, resetAt: now + windowMs });
      next();
      return;
    }
    if (bucket.count >= maxRequests) {
      res.status(429).json({ error: 'Too many requests. Please try again shortly.' });
      return;
    }
    bucket.count += 1;
    next();
  };
}

export function sanitizeText(value: unknown, maxLen = 500): string {
  if (typeof value !== 'string') return '';
  return value.replace(/[<>]/g, '').trim().slice(0, maxLen);
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function isValidMobile(mobile: string): boolean {
  return /^[0-9]{10,15}$/.test(mobile.replace(/[\s\-+()]/g, ''));
}

export function auditLog(userId: number | null, action: string, entityType: string, entityId: string | number | null, details: string) {
  db.prepare(`INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?)`).run(
    userId,
    action,
    entityType,
    entityId !== null ? String(entityId) : null,
    details
  );
}
