import React from 'react'
import PluxeeGuide from '../pluxee-junaeb-guide'

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // Log to console — will appear in browser console
    console.error('ErrorBoundary caught:', error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen flex items-center justify-center p-6">
          <div className="bg-white rounded-lg shadow p-6 max-w-2xl text-center">
            <h2 className="text-xl font-bold mb-2">Ha ocurrido un error en la aplicación</h2>
            <pre className="text-sm text-left whitespace-pre-wrap break-words">{String(this.state.error)}</pre>
            <p className="mt-4 text-gray-600">Revisa la consola del navegador para más detalles.</p>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  return (
    <div className="min-h-screen">
      <div className="fixed left-4 top-4 z-50 bg-yellow-200 text-yellow-800 px-3 py-1 rounded shadow">
        DEBUG: App mounted
      </div>
      <ErrorBoundary>
        <PluxeeGuide />
      </ErrorBoundary>
    </div>
  )
}
