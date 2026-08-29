# thally — vault

Vault de Obsidian de **thally**: incidentes, PRDs, decisiones, wiki técnica y notas por cliente.
Misma estructura y convenciones que el vault de RQE, para que los comandos de Claude Code
funcionen igual.

## Setup

```bash
git clone https://github.com/harold18m/thally.git ~/Projects/thally
```

Abrir en Obsidian: **Open folder as vault** → seleccionar `thally/`.

## Cómo se usa

Se escribe en el momento en que pasa algo, no por ritual de calendario:

| Cuándo | Comando | Dónde cae |
|---|---|---|
| Llega algo (idea, reunión, mensaje) | `/pendiente` | `tasks/inbox/harold.md` |
| Se resolvió un bug de prod | `/doc-incidente` | `incidents/` |
| Se define una feature | `/doc-prd` | `prds/` |
| Se toma una decisión de arquitectura | `/doc-adr` | `decisions/` |
| Cambia algo de un cliente | `/doc-cliente` | `clients/` |

> Los comandos `doc-*` apuntan hoy al vault de RQE. Para usarlos aquí hay que duplicarlos con
> esta ruta, o pasarles el destino a mano.

Para consultar no se navegan carpetas: se abren las **bases** (`PRDs.base`, `Decisiones.base`,
`Incidentes.base`, `Clientes.base`, `Wiki.base`), que se generan solas desde el frontmatter.

## Enums (respetarlos o la nota se cae de las vistas)

- PRD `status`: `draft` · `in_progress` · `staging` · `shipped` · `paused` — `priority`: `P0`–`P3`
- ADR `status`: `vigente` · `propuesta` · `superseded`
- Incidente `severity`: `critica` · `alta` · `media` · `baja`

El matiz que no cabe en una palabra va en `status_detail` / `severity_detail`, nunca en el enum.
Los wikilinks de `related` van entre comillas: `related: ["[[12_x]]"]`.

## Estructura

```
prds/  decisions/  incidents/  clients/  wiki/  arquitectura/  log/  tasks/inbox/  attachments/
.obsidian/templates/   ← plantillas prd, adr, incident, client, wiki, daily, weekly, log
```
