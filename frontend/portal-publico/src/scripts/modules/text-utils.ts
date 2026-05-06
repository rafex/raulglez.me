import type { CVData, HighlightSemanticMap, HighlightSemanticItem } from '../../types/cv.types';

type CompiledEntry = {
  term: string;
  regex: RegExp;
  className: string;
  tooltip: string;
};

let compiledEntries: CompiledEntry[] = [];

export function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function toTooltipText(item: HighlightSemanticItem): string {
  const parts: string[] = [];
  if (item.text?.trim()) parts.push(item.text.trim());
  if (typeof item.experienceYears === 'number') parts.push(`Experiencia: ${item.experienceYears} años.`);
  if (item.use?.length) parts.push(`Uso: ${item.use.join(', ')}.`);
  if (item.certifications?.length) parts.push(`Certificaciones: ${item.certifications.join(' | ')}.`);
  return parts.join(' ');
}

export function configureSemanticHighlights(data: CVData): void {
  const source: HighlightSemanticMap = data.highlight_semantic ?? {};
  const entries = Object.entries(source)
    .filter(([, v]) => !!v)
    .map(([term, item]) => {
      const tooltip = toTooltipText(item);
      return {
        term,
        regex: new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'),
        className: (item.className ?? 'strong') === 'soft' ? 'semantic-soft' : 'semantic-strong',
        tooltip,
      };
    })
    .sort((a, b) => b.term.length - a.term.length);

  compiledEntries = entries;
}

export function highlightSemantic(text: string): string {
  let out = esc(text);

  compiledEntries.forEach((entry) => {
    out = out.replace(
      entry.regex,
      `<span class="tooltip-container semantic-token ${entry.className}"><span class="tooltip">${esc(entry.tooltip)}</span><span class="text">$&</span></span>`
    );
  });

  return out;
}
