// Node script to check the AI binding on the deployed worker
const url = 'https://kimi-ai-worker.khay.workers.dev/api/ai/debug';

async function run() {
  try {
    const res = await fetch(url);
    const json = await res.json();
    console.log('HTTP', res.status);
    console.log(JSON.stringify(json, null, 2));
  } catch (err) {
    console.error('Request failed:', err);
    process.exit(1);
  }
}

run();
