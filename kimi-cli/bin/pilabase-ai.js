const { Command } = require('commander');
const axios = require('axios');
const fs = require('fs');
const os = require('os');
const path = require('path');
const readline = require('readline');
const chalk = require('chalk');
const ora = require('ora');
const figures = require('figures');
const { exec, execSync } = require('child_process');

const program = new Command();
const configDir = path.join(os.homedir(), '.pilabase-ai');
const oldConfigFile = path.join(os.homedir(), '.kimi-cli', 'config.json');
const configFile = path.join(configDir, 'config.json');
const {
  icons,
  renderHeader,
  renderSection,
  success,
  error,
  info,
  warn,
  renderPanel,
  renderTable,
  code,
  thinking,
  renderMessageList,
} = require('./ui');

const header = renderHeader;
const section = renderSection;

function openUrl(url) {
  const normalizedUrl = url.replace(/"/g, '\\"');
  if (process.platform === 'win32') {
    // Use cmd start to open default browser reliably on Windows (avoids "Choose an app")
    exec(`cmd /c start "" "${normalizedUrl}"`, (err) => err && console.error(err));
  } else if (process.platform === 'darwin') {
    exec(`open "${normalizedUrl}"`, (err) => err && console.error(err));
  } else {
    exec(`xdg-open "${normalizedUrl}"`, (err) => err && console.error(err));
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function pollForToken(endpoint, sessionId, timeoutMs = 120000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const resp = await axios.get(`${endpoint}/api/auth/poll-login`, {
        params: { sessionId },
        headers: { 'Content-Type': 'application/json' },
      });
      if (resp.status === 200) {
        const token = resp.data?.token || resp.data?.data?.token;
        if (token) {
          return token;
        }
      }
    } catch {
      // ignore and retry
    }
    await sleep(2000);
  }
  return null;
}

function loading(msg) {
  return ora({
    text: msg,
    color: 'cyan',
    symbol: figures.dots,
  });
}

function getEndpoint(cliEndpoint) {
  return cliEndpoint || process.env.PILABASE_AI_ENDPOINT || process.env.KIMI_AI_ENDPOINT || 'https://kimi-ai-worker.khay.workers.dev';
}

function loadConfig() {
  try {
    return JSON.parse(fs.readFileSync(configFile, 'utf8'));
  } catch {
    try {
      return JSON.parse(fs.readFileSync(oldConfigFile, 'utf8'));
    } catch {
      return {};
    }
  }
}

function saveConfig(config) {
  fs.mkdirSync(path.dirname(configFile), { recursive: true });
  fs.writeFileSync(configFile, JSON.stringify(config, null, 2), 'utf8');
}

function getAuthHeaders(cliToken) {
  const config = loadConfig();
  const token = cliToken || config.authToken || process.env.PILABASE_AI_TOKEN || process.env.KIMI_AI_TOKEN;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function promptInput(promptText) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(promptText, (value) => {
      rl.close();
      resolve(value.trim());
    });
  });
}

function promptPassword(promptText) {
  return new Promise((resolve) => {
    const stdin = process.stdin;
    const stdout = process.stdout;
    stdin.resume();
    stdout.write(promptText);
    stdin.setRawMode(true);
    let password = '';

    function onData(char) {
      const charStr = char.toString('utf8');
      switch (charStr) {
        case '\r':
        case '\n':
          stdout.write('\n');
          stdin.setRawMode(false);
          stdin.pause();
          stdin.removeListener('data', onData);
          resolve(password);
          break;
        case '\u0003':
          process.exit();
          break;
        case '\u0008':
        case '\u007f':
          password = password.slice(0, -1);
          break;
        default:
          password += charStr;
          break;
      }
    }

    stdin.on('data', onData);
  });
}

program
  .name('pilabase-ai')
  .description(chalk.bold.cyan('Pilabase AI CLI') + ' - Your AI coding companion')
  .version('0.3.0', '-v, --version');

