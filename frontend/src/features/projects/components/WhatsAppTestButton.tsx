import { useState } from 'react';
import { api } from '../../../lib/api';

type Props = { projectId: number };

export default function WhatsAppTestButton({ projectId }: Props) {
  const [state, setState] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle');
  const [msg, setMsg] = useState('');

  async function handleTest() {
    setState('loading');
    try {
      const res = await api.post(`/projects/${projectId}/whatsapp/test`);
      setState(res.data.ok ? 'ok' : 'error');
      setMsg(res.data.message);
    } catch {
      setState('error');
      setMsg('Erreur réseau');
    }
    setTimeout(() => setState('idle'), 4000);
  }

  const label = state === 'loading' ? '…' : state === 'ok' ? '✓ Envoyé' : state === 'error' ? '✗ Échec' : '🟢 Tester WhatsApp';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
      <button
        className="rw-dl-btn"
        onClick={handleTest}
        disabled={state === 'loading'}
        style={{
          background: state === 'ok' ? '#d1fae5' : state === 'error' ? '#fee2e2' : undefined,
          borderColor: state === 'ok' ? '#6ee7b7' : state === 'error' ? '#fca5a5' : undefined,
          color: state === 'ok' ? '#065f46' : state === 'error' ? '#991b1b' : undefined,
          whiteSpace: 'nowrap',
        }}
      >
        {label}
      </button>
      {msg && <span style={{ fontSize: 10, color: 'var(--text-subtle)', maxWidth: 160, textAlign: 'right' }}>{msg}</span>}
    </div>
  );
}
