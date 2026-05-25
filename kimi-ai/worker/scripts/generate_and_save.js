import fs from 'fs/promises';

async function postJson(url, body) {
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const text = await resp.text();
  try {
    return { status: resp.status, json: JSON.parse(text) };
  } catch (e) {
    return { status: resp.status, text };
  }
}

(async () => {
  const prompt = process.argv.slice(2).join(' ') || 'Write a TypeScript function sum(a:number,b:number):number that returns a+b';
  const url = 'http://127.0.0.1:8787/api/ai/generate-code';

  try {
    const res = await postJson(url, { prompt, language: 'TypeScript' });
    if (res.status !== 200) {
      console.error('Request failed:', res.status, res.json || res.text);
      process.exit(1);
    }

    const code = res.json?.data?.code || '';
    if (!code) {
      console.error('No code in response:', JSON.stringify(res.json));
      process.exit(1);
    }

    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    const outDir = new URL('../../generated', import.meta.url).pathname.replace(/^\/+/, '');
    await fs.mkdir(outDir, { recursive: true });
    const outPath = `${outDir}/${ts}-generated.ts`;
    await fs.writeFile(outPath, code, 'utf8');
    console.log('Saved generated code to', outPath);
  } catch (e) {
    console.error('Error:', e && e.message ? e.message : e);
    process.exit(1);
  }
})();
