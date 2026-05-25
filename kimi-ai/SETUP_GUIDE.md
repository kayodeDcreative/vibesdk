# Kimi AI Code Generator Extension

A powerful VS Code extension that leverages Cloudflare Workers AI to assist with code generation, analysis, refactoring, and testing.

## Features

- **Code Generation** - Generate code from natural language descriptions
- **Code Explanation** - Get detailed explanations of selected code
- **Code Refactoring** - Automatically refactor code for better readability and performance
- **Test Generation** - Generate unit tests for your code

## Prerequisites

- VS Code 1.120.0 or higher
- Deployed Kimi AI Cloudflare Worker (see worker/README.md)
- Node.js and npm installed (for extension development)

## Installation

### Option 1: From Marketplace

(When published to VS Code Marketplace)

### Option 2: From Source

1. Clone this repository
2. Install extension dependencies:
   ```bash
   npm install
   ```
3. Compile the extension:
   ```bash
   npm run compile
   ```
4. Package the extension:
   ```bash
   npm run package
   ```
5. Install the `.vsix` file in VS Code

## Setup

### 1. Deploy the Worker

First, deploy the standalone Cloudflare Worker:

```bash
cd worker
npm install
npm run deploy
```

Save the worker URL (e.g., `https://kimi-ai-worker.example.workers.dev`)

### 2. Configure the Extension

**Option A: Using Command Palette**
1. Press `Cmd/Ctrl + Shift + P`
2. Search for "Kimi AI: Configure API Key"
3. Paste your worker endpoint URL when prompted

**Option B: Using Settings**
1. Open VS Code Settings (`Cmd/Ctrl + ,`)
2. Search for "kimi-ai"
3. Paste your worker endpoint URL in the `AI Endpoint` field
   ```
   kimi-ai.aiEndpoint: https://kimi-ai-worker.example.workers.dev
   ```

### 3. Test the Connection

1. Press `Cmd/Ctrl + Shift + P`
2. Search for "Kimi AI: Test Connection"
3. Verify the connection is successful

## Usage

### Generate Code

Generate code from a description:

**Command:** `Cmd/Ctrl + Shift + K` then `G`
**Or:** `Cmd/Ctrl + Shift + P` → "Kimi AI: Generate Code"

1. Enter your code description
2. Select the programming language
3. The generated code will open in a new editor

### Explain Code

Get an explanation of selected code:

**Command:** `Cmd/Ctrl + Shift + K` then `E`
**Or:** `Cmd/Ctrl + Shift + P` → "Kimi AI: Explain Code"

1. Select the code you want to explain
2. Run the command
3. Explanation appears in the output panel

### Refactor Code

Automatically refactor selected code:

**Command:** `Cmd/Ctrl + Shift + K` then `R`
**Or:** `Cmd/Ctrl + Shift + P` → "Kimi AI: Refactor Code"

1. Select the code you want to refactor
2. Run the command
3. The code will be replaced with the refactored version

### Generate Tests

Generate unit tests for selected code:

**Command:** `Cmd/Ctrl + Shift + K` then `T`
**Or:** `Cmd/Ctrl + Shift + P` → "Kimi AI: Generate Tests"

1. Select the code you want to test
2. Run the command
3. Test code opens in a new editor

## Configuration

Access settings via `Cmd/Ctrl + ,` and search for "kimi-ai":

| Setting | Description | Default |
|---------|-------------|---------|
| `apiKey` | Your Kimi API key | (empty) |
| `apiEndpoint` | Kimi API endpoint URL | `https://api.moonshot.cn/v1` |
| `model` | Kimi model to use | `kimi-2.6` |
| `temperature` | Temperature for code generation (0-1) | `0.7` |

## Keyboard Shortcuts

| Shortcut | Command |
|----------|---------|
| `Ctrl+Shift+K G` / `Cmd+Shift+K G` | Generate Code |
| `Ctrl+Shift+K E` / `Cmd+Shift+K E` | Explain Code |
| `Ctrl+Shift+K R` / `Cmd+Shift+K R` | Refactor Code |
| `Ctrl+Shift+K T` / `Cmd+Shift+K T` | Generate Tests |

## Development

### Build

```bash
npm run compile     # Development build
npm run package     # Production build
```

### Watch Mode

```bash
npm run watch       # Compile on file changes
```

### Linting

```bash
npm run lint        # Run ESLint
```

### Testing

```bash
npm run test        # Run tests
npm run pretest     # Full test setup
```

## Troubleshooting

### Connection Failed
- Verify your API key is correct
- Check that you have active API credits on Moonshot Platform
- Ensure your internet connection is working
- Run "Kimi AI: Test Connection" command

### API Key Not Recognized
- Restart VS Code
- Clear your settings and reconfigure the API key
- Check that the API key has no extra spaces or characters

### Rate Limiting
- Wait a few minutes before trying again
- Check your Moonshot Platform usage limits
- Consider upgrading your plan if needed

## Support

For issues and feature requests, visit the GitHub repository.

## License

This extension is provided as-is for use with the Moonshot Kimi API.

## Privacy

- Your API key is stored securely in VS Code settings
- All code processing is done through the Moonshot API
- No data is stored locally beyond your API key
