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
