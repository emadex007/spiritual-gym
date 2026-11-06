import { useEffect, useRef } from 'react'
import { linkLabel, youtubeId } from '~/lib/media'
import type { WorshipSong } from '~/fns/worship'

/** Plays one of my worship songs to sing along with: the YouTube video, or my uploaded audio, with the lyrics underneath */
export function SongPlayer({ song, dark = false, autoPlay = true, onEnded }: { song: WorshipSong; dark?: boolean; autoPlay?: boolean; onEnded?: () => void }) {
  const yt = youtubeId(song.link)
  const audio = useRef<HTMLAudioElement>(null)
  useEffect(() => {
    if (autoPlay && audio.current) audio.current.play().catch(() => {})
  }, [song.id])
  const muted = dark ? 'text-white/60' : 'text-muted'
  return (
    <div className="w-full text-left">
      {song.media_key ? (
        <audio ref={audio} src={`/media/${song.media_key}`} controls className="w-full" onEnded={onEnded} />
      ) : yt ? (
        <div className="relative w-full overflow-hidden rounded-2xl bg-black" style={{ aspectRatio: '16 / 9' }}>
          <iframe
            className="absolute inset-0 h-full w-full"
            src={`https://www.youtube-nocookie.com/embed/${yt}?${autoPlay ? 'autoplay=1&' : ''}playsinline=1&rel=0&modestbranding=1`}
            title={song.title}
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
          />
        </div>
      ) : song.link ? (
        <a href={song.link} target="_blank" rel="noreferrer" className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold ${dark ? 'bg-white/15' : 'bg-surface-2'}`}>
          ▶ Open on {linkLabel(song.link)} ↗
        </a>
      ) : null}
      {song.media_key && song.link && youtubeId(song.link) === null && (
        <a href={song.link} target="_blank" rel="noreferrer" className={`mt-2 inline-block text-xs underline ${muted}`}>Open link ↗</a>
      )}
      {song.lyrics ? (
        <div className={`mt-3 max-h-[42vh] overflow-y-auto rounded-2xl p-4 font-display text-lg leading-relaxed whitespace-pre-line ${dark ? 'bg-white/8' : 'bg-surface-2'}`}>{song.lyrics}</div>
      ) : (
        !song.media_key && !song.link && <p className={`mt-2 text-sm ${muted}`}>No audio, link or lyrics saved for this song yet.</p>
      )}
    </div>
  )
}
