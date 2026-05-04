export function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function replaceInsensitive(text: string, needle: string, replacement: string): string {
  return text.replace(new RegExp(needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), replacement);
}

export function highlightSemantic(text: string): string {
  let out = esc(text);
  const strongTerms = [
    '14 años',
    'Arquitecto de software',
    'Arquitecto TI',
    'Java',
    'Spring',
    'Microservicios',
    'Azure',
    'AWS',
    'GCP',
    'Open Source',
  ];
  const softTerms = [
    'escalables',
    'liderazgo de equipos',
    'automatización',
    'docencia técnica',
  ];

  strongTerms.forEach((term) => {
    out = replaceInsensitive(out, term, `<span class="semantic-strong">${term}</span>`);
  });
  softTerms.forEach((term) => {
    out = replaceInsensitive(out, term, `<span class="semantic-soft">${term}</span>`);
  });

  return out;
}
