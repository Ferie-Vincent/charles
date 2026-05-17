import type { ReactNode } from 'react';

function parseInline(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const re = /(\*\*(.+?)\*\*|\*(.+?)\*)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) nodes.push(text.slice(last, m.index));
    if (m[0].startsWith('**')) nodes.push(<strong key={m.index}>{m[2]}</strong>);
    else nodes.push(<em key={m.index}>{m[3]}</em>);
    last = m.index + m[0].length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

export default function AiMarkdown({ text }: { text: string }) {
  const lines = text.split('\n');
  const blocks: ReactNode[] = [];
  let listItems: string[] = [];
  let key = 0;

  function flushList() {
    if (!listItems.length) return;
    blocks.push(
      <ul key={key++} className="ai-md-list">
        {listItems.map((li, i) => (
          <li key={i} className="ai-md-li">{parseInline(li)}</li>
        ))}
      </ul>
    );
    listItems = [];
  }

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) { flushList(); continue; }

    if (/^[-•]\s+/.test(line)) { listItems.push(line.replace(/^[-•]\s+/, '')); continue; }
    if (/^\d+\.\s+/.test(line)) { listItems.push(line.replace(/^\d+\.\s+/, '')); continue; }

    flushList();

    const h = line.match(/^(#{1,3})\s+(.+)/);
    if (h) {
      const Tag = (['h3','h4','h5'] as const)[h[1].length - 1] ?? 'h5';
      blocks.push(<Tag key={key++} className="ai-md-heading">{parseInline(h[2])}</Tag>);
      continue;
    }

    blocks.push(<p key={key++} className="ai-md-p">{parseInline(line)}</p>);
  }

  flushList();
  return <div className="ai-md">{blocks}</div>;
}
