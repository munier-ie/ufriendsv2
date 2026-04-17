import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './style.css'
import { LandingContentProvider } from './contexts/LandingContentContext.jsx'
import { Toaster } from 'sonner'

ReactDOM.createRoot(document.getElementById('app')).render(
    <React.StrictMode>
        <LandingContentProvider>
            <App />
            <Toaster
                position="top-right"
                richColors
                expand={false}
                duration={4000}
                toastOptions={{
                    style: {
                        fontFamily: 'inherit',
                        borderRadius: '12px',
                    },
                }}
            />
        </LandingContentProvider>
    </React.StrictMode>,
)
