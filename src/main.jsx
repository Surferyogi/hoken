import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import { APP_VERSION } from './version.js'
import './styles.css'

/**
 * Catches a render-time crash and shows what happened. Without this, a thrown
 * error inside App unmounts the whole tree and leaves an empty page with the
 * reason visible only in DevTools.
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { error: null, info: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    this.setState({ info })
    console.error('Hoken crashed while rendering:', error, info)
  }

  render() {
    if (!this.state.error) return this.props.children

    const stored = (() => {
      try {
        return localStorage.getItem('hoken.state.v1') ? 'present' : 'empty'
      } catch {
        return 'unreadable'
      }
    })()

    return (
      <div className="app">
        <main>
          <h2 style={{ marginTop: 24 }}>Hoken hit an error while rendering</h2>
          <div className="card f critical">
            <p className="muted">
              The app loaded but crashed while drawing the screen. Your saved data has not been
              touched.
            </p>
            <div className="f-row">
              <b>Error</b>
              <code>{String(this.state.error?.message || this.state.error)}</code>
            </div>
            <div className="f-row">
              <b>Version</b>
              {APP_VERSION}
            </div>
            <div className="f-row">
              <b>Saved data</b>
              {stored}
            </div>
            <div className="btn-row">
              <button className="btn" onClick={() => window.location.reload()}>
                Reload
              </button>
              <button
                className="btn danger"
                onClick={() => {
                  if (!confirm('Clear saved data and reload? Your edits in this browser will be lost.')) return
                  try {
                    localStorage.removeItem('hoken.state.v1')
                  } catch (e) {
                    console.warn(e)
                  }
                  window.location.reload()
                }}
              >
                Clear saved data and reload
              </button>
            </div>
          </div>
          {this.state.info?.componentStack && (
            <details className="card flat">
              <summary>Technical detail</summary>
              <pre style={{ fontSize: 11, whiteSpace: 'pre-wrap', overflowX: 'auto' }}>
                {this.state.info.componentStack}
              </pre>
            </details>
          )}
        </main>
      </div>
    )
  }
}

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
)

// Relative to the document, so it works at a domain root, in a subfolder, or on a
// project page - matching the relative base set in vite.config.js.
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(new URL('sw.js', document.baseURI)).catch((err) => {
      console.warn('Service worker registration failed:', err)
    })
  })
}