program
  .command('test')
  .option('-e, --endpoint <url>')
  .description('Test connection to the worker')
  .action(async (opts) => {
    header('🧪 Connection Test');
    const endpoint = getEndpoint(opts.endpoint);
    try {
      info(`Endpoint: ${endpoint}`);
      
      console.log(chalk.dim('Testing health endpoint...'));
      await axios.get(`${endpoint}/health`);
      success('Health check passed');

      console.log(chalk.dim('Testing auth check...'));
      const resp = await axios.get(`${endpoint}/api/auth/check`, { headers: getAuthHeaders() });
      success(`Auth status: ${resp.data.authenticated ? 'Authenticated' : 'Not authenticated'}`);

      console.log(chalk.dim('Testing AI endpoint...'));
      await axios.post(
        `${endpoint}/api/ai/generate-code`,
        { prompt: 'hello world function', language: 'JavaScript' },
        { headers: { 'Content-Type': 'application/json', ...getAuthHeaders(opts.token) } }
      );
      success('AI endpoint responding');
      console.log();
    } catch (err) {
      error(`Connection test failed: ${err.response ? err.response.data.error : err.message}`);
      process.exitCode = 1;
    }
  });

program
  .command('login')
  .option('-e, --email <email>')
  .option('-p, --password <password>')
  .option('-t, --token <token>')
  .option('--browser', 'Open browser-based support login and poll for token')
  .option('--support-url <url>', 'Override the support login URL')
  .option('-u, --endpoint <url>')
  .description('Login and save session token')
  .action(async (opts) => {
    header(`${icons.auth} Login`);
    try {
      const endpoint = getEndpoint(opts.endpoint);
      const authToken = opts.token || loadConfig().authToken;

      if (authToken) {
        saveConfig({ authToken });
        success('Session token saved successfully');
        info(`Token saved to ${configFile}`);
        console.log();
        return;
      }

      if (opts.browser) {
        const sessionId = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
        const supportUrl = opts.supportUrl || `${endpoint}/support/cli-login?sessionId=${sessionId}`;
        info('Opening support login in your browser...');
        openUrl(supportUrl);
        info('Waiting for token from support portal...');
        const token = await pollForToken(endpoint, sessionId, 180000);
        if (token) {
          saveConfig({ authToken: token });
          success('Logged in successfully via browser support flow');
          info(`Token saved to ${configFile}`);
          console.log();
          return;
        }
        error('Support login timed out before a token was received.');
        process.exitCode = 1;
        return;
      }

      const email = opts.email || await promptInput('Email: ');
      const password = opts.password || await promptPassword('Password: ');
      
      console.log(chalk.dim('Authenticating...'));
      const resp = await axios.post(
        `${endpoint}/api/auth/login`,
        { email, password },
        { headers: { 'Content-Type': 'application/json' } }
      );
      if (resp.status === 200 && resp.data?.data?.token) {
        saveConfig({ authToken: resp.data.data.token });
        success(`Logged in as ${chalk.bold(email)}`);
        info(`Token saved to ${configFile}`);
        console.log();
      } else {
        error('Login failed');
        process.exitCode = 1;
      }
    } catch (err) {
      error(`Login failed: ${err.response?.data?.error || err.message}`);
      process.exitCode = 1;
    }
  });

  program
    .command('signup')
    .option('-e, --email <email>')
    .option('-p, --password <password>')
    .option('-u, --endpoint <url>')
    .description('Create a new account and save session token')
    .action(async (opts) => {
      header(`${icons.auth} Signup`);
      try {
        const endpoint = getEndpoint(opts.endpoint);
        const email = opts.email || await promptInput('Email: ');
        const password = opts.password || await promptPassword('Password: ');

        console.log(chalk.dim('Creating account...'));
        const resp = await axios.post(
          `${endpoint}/api/auth/register`,
          { email, password },
          { headers: { 'Content-Type': 'application/json' } }
        );

        if (resp.status === 200 && resp.data?.data?.token) {
          saveConfig({ authToken: resp.data.data.token });
          success(`Account created and logged in as ${chalk.bold(email)}`);
          info(`Token saved to ${configFile}`);
          console.log();
        } else {
          error('Signup failed');
          process.exitCode = 1;
        }
      } catch (err) {
        error(`Signup failed: ${err.response?.data?.error || err.message}`);
        process.exitCode = 1;
      }
    });

