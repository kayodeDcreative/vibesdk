#!/usr/bin/env node
const { Command } = require('commander');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const program = new Command();

function getEndpoint(cliEndpoint) {
  // Prefer explicit CLI option, then env var, then the deployed worker URL (fallback to localhost only if not set)
  return cliEndpoint || process.env.KIMI_AI_ENDPOINT || 'https://kimi-ai-worker.khay.workers.dev';
}

program
  .name('kimi-cli')
  .description('Kimi AI CLI')
  .version('0.1.0');

program
  .command('test')
  .option('-e, --endpoint <url>')
  .description('Test connection to the worker')
  .action(async (opts) => {
    const endpoint = getEndpoint(opts.endpoint);
    try {
      const health = await axios.get(`${endpoint}/health`);
      console.log('Health:', health.status, JSON.stringify(health.data));

      // quick generate-code test
      const resp = await axios.post(`${endpoint}/api/ai/generate-code`, { prompt: 'hello', language: 'JavaScript' }, { headers: { 'Content-Type': 'application/json' } });
      console.log('Generate-code status:', resp.status);
      console.log(JSON.stringify(resp.data, null, 2));
    } catch (err) {
      console.error('Connection test failed:', err.response ? err.response.data : err.message);
      process.exitCode = 1;
    }
  });

program
  .command('generate')
  .requiredOption('-p, --prompt <text>')
  .option('-l, --language <lang>', 'language', 'JavaScript')
  .option('-o, --out <path>', 'output file path')
  .option('-e, --endpoint <url>')
  .option('--with-repo', 'include lightweight repo context')
  .description('Generate code from a prompt')
  .action(async (opts) => {
    const endpoint = getEndpoint(opts.endpoint);
    try {
      let body = { prompt: opts.prompt, language: opts.language };
      if (opts.withRepo) {
        try {
          const { execSync } = require('child_process');
          const status = execSync('git status --porcelain', { encoding: 'utf8' });
          const log = execSync('git log -n 5 --pretty=oneline', { encoding: 'utf8' });
          const pkg = (() => { try { return require(path.resolve(process.cwd(), 'package.json')); } catch { return null } })();
          body.context = {
            gitStatus: status,
            recentCommits: log,
            packageJson: pkg,
          };
        } catch (e) {
          console.warn('Warning: failed to collect repo context:', e.message || e);
        }
      }

      const resp = await axios.post(`${endpoint}/api/ai/generate-code`, body, { headers: { 'Content-Type': 'application/json' } });
      if (resp.status !== 200) {
        console.error('Generate failed:', resp.status, resp.data);
        process.exitCode = 1;
        return;
      }

      const code = resp.data?.data?.code || resp.data?.code || JSON.stringify(resp.data);
      if (opts.out) {
        const outPath = path.resolve(opts.out);
        await fs.promises.mkdir(path.dirname(outPath), { recursive: true });
        await fs.promises.writeFile(outPath, code, 'utf8');
        console.log('Saved generated code to', outPath);
      } else {
        console.log(code);
      }
    } catch (err) {
      console.error('Generate failed:', err.response ? err.response.data : err.message);
      process.exitCode = 1;
    }
  });

program
  .command('explain')
  .requiredOption('-c, --code <pathOrInline>', 'path to code file or inline code')
  .option('-e, --endpoint <url>')
  .description('Explain provided code')
  .action(async (opts) => {
    const endpoint = getEndpoint(opts.endpoint);
    let code = opts.code;
    try {
      if (fs.existsSync(code)) code = fs.readFileSync(code, 'utf8');
      const resp = await axios.post(`${endpoint}/api/ai/explain-code`, { code }, { headers: { 'Content-Type': 'application/json' } });
      console.log(JSON.stringify(resp.data, null, 2));
    } catch (err) {
      console.error('Explain failed:', err.response ? err.response.data : err.message);
      process.exitCode = 1;
    }
  });

program
  .command('refactor')
  .requiredOption('-c, --code <pathOrInline>', 'path to code file or inline code')
  .option('-l, --language <lang>', 'language')
  .option('-e, --endpoint <url>')
  .description('Refactor provided code')
  .action(async (opts) => {
    const endpoint = getEndpoint(opts.endpoint);
    let code = opts.code;
    try {
      if (fs.existsSync(code)) code = fs.readFileSync(code, 'utf8');
      const resp = await axios.post(`${endpoint}/api/ai/refactor-code`, { code, language: opts.language }, { headers: { 'Content-Type': 'application/json' } });
      console.log(JSON.stringify(resp.data, null, 2));
    } catch (err) {
      console.error('Refactor failed:', err.response ? err.response.data : err.message);
      process.exitCode = 1;
    }
  });

