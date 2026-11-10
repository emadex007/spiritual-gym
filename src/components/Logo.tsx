/** TheRenewGym logo: the "R" mark (cross and road) with the wordmark. On dark backgrounds (or in dark mode)
 *  the mark switches to its light version and "The" / "Gym" turn white. The mark can be replaced in Admin → Branding. */
export function Logo({ className = '', onDark = false, size = 'md', wordmark = true, mark = true }: { className?: string; onDark?: boolean; size?: 'sm' | 'md' | 'lg'; wordmark?: boolean; mark?: boolean }) {
  const box = size === 'lg' ? 'h-12 w-12' : size === 'sm' ? 'h-7 w-7' : 'h-9 w-9'
  const text = size === 'lg' ? 'text-3xl' : size === 'sm' ? 'text-base' : 'text-[1.35rem]'
  const plain = onDark ? 'text-white' : 'text-navy dark:text-white'
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      {!mark ? null : onDark ? (
        <img src="/brand/logo-mark-dark" alt="" className={`${box} object-contain`} />
      ) : (
        <>
          <img src="/brand/logo-mark" alt="" className={`${box} object-contain dark:hidden`} />
          <img src="/brand/logo-mark-dark" alt="" className={`${box} hidden object-contain dark:block`} />
        </>
      )}
      {wordmark && (
        <span className={`font-logo ${text} leading-none font-bold tracking-tight`} aria-label="TheRenewGym">
          <span className={plain}>The</span>
          <span className="text-gold">Renew</span>
          <span className={plain}>Gym</span>
        </span>
      )}
    </span>
  )
}
