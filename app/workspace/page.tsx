import { ThallyWorkspace } from "@/components/thally-workspace"

// La pantalla se suscribe a Convex, así que no se prerenderiza: en el build no hay
// NEXT_PUBLIC_CONVEX_URL, el provider no se monta y useQuery revienta al exportar.
export const dynamic = "force-dynamic"

// Abierta a propósito: la demo se muestra abriendo el enlace, y obligar a registrarse
// antes de ver la pantalla la mata. No hay datos por usuario todavía — la sesión en vivo
// es una sola y global. Cuando existan sesiones por cuenta, vuelve el `auth.protect()`.
export default function WorkspacePage() {
  return <ThallyWorkspace />
}
