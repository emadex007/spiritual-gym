export function Logo({ className = '' }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <svg viewBox="0 0 64 64" className="h-8 w-8" aria-hidden>
        <rect width="64" height="64" rx="16" fill="#12203a" />
        <path d="M16 40a16 16 0 0 1 32 0z" fill="#d4a94a" />
        <rect x="12" y="43" width="40" height="4" rx="2" fill="#f6f1e7" />
      </svg>
      <span className="font-display text-lg font-semibold tracking-tight">SpiritualGym</span>
    </span>
  )
}
