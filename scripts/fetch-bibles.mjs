// Downloads the public-domain BSB, ASV and BBE translations and writes one JSON file per book to public/bible/<code>/<bookId>.json
// Run from the project folder:  node scripts/fetch-bibles.mjs
import { mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'

// Pinned to an exact version of github.com/scrollmapper/bible_databases so the text never changes unexpectedly
const COMMIT = 'e1b254cef86d0e65b1a5d1a94b8b112d0f296a2c'
const SOURCES = [
  `https://cdn.jsdelivr.net/gh/scrollmapper/bible_databases@${COMMIT}/formats/json/`,
  `https://raw.githubusercontent.com/scrollmapper/bible_databases/${COMMIT}/formats/json/`,
]
const TRANSLATIONS = ['BSB', 'ASV', 'BBE']
const OUT = join('public', 'bible')

async function download(code) {
  for (const base of SOURCES) {
    for (let attempt = 1; attempt <= 4; attempt++) {
      try {
        process.stdout.write(`  ${code}: downloading (try ${attempt})… `)
        const res = await fetch(base + code + '.json')
        if (!res.ok) throw new Error('HTTP ' + res.status)
        const data = await res.json()
        console.log('ok')
        return data
      } catch (e) {
        console.log('failed: ' + e.message)
        await new Promise((r) => setTimeout(r, 2000 * attempt))
      }
    }
  }
  throw new Error(`Could not download ${code}. Check your internet connection and run the script again.`)
}

rmSync(OUT, { recursive: true, force: true })
mkdirSync(OUT, { recursive: true })
let files = 0
for (const code of TRANSLATIONS) {
  const data = await download(code)
  if (!Array.isArray(data.books) || data.books.length !== 66) throw new Error(`${code}: expected 66 books`)
  const dir = join(OUT, code.toLowerCase())
  mkdirSync(dir, { recursive: true })
  let verses = 0
  data.books.forEach((book, i) => {
    const chapters = {}
    for (const ch of book.chapters) {
      chapters[String(Number(ch.chapter))] = ch.verses.map((v) => [Number(v.verse), String(v.text).replace(/\*\*\*/g, '…').replace(/\+/g, '').trim()])
      verses += ch.verses.length
    }
    writeFileSync(join(dir, `${i + 1}.json`), JSON.stringify(chapters))
    files++
  })
  console.log(`  ${code}: 66 books, ${verses.toLocaleString()} verses written`)
}
writeFileSync(
  join(OUT, 'LICENSE.txt'),
  'BSB: Berean Standard Bible, dedicated to the public domain (CC0).\nASV: American Standard Version (1901), public domain.\nBBE: Bible in Basic English (1949/1964), public domain.\nSource: github.com/scrollmapper/bible_databases\n',
)
console.log(`\nDone: ${files + 1} files in ${OUT}. Now build and deploy.`)
