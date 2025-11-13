import { readFile, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'

const DIST_DIR = path.resolve('dist')
const BUILD_INFO_FILENAME = 'build-info.js'
const BUILD_INFO_PATH = path.join(DIST_DIR, BUILD_INFO_FILENAME)

function createBuildInfoContents(timestamp) {
  return `;(function () {\n  const buildInfo = {\n    buildTimestamp: '${timestamp}'\n  }\n\n  window.__BUILD_INFO__ = window.__BUILD_INFO__ ?? buildInfo\n})();\n`
}

async function ensureDistDirectory() {
  try {
    const distStats = await stat(DIST_DIR)
    if (!distStats.isDirectory()) {
      throw new Error(`Distribution directory not found at ${DIST_DIR}`)
    }
  } catch (error) {
    console.error('[build-timestamp] Unable to locate dist directory:', error)
    process.exitCode = 1
    throw error
  }
}

async function ensureBuildInfoFileExists() {
  try {
    await stat(BUILD_INFO_PATH)
  } catch (error) {
    console.error(`[build-timestamp] Expected ${BUILD_INFO_FILENAME} to exist in dist but it was missing.`)
    process.exitCode = 1
    throw error
  }
}

async function run() {
  try {
    await ensureDistDirectory()
    await ensureBuildInfoFileExists()
  } catch {
    return
  }

  const timestamp = new Date().toISOString()
  const contents = createBuildInfoContents(timestamp)

  try {
    await writeFile(BUILD_INFO_PATH, contents)
    console.log(`[build-timestamp] Injected timestamp into ${BUILD_INFO_FILENAME}.`)
  } catch (error) {
    console.error('[build-timestamp] Failed to write build info file:', error)
    process.exitCode = 1
    return
  }

  try {
    const verificationContents = await readFile(BUILD_INFO_PATH, 'utf8')
    if (!verificationContents.includes(timestamp)) {
      throw new Error('Timestamp verification failed')
    }
  } catch (error) {
    console.error('[build-timestamp] Verification failed after writing build info file:', error)
    process.exitCode = 1
  }
}

run()
