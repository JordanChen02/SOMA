import type { MetadataRoute } from 'next'

// Web App Manifest — served at /manifest.webmanifest.
// Drives Android/Chrome installability and standalone launch. iOS standalone
// is additionally gated by the apple-mobile-web-app meta tags in layout.tsx.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'SOMA — Body. Mind. Performance.',
    short_name: 'SOMA',
    description: 'Track your training, body, and recovery. Understand the patterns. Progress.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#070B12',
    theme_color: '#070B12',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
