import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Apply theme before React renders to prevent flash of wrong theme.
// Defaults to dark (new native palette) unless user explicitly chose light.
const stored = localStorage.getItem('theme')
if (stored !== 'light') {
  document.documentElement.classList.add('dark')
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
