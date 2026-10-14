import { readdirSync, readFileSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import { normalizePath, type Plugin, type ViteDevServer } from 'vite'
import { defineConfig } from 'vitest/config'
import { publishContent, toModuleSource } from './src/content/publish.ts'

const frontendRoot = fileURLToPath(new URL('.', import.meta.url))
const repoRoot = resolve(frontendRoot, '..')
const contentDirs = {
  topics: resolve(repoRoot, 'content/topics'),
  intros: resolve(repoRoot, 'content/intros'),
}

const VIRTUAL_ID = 'virtual:site-content'
const RESOLVED_ID = '\0' + VIRTUAL_ID

/** Case-insensitive on Windows, forward slashes everywhere. */
function samePath(a: string): string {
  const p = normalizePath(resolve(a))
  return process.platform === 'win32' ? p.toLowerCase() : p
}

/** Reads *.md in `dir`, keyed by repo-relative path (e.g. content/topics/x.md) for error messages. */
function readMarkdownDir(dir: string): { files: Record<string, string>; paths: string[] } {
  const files: Record<string, string> = {}
  const paths: string[] = []
  let names: string[]
  try {
    names = readdirSync(dir)
  } catch {
    return { files, paths }
  }
  for (const name of names.filter((n) => n.endsWith('.md'))) {
    const full = join(dir, name)
    files[normalizePath(relative(repoRoot, full))] = readFileSync(full, 'utf8')
    paths.push(full)
  }
  return { files, paths }
}

/**
 * Exposes content/ as `virtual:site-content`. Parsing and validation run in
 * Node, so `yaml`, Markdown bodies and file paths never reach the browser.
 * Builds exclude drafts; the dev server and tests keep them. Invalid content
 * throws ContentError (with the file path), which fails `vite build`.
 */
function siteContent(): Plugin {
  let production = true
  return {
    name: 'portfolio:site-content',
    configResolved(config) {
      production = config.command === 'build' || config.isProduction
    },
    resolveId(id) {
      return id === VIRTUAL_ID ? RESOLVED_ID : undefined
    },
    load(id) {
      if (id !== RESOLVED_ID) return undefined
      const topics = readMarkdownDir(contentDirs.topics)
      const intros = readMarkdownDir(contentDirs.intros)
      if (production) for (const file of [...topics.paths, ...intros.paths]) this.addWatchFile(file)
      return toModuleSource(publishContent(topics.files, intros.files, { production }))
    },
    configureServer(server: ViteDevServer) {
      const watched = new Set(Object.values(contentDirs).map(samePath))
      server.watcher.add(Object.values(contentDirs))
      const onContentEvent = (file: string) => {
        if (!file.endsWith('.md') || !watched.has(samePath(resolve(file, '..')))) return
        for (const environment of Object.values(server.environments)) {
          const mod = environment.moduleGraph.getModuleById(RESOLVED_ID)
          if (mod) environment.moduleGraph.invalidateModule(mod)
        }
        server.ws.send({ type: 'full-reload' })
      }
      server.watcher.on('add', onContentEvent)
      server.watcher.on('change', onContentEvent)
      server.watcher.on('unlink', onContentEvent)
    },
  }
}

export default defineConfig({
  plugins: [react(), siteContent()],
  build: {
    modulePreload: { polyfill: false },
  },
  server: {
    fs: {
      allow: [frontendRoot],
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['src/test/setup.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.test.{ts,tsx}', 'src/test/**', 'src/main.tsx', 'src/**/*.d.ts'],
      thresholds: {
        lines: 85,
        branches: 80,
        'src/content/parse.ts': { lines: 95, branches: 90 },
      },
    },
  },
})
