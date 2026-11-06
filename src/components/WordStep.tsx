// The Word step of a workout: its own devotion (not Today's word), with Scriptures that fill the step's time.
// Tap any verse (or several) to save it to the journal, add a note, highlight it in the Bible, or learn it as a memory verse.
import { useState } from 'react'
import { LineIcon } from '~/components/LineIcon'
import { errorText } from '~/components/AuthShell'
import { saveVerseToJournal, saveWordToJournal, setVerseMarks } from '~/fns/verses'
import { addMemory } from '~/fns/memory'
import type { StepWord } from '~/lib/word-plans'

type Journey = { label: string; reference: string; verses: { verse: number; text: string }[] } | null
type Pick = { section: number; verses: number[] }

export function WordStep({ word, journey }: { word: StepWord; journey: Journey }) {
  const [pick, setPick] = useState<Pick | null>(null)
  const [note, setNote] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [marked, setMarked] = useState<Set<string>>(new Set())
  const [savedAll, setSavedAll] = useState(false)
  const [allNote, setAllNote] = useState<string | null>(null)

  const flash = (t: string) => {
    setToast(t)
    window.setTimeout(() => setToast(null), 2600)
  }

  function toggle(section: number, verse: number) {
    setNote(null)
    setPick((p) => {
      if (!p || p.section !== section) return { section, verses: [verse] }
      const has = p.verses.includes(verse)
      const verses = has ? p.verses.filter((v) => v !== verse) : [...p.verses, verse].sort((a, b) => a - b)
      return verses.length ? { section, verses } : null
    })
  }

  const sec = pick ? word.sections[pick.section] : null
  const chosen = sec && pick ? sec.verses.filter((v) => pick.verses.includes(v.verse)) : []
  const chosenRef = sec && pick ? label(sec.reference, pick.verses) : ''
  const chosenText = chosen.map((v) => v.text).join(' ')

  async function run(what: 'journal' | 'memory' | 'highlight') {
    if (!sec || !pick) return
    setBusy(true)
    try {
      if (what === 'journal') {
        await saveVerseToJournal({ data: { reference: chosenRef, text: chosenText, translation: 'KJV', note: note ?? '' } })
        flash(note ? 'Saved to your journal with your note ✓' : 'Saved to your journal ✓')
      } else if (what === 'memory') {
        await addMemory({ data: { reference: chosenRef, text: chosenText, translation: 'KJV' } })
        flash('Added to your memory verses ✓')
      } else {
        await setVerseMarks({ data: { book: sec.bookId, chapter: sec.chapter, verses: pick.verses, color: 'yellow' } })
        setMarked((m) => new Set([...m, ...pick.verses.map((v) => `${pick.section}:${v}`)]))
        flash('Highlighted. You’ll see it in your Bible too ✓')
      }
      setPick(null)
      setNote(null)
    } catch (e) {
      flash(errorText(e))
    } finally {
      setBusy(false)
    }
  }

  async function saveAll() {
    setBusy(true)
    try {
      await saveWordToJournal({ data: { title: word.title, focus: word.focus, references: word.sections.map((s) => s.reference).join('; '), declaration: word.declaration, note: allNote ?? '' } })
      setSavedAll(true)
      setAllNote(null)
      flash('This devotion is in your journal ✓')
    } catch (e) {
      flash(errorText(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mt-6 w-full space-y-3 text-left">
      <div className="rounded-3xl bg-white/5 p-5">
        <p className="text-xs font-semibold tracking-[0.14em] text-gold uppercase">
          <LineIcon name="bookOpen" className="mr-1 inline h-3.5 w-3.5 -translate-y-px" />
          The Word · about {word.minutes} min of reading
        </p>
        <h3 className="mt-1 font-display text-2xl leading-tight font-semibold">{word.title}</h3>
        <p className="mt-1 text-white/75">{word.focus}</p>

        <div className="mt-4 max-h-[48vh] space-y-5 overflow-y-auto pr-1">
          {word.sections.map((s, si) => (
            <section key={si}>
              <p className="py-1 text-sm font-semibold text-gold">
                {s.reference} <span className="font-normal text-white/45">KJV</span>
              </p>
              <ol className="mt-1 space-y-1">
                {s.verses.map((v) => {
                  const on = pick?.section === si && pick.verses.includes(v.verse)
                  const key = s.key.includes(v.verse)
                  const hl = marked.has(`${si}:${v.verse}`)
                  return (
                    <li key={v.verse}>
                      <button
                        type="button"
                        onClick={() => toggle(si, v.verse)}
                        aria-pressed={on}
                        className={`w-full rounded-lg px-2 py-1 text-left font-display text-[17px] leading-relaxed transition ${on ? 'bg-white/15 ring-2 ring-gold/70' : hl ? 'bg-yellow-400/25' : key ? 'bg-gold/12' : 'hover:bg-white/5'} ${key || on ? 'text-white' : 'text-white/88'}`}
                      >
                        <sup className="mr-1.5 font-sans text-[11px] font-semibold text-gold/80">{v.verse}</sup>
                        {v.text}
                      </button>
                    </li>
                  )
                })}
              </ol>
            </section>
          ))}
        </div>
        {!pick && <p className="mt-3 text-xs text-white/50">Read slowly. Tap a verse that speaks to you to save it, add a note, highlight it or learn it.</p>}

        {pick && sec && (
          <div className="fade-in mt-3 rounded-2xl bg-white/10 p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="min-w-0 truncate text-sm font-semibold">{chosenRef}</p>
              <button type="button" onClick={() => { setPick(null); setNote(null) }} className="shrink-0 rounded-full px-2 py-1 text-xs font-semibold text-white/60 hover:text-white">Clear</button>
            </div>
            {note !== null && (
              <textarea
                autoFocus
                className="mt-2 min-h-20 w-full rounded-xl border border-white/15 bg-black/20 p-3 text-sm text-white placeholder:text-white/40 focus:border-gold focus:outline-none"
                placeholder="What is God saying to you in this verse?"
                value={note}
                maxLength={2000}
                onChange={(e) => setNote(e.target.value)}
              />
            )}
            <div className="mt-2 grid grid-cols-4 gap-1.5">
              <Action icon="journal" label={note !== null ? 'Save' : 'Journal'} busy={busy} onClick={() => run('journal')} primary />
              <Action icon="pen" label="Note" busy={busy} on={note !== null} onClick={() => setNote(note === null ? '' : null)} />
              <Action icon="bookmark" label="Highlight" busy={busy} onClick={() => run('highlight')} />
              <Action icon="gem" label="Memorise" busy={busy} onClick={() => run('memory')} />
            </div>
          </div>
        )}
      </div>

      {journey && (
        <div className="rounded-3xl bg-white/5 p-4">
          <p className="text-xs font-semibold tracking-[0.14em] text-gold uppercase">
            <LineIcon name="compass" className="mr-1 inline h-3.5 w-3.5 -translate-y-px" />
            {journey.label}
          </p>
          <p className="mt-1 text-sm font-semibold">{journey.reference}</p>
          <p className="mt-1 font-display text-[16px] leading-relaxed text-white/85">
            {journey.verses.map((v) => (
              <span key={v.verse}>
                <sup className="mr-1 font-sans text-[10px] font-semibold text-gold/80">{v.verse}</sup>
                {v.text}{' '}
              </span>
            ))}
          </p>
        </div>
      )}

      <p className="rounded-2xl bg-gold/15 p-4 font-semibold text-gold">
        <LineIcon name="megaphone" className="mr-1.5 inline h-4 w-4 -translate-y-px" />
        Declare aloud: {word.declaration}
      </p>
      <p className="px-1 text-sm text-white/80 italic">
        <LineIcon name="prayer" className="mr-1.5 inline h-4 w-4 -translate-y-px" />
        {word.prayer}
      </p>

      <div className="rounded-3xl bg-white/5 p-4">
        {savedAll ? (
          <p className="text-sm font-semibold text-gold"><LineIcon name="check" className="mr-1.5 inline h-4 w-4 -translate-y-px" />Saved to your journal</p>
        ) : (
          <>
            {allNote !== null && (
              <textarea
                className="mb-2 min-h-20 w-full rounded-xl border border-white/15 bg-black/20 p-3 text-sm text-white placeholder:text-white/40 focus:border-gold focus:outline-none"
                placeholder="Write what you received today (optional)"
                value={allNote}
                maxLength={2000}
                onChange={(e) => setAllNote(e.target.value)}
              />
            )}
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" disabled={busy} onClick={saveAll} className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-4 py-2 text-sm font-semibold hover:bg-white/20 disabled:opacity-50">
                <LineIcon name="journal" className="h-4 w-4" />
                Save this devotion to my journal
              </button>
              {allNote === null && (
                <button type="button" onClick={() => setAllNote('')} className="rounded-full px-3 py-2 text-sm font-semibold text-white/70 hover:text-white">
                  + Add a note
                </button>
              )}
            </div>
          </>
        )}
      </div>

      {toast && (
        <p className="fade-in fixed inset-x-4 bottom-24 z-30 mx-auto max-w-sm rounded-2xl bg-white px-4 py-3 text-center text-sm font-semibold text-[#08131f] shadow-2xl" role="status">
          {toast}
        </p>
      )}
    </div>
  )
}

function Action({ icon, label, onClick, busy, primary, on }: { icon: string; label: string; onClick: () => void; busy: boolean; primary?: boolean; on?: boolean }) {
  return (
    <button
      type="button"
      disabled={busy}
      onClick={onClick}
      className={`flex flex-col items-center gap-1 rounded-xl py-2 text-[11px] font-semibold transition disabled:opacity-50 ${primary ? 'bg-gold text-navy' : on ? 'bg-white/25 text-white' : 'bg-white/10 text-white hover:bg-white/15'}`}
    >
      <LineIcon name={icon} className="h-[18px] w-[18px]" />
      {label}
    </button>
  )
}

/** "Psalm 23:1-3" from a section reference and the chosen verse numbers */
function label(sectionRef: string, verses: number[]) {
  const base = sectionRef.replace(/:.*/, '')
  const parts: string[] = []
  for (let i = 0; i < verses.length; i++) {
    let j = i
    while (j + 1 < verses.length && verses[j + 1] === verses[j] + 1) j++
    parts.push(i === j ? String(verses[i]) : `${verses[i]}-${verses[j]}`)
    i = j
  }
  return `${base}:${parts.join(', ')}`
}
