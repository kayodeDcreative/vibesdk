// testAllAI.js - call debug + chat/completions endpoints
// Usage: node worker/scripts/testAllAI.js
// Optional env: API_TOKEN

const base = 'https://kimi-ai-worker.khay.workers.dev';
const completionPath = '/api/ai/chat/completions';
const chatPath = '/api/ai/chat';
const debugPath = '/api/ai/debug';

async function call(path, options = {}) {
  const url = base + path;
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (process.env.API_TOKEN) headers['Authorization'] = `Bearer ${process.env.API_TOKEN}`;
  try {
    const res = await fetch(url, { method: options.method || 'GET', headers, body: options.body ? JSON.stringify(options.body) : undefined });
    const text = await res.text();
    let body;
    try { body = JSON.parse(text); } catch (e) { body = text; }
    return { status: res.status, ok: res.ok, body };
  } catch (err) {
    return { error: String(err) };
  }
}

async function main() {
  console.log('Calling debug endpoint...');
  const debug = await call(debugPath);
  console.log('DEBUG:', JSON.stringify(debug, null, 2));

  const payload = {
    model: 'kimi-ai',
    messages: [
      { role: 'system', content: 'You are a helpful assistant.' },
      { role: 'user', content: 'Say hi and report model availability.' }
    ]
  };

  console.log('\nCalling chat/completions endpoint...');
  const comp = await call(completionPath, { method: 'POST', body: payload });
  console.log('COMPLETIONS:', JSON.stringify(comp, null, 2));

  console.log('\nCalling chat endpoint...');
  const chat = await call(chatPath, { method: 'POST', body: { messages: payload.messages, model: payload.model } });
  console.log('CHAT:', JSON.stringify(chat, null, 2));

  if (comp && comp.status === 503 && comp.body && comp.body.error) {
    console.log('\nDetected AI service unavailable for completions.');
  }
  if (debug && debug.body && debug.body.data && debug.body.data.present === false) {
    console.log('\nNote: AI binding not present in worker runtime ("No bindings found" at deploy).');
    console.log('You can bind the Cloudflare AI provider in wrangler.jsonc or use an external fallback.');
  }
}

main().catch(e => { console.error(e); process.exit(1); });
