import { defineConfig } from '@apps-in-toss/web-framework/config'

export default defineConfig({
  appName: '3bottle',
  brand: {
    displayName: '3 Bottle Game',
    primaryColor: '#4F46E5',
    icon: '',
  },
  web: {
    host: 'localhost',
    port: 5173,
    commands: {
      dev: 'vite',
      build: 'vite build',
    },
  },
  webViewProps: {
    type: 'game',
    mediaPlaybackRequiresUserAction: false,
  },
  permissions: [],
})
