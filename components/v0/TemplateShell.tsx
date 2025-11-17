import * as React from 'react'
import { cn } from '../../src/lib/utils'

interface TemplateShellProps extends React.HTMLAttributes<HTMLDivElement> {
  header?: React.ReactNode
  footer?: React.ReactNode
}

export function TemplateShell({ header, footer, className, children, ...props }: TemplateShellProps) {
  return (
    <div className={cn('min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100', className)} {...props}>
      {header ?? (
        <div className="bg-white/60 backdrop-blur supports-[backdrop-filter]:bg-white/40 border-b">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="text-xl font-semibold text-gray-800">Junapedia</div>
              <div className="text-sm text-gray-500">Plantilla v0 lista para integrar</div>
            </div>
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto w-full px-4 py-6">
        {children}
      </main>

      {footer ?? (
        <div className="mt-8 border-t py-6 text-center text-xs text-gray-500">
          © {new Date().getFullYear()} Junapedia
        </div>
      )}
    </div>
  )
}
