import { useEffect, useRef, useState } from 'react'
import { I } from './Icons.jsx'

export default function Composer({ busy, onSend, onStop, onToast }) {
  const [text, setText] = useState('')
  const [listening, setListening] = useState(false)
  const ta = useRef(null)
  const rec = useRef(null)

  useEffect(() => {
    const el = ta.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 200) + 'px'
  }, [text])

  const submit = () => {
    if (!text.trim() || busy) return
    onSend(text.trim())
    setText('')
  }

  const mic = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) return onToast('Voice input is not supported in this browser. Try Chrome or Edge.')
    if (listening) return rec.current?.stop()
    const r = new SR()
    r.lang = 'en-US'
    r.interimResults = true
    r.onresult = (e) => setText([...e.results].map((x) => x[0].transcript).join(''))
    r.onend = () => setListening(false)
    r.onerror = () => setListening(false)
    r.start()
    rec.current = r
    setListening(true)
  }

  return (
    <div className="composer-wrap">
      <div className="composer">
        <textarea
          ref={ta}
          rows={1}
          value={text}
          autoFocus
          placeholder="Message Nova…"
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit() } }}
        />
        <button className={'round ghost' + (listening ? ' live' : '')} onClick={mic} title="Voice input"><I.mic size={18} /></button>
        {busy ? (
          <button className="round stop" onClick={onStop} title="Stop generating"><I.stop size={15} /></button>
        ) : (
          <button className="round send" onClick={submit} disabled={!text.trim()} title="Send"><I.send size={18} /></button>
        )}
      </div>
      <p className="disclaimer">Nova can make mistakes. Check important information. Enter to send, Shift+Enter for a new line.</p>
    </div>
  )
}