program
  .command('logout')
  .option('-u, --endpoint <url>')
  .description('Logout and remove session token')
  .action(async (opts) => {
    header(`${icons.auth} Logout`);
    try {
      const endpoint = getEndpoint(opts.endpoint);
      const headers = getAuthHeaders();
      if (!headers.Authorization) {
        warn('No saved session token found');
        return;
      }
      console.log(chalk.dim('Logging out...'));
      const resp = await axios.post(`${endpoint}/api/auth/logout`, {}, { headers: { 'Content-Type': 'application/json', ...headers } });
      if (resp.status === 200) {
        saveConfig({});
        success('Logged out successfully');
        info('Local token removed');
        console.log();
      } else {
        error('Logout failed');
        process.exitCode = 1;
      }
    } catch (err) {
      error(`Logout failed: ${err.response?.data?.error || err.message}`);
      process.exitCode = 1;
    }
  });

program
  .command('support')
  .option('-u, --endpoint <url>')
  .option('--support-url <url>', 'Override the support login URL')
  .description('Open web support login and poll for token')
  .action(async (opts) => {
    header(`${icons.chat} Support Login`);
    try {
      const endpoint = getEndpoint(opts.endpoint);
      const sessionId = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      const supportUrl = opts.supportUrl || `${endpoint}/support/cli-login?sessionId=${sessionId}`;
      info('Opening support portal in your browser...');
      openUrl(supportUrl);
      info('Waiting for token from support portal...');
      const token = await pollForToken(endpoint, sessionId, 180000);
      if (token) {
        saveConfig({ authToken: token });
        success('Support login complete and token saved');
        info(`Token saved to ${configFile}`);
      } else {
        error('Timed out waiting for support token.');
        process.exitCode = 1;
      }
      console.log();
    } catch (err) {
      error(`Support login failed: ${err.response?.data?.error || err.message}`);
      process.exitCode = 1;
    }
  });

program
  .command('status')
  .option('-e, --endpoint <url>')
  .description('Show configured CLI settings')
  .action((opts) => {
    header(`${icons.rocket} CLI Status`);
    const endpoint = getEndpoint(opts.endpoint);
    const config = loadConfig();
    const authStatus = config.authToken ? chalk.green('Saved') : chalk.yellow('Missing');
    const envToken = process.env.PILABASE_AI_TOKEN || process.env.KIMI_AI_TOKEN ? chalk.green('Set') : chalk.gray('None');

    renderPanel('Settings', [
      ['Endpoint:', endpoint],
      ['Config path:', configFile],
      ['Auth token:', authStatus],
      ['Env token override:', envToken],
    ]);
    console.log();
  });

program
  .command('profile')
  .option('-u, --endpoint <url>')
  .description('Show authenticated user profile')
  .action(async (opts) => {
    header(`${icons.user} User Profile`);
    try {
      const endpoint = getEndpoint(opts.endpoint);
      const resp = await axios.get(`${endpoint}/api/auth/profile`, { headers: getAuthHeaders() });
      section('Profile Information');
      console.log(`  ${chalk.bold('ID:')} ${resp.data.data.id}`);
      console.log(`  ${chalk.bold('Email:')} ${resp.data.data.email}`);
      console.log(`  ${chalk.bold('Joined:')} ${new Date(resp.data.data.createdAt).toLocaleString()}`);
      console.log();
    } catch (err) {
      error(`Failed to fetch profile: ${err.response?.data?.error || err.message}`);
      process.exitCode = 1;
    }
  });

