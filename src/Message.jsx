import { useMemo, useState } from 'react'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import hljs from 'highlight.js/lib/common'
import 'highlight.js/styles/github-dark.css'
import { I } from './Icons.jsx'

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

marked.use({
  gfm: true,
  breaks: true,
  renderer: {
    code(code, info) {
      const lang = (info || '').split(/\s+/)[0]
      let html
      try { html = lang && hljs.getLanguage(lang) ? hljs.highlight(code, { language: lang }).value : esc(code) }
      catch { html = esc(code) }
      return `<div class="code"><div class="code-head"><span>${esc(lang || 'text')}</span><button data-copy>Copy</button></div><pre><code class="hljs">${html}</code></pre></div>`
    },
  },
})

const onClick = (e) => {
  const b = e.target.closest('[data-copy]')
  if (!b) return
  navigator.clipboard.writeText(b.closest('.code').querySelector('code').innerText)
  b.textContent = 'Copied'
  setTimeout(() => (b.textContent = 'Copy'), 1200)
}

export default function Message({ m, streaming, canRegenerate, onRegenerate }) {
  const [copied, setCopied] = useState(false)
  const html = useMemo(
    () => (m.role === 'assistant' ? DOMPurify.sanitize(marked.parse(m.content || '')) : ''),
    [m.content, m.role],
  )

  if (m.role === 'user') {
    return <div className="row user"><div className="bubble">{m.content}</div></div>
  }
  return (
    <div className="row assistant">
      <div className="avatar"><I.sparkle size={15} /></div>
      <div className="content">
        {m.error ? (
          <div className="err-box">{m.error}</div>
        ) : (
          <>
            {!m.content && streaming && <div className="typing"><i /><i /><i /></div>}
            <div className="md" onClick={onClick} dangerouslySetInnerHTML={{ __html: html }} />
            {streaming && m.content && <span className="cursor" />}
          </>
        )}
        {!streaming && m.content && (
          <div className="actions">
            <button onClick={() => { navigator.clipboard.writeText(m.content); setCopied(true); setTimeout(() => setCopied(false), 1200) }}>
              {copied ? <I.check size={14} /> : <I.copy size={14} />} {copied ? 'Copied' : 'Copy'}
            </button>
            {canRegenerate && <button onClick={onRegenerate}><I.refresh size={14} /> Regenerate</button>}
          </div>
        )}
        {!streaming && m.error && canRegenerate && (
          <div className="actions"><button onClick={onRegenerate}><I.refresh size={14} /> Try again</button></div>
        )}
      </div>
    </div>
  )
}
