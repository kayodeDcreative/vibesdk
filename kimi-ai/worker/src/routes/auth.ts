/**
 * Auth Route
 * Provides user registration, login, profile, and session management for the standalone Kimi AI worker.
 */

import { Hono } from 'hono';
import { Context } from 'hono';

const app = new Hono();
const TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;
let dbInitialized = false;

function toHex(bytes: Uint8Array) {
  return Array.from(bytes).map((value) => value.toString(16).padStart(2, '0')).join('');
}

async function hashPassword(password: string, salt: string) {
  const encoder = new TextEncoder();
  const data = encoder.encode(`${salt}:${password}`);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return toHex(new Uint8Array(digest));
}

function randomToken(length = 32) {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return toHex(bytes);
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

async function ensureAuthDb(db: D1Database) {
  if (dbInitialized) return;

  await db.prepare(
    `CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      salt TEXT NOT NULL,
      created_at TEXT NOT NULL
    )`
  ).run();

  await db.prepare(
    `CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )`
  ).run();

  dbInitialized = true;
}

async function getAuthDb(c: Context) {
  // Support both new `AUTH_DB` binding and legacy `DB` binding for compatibility
  const db = (c.env.AUTH_DB || c.env.DB) as D1Database | undefined;
  if (!db) {
    throw new Error('Auth database is not configured.');
  }
  await ensureAuthDb(db);
  return db;
}

async function createSession(db: D1Database, userId: string) {
  const token = randomToken(32);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + TOKEN_TTL_MS).toISOString();

  await db.prepare(
    'INSERT INTO sessions (token, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)' 
  ).bind(token, userId, expiresAt, now.toISOString()).run();

  return { token, expiresAt };
}

async function findUserByEmail(db: D1Database, email: string) {
  const row = await db.prepare('SELECT id, email, password_hash, salt FROM users WHERE email = ?').bind(email).first();
  return row as { id: string; email: string; password_hash: string; salt: string } | null;
}

async function findSession(db: D1Database, token: string) {
  const now = new Date().toISOString();
  const row = await db.prepare(
    'SELECT token, user_id, expires_at FROM sessions WHERE token = ? AND expires_at > ?'
  ).bind(token, now).first();
  return row as { token: string; user_id: string; expires_at: string } | null;
}

function parseBearerToken(c: Context) {
  // Accept tokens in several common header formats so clients like VS Code can
  // provide the API key as either an Authorization Bearer token or as
  // x-api-key / api-key / apikey headers.
  const headerNames = ['authorization', 'x-api-key', 'api-key', 'apikey'];
  for (const name of headerNames) {
    const val = c.req.header(name) || c.req.header(name.toUpperCase());
    if (!val) continue;
    const parts = val.split(' ');
    if (parts.length >= 2 && parts[0].toLowerCase() === 'bearer') {
      return parts.slice(1).join(' ');
    }
    // If header is present but not Bearer-prefixed, treat the whole value as the token
    return val;
  }
  return undefined;
}

async function requireAuth(c: Context) {
  const token = parseBearerToken(c);
  if (!token) {
    return null;
  }

  const db = await getAuthDb(c);
  const session = await findSession(db, token);
  if (!session) {
    return null;
  }

  return { token: session.token, userId: session.user_id };
}

app.post('/register', async (c) => {
  try {
    const body = await c.req.json<{ email?: string; password?: string }>();
    const email = body?.email ? normalizeEmail(body.email) : '';
    const password = body?.password || '';

    if (!email || !password) {
      return c.json({ error: 'Email and password are required' }, 400);
    }

    if (password.length < 8) {
      return c.json({ error: 'Password must be at least 8 characters' }, 400);
    }

    const db = await getAuthDb(c);
    const existing = await findUserByEmail(db, email);
    if (existing) {
      return c.json({ error: 'Account with that email already exists' }, 409);
    }

    const salt = randomToken(16);
    const passwordHash = await hashPassword(password, salt);
    const userId = crypto.randomUUID();

    await db.prepare(
      'INSERT INTO users (id, email, password_hash, salt, created_at) VALUES (?, ?, ?, ?, ?)'
    ).bind(userId, email, passwordHash, salt, new Date().toISOString()).run();

    return c.json({ success: true, data: { userId, email } });
  } catch (error) {
    console.error('Register error:', error);
    return c.json({ error: 'Failed to register user', message: error instanceof Error ? error.message : String(error) }, 500);
  }
});

app.post('/login', async (c) => {
  try {
    const body = await c.req.json<{ email?: string; password?: string }>();
    const email = body?.email ? normalizeEmail(body.email) : '';
    const password = body?.password || '';

    if (!email || !password) {
      return c.json({ error: 'Email and password are required' }, 400);
    }

    const db = await getAuthDb(c);
    const user = await findUserByEmail(db, email);
    if (!user) {
      return c.json({ error: 'Invalid email or password' }, 401);
    }

    const passwordHash = await hashPassword(password, user.salt);
    if (passwordHash !== user.password_hash) {
      return c.json({ error: 'Invalid email or password' }, 401);
    }

    const session = await createSession(db, user.id);
    return c.json({ success: true, data: { token: session.token, expiresAt: session.expiresAt } });
  } catch (error) {
    console.error('Login error:', error);
    return c.json({ error: 'Failed to login', message: error instanceof Error ? error.message : String(error) }, 500);
  }
});

app.get('/check', async (c) => {
  try {
    const auth = await requireAuth(c);
    if (!auth) {
      return c.json({ authenticated: false }, 200);
    }
    return c.json({ authenticated: true });
  } catch (error) {
    console.error('Auth check error:', error);
    return c.json({ error: 'Failed to check auth', message: error instanceof Error ? error.message : String(error) }, 500);
  }
});

app.get('/profile', async (c) => {
  try {
    const auth = await requireAuth(c);
    if (!auth) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const db = await getAuthDb(c);
    const row = await db.prepare('SELECT id, email, created_at FROM users WHERE id = ?').bind(auth.userId).first();
    if (!row) {
      return c.json({ error: 'User not found' }, 404);
    }

    return c.json({ success: true, data: { id: row.id, email: row.email, createdAt: row.created_at } });
  } catch (error) {
    console.error('Profile error:', error);
    return c.json({ error: 'Failed to fetch profile', message: error instanceof Error ? error.message : String(error) }, 500);
  }
});

app.post('/logout', async (c) => {
  try {
    const auth = await requireAuth(c);
    if (!auth) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const db = await getAuthDb(c);
    await db.prepare('DELETE FROM sessions WHERE token = ?').bind(auth.token).run();
    return c.json({ success: true, data: { message: 'Logged out' } });
  } catch (error) {
    console.error('Logout error:', error);
    return c.json({ error: 'Failed to logout', message: error instanceof Error ? error.message : String(error) }, 500);
  }
});

export async function authMiddleware(c: Context, next: () => Promise<void>) {
  const auth = await requireAuth(c);
  if (!auth) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  c.set('auth', { userId: auth.userId });
  await next();
}

export { app as authRouter };
