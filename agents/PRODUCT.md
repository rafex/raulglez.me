# PRODUCT.md

Portal web CV personal accesible en `raulglez.me`.

## Problema

Raúl Eduardo González Argote, Arquitecto TI con 14+ años de experiencia, necesita un portal web profesional que:
- Presente su CV de forma clara, moderna y accesible.
- Permita a reclutadores y clientes interactuar con el CV via chat IA.
- Registre los datos de contacto de quienes consultan.
- Refleje su expertise técnico sin depender de plataformas de terceros.
- Sea gestionable desde un panel administrativo propio.

## Usuarios

| Segmento | Necesidad | Contexto |
|---|---|---|
| Reclutadores y RRHH | Evaluar rápidamente experiencia técnica | Escanean en < 30 s; usan el chat para preguntas específicas |
| Clientes potenciales | Validar expertise para proyectos | Buscan tecnologías y casos de éxito; dejan datos de contacto |
| Colegas técnicos | Conocer trayectoria y proyectos | Valoran enlaces a GitHub, APIs y contribuciones |
| Raúl (administrador) | Revisar quién interactuó, calificar respuestas IA | Accede al panel admin para gestión y mejora continua |

## Objetivos

- **CV público**: portal estático, rápido, accesible, con chat IA en tiempo real.
- **Chat IA**: responde preguntas sobre el CV; registra leads (nombre + teléfono obligatorio).
- **Panel admin**: gestión de interacciones, calificación de respuestas, edición del prompt del sistema IA y reindexado FAISS.
- **Métricas de calidad**: Lighthouse > 95 en Performance, Accessibility, Best Practices.
- **CI/CD propio**: deploy independiente por servicio en k3s personal.

## No objetivos

- No es un blog.
- No remplaza LinkedIn — es complementario.
- El panel admin no es público — acceso solo por credenciales.

## Valor diferencial

- **Chat IA contextual**: responde solo con base en el CV real; no inventa ni alucina.
- **Lead capture integrado**: cada pregunta queda registrada con datos de contacto.
- **Revisión humana del loop IA**: las respuestas se califican y pueden ajustarse para mejorar el RAG.
- **Prompt editable sin redeploy**: el comportamiento de la IA se ajusta desde el panel admin en tiempo real.
- **Control total**: código propio, dominio propio, infraestructura propia (k3s).
- **Velocidad**: HTML estático + nginx alpine; la IA es asíncrona via WebSocket + MQTT.
- **Imagen Python estática**: la dependencia pesada (FAISS + sentence-transformers) no bloquea el deploy.

## Flujo de valor

```
Visitante → Chat → Backend-IA (RAG + Groq) → Respuesta contextual
                                ↓
                         SQLite (interacción registrada con datos de contacto)
                                ↓
                    Panel Admin → Raúl revisa, califica, corrige
                                ↓
                    Respuestas aprobadas → FAISS reindexado → mejor RAG
```
