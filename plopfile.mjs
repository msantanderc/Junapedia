import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

export default function (plop) {
  plop.setHelper('kebab', (txt) => String(txt).replace(/([a-z])([A-Z])/g, '$1-$2').replace(/\s+/g, '-').toLowerCase())

  plop.setGenerator('v0-import', {
    description: 'Import a v0-generated TSX file into components/v0',
    prompts: [
      {
        type: 'input',
        name: 'componentName',
        message: 'Component name (PascalCase):',
        validate: (v) => /[A-Za-z][A-Za-z0-9]*/.test(v) || 'Use letters/numbers (PascalCase)'
      },
      {
        type: 'input',
        name: 'sourcePath',
        message: 'Path to source TSX file from v0:',
        validate: (p) => !!p || 'Provide a file path'
      },
      {
        type: 'input',
        name: 'targetDir',
        message: 'Target dir (default: components/v0):',
        default: 'components/v0'
      },
      {
        type: 'confirm',
        name: 'openInApp',
        message: 'Create a usage stub under src/pages to preview?',
        default: false
      }
    ],
    actions: [
      function importFile(answers) {
        const { componentName, sourcePath, targetDir } = answers
        const absSrc = resolve(process.cwd(), sourcePath)
        const content = readFileSync(absSrc, 'utf8')
        const outDir = resolve(process.cwd(), targetDir)
        mkdirSync(outDir, { recursive: true })
        const outPath = resolve(outDir, `${componentName}.tsx`)
        writeFileSync(outPath, content, 'utf8')
        return `Imported to ${outPath}`
      },
      function optionalPage(answers) {
        if (!answers.openInApp) return 'Skipped page stub'
        const { componentName } = answers
        const pageDir = resolve(process.cwd(), 'src/pages')
        mkdirSync(pageDir, { recursive: true })
        const pagePath = resolve(pageDir, `${plop.renderString('{{kebab componentName}}', answers)}.tsx`)
        const stub = `import * as React from 'react'
import { TemplateShell } from '../../components/v0/TemplateShell'
import { ${componentName} } from '../../components/v0/${componentName}'

export default function Page() {
  return (
    <TemplateShell>
      <${componentName} />
    </TemplateShell>
  )
}
`
        writeFileSync(pagePath, stub, 'utf8')
        return `Created page stub at ${pagePath}`
      }
    ]
  })
}
