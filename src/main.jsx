import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './style.css'
import { LandingContentProvider } from './contexts/LandingContentContext.jsx'

ReactDOM.createRoot(document.getElementById('app')).render(
    <React.StrictMode>
        <LandingContentProvider>
            <App />
        </LandingContentProvider>
    </React.StrictMode>,
)
