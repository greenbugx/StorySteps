import { readdirSync, readFileSync, existsSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { ORT_WASM_PATHS } from '@/lib/ai/modelConfig'

const projectRoot = process.cwd()
const pnpmStore = path.join(projectRoot, 'node_modules', '.pnpm')

function locateOrtDist(): string {
  const direct = path.join(projectRoot, 'node_modules', 'onnxruntime-web', 'dist')
  if (existsSync(direct)) return direct
  for (const entry of readdirSync(pnpmStore)) {
    if (!entry.startsWith('onnxruntime-web@')) continue
    const candidate = path.join(pnpmStore, entry, 'node_modules', 'onnxruntime-web', 'dist')
    if (existsSync(candidate)) return candidate
  }
  throw new Error('onnxruntime-web is not installed, so the self hosted runtime files cannot be checked')
}

const ortDist = locateOrtDist()

describe('self hosted onnx runtime files', () => {
  it('points at a factory that exposes the webgpu entry point', () => {
    for (const target of ['webgpu', 'wasm'] as const) {
      const source = readFileSync(path.join(ortDist, path.basename(ORT_WASM_PATHS[target].mjs)), 'utf8')
      expect(source).toContain('webgpuInit')
    }
  })

  it('pairs every factory with the wasm binary of the same build', () => {
    for (const target of ['webgpu', 'wasm'] as const) {
      const binary = path.basename(ORT_WASM_PATHS[target].wasm)
      expect(binary).toBe(path.basename(ORT_WASM_PATHS[target].mjs).replace(/\.mjs$/, '.wasm'))
      expect(readFileSync(path.join(ortDist, binary)).byteLength).toBeGreaterThan(1_000_000)
    }
  })
})
