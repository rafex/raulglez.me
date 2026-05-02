# Historial de Exploraciones

## Auditoría GSAP + Shadow DOM — 2026-05-01

- **Contexto:** Auditoría de calidad y seguridad de la integración GSAP en 9 Web Components (worktree `task-2026-05-01-gsap`).
- **Tipo de auditoría:** Code review + security audit completo.
- **Archivos revisados:** 12 TypeScript (`main.ts`, `animations/gsap.ts`, `components/cv-{header,about,experience,skills,projects,education,conferences,contact,app}.ts`, `types/cv.types.ts`) + `cv.json` + `package.json` + `tsconfig.json`.
- **Tamaño del worktree:** MEDIANO (60 archivos, 15020 líneas; 13 TS, 736 líneas).
- **Veredicto:** ❌ Requiere cambios — 5 hallazgos críticos/altos.

### Hallazgos principales

| Severidad | Hallazgo | Archivos |
|-----------|----------|----------|
| 🔴 CRÍTICO | XSS: datos de `cv.json` insertados en `innerHTML` sin sanitizar | 8 componentes |
| 🔴 CRÍTICO | Memory leaks: event listeners y tweens GSAP nunca se limpian (sin `disconnectedCallback`) | `cv-skills.ts`, `cv-projects.ts`, `cv-contact.ts`, `cv-experience.ts` |
| 🟠 ALTO | `esc()` de `cv-app.ts` no escapa `<` `>` y solo protege contexto de atributo | `cv-app.ts` |
| 🟠 ALTO | URL sin validar en `href` (riesgo `javascript:`) | `cv-projects.ts` |
| 🟡 MEDIO | CSS duplicado (~160 líneas) y falta de event delegation | 8 componentes |
| 🔵 BAJO | Código muerto: `queryShadow`/`queryShadowAll` no usados | `gsap.ts` |

### Shadow DOM + GSAP — positivo
- ✅ Arquitectura correcta: selectors operan dentro del ShadowRoot
- ✅ Presets de animación bien tipados y configurables
- ✅ ScrollTriggers con `once: true` — buena práctica de performance
- ✅ Propiedades GPU-friendly (`opacity`, `transform`, `scale`)

### Recomendaciones prioritarias
1. Crear helper `escapeHtml()` y aplicar antes de cada interpolación en `innerHTML`
2. Implementar `disconnectedCallback` con `gsap.killTweensOf()` y `removeEventListener`
3. Validar URLs antes de insertarlas en `href`
4. Considerar `CSSStyleSheet` adoptado para estilos compartidos
5. Usar event delegation en lugar de listeners por elemento

### Áreas a investigar
- Posibilidad de migrar a `adoptedStyleSheets` para reducir duplicación CSS
- Evaluar si los components necesitan Shadow DOM cerrado (`mode: 'closed'`) en lugar de `open`
