import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	plugins: [sveltekit()],
	// Honor an externally assigned port (e.g. preview harnesses set PORT).
	server: {
		port: Number(process.env.PORT) || 5173
	},
	test: {
		include: ['src/**/*.test.ts', 'tests/**/*.test.ts']
	}
});
