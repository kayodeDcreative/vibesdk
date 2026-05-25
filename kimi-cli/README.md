Kimi CLI
========

Simple command-line interface for the Kimi AI worker.

Install and run locally:

```
cd kimi-cli
npm install
npm start -- generate -p "Write a hello function" -o ../kimi-ai/generated/hello.ts
```

Or run directly without installing dependencies (Node 18+ required):

```
node bin/kimi-cli.js test
node bin/kimi-cli.js generate -p "Write sum(a,b)" -o ../kimi-ai/generated/sum.ts
```

The CLI uses the `KIMI_AI_ENDPOINT` environment variable or defaults to `http://127.0.0.1:8787`.
