import { useMemo } from 'react'
import katex from 'katex'
import 'katex/dist/katex.min.css'

interface MathViewProps {
  text: string | undefined | null
  className?: string
  as?: 'p' | 'span' | 'div'
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function fallbackMathBeautify(raw: string): string {
  return raw
    .replace(/\\times/g, ' × ')
    .replace(/\\div/g, ' ÷ ')
    .replace(/\\approx/g, ' ≈ ')
    .replace(/\\leq/g, ' ≤ ')
    .replace(/\\geq/g, ' ≥ ')
    .replace(/\\neq/g, ' ≠ ')
    .replace(/\\angle\s*([0-9A-Za-z]+)/g, '∠$1')
    .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '$1/$2')
    .replace(/\^2/g, '²')
    .replace(/\^3/g, '³')
    .replace(/\\text\{([^}]+)\}/g, '$1')
    .replace(/\\circ/g, '°')
    .replace(/\\quad/g, ' ')
}

function renderMathSegment(segment: string, isBlock: boolean): string {
  const trimmed = segment.trim()
  if (!trimmed) return ''

  try {
    return katex.renderToString(trimmed, {
      displayMode: isBlock,
      throwOnError: false,
    })
  } catch {
    const beautified = escapeHtml(fallbackMathBeautify(trimmed))
    return isBlock
      ? `<div class="my-1.5 py-1 px-2 font-mono text-center font-semibold bg-[#f4ead4]/30 rounded">${beautified}</div>`
      : `<span class="mx-0.5 font-mono font-medium">${beautified}</span>`
  }
}

export function parseAndRenderMath(text: string): string {
  if (!text) return ''

  const parts: string[] = []
  let cursor = 0
  const mathRegex = /(\$\$([\s\S]*?)\$\$|\\\[([\s\S]*?)\\\]|\$([^\$\n]+?)\$|\\\(([\s\S]*?)\\\))/g
  let match: RegExpExecArray | null

  while ((match = mathRegex.exec(text)) !== null) {
    const matchIndex = match.index
    if (matchIndex > cursor) {
      const normalText = text.slice(cursor, matchIndex)
      parts.push(escapeHtml(normalText).replace(/\n/g, '<br/>'))
    }

    const isBlock = Boolean(match[1]?.startsWith('$$') || match[1]?.startsWith('\\['))
    const formula = match[2] ?? match[3] ?? match[4] ?? match[5] ?? ''
    parts.push(renderMathSegment(formula, isBlock))
    cursor = matchIndex + match[0].length
  }

  if (cursor < text.length) {
    parts.push(escapeHtml(text.slice(cursor)).replace(/\n/g, '<br/>'))
  }

  return parts.join('')
}

export default function MathView({ text, className = '', as: Component = 'div' }: MathViewProps) {
  const htmlContent = useMemo(() => {
    if (!text) return ''
    return parseAndRenderMath(text)
  }, [text])

  if (!text) return null

  return (
    <Component
      className={`math-rendered-content ${className}`}
      dangerouslySetInnerHTML={{ __html: htmlContent }}
    />
  )
}
