/// <reference types="vite/client" />
import type { ReactNode } from 'react'
import { HeadContent, Link, Scripts, createRootRoute } from '@tanstack/react-router'
import appCss from '~/styles.css?url'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover' },
      { title: 'TheRenewGym — Train Your Faith. Grow in Grace.' },
      { name: 'description', content: 'A free, gentle space to build prayer, Bible reading and worship into your everyday life. Come back. Let’s take the next step together.' },
      { name: 'theme-color', content: '#002e54' },
      { name: 'apple-mobile-web-app-capable', content: 'yes' },
      { name: 'mobile-web-app-capable', content: 'yes' },
      { name: 'apple-mobile-web-app-status-bar-style', content: 'black-translucent' },
      { name: 'apple-mobile-web-app-title', content: 'TheRenewGym' },
      { property: 'og:title', content: 'TheRenewGym' },
      { property: 'og:description', content: 'Train Your Faith. Grow in Grace. Walk Together.' },
      { property: 'og:image', content: '/brand/logo-stacked.png' },
    ],
    links: [
      { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
      { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossOrigin: 'anonymous' },
      {
        rel: 'stylesheet',
        href: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Poppins:wght@700;800&family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&display=swap',
      },
      { rel: 'stylesheet', href: appCss },
      { rel: 'stylesheet', href: '/brand.css' },
      { rel: 'icon', href: '/favicon.png', type: 'image/png' },
      { rel: 'manifest', href: '/manifest.webmanifest' },
      { rel: 'apple-touch-icon', href: '/icons/apple-touch-icon.png' },
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
const THEME_SCRIPT = `(function(){try{var k='sg-theme',p=localStorage.getItem(k)||'system',m=window.matchMedia('(prefers-color-scheme: dark)');function a(){var d=p==='dark'||(p==='system'&&m.matches);document.documentElement.setAttribute('data-theme',d?'dark':'light');var t=document.querySelector('meta[name=theme-color]');if(t)t.setAttribute('content',d?'#071629':'#002e54')}a();m.addEventListener('change',a);window.__sgSetTheme=function(v){p=v;try{localStorage.setItem(k,v)}catch(e){}a()};window.__sgGetTheme=function(){return p}}catch(e){}})();(function(){window.addEventListener('beforeinstallprompt',function(e){e.preventDefault();window.__sgInstall=e;window.dispatchEvent(new Event('sg-installable'))});if('serviceWorker' in navigator&&location.hostname!=='localhost'){window.addEventListener('load',function(){navigator.serviceWorker.register('/sw.js').catch(function(){})})}})()`

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
