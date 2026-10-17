import { PERSONAS } from './config.js'
import { I } from './Icons.jsx'

export default function Settings({ s, setS, models, onClose, onClearAll }) {
  const pickPersona = (k) => setS({ ...s, persona: k, system: PERSONAS[k].prompt })
  return (
    <div className="modal-back" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head"><h3>Chat settings</h3><button className="icon" onClick={onClose}><I.x /></button></div>

        <label>Model
          <select value={s.model} onChange={(e) => setS({ ...s, model: e.target.value })}>
            {models.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </label>

        <div className="field">
          <span className="lbl">Persona</span>
          <div className="chips">
            {Object.entries(PERSONAS).map(([k, v]) => (
              <button key={k} className={'chip' + (s.persona === k ? ' on' : '')} onClick={() => pickPersona(k)}>{v.label}</button>
            ))}
            <button className={'chip' + (s.persona === 'custom' ? ' on' : '')} onClick={() => setS({ ...s, persona: 'custom' })}>Custom</button>
          </div>
        </div>

        <label>System prompt
          <textarea rows={4} value={s.system} onChange={(e) => setS({ ...s, system: e.target.value, persona: 'custom' })} />
        </label>

        <label>Creativity (temperature): <b>{s.temperature}</b>
          <input type="range" min="0" max="1.5" step="0.1" value={s.temperature} onChange={(e) => setS({ ...s, temperature: +e.target.value })} />
        </label>

        <label>Max reply length: <b>{s.max_tokens}</b> tokens
          <input type="range" min="256" max="8192" step="256" value={s.max_tokens} onChange={(e) => setS({ ...s, max_tokens: +e.target.value })} />
        </label>

        <div className="modal-actions">
          <button className="btn danger" onClick={onClearAll}><I.trash size={14} /> Delete all chats</button>
          <button className="btn primary" onClick={onClose}>Done</button>
        </div>
      </div>
    </div>
  )
}
