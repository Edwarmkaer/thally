"use client"

import { useRef, useState } from "react"
import { useAction, useMutation } from "convex/react"
import { makeFunctionReference } from "convex/server"
import { Plus, Upload, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

type State = { kind: "idle" } | { kind: "working"; label: string } | { kind: "error"; message: string }

/**
 * Vive dentro de la barra de la ventana de video y arranca colapsado: es un control
 * secundario y no debe robarle espacio ni proporción al contenido.
 */
export function IngestSource() {
  // makeFunctionReference en vez de `api.ingest.*`: las funciones de convex/ingest.ts
  // todavía no están en los tipos generados (hace falta un deploy de Convex para eso).
  // Es la API oficial para referenciar una función por nombre; al desplegar, funciona igual.
  const generateUploadUrl = useMutation(
    makeFunctionReference<"mutation", Record<string, never>, string>("ingest:generateUploadUrl"),
  )
  const fromUrl = useAction(
    makeFunctionReference<"action", { url: string; title?: string }, unknown>("ingest:transcribeFromUrl"),
  )
  const fromStorage = useAction(
    makeFunctionReference<"action", { storageId: string; title?: string }, unknown>("ingest:transcribeFromStorage"),
  )

  const [open, setOpen] = useState(false)
  const [url, setUrl] = useState("")
  const [state, setState] = useState<State>({ kind: "idle" })
  const fileInput = useRef<HTMLInputElement>(null)

  const busy = state.kind === "working"

  const fail = (error: unknown) =>
    setState({ kind: "error", message: error instanceof Error ? error.message : "Falló la transcripción" })

  const submitUrl = async () => {
    if (url.trim() === "" || busy) return
    setState({ kind: "working", label: "Transcribiendo…" })
    try {
      await fromUrl({ url: url.trim() })
      setUrl("")
      setOpen(false)
      setState({ kind: "idle" })
    } catch (error) { fail(error) }
  }

  const submitFile = async (file: File) => {
    setState({ kind: "working", label: "Subiendo…" })
    try {
      const uploadUrl = await generateUploadUrl()
      const uploaded = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      })
      if (!uploaded.ok) throw new Error("no se pudo subir el archivo")
      const { storageId } = (await uploaded.json()) as { storageId: string }

      setState({ kind: "working", label: "Transcribiendo…" })
      await fromStorage({ storageId, title: file.name })
      setOpen(false)
      setState({ kind: "idle" })
    } catch (error) { fail(error) }
  }

  if (!open) {
    return (
      <div className="ingest-collapsed">
        {state.kind === "working" ? <small className="ingest-status">{state.label}</small> : null}
        {state.kind === "error" ? <small className="ingest-error">{state.message}</small> : null}
        <Button
          size="xs"
          variant="ghost"
          onClick={() => { setState({ kind: "idle" }); setOpen(true) }}
          aria-label="Cargar contenido para transcribir"
        >
          <Plus aria-hidden="true" /> Fuente
        </Button>
      </div>
    )
  }

  return (
    <div className="ingest-open">
      <Input
        autoFocus
        value={url}
        onChange={(event) => setUrl(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") void submitUrl()
          if (event.key === "Escape") setOpen(false)
        }}
        placeholder="URL de audio o video"
        aria-label="URL del contenido"
        disabled={busy}
      />
      <Button size="xs" onClick={() => void submitUrl()} disabled={busy || url.trim() === ""}>
        Transcribir
      </Button>
      <Button size="icon-xs" variant="ghost" onClick={() => fileInput.current?.click()} disabled={busy} aria-label="Subir archivo">
        <Upload aria-hidden="true" />
      </Button>
      <Button size="icon-xs" variant="ghost" onClick={() => setOpen(false)} aria-label="Cerrar">
        <X aria-hidden="true" />
      </Button>
      <input
        ref={fileInput}
        type="file"
        accept="audio/*,video/*"
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0]
          event.target.value = ""
          if (file) void submitFile(file)
        }}
      />
    </div>
  )
}
