import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// Configuracion de Vite + PWA.
// El plugin PWA genera el service worker (lo que permite instalar la app y que
// arranque rapido). Usa nuestro manifest e iconos de la carpeta public.
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',      // actualiza sola cuando publicas una version nueva
      includeAssets: ['app-icon.svg', 'icon-192.png', 'icon-512.png', 'icon-maskable-512.png'],
      manifest: {
        name: 'Tu cuaderno',
        short_name: 'Cuaderno',
        description: 'Entrenamiento, habitos y mente en un solo cuaderno personal.',
        start_url: '/',
        display: 'standalone',
        background_color: '#0B1B33',
        theme_color: '#0B1B33',
        orientation: 'portrait',
        lang: 'es',
        // Accesos rápidos: se mantienen pulsando el icono de la app.
        shortcuts: [
          { name: 'Entrenar hoy', short_name: 'Entreno', url: '/?ir=training',
            icons: [{ src: '/icon-192.png', sizes: '192x192' }] },
          { name: 'Marcar hábitos', short_name: 'Hábitos', url: '/?ir=daily',
            icons: [{ src: '/icon-192.png', sizes: '192x192' }] },
          { name: 'Nuevo destello', short_name: 'Destello', url: '/?ir=notes',
            icons: [{ src: '/icon-192.png', sizes: '192x192' }] },
        ],
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Cachea los archivos de la app para arranque rapido y uso sin conexion.
        // Las llamadas a la API (datos) NO se cachean: siempre datos frescos.
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        navigateFallbackDenylist: [/^\/api/],
      },
    }),
  ],
})
