'use client';
// "Download a copy" – the information sheet and the participant's consent
// record as a self-contained HTML file they can keep or print.
import type { InfoSheet, ConsentForm } from '../content/infoAndConsent';
import { plain } from './Markup';

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export function downloadStudyCopy(opts: {
  sheet: InfoSheet;
  form: ConsentForm;
  pid: string;
  ticked: Record<string, number>;
  signedAt: number | null;
}) {
  const { sheet, form, pid, ticked, signedAt } = opts;
  const blocks = (bs: InfoSheet['intro']) =>
    bs
      .map((b) =>
        b.kind === 'p'
          ? `<p>${esc(plain(b.text ?? ''))}</p>`
          : `<${b.kind}>${(b.items ?? []).map((i) => `<li>${esc(plain(i))}</li>`).join('')}</${b.kind}>`
      )
      .join('\n');
  const consentRows = form.statements
    .map((s) => `<tr><td>${esc(s.text)}</td><td>${ticked[s.id] ? '✔ ' + new Date(ticked[s.id]).toLocaleString('en-GB') : '—'}</td></tr>`)
    .join('\n');
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${esc(sheet.title)}</title>
<style>body{font-family:system-ui,sans-serif;max-width:760px;margin:2rem auto;padding:0 1rem;line-height:1.5;color:#111}
h1{font-size:1.4rem}h2{font-size:1.1rem;margin-top:1.6rem}table{border-collapse:collapse;width:100%}
td{border:1px solid #ccc;padding:.5rem;vertical-align:top}td:last-child{white-space:nowrap}</style></head><body>
<h1>${esc(sheet.title)}</h1><p><strong>${esc(sheet.subtitle)}</strong></p><p><em>Version: ${esc(sheet.version)}</em></p>
${blocks(sheet.intro)}
${sheet.sections.map((s, i) => `<h2>${i + 1}. ${esc(s.heading)}</h2>\n${blocks(s.blocks)}`).join('\n')}
<hr><h1>Consent record</h1>
<p>Project: ${esc(form.projectTitle)}<br>SREC reference: ${esc(form.srecReference || '—')}<br>Lead researcher: ${esc(form.leadResearcher)}<br>
Consent form version: ${esc(form.version)}<br>Participant ID: ${esc(pid)}<br>
Consent given: ${signedAt ? new Date(signedAt).toLocaleString('en-GB') : 'not yet'}</p>
<table>${consentRows}</table></body></html>`;
  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'study-information-and-consent.html';
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
