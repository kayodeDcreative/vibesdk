const { spawn } = require('child_process');

const [command, ...args] = process.argv.slice(2);

if (!command) {
	console.error('Usage: node scripts/dev-env.cjs <command> [args...]');
	process.exit(1);
}

const child = spawn(command, args, {
	stdio: 'inherit',
	shell: true,
	env: { ...process.env, DEV_MODE: 'true' }
});

child.on('exit', (code) => process.exit(code ?? 0));
child.on('error', (error) => {
	console.error('Failed to spawn command:', error);
	process.exit(1);
});
