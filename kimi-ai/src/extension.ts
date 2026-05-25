// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { KimiService } from './kimiService';

let kimiService: KimiService;

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	console.log('Congratulations, your extension "kimi-ai" is now active!');

	// Initialize Kimi Service
	kimiService = new KimiService();

	// Command: Generate Code from Description
	const generateCodeCommand = vscode.commands.registerCommand('kimi-ai.generateCode', async () => {
		const prompt = await vscode.window.showInputBox({
			placeHolder: 'Enter your code generation request...',
			prompt: 'Describe the code you want to generate',
		});

		if (!prompt) {
			return;
		}

		const language = await vscode.window.showQuickPick(
			['JavaScript', 'TypeScript', 'Python', 'Java', 'C++', 'C#', 'Go', 'Rust', 'PHP', 'Other'],
			{ placeHolder: 'Select programming language' }
		);

		if (!language) {
			return;
		}

		await withProgress('Generating code...', async () => {
			try {
				const result = await kimiService.generateCode({
					prompt,
					language,
				});

				// Open new file with generated code
				const document = await vscode.workspace.openTextDocument({
					language: language.toLowerCase(),
					content: result.code,
				});

				const editor = await vscode.window.showTextDocument(document);

				vscode.window.showInformationMessage('✅ Code generated successfully!');
			} catch (error) {
				vscode.window.showErrorMessage(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
			}
		});
	});

	// Command: Explain Selected Code
	const explainCodeCommand = vscode.commands.registerCommand('kimi-ai.explainCode', async () => {
		const editor = vscode.window.activeTextEditor;

		if (!editor) {
			vscode.window.showErrorMessage('No active editor');
			return;
		}

		const selection = editor.selection;
		const selectedText = editor.document.getText(selection);

		if (!selectedText) {
			vscode.window.showErrorMessage('No text selected');
			return;
		}

		await withProgress('Analyzing code...', async () => {
			try {
				const explanation = await kimiService.explainCode(selectedText);

				// Show explanation in output channel
				const outputChannel = vscode.window.createOutputChannel('Kimi AI - Explanation');
				outputChannel.clear();
				outputChannel.appendLine('=== Code Explanation ===\n');
				outputChannel.appendLine(explanation);
				outputChannel.show();

				vscode.window.showInformationMessage('✅ Explanation generated!');
			} catch (error) {
				vscode.window.showErrorMessage(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
			}
		});
	});

	// Command: Refactor Selected Code
	const refactorCodeCommand = vscode.commands.registerCommand('kimi-ai.refactorCode', async () => {
		const editor = vscode.window.activeTextEditor;

		if (!editor) {
			vscode.window.showErrorMessage('No active editor');
			return;
		}

		const selection = editor.selection;
		const selectedText = editor.document.getText(selection);

		if (!selectedText) {
			vscode.window.showErrorMessage('No text selected');
			return;
		}

		await withProgress('Refactoring code...', async () => {
			try {
				const refactoredCode = await kimiService.refactorCode(selectedText, editor.document.languageId);

				// Replace selected text with refactored code
				await editor.edit(editBuilder => {
					editBuilder.replace(selection, refactoredCode);
				});

				vscode.window.showInformationMessage('✅ Code refactored successfully!');
			} catch (error) {
				vscode.window.showErrorMessage(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
			}
		});
	});

	// Command: Generate Tests
	const generateTestsCommand = vscode.commands.registerCommand('kimi-ai.generateTests', async () => {
		const editor = vscode.window.activeTextEditor;

		if (!editor) {
			vscode.window.showErrorMessage('No active editor');
			return;
		}

		const selection = editor.selection;
		const selectedText = editor.document.getText(selection);

		if (!selectedText) {
			vscode.window.showErrorMessage('No text selected');
			return;
		}

		await withProgress('Generating test cases...', async () => {
			try {
				const tests = await kimiService.generateTests(selectedText, editor.document.languageId);

				// Open new file with test code
				const document = await vscode.workspace.openTextDocument({
					language: editor.document.languageId,
					content: tests,
				});

				await vscode.window.showTextDocument(document);

				vscode.window.showInformationMessage('✅ Test cases generated!');
			} catch (error) {
				vscode.window.showErrorMessage(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
			}
		});
	});

	// Command: Configure Worker Endpoint
	const configureKeyCommand = vscode.commands.registerCommand('kimi-ai.configureApiKey', async () => {
		const config = vscode.workspace.getConfiguration('kimi-ai');
		const currentEndpoint = config.get<string>('aiEndpoint', '');

		const endpoint = await vscode.window.showInputBox({
			placeHolder: 'e.g., https://kimi-ai-worker.example.workers.dev',
			prompt: 'Enter your Cloudflare Worker endpoint URL',
			value: currentEndpoint,
		});

		if (endpoint) {
			await config.update('aiEndpoint', endpoint, vscode.ConfigurationTarget.Global);

			// Update service with new endpoint
			kimiService.updateEndpoint(endpoint);

			vscode.window.showInformationMessage('✅ Worker endpoint configured successfully!');
		}
	});

	// Command: Test API Connection
	const testConnectionCommand = vscode.commands.registerCommand('kimi-ai.testConnection', async () => {
		await withProgress('Testing connection...', async () => {
			try {
				const success = await kimiService.testConnection();
				if (success) {
					vscode.window.showInformationMessage('✅ Connection successful!');
				} else {
					vscode.window.showWarningMessage('⚠️ Connection test failed');
				}
			} catch (error) {
				vscode.window.showErrorMessage(`❌ Connection error: ${error instanceof Error ? error.message : 'Unknown error'}`);
			}
		});
	});

	// Register all commands
	context.subscriptions.push(generateCodeCommand);
	context.subscriptions.push(explainCodeCommand);
	context.subscriptions.push(refactorCodeCommand);
	context.subscriptions.push(generateTestsCommand);
	context.subscriptions.push(configureKeyCommand);
	context.subscriptions.push(testConnectionCommand);
}

// Helper function to show progress
async function withProgress(title: string, task: () => Promise<void>): Promise<void> {
	await vscode.window.withProgress(
		{
			location: vscode.ProgressLocation.Notification,
			title,
			cancellable: false,
		},
		async () => {
			await task();
		}
	);
}

// This method is called when your extension is deactivated
export function deactivate() {}
