/**
 * Kimi AI Worker - Standalone Cloudflare Worker
 * Handles code generation, explanation, refactoring, and testing operations
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { generateCode } from './routes/generateCode';
import { explainCode } from './routes/explainCode';
import { refactorCode } from './routes/refactorCode';
import { generateTests } from './routes/generateTests';
import { chatHandler } from './routes/chat';
import { chatCompletionsHandler } from './routes/chatCompletions';
// auth routes removed to make worker endpoints public

interface Env {
  AI: AiGateway;
  AUTH_DB: D1Database;
  ENVIRONMENT: string;
  LOG_LEVEL: string;
  API_TIMEOUT: string;
}

const app = new Hono<{ Bindings: Env }>();

// Middleware
app.use('*', logger());
app.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}));

// Health check
app.get('/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Debug endpoint to inspect AI binding availability
app.get('/api/ai/debug', (c) => {
  try {
    const AI = (c.env as any).AI;
    const info: Record<string, any> = { present: !!AI };
    if (AI) {
      info.hasRun = typeof AI.run === 'function';
      try {
        info.keys = Object.keys(AI).slice(0, 20);
      } catch (e) {
        // ignore
      }
    }
    return c.json({ success: true, data: info });
  } catch (err) {
    return c.json({ success: false, error: String(err) }, 500);
  }
});

// All AI endpoints are public (auth removed)
app.post('/api/ai/chat/completions', chatCompletionsHandler);
app.post('/api/ai/generate-code', generateCode);
app.post('/api/ai/explain-code', explainCode);
app.post('/api/ai/refactor-code', refactorCode);
app.post('/api/ai/generate-tests', generateTests);
app.post('/api/ai/chat', chatHandler);

// 404 handler
app.notFound((c) => {
  return c.json({ error: 'Not Found', path: c.req.path }, 404);
});

// Error handler
app.onError((err, c) => {
  console.error('Worker error:', err);
  return c.json({
    error: 'Internal Server Error',
    message: err instanceof Error ? err.message : 'Unknown error',
  }, 500);
});

export default app;
