'use client'

interface Props {
  content: string
}

export function MarkdownRenderer({ content }: Props) {
  if (!content) return null

  const lines = content.split('\n')
  const elements: React.ReactNode[] = []
  let key = 0

  const parseInline = (text: string): React.ReactNode => {
    const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g)
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} className="text-text-primary font-semibold">{part.slice(2, -2)}</strong>
      }
      if (part.startsWith('*') && part.endsWith('*')) {
        return <em key={i} className="italic">{part.slice(1, -1)}</em>
      }
      if (part.startsWith('`') && part.endsWith('`')) {
        return <code key={i} className="px-1.5 py-0.5 rounded text-[11px] font-mono bg-white/[0.06] text-accent-blue">{part.slice(1, -1)}</code>
      }
      return part
    })
  }

  let i = 0
  while (i < lines.length) {
    const line = lines[i]

    if (!line.trim()) {
      i++
      continue
    }

    if (line.startsWith('## ')) {
      elements.push(
        <h2 key={key++} className="text-text-primary font-bold text-base mt-5 mb-2 pb-1 border-b border-white/[0.06]">
          {parseInline(line.slice(3))}
        </h2>
      )
    } else if (line.startsWith('### ')) {
      elements.push(
        <h3 key={key++} className="text-text-primary font-semibold text-sm mt-4 mb-1.5">
          {parseInline(line.slice(4))}
        </h3>
      )
    } else if (line.startsWith('# ')) {
      elements.push(
        <h1 key={key++} className="text-text-primary font-bold text-lg mt-4 mb-2">
          {parseInline(line.slice(2))}
        </h1>
      )
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      const listItems: React.ReactNode[] = []
      while (i < lines.length && (lines[i].startsWith('- ') || lines[i].startsWith('* '))) {
        listItems.push(
          <li key={i} className="flex gap-2 text-text-secondary text-sm leading-relaxed">
            <span className="text-accent-purple mt-1.5 flex-shrink-0">•</span>
            <span>{parseInline(lines[i].slice(2))}</span>
          </li>
        )
        i++
      }
      elements.push(<ul key={key++} className="space-y-1 my-2">{listItems}</ul>)
      continue
    } else if (/^\d+\. /.test(line)) {
      const listItems: React.ReactNode[] = []
      let num = 1
      while (i < lines.length && /^\d+\. /.test(lines[i])) {
        listItems.push(
          <li key={i} className="flex gap-2 text-text-secondary text-sm leading-relaxed">
            <span className="text-accent-purple font-medium flex-shrink-0 w-4">{num}.</span>
            <span>{parseInline(lines[i].replace(/^\d+\. /, ''))}</span>
          </li>
        )
        i++
        num++
      }
      elements.push(<ol key={key++} className="space-y-1 my-2">{listItems}</ol>)
      continue
    } else if (line.startsWith('> ')) {
      elements.push(
        <blockquote key={key++} className="border-l-2 border-accent-purple/40 pl-4 my-2 text-text-secondary text-sm italic">
          {parseInline(line.slice(2))}
        </blockquote>
      )
    } else if (line.startsWith('---') || line.startsWith('***')) {
      elements.push(<hr key={key++} className="border-white/[0.06] my-3" />)
    } else {
      elements.push(
        <p key={key++} className="text-text-secondary text-sm leading-relaxed my-1.5">
          {parseInline(line)}
        </p>
      )
    }
    i++
  }

  return <div className="space-y-0.5">{elements}</div>
}
