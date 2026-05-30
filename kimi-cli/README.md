Pilabase AI CLI
================

The Pilabase AI CLI gives you a rich command-line experience for working with the Pilabase AI worker.

## Install

```
cd kimi-cli
npm install
```

## Run

```
npm start -- generate -p "Write a hello function" -o ../kimi-ai/generated/hello.ts
```


## Login and support

Pilabase AI supports local password login and browser-based support login.

- `pilabase-ai login` — prompt for email/password
- `pilabase-ai login --token <token>` — save an existing token
- `pilabase-ai login --browser` — open browser support login and poll for a token
- `pilabase-ai support` — open the support login flow and wait for a token
- `pilabase-ai logout` — clear saved credentials

The CLI stores credentials in `~/.pilabase-ai/config.json` and will also read legacy `~/.kimi-cli/config.json` if present.

## Commands

- `pilabase-ai test` — verify worker, auth, and AI connectivity
- `pilabase-ai status` — show current CLI configuration and token status
- `pilabase-ai profile` — fetch authenticated profile information
- `pilabase-ai generate -p <prompt>` — generate code from a prompt
- `pilabase-ai explain -c <file-or-code>` — explain code with AI
- `pilabase-ai refactor -c <file-or-code>` — refactor code with AI
- `pilabase-ai generate-tests -c <file-or-code>` — produce tests for code
- `pilabase-ai repo-context` — display repo status, commits, and file excerpts
- `pilabase-ai chat -m "Hello"` — send chat messages to the AI

## Example usage

```
pilabase-ai login --browser
pilabase-ai status
pilabase-ai generate -p "Create a React counter component" -l TypeScript -o ./generated/counter.tsx
pilabase-ai chat -m "What should I name this component?"
```

## Notes

- `pilabase-ai` is the main executable.
- A compatibility wrapper remains at `bin/kimi-cli.js` for legacy scripts.
- Use `--show-thinking` to see intermediate AI reasoning when available.

The CLI now includes richer formatted headers, panels, and status output for a cleaner interactive experience. Run `node bin/kimi-cli.js status` to inspect your current configuration.