program
  .command('generate-tests')
  .requiredOption('-c, --code <pathOrInline>', 'path to code file or inline code')
  .option('-l, --language <lang>', 'language')
  .option('-e, --endpoint <url>')
  .description('Generate tests for provided code')
  .action(async (opts) => {
    const endpoint = getEndpoint(opts.endpoint);
    let code = opts.code;
    try {
      if (fs.existsSync(code)) code = fs.readFileSync(code, 'utf8');
      const resp = await axios.post(`${endpoint}/api/ai/generate-tests`, { code, language: opts.language }, { headers: { 'Content-Type': 'application/json' } });
      console.log(JSON.stringify(resp.data, null, 2));
    } catch (err) {
      console.error('Generate-tests failed:', err.response ? err.response.data : err.message);
      process.exitCode = 1;
    }
  });

program
  .command('repo-context')
  .option('-f, --files <list>', 'comma-separated list of files to include')
  .description('Print lightweight repo context (git status, recent commits, small file excerpts)')
  .action((opts) => {
    try {
      const { execSync } = require('child_process');
      const status = execSync('git status --porcelain', { encoding: 'utf8' });
      const log = execSync('git log -n 20 --pretty=oneline', { encoding: 'utf8' });
      const files = (opts.files || '').split(',').map(s => s.trim()).filter(Boolean);
      const excerpts = {};
      for (const f of files) {
        try { excerpts[f] = fs.readFileSync(f, 'utf8').slice(0, 2000); } catch { excerpts[f] = null }
      }
      console.log(JSON.stringify({ gitStatus: status, recentCommits: log, excerpts }, null, 2));
    } catch (e) {
      console.error('Failed to collect repo context:', e.message || e);
      process.exitCode = 1;
    }
  });

program
  .command('apply')
  .requiredOption('-p, --path <filePath>')
  .requiredOption('-c, --content <content>')
  .option('-y, --yes', 'no confirmation')
  .description('Write provided content to a file in the repo')
  .action(async (opts) => {
    try {
      if (!opts.yes) {
        const rl = require('readline').createInterface({ input: process.stdin, output: process.stdout });
        await new Promise(res => rl.question(`Write to ${opts.path}? (y/n) `, a => { rl.close(); res(a); }));
      }
      await fs.promises.mkdir(path.dirname(opts.path), { recursive: true });
      await fs.promises.writeFile(opts.path, opts.content, 'utf8');
      console.log('Wrote', opts.path);
    } catch (e) {
      console.error('Apply failed:', e.message || e);
      process.exitCode = 1;
    }
  });

program
  .command('commit')
  .requiredOption('-m, --message <msg>')
  .option('-f, --files <list>', 'comma-separated list of files to add')
  .description('Run git add and git commit for files')
  .action((opts) => {
    try {
      const { execSync } = require('child_process');
      const files = (opts.files || '').split(',').map(s => s.trim()).filter(Boolean);
      if (files.length) execSync(`git add ${files.map(f => '"'+f+'"').join(' ')}`);
      execSync(`git commit -m "${opts.message.replace(/"/g, '\\"')}"`);
      console.log('Committed.');
    } catch (e) {
      console.error('Commit failed:', e.message || e);
      process.exitCode = 1;
    }
  });

program
  .command('chat')
  .option('-m, --message <text>', 'single user message (can be repeated)', (v, a) => { a.push(v); return a; }, [])
  .option('-j, --json <pathOrJson>', 'path to JSON messages or inline JSON')
  .option('--with-repo', 'include lightweight repo context')
  .option('-e, --endpoint <url>')
  .description('Send chat messages to AI and print reply')
  .action(async (opts) => {
    const endpoint = getEndpoint(opts.endpoint);
    let messages = [];
    try {
      if (opts.json) {
        // try file first
        if (fs.existsSync(opts.json)) {
          messages = JSON.parse(fs.readFileSync(opts.json, 'utf8'));
        } else {
          messages = JSON.parse(opts.json);
        }
      } else if (opts.message && opts.message.length) {
        messages = opts.message.map(m => ({ role: 'user', content: m }));
      } else {
        console.error('Provide --message or --json with messages');
        process.exitCode = 1;
        return;
      }

      const body = { messages };
      if (opts.withRepo) {
        try {
          const { execSync } = require('child_process');
          body.context = { gitStatus: execSync('git status --porcelain', { encoding: 'utf8' }) };
        } catch (e) { /* ignore */ }
      }

      const resp = await axios.post(`${endpoint}/api/ai/chat`, body, { headers: { 'Content-Type': 'application/json' } });
      if (resp.status !== 200) {
        console.error('Chat failed:', resp.status, resp.data);
        process.exitCode = 1;
        return;
      }
      console.log(JSON.stringify(resp.data, null, 2));
    } catch (err) {
      console.error('Chat failed:', err.response ? err.response.data : err.message);
      process.exitCode = 1;
    }
  });

program.parse(process.argv);
