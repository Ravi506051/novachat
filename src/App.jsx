import { useEffect, useMemo, useRef, useState } from 'react'
import { I } from './Icons.jsx'
import Message from './Message.jsx'
import Composer from './Composer.jsx'
import Settings from './Settings.jsx'
import { PERSONAS, SUGGESTIONS } from './config.js'

const uid = () => Math.random().toString(36).slice(2, 10)
const load = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d } catch { return d } }

export default function App() {
  const [chats, setChats] = useState(() => load('nova.chats', []))
  const [activeId, setActiveId] = useState(() => load('nova.active', null))
  const [s, setS] = useState(() => ({ model: '', persona: 'assistant', system: PERSONAS.assistant.prompt, temperature: 0.7, max_tokens: 2048, ...load('nova.settings', {}) }))
  const [models, setModels] = useState([])
  const [hasKey, setHasKey] = useState(true)
  const [dark, setDark] = useState(() => localStorage.getItem('nova.theme') !== 'light')
  const [busy, setBusy] = useState(false)
  const [side, setSide] = useState(() => window.innerWidth > 800)
  const [query, setQuery] = useState('')
  const [showSettings, setShowSettings] = useState(false)
  const [toast, setToast] = useState('')
  const [atBottom, setAtBottom] = useState(true)
  const abort = useRef(null)
  const scroller = useRef(null)

  const chat = chats.find((c) => c.id === activeId) || null
  const messages = chat ? chat.messages : []
  const say = (m) => { setToast(m); setTimeout(() => setToast(''), 2800) }

  // ---- persistence ----
  useEffect(() => { const t = setTimeout(() => localStorage.setItem('nova.chats', JSON.stringify(chats)), 300); return () => clearTimeout(t) }, [chats])
  useEffect(() => localStorage.setItem('nova.active', JSON.stringify(activeId)), [activeId])
  useEffect(() => localStorage.setItem('nova.settings', JSON.stringify(s)), [s])
  useEffect(() => {
    document.documentElement.dataset.theme = dark ? 'dark' : 'light'
    localStorage.setItem('nova.theme', dark ? 'dark' : 'light')
  }, [dark])

  // ---- server info ----
  useEffect(() => {
    fetch('/api/config').then((r) => r.json()).then((c) => setHasKey(c.has_key)).catch(() => setHasKey(false))
    fetch('/api/models').then((r) => r.json()).then((d) => {
      setModels(d.models)
      setS((x) => (x.model && d.models.includes(x.model) ? x : { ...x, model: d.default }))
    }).catch(() => {})
  }, [])

  // ---- scrolling ----
  useEffect(() => { if (atBottom) scroller.current?.scrollTo({ top: scroller.current.scrollHeight }) }, [messages, atBottom])
  const onScroll = () => {
    const el = scroller.current
    setAtBottom(el.scrollHeight - el.scrollTop - el.clientHeight < 80)
  }

  // ---- chat logic ----
  const patch = (chatId, fn) => setChats((cs) => cs.map((c) => (c.id === chatId ? fn(c) : c)))

  const stream = async (chatId, history) => {
    const aid = uid()
    const ctrl = new AbortController()
    abort.current = ctrl
    setBusy(true)
    setAtBottom(true)
    patch(chatId, (c) => ({ ...c, messages: [...c.messages, { id: aid, role: 'assistant', content: '' }] }))
    const setMsg = (fn) => patch(chatId, (c) => ({ ...c, messages: c.messages.map((m) => (m.id === aid ? fn(m) : m)) }))
    try {
      const r = await fetch('/api/chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: ctrl.signal,
        body: JSON.stringify({
          messages: history.map(({ role, content }) => ({ role, content })),
          model: s.model, system: s.system, temperature: s.temperature, max_tokens: s.max_tokens,
        }),
      })
      if (!r.ok) throw new Error((await r.json().catch(() => ({}))).detail || 'Request failed')
      const reader = r.body.getReader()
      const dec = new TextDecoder()
      let buf = ''
      for (;;) {
        const { done, value } = await reader.read()
        if (done) break
        buf += dec.decode(value, { stream: true })
        const lines = buf.split('\n')
        buf = lines.pop()
        for (const l of lines) {
          if (!l.startsWith('data: ')) continue
          const p = l.slice(6).trim()
          if (p === '[DONE]') continue
          const j = JSON.parse(p)
          if (j.error) throw new Error(j.error)
          if (j.t) setMsg((m) => ({ ...m, content: m.content + j.t }))
        }
      }
    } catch (e) {
      if (e.name !== 'AbortError') setMsg((m) => ({ ...m, error: e.message }))
    } finally {
      setBusy(false)
      abort.current = null
    }
  }

  const send = (text) => {
    if (busy) return
    let id = activeId
    const userMsg = { id: uid(), role: 'user', content: text }
    if (!chat) {
      id = uid()
      setChats((cs) => [{ id, title: text.slice(0, 42), created: Date.now(), messages: [userMsg] }, ...cs])
      setActiveId(id)
      stream(id, [userMsg])
    } else {
      patch(id, (c) => ({ ...c, messages: [...c.messages, userMsg] }))
      stream(id, [...chat.messages.filter((m) => !m.error), userMsg])
    }
  }

  const regenerate = () => {
    if (busy || !chat) return
    const last = chat.messages[chat.messages.length - 1]
    const base = last?.role === 'assistant' ? chat.messages.slice(0, -1) : chat.messages
    patch(chat.id, (c) => ({ ...c, messages: base }))
    stream(chat.id, base.filter((m) => !m.error))
  }

  const stop = () => abort.current?.abort()
  const newChat = () => { if (!busy) { setActiveId(null); if (window.innerWidth <= 800) setSide(false) } }
  const removeChat = (id) => { setChats((cs) => cs.filter((c) => c.id !== id)); if (id === activeId) setActiveId(null) }
  const exportChat = () => {
    if (!chat) return say('Nothing to export yet')
    const md = `# ${chat.title}\n\n` + chat.messages.map((m) => `**${m.role === 'user' ? 'You' : 'Nova'}:**\n\n${m.content}`).join('\n\n---\n\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([md], { type: 'text/markdown' }))
    a.download = (chat.title || 'chat').replace(/[^\w-]+/g, '_') + '.md'
    a.click()
  }

  const visible = useMemo(
    () => chats.filter((c) => c.title.toLowerCase().includes(query.toLowerCase())),
    [chats, query],
  )

  return (
    <div className={'app' + (side ? '' : ' no-side')}>
      <aside className="sidebar">
        <div className="brand"><span className="mark"><I.sparkle size={15} /></span> Nova</div>
        <button className="btn primary wide" onClick={newChat}><I.plus size={16} /> New chat</button>
        <div className="search"><I.search size={14} /><input placeholder="Search chats" value={query} onChange={(e) => setQuery(e.target.value)} /></div>
        <div className="side-title">Recent</div>
        <ul className="chat-list">
          {visible.map((c) => (
            <li key={c.id} className={c.id === activeId ? 'sel' : ''} onClick={() => { if (!busy) { setActiveId(c.id); if (window.innerWidth <= 800) setSide(false) } }}>
              <I.chat size={15} /><span>{c.title}</span>
              <button title="Delete chat" onClick={(e) => { e.stopPropagation(); removeChat(c.id) }}><I.trash size={14} /></button>
            </li>
          ))}
          {!visible.length && <li className="muted">{chats.length ? 'No matches' : 'Your chats will appear here'}</li>}
        </ul>
        <div className="side-foot">Powered by Groq</div>
      </aside>

      <main>
        <header>
          <button className="icon" onClick={() => setSide(!side)} title="Toggle sidebar"><I.menu /></button>
          <div className="model">
            <select value={s.model} onChange={(e) => setS({ ...s, model: e.target.value })} title="Model">
              {(models.length ? models : [s.model || 'loading…']).map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
            <I.down size={14} />
          </div>
          <span className="grow" />
          <button className="icon" onClick={exportChat} title="Export chat (.md)"><I.download /></button>
          <button className="icon" onClick={() => setShowSettings(true)} title="Settings"><I.sliders /></button>
          <button className="icon" onClick={() => setDark(!dark)} title="Theme">{dark ? <I.sun /> : <I.moon />}</button>
        </header>

        {!hasKey && (
          <div className="banner">
            No API key found. Open the <code>.env</code> file, set <code>GROQ_API_KEY</code>, then restart the backend.
          </div>
        )}

        <div className="scroll" ref={scroller} onScroll={onScroll}>
          {messages.length === 0 ? (
            <div className="hero">
              <div className="big"><I.sparkle size={30} /></div>
              <h1>How can I help you today?</h1>
              <p>Powered by Groq for ultra-fast answers.</p>
              <div className="cards">
                {SUGGESTIONS.map((x) => {
                  const Ic = I[x.icon]
                  return (
                    <button key={x.title} className="card" onClick={() => send(x.text)}>
                      <span className="card-ic"><Ic size={18} /></span>
                      <b>{x.title}</b>
                      <span>{x.text}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          ) : (
            <div className="thread">
              {messages.map((m, i) => (
                <Message key={m.id} m={m}
                  streaming={busy && i === messages.length - 1 && m.role === 'assistant'}
                  canRegenerate={!busy && i === messages.length - 1 && m.role === 'assistant'}
                  onRegenerate={regenerate} />
              ))}
            </div>
          )}
          {!atBottom && messages.length > 0 && (
            <button className="to-bottom" onClick={() => scroller.current.scrollTo({ top: scroller.current.scrollHeight, behavior: 'smooth' })}><I.down size={18} /></button>
          )}
        </div>

        <Composer busy={busy} onSend={send} onStop={stop} onToast={say} />
      </main>

      {showSettings && (
        <Settings s={s} setS={setS} models={models.length ? models : [s.model]} onClose={() => setShowSettings(false)}
          onClearAll={() => { if (confirm('Delete all chats?')) { setChats([]); setActiveId(null); setShowSettings(false) } }} />
      )}
      {toast && <div className="toast">{toast}</div>}
    </div>
  )
}
