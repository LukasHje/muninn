// @ts-check
import { defineConfig } from 'astro/config';
import { fileURLToPath } from 'node:url';
import node from '@astrojs/node';
import tailwindcss from '@tailwindcss/vite';

const srcRoot = fileURLToPath(new URL('./src', import.meta.url));
const bundleServerDependencies = process.env.NODE_ENV !== 'development';

// https://astro.build/config
export default defineConfig({
	output: 'server',
	devToolbar: {
		enabled: false,
	},
	adapter: node({
		mode: 'standalone',
	}),
	vite: {
		...(bundleServerDependencies
			? {
					ssr: {
						noExternal: true,
					},
				}
			: {}),
		resolve: {
			alias: {
				src: srcRoot,
			},
		},
		plugins: [tailwindcss()],
	},
});
