import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Base path for GitHub Pages deployment.
  // If your repo is https://github.com/<user>/beat-sequencer, this is correct.
  // For a user/org site (https://<user>.github.io) use base: '/'
  base: '/beat-sequencer/',
})
