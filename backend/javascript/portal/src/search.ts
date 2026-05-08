/**
 * search.ts — Búsqueda local sobre el JSON del CV.
 * Devuelve resultados con section, sectionId, title, snippet y score.
 */

export type SearchResult = {
  section:   string;
  sectionId: string;
  title:     string;
  snippet:   string;
  score:     number;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function normalize(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

function scoreText(text: string, tokens: string[]): number {
  const norm = normalize(text);
  return tokens.reduce((acc, t) => acc + (norm.split(t).length - 1), 0);
}

function makeSnippet(text: string, firstToken: string, maxLen = 130): string {
  if (!text) return '';
  const idx = normalize(text).indexOf(firstToken);
  if (idx === -1) return text.slice(0, maxLen) + (text.length > maxLen ? '…' : '');
  const start = Math.max(0, idx - 30);
  const end   = Math.min(text.length, idx + firstToken.length + 80);
  return (start > 0 ? '…' : '') + text.slice(start, end) + (end < text.length ? '…' : '');
}

function skillName(s: string | { name: string }): string {
  return typeof s === 'string' ? s : s.name;
}

// ─── Función principal ────────────────────────────────────────────────────────

export function searchCv(data: any, query: string): SearchResult[] {
  const tokens = normalize(query.trim()).split(/\s+/).filter((t) => t.length > 1);
  if (!tokens.length) return [];

  const results: SearchResult[] = [];
  const t0 = tokens[0];

  // ── Sobre mí ────────────────────────────────────────────────────────────────
  const aboutS = scoreText(data.about ?? '', tokens);
  if (aboutS > 0) {
    results.push({
      section: 'Sobre mí', sectionId: 'about',
      title: 'Sobre mí',
      snippet: makeSnippet(data.about, t0),
      score: aboutS,
    });
  }

  // ── Educación ────────────────────────────────────────────────────────────────
  for (const edu of (data.education ?? [])) {
    const combined = [edu.degree, edu.institution, edu.location].join(' ');
    const s = scoreText(combined, tokens);
    if (s > 0) {
      results.push({
        section: 'Educación', sectionId: 'about',
        title: edu.degree,
        snippet: `${edu.institution} · ${edu.location} (${edu.period})`,
        score: s,
      });
    }
  }

  // ── Experiencia ──────────────────────────────────────────────────────────────
  for (const item of (data.experience ?? [])) {
    const highlights: string[] = item.highlights ?? [];
    const techSkills: string[] = (item.skills?.technical ?? []).map(skillName);
    const combined = [item.role, item.company, item.location, ...highlights, ...techSkills].join(' ');
    const s = scoreText(combined, tokens);
    if (s > 0) {
      const matchedHighlight = highlights.find((h: string) => scoreText(h, tokens) > 0);
      results.push({
        section: 'Experiencia', sectionId: 'experience',
        title: `${item.role} @ ${item.company}`,
        snippet: matchedHighlight
          ? makeSnippet(matchedHighlight, t0)
          : `${item.period} · ${item.location}`,
        score: s,
      });
    }
  }

  // ── Habilidades ──────────────────────────────────────────────────────────────
  const techNames: string[] = (data.skills?.technical ?? []).map(skillName);
  const competencies: string[] = data.skills?.competencies ?? [];
  const allSkills = [...techNames, ...competencies];
  const skillsScore = scoreText(allSkills.join(' '), tokens);
  if (skillsScore > 0) {
    const matched = allSkills.filter((s) => scoreText(s, tokens) > 0).slice(0, 4).join(', ');
    results.push({
      section: 'Habilidades', sectionId: 'skills',
      title: 'Habilidades técnicas',
      snippet: matched,
      score: skillsScore,
    });
  }

  // ── Certificaciones ──────────────────────────────────────────────────────────
  for (const cert of (data.certifications ?? [])) {
    const combined = [cert.title, cert.issuer ?? ''].join(' ');
    const s = scoreText(combined, tokens);
    if (s > 0) {
      results.push({
        section: 'Certificaciones', sectionId: 'education',
        title: cert.title,
        snippet: [cert.issuer, cert.expedition].filter(Boolean).join(' · '),
        score: s,
      });
    }
  }

  // ── Conferencias ─────────────────────────────────────────────────────────────
  for (const conf of (data.conferences ?? [])) {
    const combined = [conf.title, conf.event, conf.location].join(' ');
    const s = scoreText(combined, tokens);
    if (s > 0) {
      results.push({
        section: 'Conferencias', sectionId: 'conferences',
        title: conf.title,
        snippet: `${conf.event} · ${conf.location}`,
        score: s,
      });
    }
  }

  // ── Artículos ────────────────────────────────────────────────────────────────
  for (const art of (data.articles ?? [])) {
    const combined = [art.title, art.publication].join(' ');
    const s = scoreText(combined, tokens);
    if (s > 0) {
      results.push({
        section: 'Artículos', sectionId: 'articles',
        title: art.title,
        snippet: `${art.publication} · ${art.date ?? ''}`,
        score: s,
      });
    }
  }

  // ── Proyectos ────────────────────────────────────────────────────────────────
  for (const proj of (data.projects ?? [])) {
    const combined = [proj.name, proj.description].join(' ');
    const s = scoreText(combined, tokens);
    if (s > 0) {
      results.push({
        section: 'Proyectos', sectionId: 'projects',
        title: proj.name,
        snippet: makeSnippet(proj.description, t0),
        score: s,
      });
    }
  }

  // Ordenar por score y limitar a 10
  return results.sort((a, b) => b.score - a.score).slice(0, 10);
}
