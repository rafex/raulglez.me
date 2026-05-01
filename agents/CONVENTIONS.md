# CONVENTIONS.md

Convenciones de desarrollo del portal CV `raulglez.me`.

## Código

### Naming

| Elemento | Convención | Ejemplo |
|----------|-----------|---------|
| Partials Pug | `_nombre.pug` (underscore prefix) | `_header.pug`, `_experience.pug` |
| Partials Sass | `_nombre.scss` (underscore prefix) | `_variables.scss`, `_base.scss` |
| Clases CSS | BEM-like: `bloque__elemento--modificador` | `cv__section`, `timeline__card`, `skill__badge--soft` |
| IDs | kebab-case | `#about`, `#experience`, `#contact` |
| Archivos JS | camelCase | `main.js` |
| Directorios | kebab-case o plural | `partials/`, `styles/`, `templates/` |

### Estructura

```
frontend/
├── index.html          ← entry point con tag <pug>
├── vite.config.js       ← configuración Vite + Pug plugin
├── package.json
└── src/
    ├── main.js          ← JS: animate.css + IntersectionObserver
    ├── data/
    │   └── cv.json      ← fuente de verdad de datos del CV
    ├── styles/
    │   ├── main.scss     ← entry point (importa todos los partials)
    │   ├── _variables.scss  ← design tokens
    │   ├── _base.scss       ← reset + estilos base + print
    │   ├── _layout.scss     ← grid y secciones
    │   ├── _components.scss ← componentes (timeline, badges, cards)
    │   └── _responsive.scss ← media queries
    └── templates/
        ├── index.pug    ← layout principal
        └── partials/
            ├── _header.pug
            ├── _about.pug
            ├── _experience.pug
            ├── _skills.pug
            ├── _education.pug
            ├── _conferences.pug
            ├── _projects.pug
            └── _contact.pug
```

### Principios

- **Cambios pequeños y locales**: cada partial Pug es autónomo
- **Separación contenido/presentación**: datos en `cv.json`, estructura en `.pug`, estilos en `.scss`
- **Sin duplicación**: un solo lugar para cada dato
- **Accesibilidad**: `prefers-reduced-motion`, etiquetas semánticas, contraste adecuado
- **Print-friendly**: estilos de impresión en `_base.scss`

## Commits

- **Formato**: Conventional Commits con emojis
  - `✨ feat:` nueva funcionalidad
  - `🐛 fix:` corrección de bug
  - `📦 build:` infraestructura, Docker, CI
  - `📝 docs:` documentación
  - `🎨 style:` cambios de estilo/formato
- **Branching**: `feature/*`, `fix/*`, `chore/*`
- **Atomicidad**: un commit = un propósito lógico

## Testing

- **Build verification**: `npm run build` debe completar sin errores
- **Helm lint**: `helm lint helm/raulglez-me/` debe pasar
- **YAML lint**: workflows de GitHub Actions deben ser YAML válido
- **Manual**: inspección visual en `npm run preview`

## Documentación

- Los `agents/*.md` contienen contexto fuente del proyecto
- `tasks/TODO.md` es el tablero de tareas activas
- `README.md` del root indexa todo
- No duplicar información entre documentos
