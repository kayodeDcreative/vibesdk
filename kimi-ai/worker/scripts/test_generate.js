import http from 'node:http';

async function postJson(url, body) {
  const data = JSON.stringify(body);
  const u = new URL(url);
  const options = {
    hostname: u.hostname,
    port: u.port,
    path: u.pathname + u.search,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(data),
    },
  };

  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let chunks = '';
      res.setEncoding('utf8');
      res.on('data', (c) => (chunks += c));
      res.on('end', () => resolve({ status: res.statusCode, body: chunks }));
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

(async () => {
  try {
    console.log('Testing generate-code (connection check)');
    const res = await postJson('http://127.0.0.1:8787/api/ai/generate-code', { prompt: 'hello world', language: 'JavaScript' });
    console.log('STATUS', res.status);
    console.log(res.body);

    console.log('\nTesting generate-code with sample prompt');
    const res2 = await postJson('http://127.0.0.1:8787/api/ai/generate-code', { prompt: 'Write a TypeScript function sum(a:number,b:number):number that returns a+b', language: 'TypeScript' });
    console.log('STATUS', res2.status);
    console.log(res2.body);
  } catch (e) {
    console.error('Error:', e && e.message ? e.message : e);
    process.exitCode = 1;
  }
})();
