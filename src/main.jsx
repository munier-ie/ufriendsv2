import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './style.css'
import { LandingContentProvider } from './contexts/LandingContentContext.jsx'
import { ModalProvider } from './contexts/ModalContext.jsx'
import { HelmetProvider } from 'react-helmet-async'

ReactDOM.createRoot(document.getElementById('app')).render(
    <React.StrictMode>
        {/* HelmetProvider enables per-page <head> meta injection via react-helmet-async */}
        <HelmetProvider>
            <LandingContentProvider>
                <ModalProvider>
                    <App />
                </ModalProvider>
            </LandingContentProvider>
        </HelmetProvider>
    </React.StrictMode>,
)