program
  .command('generate')
  .requiredOption('-p, --prompt <text>')
  .option('-l, --language <lang>', 'language', 'JavaScript')
  .option('-o, --out <path>', 'output file path (auto-generated if not specified)')
  .option('-u, --update', 'update file if it already exists')
  .option('-e, --endpoint <url>')
  .option('-t, --token <token>', 'session token override')
  .option('--with-repo', 'include lightweight repo context')
  .option('--show-thinking', 'display AI thinking process')
  .description('Generate code from a prompt')
  .action(async (opts) => {
    header(`${icons.sparkles} Code Generation`);
    const endpoint = getEndpoint(opts.endpoint);
    try {
      section('Prompt');
      console.log(chalk.italic(opts.prompt));
      console.log();
      
      let body = { prompt: opts.prompt, language: opts.language };
      if (opts.withRepo) {
        try {
          const status = execSync('git status --porcelain', { encoding: 'utf8' });
          const log = execSync('git log -n 5 --pretty=oneline', { encoding: 'utf8' });
          const pkg = (() => { try { return require(path.resolve(process.cwd(), 'package.json')); } catch { return null } })();
          body.context = {
            gitStatus: status,
            recentCommits: log,
            packageJson: pkg,
          };
          info('Included repository context');
        } catch (e) {
          warn(`Failed to collect repo context: ${e.message || e}`);
        }
      }

      console.log(chalk.dim('Generating code...'));
      const resp = await axios.post(`${endpoint}/api/ai/generate-code`, body, { headers: { 'Content-Type': 'application/json', ...getAuthHeaders(opts.token) } });
      if (resp.status !== 200) {
        error(`Generation failed: ${resp.status}`);
        process.exitCode = 1;
        return;
      }

      if (opts.showThinking && resp.data?.data?.thinking) {
        thinking(resp.data.data.thinking);
      }

      success(`Generated ${opts.language}`);
      const genCode = resp.data?.data?.code || resp.data?.code || '';
      if (genCode) {
        // Generate meaningful filename from prompt
        function generateFileName(prompt, language, customPath) {
          if (customPath) {
            return path.resolve(customPath);
          }
          
          const ext = {
            'javascript': 'js',
            'typescript': 'ts',
            'python': 'py',
            'react': 'jsx',
            'html': 'html',
            'css': 'css',
            'json': 'json',
          }[language.toLowerCase()] || 'txt';
          
          // Extract meaningful name from prompt
          const words = prompt
            .toLowerCase()
            .replace(/[^a-z0-9\s]/g, '')
            .split(/\s+/)
            .filter(w => w.length > 2 && !['function', 'create', 'write', 'build', 'make', 'component', 'script', 'the', 'for', 'with', 'and', 'from', 'that', 'this'].includes(w))
            .slice(0, 3)
            .join('-');
          
          const fileName = words ? `${words}.${ext}` : `generated-${Date.now()}.${ext}`;
          return path.resolve(fileName);
        }
        
        let outPath = generateFileName(opts.prompt, opts.language, opts.out);
        
        // Check if file exists
        if (fs.existsSync(outPath) && !opts.update) {
          const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
          });
          
          await new Promise(resolve => {
            rl.question(chalk.yellow(`File ${path.basename(outPath)} already exists. Overwrite? (y/n) `), (answer) => {
              rl.close();
              if (answer.toLowerCase() !== 'y') {
                // Generate new file with timestamp
                const ext = path.extname(outPath);
                const baseName = path.basename(outPath, ext);
                outPath = path.resolve(`${baseName}-${Date.now()}${ext}`);
                info(`Saving as ${path.basename(outPath)} instead`);
              }
              resolve();
            });
          });
        }
        
        await fs.promises.mkdir(path.dirname(outPath), { recursive: true });
        await fs.promises.writeFile(outPath, genCode, 'utf8');
        
        // Show file path
        section('Generated File');
        console.log(chalk.cyan.underline(outPath));
        console.log();
        info(`File saved and ready to open`);
        info(`To open: ${chalk.dim(`code "${outPath}"`)}`);
      }
      console.log();
    } catch (err) {
      error(`Generation failed: ${err.response?.data?.error || err.message}`);
      process.exitCode = 1;
    }
  });

