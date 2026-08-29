import { ThallyWorkspace } from "@/components/thally-workspace"

// Abierto a propósito: la demo se muestra abriendo el enlace, y obligar a registrarse
// antes de ver la pantalla la mata. No hay datos por usuario todavía — la sesión en vivo
// es una sola y global, así que no hay nada que aislar. Cuando existan sesiones por
// cuenta, vuelve el `auth.protect()`.
export default function WorkspacePage() {
  return <ThallyWorkspace />
}
