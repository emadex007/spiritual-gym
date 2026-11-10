import { LineIcon } from '~/components/LineIcon'
import { mediaUrl } from '~/lib/util'
import { topicColors } from '~/lib/topics'

/** A topic plan's featured picture, or a soft gradient with the topic when there's no picture */
export function TopicCover({ cover, topic, className = '', label = true }: { cover: string | null; topic: string; className?: string; label?: boolean }) {
  if (cover) return <img src={mediaUrl(cover)} alt="" loading="lazy" className={`object-cover ${className}`} />
  const [a, b] = topicColors(topic || 'Faith')
  return (
    <div className={`relative overflow-hidden ${className}`} style={{ background: `linear-gradient(135deg,${a},${b})` }}>
      <LineIcon name="sparkles" className="absolute -right-3 -bottom-3 h-2/3 w-2/3 text-white/15" strokeWidth={1.2} />
      {topic && label && <span className="absolute bottom-2 left-3 font-display text-lg font-semibold text-white/90">{topic}</span>}
    </div>
  )
}
