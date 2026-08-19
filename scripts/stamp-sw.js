/* Replaces __BUILD_STAMP__ in dist/sw.js with the app version, so each build
 * gets a fresh cache name and clients pick up the new bundle. */
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const swPath = resolve(root, 'dist', 'sw.js')
const versionPath = resolve(root, 'src', 'version.js')

if (!existsSync(swPath)) {
  console.error('[stamp-sw] dist/sw.js not found - run vite build first')
  process.exit(1)
}

const versionSrc = readFileSync(versionPath, 'utf8')
const match = versionSrc.match(/APP_VERSION\s*=\s*'([^']+)'/)
const stamp = (match ? match[1] : 'unversioned').replace(/[^A-Za-z0-9]/g, '-')

const sw = readFileSync(swPath, 'utf8').replace('__BUILD_STAMP__', stamp)
writeFileSync(swPath, sw)
console.log(`[stamp-sw] cache name stamped as hoken-${stamp}`)
