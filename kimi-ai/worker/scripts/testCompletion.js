// Simple Node.js script to POST to the deployed chat completions endpoint
// Usage: node scripts/testCompletion.js
// Optional: set API_TOKEN env var to include Authorization header

const url = 'https://kimi-ai-worker.khay.workers.dev/api/ai/chat/completions';

const body = {
  model: 'kimi-ai',
  messages: [
    { role: 'system', content: 'You are a helpful assistant.' },
    { role: 'user', content: 'Hello' }
  ]
};

async function run() {
  try {
    const headers = { 'Content-Type': 'application/json' };
    if (process.env.API_TOKEN) headers['Authorization'] = `Bearer ${process.env.API_TOKEN}`;

    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    const text = await res.text();
    console.log('HTTP', res.status, res.statusText);
    try {
      console.log(JSON.stringify(JSON.parse(text), null, 2));
    } catch (e) {
      console.log(text);
    }
  } catch (err) {
    console.error('Request failed:', err);
    process.exit(1);
  }
}

run();
