import { defineConfig } from 'tsup'

export default defineConfig({
    entry: [
        'src/rpc_server.ts',
        'src/rpc_client.ts',
        'src/rpc_browser.ts'
    ],
    splitting: false,
    sourcemap: true,
    clean: true,
    outDir: "build"
})