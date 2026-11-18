// Fails the lint step if a pixel length appears in client source (constitution: rem only).
// Scans src/** and index.html for a number followed by "px", e.g. `16px` or `w-[300px]`,
// prints file:line for each hit, and exits with code 1.
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
const extensions = new Set(['.js', '.jsx', '.css', '.html'])
const pxPattern = /\d*\.?\d+px\b/g

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) yield* walk(path)
    else if (extensions.has(path.slice(path.lastIndexOf('.')))) yield path
  }
}

const files = [...walk(join(root, 'src')), join(root, 'index.html')]
let hits = 0

for (const file of files) {
  readFileSync(file, 'utf8')
    .split(/\r?\n/)
    .forEach((line, i) => {
      for (const match of line.matchAll(pxPattern)) {
        hits++
        console.error(`${relative(root, file)}:${i + 1}: "${match[0]}" — use rem instead of px`)
      }
    })
}

if (hits > 0) {
  console.error(`\ncheck-no-px: ${hits} px value(s) found.`)
  process.exit(1)
}
console.log(`check-no-px: ${files.length} files clean.`)
