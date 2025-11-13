import { readFile, readdir, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'

const PLACEHOLDER = '__BUILD_TIMESTAMP__'
const DIST_DIR = path.resolve('dist')

async function* walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true })
  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name)
    if (entry.isDirectory()) {
      yield* walk(entryPath)
    } else if (entry.isFile()) {
      yield entryPath
    }
  }
}

async function replacePlaceholderInFile(filePath, timestamp) {
  const content = await readFile(filePath, 'utf8')
  if (!content.includes(PLACEHOLDER)) {
    return false
  }

  const updatedContent = content.replaceAll(PLACEHOLDER, timestamp)
  await writeFile(filePath, updatedContent)
  return true
}

async function run() {
  try {
    const distStats = await stat(DIST_DIR)
    if (!distStats.isDirectory()) {
      throw new Error(`Distribution directory not found at ${DIST_DIR}`)
    }
  } catch (error) {
    console.error('[build-timestamp] Unable to locate dist directory:', error)
    process.exitCode = 1
    return
  }

  const timestamp = new Date().toISOString()
  const updatedFiles = []

  for await (const filePath of walk(DIST_DIR)) {
    const replaced = await replacePlaceholderInFile(filePath, timestamp)
    if (replaced) {
      updatedFiles.push(path.relative(DIST_DIR, filePath))
    }
  }

  if (!updatedFiles.length) {
    console.warn('[build-timestamp] No placeholders were replaced.')
    return
  }

  console.log(`[build-timestamp] Injected timestamp into ${updatedFiles.length} file(s).`)
}

run()
