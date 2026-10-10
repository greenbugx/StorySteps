import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { copyFileSync, createReadStream, existsSync, mkdirSync, statSync } from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import { VitePWA } from 'vite-plugin-pwa'
import { defineConfig } from 'vitest/config'
import type { Plugin } from 'vite'

const require = createRequire(import.meta.url)

const litertWasmRoot = path.join(path.dirname(require.resolve('@litert-lm/core/package.json')), 'wasm')
const transformersRequire = createRequire(require.resolve('@huggingface/transformers'))
const ortDistRoot = path.dirname(transformersRequire.resolve('onnxruntime-web'))

const runtimeAssetGroups = [
  {
    prefix: 'runtime/litert',
    root: litertWasmRoot,
    files: [
      'litertlm_wasm_internal.js',
      'litertlm_wasm_internal.wasm',
      'litertlm_wasm_asyncify_internal.js',
      'litertlm_wasm_asyncify_internal.wasm',
    ],
  },
  {
    prefix: 'runtime/ort',
    root: ortDistRoot,
    files: ['ort-wasm-simd-threaded.asyncify.mjs', 'ort-wasm-simd-threaded.asyncify.wasm'],
  },
]

function runtimeAssetPaths(): Record<string, string> {
  const lookup: Record<string, string> = {}
  for (const group of runtimeAssetGroups) {
    for (const file of group.files) {
      lookup[`/${group.prefix}/${file}`] = path.join(group.root, file)
    }
  }
  return lookup
}

function runtimeAssets(): Plugin {
  const lookup = runtimeAssetPaths()

  return {
    name: 'storysteps-runtime-assets',
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        const url = request.url?.split('?')[0]
        const absolute = url ? lookup[url] : undefined
        if (!absolute || !existsSync(absolute)) {
          next()
          return
        }
        response.setHeader(
          'Content-Type',
          url?.endsWith('.wasm') ? 'application/wasm' : 'text/javascript',
        )
        response.setHeader('Content-Length', String(statSync(absolute).size))
        response.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
        createReadStream(absolute).pipe(response)
      })
    },
    writeBundle(options) {
      const outDir = options.dir ?? path.dirname(options.file ?? '')
      for (const group of runtimeAssetGroups) {
        const target = path.join(outDir, group.prefix)
        mkdirSync(target, { recursive: true })
        for (const file of group.files) {
          const source = path.join(group.root, file)
          if (existsSync(source)) {
            copyFileSync(source, path.join(target, file))
          }
        }
      }
    },
  }
}

export default defineConfig({
  plugins: [
    runtimeAssets(),
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['favicon.png'],
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,webmanifest,woff2}'],
        globIgnores: ['runtime/**'],
        runtimeCaching: [
          {
            urlPattern: /\/runtime\/(litert|ort)\//,
            handler: 'CacheFirst',
            options: {
              cacheName: 'storysteps-runtime-wasm',
              expiration: { maxEntries: 8, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
        ],
      },
      manifest: {
        name: 'StorySteps',
        short_name: 'StorySteps',
        description: 'A local, offline-first atlas of the stories attached to places.',
        theme_color: '#3f4a37',
        background_color: '#f6f3ec',
        display: 'standalone',
        orientation: 'any',
        start_url: '/',
        scope: '/',
        icons: [{ src: 'favicon.png', sizes: '512x512', type: 'image/png', purpose: 'any' }],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  worker: {
    format: 'es',
  },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    setupFiles: ['src/test/setup.ts'],
    restoreMocks: true,
  },
})
