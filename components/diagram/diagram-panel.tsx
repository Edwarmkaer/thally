"use client"

import { useState } from "react"
import dynamic from "next/dynamic"

import { scenes } from "@/components/diagram/scenes"
import { Button } from "@/components/ui/button"

const ExcalidrawScene = dynamic(() => import("@/components/diagram/excalidraw-scene"), {
  ssr: false,
  loading: () => <p className="diagram-loading">Preparando el lienzo…</p>,
})

export function DiagramPanel() {
  const [sceneId, setSceneId] = useState(scenes[0].id)
  const scene = scenes.find((item) => item.id === sceneId) ?? scenes[0]

  return (
    <div className="diagram-view">
      <div className="panel-heading">
        <div>
          <p className="panel-kicker">Esquema de la sesión</p>
          <h2>{scene.title}</h2>
        </div>
      </div>

      <div className="diagram-switch" role="group" aria-label="Elegir esquema">
        {scenes.map((item) => (
          <Button
            key={item.id}
            type="button"
            size="sm"
            variant={item.id === scene.id ? "default" : "ghost"}
            aria-pressed={item.id === scene.id}
            onClick={() => setSceneId(item.id)}
          >
            {item.title}
          </Button>
        ))}
      </div>

      <p className="diagram-caption">{scene.caption}</p>

      {/*
        El lienzo es un canvas: no lo lee un lector de pantalla. La lista de abajo es la
        alternativa textual equivalente, no un resumen decorativo (PRODUCT.md, WCAG 2.2 AA).
      */}
      <div className="diagram-canvas" role="img" aria-label={`${scene.title}. Descripción bajo el esquema.`}>
        <ExcalidrawScene scene={scene} />
      </div>

      <details className="diagram-outline">
        <summary>Descripción del esquema</summary>
        <ul>
          {scene.outline.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </details>
    </div>
  )
}
