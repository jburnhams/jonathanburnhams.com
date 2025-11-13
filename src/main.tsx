import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { hydrateBuildTimestampBadges } from './utils/hydrateBuildTimestampBadges.ts'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

hydrateBuildTimestampBadges()
