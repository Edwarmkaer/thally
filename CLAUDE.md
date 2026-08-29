# thally

Monolito: app Next.js en la raíz, vault de Obsidian en `obsidian/`.

## Ops — cómo entra un cambio

- **Documentación** (`obsidian/**`, `*.md` de la raíz): **push directo a `main`**. Sin PR, sin
  rama. Commit descriptivo y listo.
- **Features y todo lo demás** (`app/**`, config, deps, `package.json`): **PR a `main`**.
  Rama `feat/<slug>` o `fix/<slug>`, PR aunque sea de una línea.
- Nunca mezclar los dos en un mismo commit: si un PR de feature necesita doc, la doc va aparte
  en su push a main.

## Stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind 4 · bun.

```bash
bun dev      bun run build      bun run lint
```

## Vault

`obsidian/` es el brain del proyecto: PRDs, decisiones (ADR), incidentes, clientes y wiki.
Los enums de frontmatter son estrictos — si una nota usa otro valor se cae de las vistas `.base`.
Ver `obsidian/README.md` antes de crear notas.

## Equipo

**Dueño por vertical, no por capa.** Cada quien es dueño de un camino completo en vez de "el del
backend" y "el del frontend". Así dos personas casi nunca tocan el mismo archivo. Somos cinco:

- **Valeria** — ingesta del contenido hablado: transcripción en vivo con ElevenLabs.
- **Harold** — verificación y evidencia: `convex/schema.ts`, `claims`, las fuentes.
- **Miguel** — el acompañante: frontend.
- **Francisco** — uso validado: usuarios reales usando thally hoy, y la data que lo demuestre.
- **Edward** — deploy público y entrega: submit, ficha en Vibe Apps, pitch.

**Los dos criterios que no son código también tienen dueño.** La rúbrica da 25% a uso validado
("usuario concreto, problema real y data recogida hoy") y 10% al pitch, 3 minutos para contarlo
y 3 para defenderlo. Sin dueño se hacen a las 19:40, y se hacen mal.

**La costura entre ingesta y verificación se acuerda, no se improvisa.** La transcripción en vivo
entrega texto parcial que todavía se corrige solo; una afirmación creada sobre texto no confirmado
produce claims duplicadas y citas mal recortadas. Quién decide que un fragmento está listo para
`claims.add` —y con qué criterio— es decisión de modelo: va como ADR en `obsidian/decisions/`.

**`convex/schema.ts` tiene un solo dueño.** Es el único archivo donde todos chocan. Cambiar el
schema se avisa antes de abrir el PR, y los campos nuevos entran como `v.optional(...)`: los
documentos que ya existen en el deployment no se migran solos.

**PRs chicos, merge rápido.** CI verde es el único gate — no hay review formal ni aprobación
obligatoria. Si un PR lleva más de un par de horas de trabajo, se parte en dos.

**`main` siempre desplegable.** Ramas cortas, nada de ramas largas de días.

**Requisito de entrega, no criterio de rúbrica:** el proyecto usa Convex (ya cumplido) y **se
registra en Vibe Apps antes del cierre**. El submit en `vibeapps.dev/submit` pide título,
tagline, **link a la app funcionando** y nombre; pide cuenta, así que se crea antes. El tag
**`thenextcrafthackathon`** está oculto —solo sale al escribir "craft" en el buscador de tags— y
es lo que amarra el submit al evento. Sin él se publica en el directorio general y el organizador
no tiene cómo encontrarnos.

**Quién destraba qué** (mientras siga pendiente):
- Edward — deploy público del frontend. No es infra opcional: es el "App Website Link"
  obligatorio del submit, así que bloquea el requisito de entrega.
- Harold — `convex login` para generar `convex/_generated/` y dejar el CI verde.
- Soltado a propósito: el deployment de **producción** de Convex. El deployment dev alcanza para
  demostrar y no da puntos; se retoma después del evento.

**Qué se documenta durante la hackathon:** solo las decisiones que cambian el modelo, como ADR en
`obsidian/decisions/`. El resto se conversa y se sigue.
