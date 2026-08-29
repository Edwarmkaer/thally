import { auth } from "@clerk/nextjs/server"

import { ThallyWorkspace } from "@/components/thally-workspace"

// Check por recurso, no por matcher en el proxy: es el patrón vigente de Clerk.
export default async function WorkspacePage() {
  await auth.protect()
  return <ThallyWorkspace />
}
