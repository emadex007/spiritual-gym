import type { ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { Logo } from '~/components/Logo'
import { DoveIcon, SunriseScene } from '~/components/Art'

export function AuthShell({ title, subtitle, children, footer }: { title: string; subtitle: string; children: ReactNode; footer: ReactNode }) {
  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-2">
      {/* Illustration panel */}
      <aside className="relative isolate hidden overflow-hidden text-white lg:flex lg:flex-col lg:justify-between lg:p-10">
        <SunriseScene className="absolute inset-0 -z-10 h-full w-full" />
        <Link to="/" className="[&_span]:text-white"><Logo /></Link>
        <div className="max-w-md">
          <DoveIcon className="h-10 w-10 text-gold" />
          <blockquote className="mt-4 font-display text-3xl leading-snug drop-shadow-sm">“Come unto me, all ye that labour and are heavy laden, and I will give you rest.”</blockquote>
          <p className="mt-3 text-sm font-semibold text-white/80">Matthew 11:28 · KJV</p>
        </div>
      </aside>

      <div className="flex min-h-dvh flex-col">
        <header className="relative isolate overflow-hidden px-5 pt-5 pb-16 text-white lg:hidden">
          <SunriseScene className="absolute inset-0 -z-10 h-full w-full" />
          <Link to="/" className="[&_span]:text-white"><Logo /></Link>
        </header>
        <main className="fade-in relative mx-auto -mt-10 flex w-full max-w-md flex-1 flex-col px-5 pb-16 lg:mt-0 lg:justify-center">
          <div className="card lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none">
            <h1 className="font-display text-3xl font-semibold tracking-tight">{title}</h1>
            <p className="mt-2 text-muted">{subtitle}</p>
            <div className="mt-8">{children}</div>
          </div>
          <p className="mt-6 text-center text-sm text-muted">{footer}</p>
        </main>
      </div>
    </div>
  )
}

export function FormError({ message }: { message: string | null }) {
  if (!message) return null
  return (
    <p role="alert" className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
      {message}
    </p>
  )
}

export function errorText(e: unknown) {
  return e instanceof Error ? e.message : 'Something went wrong. Please try again.'
}
