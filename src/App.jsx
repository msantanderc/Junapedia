import { useState, Component } from 'react'
import PluxeeGuide from '../pluxee-junaeb-guide'
import { TemplateShell } from '../components/v0/TemplateShell'
import Header from '@/components/header'

class ErrorBoundary extends Component {
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
  const [searchQuery, setSearchQuery] = useState('')
  return (
    <div className="min-h-screen">
      <ErrorBoundary>
        <TemplateShell header={<Header searchQuery={searchQuery} onSearchChange={setSearchQuery} />}>
          <PluxeeGuide hideHeader searchTerm={searchQuery} onSearchTermChange={setSearchQuery} />
        </TemplateShell>
      </ErrorBoundary>
    </div>
  )
}
