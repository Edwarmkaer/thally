"use client"

import { useMemo } from "react"
import { Excalidraw, convertToExcalidrawElements } from "@excalidraw/excalidraw"

import type { DiagramScene } from "@/components/diagram/scenes"

import "@excalidraw/excalidraw/index.css"

/**
 * Este módulo se carga con `next/dynamic({ ssr: false })` desde `diagram-panel`.
 * Está aislado a propósito: Excalidraw pesa y toca `window` al importarse, así que no
 * debe entrar al bundle inicial ni ejecutarse en el servidor.
 */
export default function ExcalidrawScene({ scene }: { scene: DiagramScene }) {
  // convertToExcalidrawElements asigna ids y resuelve los bindings de las flechas.
  // Depende de la escena, no del render, así que se memoiza para no rehacerlo al repintar.
  const elements = useMemo(() => convertToExcalidrawElements(scene.elements), [scene])

  return (
    <Excalidraw
      // key fuerza el remonte al cambiar de escena: initialData solo se lee al montar.
      key={scene.id}
      initialData={{
        elements,
        appState: { viewBackgroundColor: "#ffffff" },
        scrollToContent: true,
      }}
      UIOptions={{
        canvasActions: {
          toggleTheme: false,
          loadScene: false,
          saveToActiveFile: false,
        },
      }}
    />
  )
}