program
  .command('explain')
  .requiredOption('-c, --code <pathOrInline>', 'path to code file or inline code')
  .option('-e, --endpoint <url>')
  .option('-t, --token <token>', 'session token override')
  .option('--show-thinking', 'display AI thinking process')
  .description('Explain provided code')
  .action(async (opts) => {
    header(`${icons.code} Code Explanation`);
    const endpoint = getEndpoint(opts.endpoint);
    let codeContent = opts.code;
    try {
      if (fs.existsSync(opts.code)) {
        codeContent = fs.readFileSync(opts.code, 'utf8');
        info(`Reading from ${chalk.bold(opts.code)}`);
      }
      
      console.log(chalk.dim('Analyzing code...'));
      const resp = await axios.post(`${endpoint}/api/ai/explain-code`, { code: codeContent }, { headers: { 'Content-Type': 'application/json', ...getAuthHeaders(opts.token) } });
      
      if (opts.showThinking && resp.data?.data?.thinking) {
        thinking(resp.data.data.thinking);
      }

      success('Analysis complete');
      section('Explanation');
      console.log(resp.data.data.explanation);
      console.log();
    } catch (err) {
      error(`Explanation failed: ${err.response?.data?.error || err.message}`);
      process.exitCode = 1;
    }
  });

program
  .command('refactor')
  .requiredOption('-c, --code <pathOrInline>', 'path to code file or inline code')
  .option('-l, --language <lang>', 'language')
  .option('-e, --endpoint <url>')
  .option('-t, --token <token>', 'session token override')
  .option('--show-thinking', 'display AI thinking process')
  .description('Refactor provided code')
  .action(async (opts) => {
    header(`${icons.sparkles} Code Refactoring`);
    const endpoint = getEndpoint(opts.endpoint);
    let codeContent = opts.code;
    try {
      if (fs.existsSync(opts.code)) {
        codeContent = fs.readFileSync(opts.code, 'utf8');
        info(`Reading from ${chalk.bold(opts.code)}`);
      }
      
      console.log(chalk.dim('Refactoring code...'));
      const resp = await axios.post(`${endpoint}/api/ai/refactor-code`, { code: codeContent, language: opts.language }, { headers: { 'Content-Type': 'application/json', ...getAuthHeaders(opts.token) } });
      
      if (opts.showThinking && resp.data?.data?.thinking) {
        thinking(resp.data.data.thinking);
      }

      success('Refactoring complete');
      const refactoredCode = resp.data.data.code || '';
      if (refactoredCode) {
        const timestamp = Date.now();
        const ext = {
          'javascript': 'js',
          'typescript': 'ts',
          'python': 'py',
          'react': 'jsx',
          'html': 'html',
          'css': 'css',
        }[opts.language?.toLowerCase()] || 'txt';
        const outPath = path.resolve(`refactored-${timestamp}.${ext}`);
        
        await fs.promises.mkdir(path.dirname(outPath), { recursive: true });
        await fs.promises.writeFile(outPath, refactoredCode, 'utf8');
        
        section('Refactored File');
        console.log(chalk.cyan.underline(outPath));
        console.log();
        info('File saved and ready to open');
      }
      
    } catch (err) {
      error(`Refactoring failed: ${err.response?.data?.error || err.message}`);
      process.exitCode = 1;
    }
  });

program
  .command('generate-tests')
  .requiredOption('-c, --code <pathOrInline>', 'path to code file or inline code')
  .option('-l, --language <lang>', 'language')
  .option('-e, --endpoint <url>')
  .option('-t, --token <token>', 'session token override')
  .option('--show-thinking', 'display AI thinking process')
  .description('Generate tests for provided code')
  .action(async (opts) => {
    header(`${icons.code} Test Generation`);
    const endpoint = getEndpoint(opts.endpoint);
    let codeContent = opts.code;
    try {
      if (fs.existsSync(opts.code)) {
        codeContent = fs.readFileSync(opts.code, 'utf8');
        info(`Reading from ${chalk.bold(opts.code)}`);
      }
      
      console.log(chalk.dim('Generating tests...'));
      const resp = await axios.post(`${endpoint}/api/ai/generate-tests`, { code: codeContent, language: opts.language }, { headers: { 'Content-Type': 'application/json', ...getAuthHeaders(opts.token) } });
      
      if (opts.showThinking && resp.data?.data?.thinking) {
        thinking(resp.data.data.thinking);
      }

      success('Tests generated');
      const generatedTests = resp.data.data.tests || '';
      if (generatedTests) {
        const timestamp = Date.now();
        const ext = {
          'javascript': 'test.js',
          'typescript': 'test.ts',
          'python': 'test.py',
          'react': 'test.jsx',
        }[opts.language?.toLowerCase()] || 'test.txt';
        const outPath = path.resolve(`generated-${timestamp}.${ext}`);
        
        await fs.promises.mkdir(path.dirname(outPath), { recursive: true });
        await fs.promises.writeFile(outPath, generatedTests, 'utf8');
        
        section('Test File');
        console.log(chalk.cyan.underline(outPath));
        console.log();
        info('Test file saved and ready to open');
      }
      
    } catch (err) {
      error(`Test generation failed: ${err.response?.data?.error || err.message}`);
      process.exitCode = 1;
    }
  });

