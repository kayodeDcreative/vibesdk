# Kimi AI Worker

A standalone Cloudflare Workers service that powers the Kimi AI VS Code extension with AI-driven code generation, analysis, refactoring, and testing capabilities.

## Features

- **Code Generation** - Generate code from natural language descriptions
- **Code Explanation** - Get detailed explanations of code functionality
- **Code Refactoring** - Automatically refactor code for better quality
- **Test Generation** - Generate unit tests for your code

## Prerequisites

- Node.js 18+
- Wrangler CLI (`npm install -g wrangler`)
- Cloudflare account

## Installation

```bash
cd worker
npm install
```

## Development

Run the worker locally:

```bash
npm run dev
```

The worker will start at `http://localhost:8787`

## Deployment

### Development Environment

```bash
npm run dev
```

### Production Deployment

```bash
npm run deploy:prod
```

Or deploy to development:

```bash
npm run deploy
```

## Configuration

Update `wrangler.jsonc` to configure:

- Worker name and routes
- Environment variables
- AI binding settings

## API Endpoints

All endpoints use POST method and expect JSON payloads.

### Generate Code

`POST /api/ai/generate-code`

Request:
```json
{
  "prompt": "Create a function that validates email addresses",
  "language": "TypeScript",
  "context": "Use regex patterns"
}
```

Response:
```json
{
  "success": true,
  "data": {
    "code": "function validateEmail(email: string): boolean { ... }",
    "explanation": "Generated TypeScript code based on requirements."
  }
}
```

### Explain Code

`POST /api/ai/explain-code`

Request:
```json
{
  "code": "const arr = [1,2,3]; const doubled = arr.map(x => x * 2);"
}
```

Response:
```json
{
  "success": true,
  "data": {
    "explanation": "This code creates an array of numbers and uses map to double each value..."
  }
}
```

### Refactor Code

`POST /api/ai/refactor-code`

Request:
```json
{
  "code": "function add(a, b) { return a + b; }",
  "language": "JavaScript"
}
```

Response:
```json
{
  "success": true,
  "data": {
    "code": "const add = (a: number, b: number): number => a + b;",
    "suggestions": "Refactored JavaScript code for improved quality."
  }
}
```

### Generate Tests

`POST /api/ai/generate-tests`

Request:
```json
{
  "code": "function add(a, b) { return a + b; }",
  "language": "JavaScript"
}
```

Response:
```json
{
  "success": true,
  "data": {
    "tests": "describe('add', () => { ... });",
    "coverage": "Unit tests generated for provided code."
  }
}
```

## Environment Variables

- `ENVIRONMENT` - Deployment environment (development/production)
- `LOG_LEVEL` - Logging level (debug/info/warn/error)
- `API_TIMEOUT` - Request timeout in milliseconds

## Project Structure

```
worker/
├── src/
│   ├── index.ts          # Main worker entry point
│   └── routes/           # Route handlers
│       ├── generateCode.ts
│       ├── explainCode.ts
│       ├── refactorCode.ts
│       └── generateTests.ts
├── wrangler.jsonc        # Wrangler configuration
├── package.json          # Dependencies
├── tsconfig.json         # TypeScript configuration
└── README.md             # This file
```

## Linking to Extension

In the VS Code extension settings, configure the worker endpoint:

```
kimi-ai.aiEndpoint: "https://your-worker-url.workers.dev"
```

Or use environment variable:

```
KIMI_AI_ENDPOINT=https://your-worker-url.workers.dev
```

## License

MIT
