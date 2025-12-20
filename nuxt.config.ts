import Aura from '@primevue/themes/aura';

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  modules: [
    '@primevue/nuxt-module'
  ],
  primevue: {
    options: {
      theme: {
        preset: Aura,
        options: {
          darkModeSelector: 'none',
        }
      }
    }
  },
  css: [
    'primeicons/primeicons.css',
    'primeflex/primeflex.css'
  ],
  app: {
    head: {
      link: [
        { rel: 'icon', type: 'image/png', href: '/favicon.png' }
      ]
    }
  },
  devServer: {
    allowedHosts: process.env.NGROK_HOST ? [process.env.NGROK_HOST] : []
  },
  vite: {
    server: {
      allowedHosts: process.env.NGROK_HOST ? [process.env.NGROK_HOST] : []
    }
  }
})
