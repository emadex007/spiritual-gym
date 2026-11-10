/// <reference types="vite/client" />
import { useEffect, type ReactNode } from 'react'
import { listenForErrors } from '~/lib/report-error'
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
      // What WhatsApp, Facebook, X and others show when someone shares a link (the picture must be a full https address)
      { property: 'og:type', content: 'website' },
      { property: 'og:site_name', content: 'TheRenewGym' },
      { property: 'og:url', content: 'https://therenewgym.org' },
      { property: 'og:title', content: 'TheRenewGym: Train your faith. Every day.' },
      { property: 'og:description', content: 'Free app for daily prayer, worship and the Word. Plans, groups and live prayer, all in one place.' },
      { property: 'og:image', content: 'https://therenewgym.org/brand/share.jpg' },
      { property: 'og:image:width', content: '1200' },
      { property: 'og:image:height', content: '630' },
      { property: 'og:image:alt', content: 'TheRenewGym: Train your faith. Every day. Free at therenewgym.org' },
      { name: 'twitter:card', content: 'summary_large_image' },
      { name: 'twitter:image', content: 'https://therenewgym.org/brand/share.jpg' },
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
  // Crashes on members' phones go to Admin → Errors
  useEffect(() => listenForErrors(), [])
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
