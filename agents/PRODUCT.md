# PRODUCT.md

Portal web CV personal accesible en `raulglez.me`.

## Problema

Raúl Eduardo González Argote, Arquitecto TI con 14+ años de experiencia, necesita un portal web profesional que:
- Presente su CV de forma clara, moderna y accesible
- Refleje su expertise técnico sin depender de plataformas de terceros
- Cargue instantáneamente (< 1s) como sitio estático
- Sea responsive en móvil y desktop
- Tenga animaciones sutiles que mejoren la presentación sin distraer

## Usuarios

| Segmento | Necesidad | Contexto |
|----------|-----------|----------|
| Reclutadores y RRHH | Evaluar rápidamente experiencia técnica | Escanean en < 30 segundos, necesitan jerarquía clara |
| Clientes potenciales | Validar expertise para proyectos | Buscan tecnologías específicas y casos de éxito |
| Colegas técnicos | Conocer trayectoria y proyectos open source | Valoran enlaces a GitHub, APIs y contribuciones |

## Objetivos

- **Principal**: Portal CV estático, rápido, profesional y autogestionado
- **Métrica**: Lighthouse score > 95 en Performance, Accessibility, Best Practices
- **Secundario**: CI/CD automatizado con deploy en k3s propio
- **Secundario**: Build multi-arch (amd64/arm64) para clusters heterogéneos

## No objetivos

- No es un blog (aunque puede enlazar a theworldofrafex.blog)
- No es una SPA con framework JS — es HTML estático
- No tiene backend, API ni base de datos
- No reemplaza LinkedIn ni otras plataformas — es complementario

## Valor diferencial

- **Velocidad pura**: HTML estático generado en build, servido por nginx alpine (~10MB imagen)
- **Control total**: Código propio, dominio propio, infraestructura propia (k3s)
- **Multi-arch**: Corre en amd64 y ARM64 (Raspberry Pi, AWS Graviton, etc.)
- **Open Source**: Todo el código público, reproducible con `make build`
