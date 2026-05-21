import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

export default defineConfig({
	plugins: [react(), tailwindcss()],
	resolve: {
		alias: [
			{ find: '@', replacement: path.resolve(__dirname, 'src') },
			{ find: /^worker\/(.*)$/, replacement: path.resolve(__dirname, 'worker/$1') },
			{ find: /^shared\/(.*)$/, replacement: path.resolve(__dirname, 'shared/$1') }
		]
	},
	server: {
		port: 5173
	}
});
