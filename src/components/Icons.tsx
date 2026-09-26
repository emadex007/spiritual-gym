type P = { className?: string }
const base = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, viewBox: '0 0 24 24' }

export const HomeIcon = ({ className = 'h-6 w-6' }: P) => (
  <svg {...base} className={className} aria-hidden><path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" /></svg>
)
export const TrainIcon = ({ className = 'h-6 w-6' }: P) => (
  <svg {...base} className={className} aria-hidden><circle cx="12" cy="13" r="8" /><path d="M12 9v4l2.5 2.5M9.5 2.5h5" /></svg>
)
export const CommunityIcon = ({ className = 'h-6 w-6' }: P) => (
  <svg {...base} className={className} aria-hidden><circle cx="9" cy="8" r="3.2" /><path d="M3 20c.6-3.3 3-5.2 6-5.2s5.4 1.9 6 5.2" /><circle cx="17" cy="9" r="2.5" /><path d="M16.5 14.3c2.4.2 4 1.9 4.5 4.7" /></svg>
)
export const JournalIcon = ({ className = 'h-6 w-6' }: P) => (
  <svg {...base} className={className} aria-hidden><path d="M5 4.5A1.5 1.5 0 0 1 6.5 3H19v18H6.5A1.5 1.5 0 0 1 5 19.5z" /><path d="M9 7.5h6M9 11h6" /></svg>
)
export const ProfileIcon = ({ className = 'h-6 w-6' }: P) => (
  <svg {...base} className={className} aria-hidden><circle cx="12" cy="8" r="4" /><path d="M4 21c.8-4 4-6.5 8-6.5s7.2 2.5 8 6.5" /></svg>
)
export const PlayIcon = ({ className = 'h-5 w-5' }: P) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden fill="currentColor"><path d="M8 5.5v13a1 1 0 0 0 1.5.9l10.4-6.5a1 1 0 0 0 0-1.8L9.5 4.6A1 1 0 0 0 8 5.5z" /></svg>
)
export const PauseIcon = ({ className = 'h-5 w-5' }: P) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1" /><rect x="14" y="5" width="4" height="14" rx="1" /></svg>
)
export const CheckIcon = ({ className = 'h-5 w-5' }: P) => (
  <svg {...base} strokeWidth={2.4} className={className} aria-hidden><path d="m5 12.5 4.5 4.5L19 7.5" /></svg>
)
export const CloseIcon = ({ className = 'h-5 w-5' }: P) => (
  <svg {...base} strokeWidth={2} className={className} aria-hidden><path d="M6 6l12 12M18 6 6 18" /></svg>
)
