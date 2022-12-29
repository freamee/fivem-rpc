import { defineConfig } from 'tsup'

export default defineConfig({
    entry: [
        'src/server.ts',
        'src/client.ts',
        'src/browser.ts'
    ],
    splitting: false,
    sourcemap: true,
    clean: true,
    outDir: "build"
})