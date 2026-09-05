import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { elevenlabsPlugin } from './vite/elevenlabs-plugin.ts'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  if (env.ELEVENLABS_API_KEY) process.env.ELEVENLABS_API_KEY = env.ELEVENLABS_API_KEY
  if (env.ELEVENLABS_VOICE_ID) process.env.ELEVENLABS_VOICE_ID = env.ELEVENLABS_VOICE_ID

  return {
    plugins: [react(), elevenlabsPlugin()],
  }
})
