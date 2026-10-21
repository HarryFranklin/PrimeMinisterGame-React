'use client';
import React from 'react';

// Tiny text formatter for the content files: **bold**, line breaks, bare
// https:// links, and bullet lists (lines starting "- "). Deliberately minimal
// – no HTML from content is ever injected. Renders block elements for bullets,
// so put it inside a <div>, not a <p>, when the text may contain them.
export function Markup({ text }: { text: string }) {
  const lines = text.split('\n');
  const out: React.ReactNode[] = [];
  let bullets: string[] = [];
  const flush = (key: number) => {
    if (!bullets.length) return;
    out.push(
      <ul key={`ul${key}`} className="list-disc pl-5 my-1 flex flex-col gap-1">
        {bullets.map((b, j) => <li key={j}>{formatLine(b)}</li>)}
      </ul>
    );
    bullets = [];
  };
  lines.forEach((line, i) => {
    if (line.startsWith('- ')) {
      bullets.push(line.slice(2));
      return;
    }
    flush(i);
    out.push(
      <React.Fragment key={i}>
        {i > 0 && !lines[i - 1].startsWith('- ') && <br />}
        {formatLine(line)}
      </React.Fragment>
    );
  });
  flush(lines.length);
  return <>{out}</>;
}

function formatLine(line: string): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|https?:\/\/[^\s)]+[^\s).,;])/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let k = 0;
  while ((m = re.exec(line))) {
    if (m.index > last) out.push(line.slice(last, m.index));
    const tok = m[0];
    if (tok.startsWith('**')) out.push(<strong key={k++} className="font-semibold text-zinc-100">{tok.slice(2, -2)}</strong>);
    else
      out.push(
        <a key={k++} href={tok} target="_blank" rel="noreferrer" className="underline underline-offset-2 break-all hover:text-white">
          {tok}
        </a>
      );
    last = m.index + tok.length;
  }
  if (last < line.length) out.push(line.slice(last));
  return out;
}

/** Plain-text version (for downloads). */
export function plain(text: string): string {
  return text.replace(/\*\*([^*]+)\*\*/g, '$1');
}
