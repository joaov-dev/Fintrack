#!/usr/bin/env node
/**
 * Converte docs/test-plan.md → docs/test-plan.pdf
 *
 * Uso:
 *   node scripts/generate-pdf.mjs
 *
 * md-to-pdf está instalado em backend/node_modules (devDependency).
 */

import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root      = join(__dirname, '..')

// md-to-pdf vive no backend/node_modules
const { mdToPdf } = await import(join(root, 'backend', 'node_modules', 'md-to-pdf', 'dist', 'index.js'))

const inputPath  = join(root, 'docs', 'test-plan.md')
const outputPath = join(root, 'docs', 'test-plan.pdf')

const css = `
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 13px;
    line-height: 1.6;
    color: #1a1a2e;
    padding: 0 20px;
  }
  h1 {
    font-size: 26px;
    color: #16213e;
    border-bottom: 3px solid #6366f1;
    padding-bottom: 10px;
  }
  h2 {
    font-size: 18px;
    color: #6366f1;
    border-bottom: 1px solid #e5e7eb;
    padding-bottom: 6px;
    margin-top: 32px;
  }
  h3 { font-size: 15px; color: #374151; margin-top: 20px; }
  table { width: 100%; border-collapse: collapse; margin: 14px 0; font-size: 11px; }
  th { background-color: #6366f1; color: white; padding: 7px 10px; text-align: left; }
  td { padding: 6px 10px; border-bottom: 1px solid #e5e7eb; }
  tr:nth-child(even) td { background-color: #f9fafb; }
  code { background-color: #f3f4f6; padding: 2px 5px; border-radius: 3px; font-size: 11px; }
  pre {
    background-color: #1e1e2e;
    color: #cdd6f4;
    padding: 14px;
    border-radius: 6px;
    font-size: 10px;
    line-height: 1.5;
  }
  pre code { background: none; color: inherit; padding: 0; }
`

try {
  console.log(`Gerando PDF a partir de: ${inputPath}`)
  const pdf = await mdToPdf(
    { path: inputPath },
    {
      dest: outputPath,
      css,
      pdf_options: {
        format: 'A4',
        margin: { top: '18mm', bottom: '18mm', left: '15mm', right: '15mm' },
        printBackground: true,
      },
      launch_options: { args: ['--no-sandbox', '--disable-setuid-sandbox'] },
    },
  )
  console.log(`✓ PDF gerado: ${pdf.filename}`)
} catch (err) {
  console.error('Erro ao gerar PDF:', err.message)
  process.exit(1)
}
