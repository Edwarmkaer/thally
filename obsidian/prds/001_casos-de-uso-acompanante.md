---
type: prd
number: 1
status: draft
priority: P0
domain: producto
owner: Harold
created: 2026-08-29
updated: 2026-08-29
related: []
tags: [type/prd]
---

# PRD 001: Casos de uso del Acompañante

## Problema

El contenido hablado en vivo produce afirmaciones más rápido de lo que alguien puede
contrastarlas. Quien tiene que decidir qué hacer con lo que se dijo —publicar, repreguntar,
matizar— no tiene la evidencia a mano en el momento en que la necesita, y cuando la consigue
la decisión ya se tomó.

El equipo está construyendo sin un caso de uso fijado: `PRODUCT.md` y `CONTEXT.md` definen el
lenguaje y los principios, pero no dicen **sobre qué contenido** corre la primera versión ni
**qué se muestra en la demo**.

## Objetivo

Pasar de una afirmación escuchada a evidencia consultable con mínima fricción, sin interrumpir
el contenido. Fijar un caso de uso primario y un guion de demo que no dependa de condiciones
del momento.

## Solucion propuesta

**Caso de uso primario: rueda de prensa o debate transmitido.** Es el caso que la documentación
ya describe sin nombrarlo: `CONTEXT.md` define verificación como lo que "ayuda a tomar una
decisión editorial". Las afirmaciones son factuales y concretas, las fuentes son públicas y
contrastables, y la urgencia es real.

**Caso secundario: clase o conferencia.** `CONTEXT.md` lo nombra explícitamente en la definición
de *Acompañante*. Aquí el peso cae sobre Thaily: la duda se resuelve sin interrumpir el contenido.

**Demo sobre clip pregrabado.** `CONTEXT.md` admite contenido que sucede "o se reproduce". La demo
reproduce un clip corto como sesión en vivo: mismo audio, mismas afirmaciones, mismo resultado en
cada corrida. El producto que se muestra es idéntico; lo que se elimina es la dependencia del wifi
del venue, de que alguien hable a tiempo y de que la transcripción acierte en el momento.

## Alcance

### In scope

- Sesión en vivo y afirmaciones con verificación — schema ya mergeado (`convex/schema.ts`:
  `sessions`, `claims`, con `needs_context` y `verification`).
- Transcripción del contenido hablado en tiempo real.
- Detección de afirmaciones verificables y marcado de las que necesitan contexto.
- Verificación con fuentes consultables, presentada como evaluación provisional.
- Chat con Thaily sobre el contenido y su transcripción.
- Una sola vista general, según `PRODUCT.md`.

### Out of scope

- **Reuniones de trabajo y llamadas de ventas.** Parece que amplían el mercado, pero sus
  afirmaciones ("lo entregamos en marzo") no se contrastan con fuentes públicas, que es el core
  del producto. Descartado a propósito, no por falta de tiempo.
- Herramientas especializadas por tipo de cliente — `PRODUCT.md` ya las deja fuera.
- Thaily respondiendo por voz, telefonía y salas multi-participante remotas: ninguna es necesaria
  para los casos primario y secundario.

## Plan de implementacion

1. Audio del micrófono o del clip → transcripción en streaming.
2. Transcripción → detección de afirmaciones → `claims.add`.
3. Afirmación → búsqueda de evidencia → `claims.recordVerification`.
4. Vista única: contenido, transcripción, afirmaciones y Thaily.

> [!info] Pendiente de definir
> - Proveedor de transcripción en streaming.
> - Si Thaily responde solo por texto o también por voz. Hoy nada en la documentación exige voz.
> - Qué clip se usa en la demo.

## Metricas de exito

- Una afirmación pasa de dicha a evidencia visible mientras el contenido sigue corriendo.
- La mayoría de las afirmaciones detectadas termina con fuente adjunta o marcada como
  *necesita contexto*; ninguna queda colgada en `pending`.
- La demo corre tres veces seguidas con el mismo resultado.

## Riesgos

- **Detección de más.** Marcar opiniones o predicciones como afirmaciones verificables rompe la
  confianza más rápido que no detectar nada.
- **Verificación que suena a veredicto.** `CONTEXT.md` es explícito: evaluación provisional, no
  verdad. El copy y la UI tienen que sostenerlo.
- **Latencia acumulada.** Transcripción, detección y búsqueda en cadena; si el total supera el
  ritmo del habla, el acompañante llega tarde y deja de acompañar.
- **Documentación dispersa.** `PRODUCT.md` y `CONTEXT.md` viven en `origin/frontend/thaily-agent`,
  no en `main`.

> [!info] Falta la rúbrica de la hackathon
> Este PRD se escribió sin los criterios de puntuación ni la fecha límite. Con la rúbrica en mano
> hay que revisar el alcance y las métricas.
