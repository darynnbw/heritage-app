import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HeritageMvp } from './mvp/HeritageMvp.tsx'
import './mvp/mvp.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HeritageMvp />
  </StrictMode>,
)