program
  .command('repo-context')
  .option('-f, --files <list>', 'comma-separated list of files to include')
  .description('Print repository context')
  .action((opts) => {
    header(`${icons.database} Repository Context`);
    try {
      const status = execSync('git status --porcelain', { encoding: 'utf8' });
      const log = execSync('git log -n 20 --pretty=oneline', { encoding: 'utf8' });
      const files = (opts.files || '').split(',').map(s => s.trim()).filter(Boolean);
      const excerpts = {};
      for (const f of files) {
        try { excerpts[f] = fs.readFileSync(f, 'utf8').slice(0, 2000); } catch { excerpts[f] = null }
      }
      
      section('Git Status');
      console.log(chalk.dim(status || '(clean)'));
      section('Recent Commits');
      console.log(chalk.dim(log));
      
      if (Object.keys(excerpts).length > 0) {
        section('File Excerpts');
        Object.entries(excerpts).forEach(([file, content]) => {
          if (content) {
            console.log(chalk.bold(file));
            console.log(chalk.gray(content.split('\n').slice(0, 5).join('\n')));
            console.log();
          }
        });
      }
      console.log();
    } catch (e) {
      error(`Failed to collect repo context: ${e.message || e}`);
      process.exitCode = 1;
    }
  });

program
  .command('chat')
  .option('-m, --message <text>', 'single user message (can be repeated)', (v, a) => { a.push(v); return a; }, [])
  .option('-j, --json <pathOrJson>', 'path to JSON messages or inline JSON')
  .option('--with-repo', 'include lightweight repo context')
  .option('-e, --endpoint <url>')
  .option('-t, --token <token>', 'session token override')
  .option('--show-thinking', 'display AI thinking process')
  .description('Chat with AI')
  .action(async (opts) => {
    header(`${icons.chat} Chat`);
    const endpoint = getEndpoint(opts.endpoint);
    let messages = [];
    try {
      if (opts.json) {
        if (fs.existsSync(opts.json)) {
          messages = JSON.parse(fs.readFileSync(opts.json, 'utf8'));
        } else {
          messages = JSON.parse(opts.json);
        }
      } else if (opts.message && opts.message.length) {
        messages = opts.message.map(m => ({ role: 'user', content: m }));
      } else {
        error('Provide --message or --json with messages');
        process.exitCode = 1;
        return;
      }

      section('Messages');
      messages.forEach(m => {
        const color = m.role === 'user' ? 'cyan' : m.role === 'assistant' ? 'green' : 'gray';
        console.log(chalk[color](`${chalk.bold(m.role.toUpperCase())}: ${m.content.substring(0, 80)}${m.content.length > 80 ? '...' : ''}`));
      });
      console.log();

      const body = { messages };
      if (opts.withRepo) {
        try {
          body.context = { gitStatus: execSync('git status --porcelain', { encoding: 'utf8' }) };
          info('Included repository context');
        } catch (e) { }
      }

      console.log(chalk.dim('Thinking...'));
      const resp = await axios.post(`${endpoint}/api/ai/chat`, body, { headers: { 'Content-Type': 'application/json', ...getAuthHeaders(opts.token) } });
      if (resp.status !== 200) {
        error(`Chat failed: ${resp.status}`);
        process.exitCode = 1;
        return;
      }

      if (opts.showThinking && resp.data?.data?.thinking) {
        thinking(resp.data.data.thinking);
      }

      success('Response received');
      section('Reply');
      console.log(resp.data.data.reply);
      console.log();
    } catch (err) {
      error(`Chat failed: ${err.response?.data?.error || err.message}`);
      process.exitCode = 1;
    }
  });

program.parse(process.argv);
