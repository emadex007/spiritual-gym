import type { ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { Logo } from '~/components/Logo'

export function AuthShell({ title, subtitle, children, footer }: { title: string; subtitle: string; children: ReactNode; footer: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col px-5">
      <header className="mx-auto w-full max-w-md py-5">
        <Link to="/">
          <Logo />
        </Link>
      </header>
      <main className="fade-in mx-auto flex w-full max-w-md flex-1 flex-col justify-center pb-16">
        <h1 className="font-display text-3xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-2 text-muted">{subtitle}</p>
        <div className="mt-8">{children}</div>
        <p className="mt-6 text-center text-sm text-muted">{footer}</p>
      </main>
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
