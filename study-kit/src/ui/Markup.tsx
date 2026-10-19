'use client';
import React from 'react';

// Tiny text formatter for the content files: **bold**, line breaks, and bare
// https:// links. Deliberately minimal – no HTML from content is ever injected.
export function Markup({ text }: { text: string }) {
  const lines = text.split('\n');
  return (
    <>
      {lines.map((line, i) => (
        <React.Fragment key={i}>
          {i > 0 && <br />}
          {formatLine(line)}
        </React.Fragment>
      ))}
    </>
  );
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
