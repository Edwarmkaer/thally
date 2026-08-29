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

**Dueño por vertical, no por capa.** Cada quien es dueño de un camino completo (ingesta del
contenido hablado · verificación y evidencia · acompañante) en vez de "el del backend" y "el del
frontend". Así dos personas casi nunca tocan el mismo archivo.

**`convex/schema.ts` tiene un solo dueño.** Es el único archivo donde todos chocan. Cambiar el
schema se avisa antes de abrir el PR, y los campos nuevos entran como `v.optional(...)`: los
documentos que ya existen en el deployment no se migran solos.

**PRs chicos, merge rápido.** CI verde es el único gate — no hay review formal ni aprobación
obligatoria. Si un PR lleva más de un par de horas de trabajo, se parte en dos.

**`main` siempre desplegable.** Ramas cortas, nada de ramas largas de días.

**Quién destraba qué** (mientras siga pendiente):
- Edward — instalar la GitHub App de Vercel en el repo para tener previews por PR.
- Francisco — deployment de producción de Convex + `CONVEX_DEPLOY_KEY`; hoy prod escribe en el
  deployment dev.
- Harold — proyecto de Vercel (`dropout-capital/thally`) y sus env vars.

**Qué se documenta durante la hackathon:** solo las decisiones que cambian el modelo, como ADR en
`obsidian/decisions/`. El resto se conversa y se sigue.
