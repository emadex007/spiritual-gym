/// <reference types="vite/client" />
import type { ReactNode } from 'react'
import { HeadContent, Link, Scripts, createRootRoute } from '@tanstack/react-router'
import appCss from '~/styles.css?url'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' },
      { title: 'SpiritualGym — Train your walk. Grow in grace.' },
      { name: 'description', content: 'A free, gentle space to build prayer, Bible reading and worship into your everyday life. Come back. Let’s take the next step together.' },
      { name: 'theme-color', content: '#12203a' },
      { property: 'og:title', content: 'SpiritualGym' },
      { property: 'og:description', content: 'Train your walk. Grow in grace. Walk together.' },
    ],
    links: [
      { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
      { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossOrigin: 'anonymous' },
      {
        rel: 'stylesheet',
        href: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&display=swap',
      },
      { rel: 'stylesheet', href: appCss },
      { rel: 'icon', href: '/favicon.svg', type: 'image/svg+xml' },
    ],
  }),
  shellComponent: RootDocument,
  notFoundComponent: () => (
    <div className="mx-auto max-w-xl px-6 py-24 text-center">
      <p className="font-display text-6xl font-semibold">404</p>
      <p className="mt-3 text-muted">We couldn’t find that page.</p>
      <Link to="/" className="btn-primary mt-6">
        Back to home
      </Link>
    </div>
  ),
})

/** Applies light/dark before the page paints, follows the phone's setting live, and exposes window.__sgSetTheme */
const THEME_SCRIPT = `(function(){try{var k='sg-theme',p=localStorage.getItem(k)||'system',m=window.matchMedia('(prefers-color-scheme: dark)');function a(){var d=p==='dark'||(p==='system'&&m.matches);document.documentElement.setAttribute('data-theme',d?'dark':'light');var t=document.querySelector('meta[name=theme-color]');if(t)t.setAttribute('content',d?'#0c1424':'#12203a')}a();m.addEventListener('change',a);window.__sgSetTheme=function(v){p=v;try{localStorage.setItem(k,v)}catch(e){}a()};window.__sgGetTheme=function(){return p}}catch(e){}})()`

function RootDocument({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  )
}
