import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './admin.css'

// Theme: the admin's own choice, else the system setting
let saved = null
try { saved = localStorage.getItem('examprep_admin_theme') } catch { /* private mode */ }
const dark = saved ? saved === 'dark' : window.matchMedia?.('(prefers-color-scheme: dark)').matches
document.documentElement.classList.toggle('dark', !!dark)

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
