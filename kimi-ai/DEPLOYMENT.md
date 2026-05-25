# Kimi AI - Deployment & Integration Guide

This document explains the architecture and deployment process for the Kimi AI extension with its standalone Cloudflare Worker backend.

## Architecture Overview

The Kimi AI system consists of two independent components:

```
┌─────────────────────────────────────────┐
│       VS Code Extension (kimi-ai)       │
│  - Code: src/                           │
│  - Package: package.json                │
│  - UI Commands & Editor Integration     │
└────────────────┬────────────────────────┘
                 │ HTTP Requests
                 ▼
┌─────────────────────────────────────────┐
│  Cloudflare Worker (kimi-ai/worker)     │
│  - Routes: src/routes/                  │
│  - Bindings: AI, Observability          │
│  - Config: wrangler.jsonc               │
└────────────────┬────────────────────────┘
                 │ API Calls
                 ▼
         ┌───────────────┐
         │ Cloudflare AI │
         │   (Mistral)   │
         └───────────────┘
```

## Project Structure

```
kimi-ai/
├── src/                          # Extension source code
│   ├── extension.ts             # Main extension entry point
│   ├── kimiService.ts           # Service layer (API calls to worker)
│   └── test/
├── worker/                       # Standalone Cloudflare Worker
│   ├── src/
│   │   ├── index.ts             # Worker entry point (Hono app)
│   │   └── routes/              # API route handlers
│   │       ├── generateCode.ts
│   │       ├── explainCode.ts
│   │       ├── refactorCode.ts
│   │       └── generateTests.ts
│   ├── wrangler.jsonc           # Cloudflare Worker config
│   ├── tsconfig.json            # TypeScript config
│   ├── package.json             # Worker dependencies
│   ├── .gitignore               # Worker-specific git ignore
│   └── README.md                # Worker deployment guide
├── package.json                 # Extension dependencies
├── tsconfig.json                # Extension TypeScript config
├── SETUP_GUIDE.md               # User setup instructions
└── DEPLOYMENT.md                # This file
```

## Deployment Steps

### Step 1: Deploy the Cloudflare Worker

1. Navigate to the worker directory:
   ```bash
   cd kimi-ai/worker
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure your Cloudflare credentials:
   ```bash
   wrangler login
   ```

4. Deploy to production:
   ```bash
   npm run deploy:prod
   ```

5. Note the worker URL (shown in deployment output):
   ```
   Deployment URL: https://kimi-ai-worker-xxxxx.example.workers.dev
   ```

### Step 2: Configure the Extension

1. Build the extension:
   ```bash
   npm install
   npm run compile
   ```

2. Package the extension (optional):
   ```bash
   npm run package
   ```

3. Install in VS Code:
   - Open VS Code
   - Go to Extensions (Cmd/Ctrl + Shift + X)
   - Click "Install from VSIX..." (if packaged)
   - Or, in development: Press F5 to open extension development host

4. Configure the endpoint:
   - Press `Cmd/Ctrl + Shift + P`
   - Run "Kimi AI: Configure API Key"
   - Paste the worker URL from Step 1

### Step 3: Test the Integration

1. In VS Code, open a code file
2. Press `Cmd/Ctrl + Shift + P`
3. Run "Kimi AI: Test Connection"
4. You should see a success message

## Configuration

### Extension Settings

Edit `.vscode/settings.json` or VS Code settings:

```json
{
  "kimi-ai.aiEndpoint": "https://kimi-ai-worker-xxxxx.example.workers.dev",
  "kimi-ai.cloudflareWorkerUrl": "https://kimi-ai-worker-xxxxx.example.workers.dev"
}
```

### Worker Environment Variables

Edit `worker/wrangler.jsonc`:

```jsonc
{
  "vars": {
    "ENVIRONMENT": "production",
    "LOG_LEVEL": "info",
    "API_TIMEOUT": "60000"
  }
}
```

## API Endpoints

All endpoints are served from the worker at the configured URL:

- `POST /api/ai/generate-code` - Generate code from description
- `POST /api/ai/explain-code` - Explain provided code
- `POST /api/ai/refactor-code` - Refactor provided code
- `POST /api/ai/generate-tests` - Generate tests for code

See [worker/README.md](worker/README.md) for detailed API documentation.

## Development

### Local Development

#### Extension Development

```bash
# Install dependencies
npm install

# Watch mode
npm run watch

# Launch extension (F5 in VS Code)
```

#### Worker Development

```bash
# Navigate to worker
cd worker

# Install dependencies
npm install

# Start local development server
npm run dev

# Worker will be available at http://localhost:8787
```

#### Testing with Local Worker

1. Start worker dev server: `cd worker && npm run dev`
2. Configure extension endpoint to: `http://localhost:8787`
3. Press F5 to launch extension development host
4. Test commands in the development host

### Environment-Specific Deployments

#### Development Environment

```bash
cd worker
npm run deploy
# Uses "development" env from wrangler.jsonc
```

#### Production Environment

```bash
cd worker
npm run deploy:prod
# Uses "production" env from wrangler.jsonc
```

## Monitoring & Debugging

### Worker Logs

View real-time worker logs:

```bash
cd worker
wrangler tail
```

### Extension Logs

In the development host (F5 launch):
- Open Output panel: `Cmd/Ctrl + Shift + U`
- Select "Kimi AI" from dropdown

### Common Issues

**"AI service not available"**
- Check that Cloudflare Worker is deployed
- Verify AI binding is configured in wrangler.jsonc
- Ensure your Cloudflare account has AI credits

**Connection timeout**
- Check worker URL is correct
- Verify network connectivity
- Check worker logs: `wrangler tail`

**Invalid endpoint**
- Verify worker endpoint URL format: `https://...workers.dev`
- Check for typos in configuration
- Redeploy worker if URL changed

## Git Integration

**Note:** The kimi-ai folder has been cleaned of its separate git configuration. The entire project should be managed from the main vibesdk repository.

- Extension code: `kimi-ai/src/`
- Worker code: `kimi-ai/worker/src/`
- Both are committed to the main repo

## Publishing

### To VS Code Marketplace

1. Update version in `package.json`
2. Build and package:
   ```bash
   npm run package
   ```
3. Publish with vsce:
   ```bash
   npx vsce publish
   ```

### Private Distribution

1. Package the extension:
   ```bash
   npm run package
   ```
2. Share the `.vsix` file for manual installation

## Support

For issues or questions:
1. Check [SETUP_GUIDE.md](SETUP_GUIDE.md) for user setup
2. Check [worker/README.md](worker/README.md) for API details
3. Review worker logs: `wrangler tail`
4. Check extension development console (F5 launch)
