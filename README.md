# thally

Monolito: la app **Next.js** y el **vault de Obsidian** viven en el mismo repo.

```
app/         Next.js 16 (App Router, TypeScript, Tailwind 4)
public/      estáticos
obsidian/    vault de Obsidian — PRDs, decisiones, incidentes, clientes, wiki
```

## Correr

```bash
bun install
bun dev          # http://localhost:3000
bun run build
bun run lint
```

## Vault

Abrir en Obsidian: **Open folder as vault** → seleccionar `obsidian/`.
Convenciones, enums y plantillas: [obsidian/README.md](obsidian/README.md).

## Ops

| Cambio | Cómo entra |
|---|---|
| Documentación (`obsidian/`, `*.md`) | push directo a `main` |
| Features y cualquier cosa bajo `app/`, config o deps | PR a `main` |

Detalle en [CLAUDE.md](CLAUDE.md).
