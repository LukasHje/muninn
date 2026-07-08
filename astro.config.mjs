// @ts-check
import { defineConfig } from 'astro/config';
import { fileURLToPath } from 'node:url';
import node from '@astrojs/node';
import tailwindcss from '@tailwindcss/vite';

const srcRoot = fileURLToPath(new URL('./src', import.meta.url));

// https://astro.build/config
export default defineConfig({
	output: 'server',
	adapter: node({
		mode: 'standalone',
	}),
	vite: {
		resolve: {
			alias: {
				components: fileURLToPath(new URL('./src/components', import.meta.url)),
				i18n: fileURLToPath(new URL('./src/i18n', import.meta.url)),
				layouts: fileURLToPath(new URL('./src/layouts', import.meta.url)),
				lib: fileURLToPath(new URL('./src/lib', import.meta.url)),
				pages: fileURLToPath(new URL('./src/pages', import.meta.url)),
				scripts: fileURLToPath(new URL('./src/scripts', import.meta.url)),
				styles: fileURLToPath(new URL('./src/styles', import.meta.url)),
				src: srcRoot,
			},
		},
		plugins: [tailwindcss()],
	},
});
