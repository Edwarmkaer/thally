import type { ExcalidrawElementSkeleton } from "@excalidraw/excalidraw/data/transform"

/**
 * Esquemas de ejemplo fijos.
 *
 * Están escritos como "skeletons": la forma reducida que `convertToExcalidrawElements`
 * expande a elementos completos (ids, seeds, bindings de flechas). Es el mismo formato
 * intermedio que produce el MCP de Excalidraw, así que un esquema diseñado ahí se puede
 * pegar aquí sin traducción.
 *
 * El contenido deriva de la transcripción y los claims simulados de la sesión: el objetivo
 * es que el esquema se lea como si lo hubiera construido el agente a partir de lo dicho.
 */

export type DiagramScene = {
  id: string
  title: string
  caption: string
  /** Alternativa textual del esquema. El canvas no es accesible por lector de pantalla. */
  outline: string[]
  elements: ExcalidrawElementSkeleton[]
}

const ZONE = { backgroundColor: "#e9ecef", strokeColor: "#868e96", fillStyle: "solid", strokeStyle: "dashed", roughness: 0, opacity: 40 } as const
const STEP = { width: 180, height: 90, fillStyle: "solid", roughness: 0, strokeWidth: 2 } as const

const pipeline: ExcalidrawElementSkeleton[] = [
  // Zonas de fondo primero: el orden del array es el orden de pintado.
  { type: "rectangle", x: 30, y: 140, width: 530, height: 190, ...ZONE },
  { type: "rectangle", x: 590, y: 140, width: 530, height: 190, ...ZONE },
  { type: "rectangle", x: 1150, y: 140, width: 240, height: 190, ...ZONE },

  { type: "text", x: 46, y: 152, text: "Ingesta", fontSize: 16, strokeColor: "#868e96", fontFamily: 2 },
  { type: "text", x: 606, y: 152, text: "Verificación en vivo", fontSize: 16, strokeColor: "#868e96", fontFamily: 2 },
  { type: "text", x: 1166, y: 152, text: "Acompañante", fontSize: 16, strokeColor: "#868e96", fontFamily: 2 },

  {
    type: "rectangle", id: "audio", x: 60, y: 190, ...STEP,
    strokeColor: "#1971c2", backgroundColor: "#a5d8ff",
    label: { text: "Audio en vivo", fontSize: 16, strokeColor: "#1e1e1e", fontFamily: 2 },
  },
  {
    type: "rectangle", id: "scribe", x: 340, y: 190, ...STEP,
    strokeColor: "#9c36b5", backgroundColor: "#eebefa",
    label: { text: "Transcripción", fontSize: 16, strokeColor: "#1e1e1e", fontFamily: 2 },
  },
  {
    type: "rectangle", id: "claims", x: 620, y: 190, ...STEP,
    strokeColor: "#e8590c", backgroundColor: "#ffd8a8",
    label: { text: "Afirmaciones", fontSize: 16, strokeColor: "#1e1e1e", fontFamily: 2 },
  },
  {
    type: "rectangle", id: "verify", x: 900, y: 190, ...STEP,
    strokeColor: "#2f9e44", backgroundColor: "#b2f2bb",
    label: { text: "Verificación", fontSize: 16, strokeColor: "#1e1e1e", fontFamily: 2 },
  },
  {
    type: "rectangle", id: "thaily", x: 1180, y: 190, ...STEP,
    strokeColor: "#1971c2", backgroundColor: "#a5d8ff",
    label: { text: "Thaily", fontSize: 16, strokeColor: "#1e1e1e", fontFamily: 2 },
  },
  {
    type: "rectangle", id: "store", x: 760, y: 420, width: 180, height: 80,
    fillStyle: "solid", roughness: 0, strokeWidth: 2,
    strokeColor: "#0c8599", backgroundColor: "#99e9f2",
    label: { text: "Evidencia", fontSize: 16, strokeColor: "#1e1e1e", fontFamily: 2 },
  },

  { type: "arrow", x: 250, y: 235, strokeColor: "#1e1e1e", roughness: 0, start: { id: "audio" }, end: { id: "scribe" } },
  { type: "arrow", x: 530, y: 235, strokeColor: "#1e1e1e", roughness: 0, start: { id: "scribe" }, end: { id: "claims" } },
  { type: "arrow", x: 810, y: 235, strokeColor: "#1e1e1e", roughness: 0, start: { id: "claims" }, end: { id: "verify" } },
  { type: "arrow", x: 1090, y: 235, strokeColor: "#1e1e1e", roughness: 0, start: { id: "verify" }, end: { id: "thaily" } },
  {
    type: "arrow", x: 850, y: 300, strokeColor: "#0c8599", roughness: 0, strokeStyle: "dashed",
    start: { id: "verify" }, end: { id: "store" },
  },
  {
    type: "arrow", x: 850, y: 400, strokeColor: "#0c8599", roughness: 0, strokeStyle: "dashed",
    start: { id: "store" }, end: { id: "thaily" },
  },
]

const claimMap: ExcalidrawElementSkeleton[] = [
  {
    type: "rectangle", id: "session", x: 60, y: 240, width: 200, height: 90,
    fillStyle: "solid", roughness: 0, strokeWidth: 2,
    strokeColor: "#1971c2", backgroundColor: "#a5d8ff",
    label: { text: "Sesión 00:34", fontSize: 16, strokeColor: "#1e1e1e", fontFamily: 2 },
  },
  {
    type: "rectangle", id: "c1", x: 480, y: 80, width: 300, height: 90,
    fillStyle: "solid", roughness: 0, strokeWidth: 2,
    strokeColor: "#e8590c", backgroundColor: "#ffd8a8",
    label: { text: "Costos de agentes de voz\nVerificando", fontSize: 15, strokeColor: "#1e1e1e", fontFamily: 2 },
  },
  {
    type: "rectangle", id: "c2", x: 480, y: 240, width: 300, height: 90,
    fillStyle: "solid", roughness: 0, strokeWidth: 2,
    strokeColor: "#1971c2", backgroundColor: "#a5d8ff",
    label: { text: "ElevenLabs Scribe v2\n2 fuentes", fontSize: 15, strokeColor: "#1e1e1e", fontFamily: 2 },
  },
  {
    type: "rectangle", id: "c3", x: 480, y: 400, width: 300, height: 90,
    fillStyle: "solid", roughness: 0, strokeWidth: 2,
    strokeColor: "#2f9e44", backgroundColor: "#b2f2bb",
    label: { text: "Convex\nVerificado", fontSize: 15, strokeColor: "#1e1e1e", fontFamily: 2 },
  },

  { type: "arrow", x: 270, y: 270, strokeColor: "#1e1e1e", roughness: 0, start: { id: "session" }, end: { id: "c1" } },
  { type: "arrow", x: 270, y: 285, strokeColor: "#1e1e1e", roughness: 0, start: { id: "session" }, end: { id: "c2" } },
  { type: "arrow", x: 270, y: 300, strokeColor: "#1e1e1e", roughness: 0, start: { id: "session" }, end: { id: "c3" } },
]

export const scenes: DiagramScene[] = [
  {
    id: "pipeline",
    title: "Flujo del agente de voz",
    caption: "Construido a partir de la transcripción · 00:15 – 00:34",
    outline: [
      "Ingesta: el audio en vivo pasa a transcripción.",
      "Verificación en vivo: de la transcripción salen afirmaciones, que pasan a verificación.",
      "La verificación guarda y consulta evidencia.",
      "Acompañante: Thaily responde apoyándose en esa evidencia.",
    ],
    elements: pipeline,
  },
  {
    id: "claims",
    title: "Mapa de afirmaciones",
    caption: "Tres afirmaciones detectadas y su estado",
    outline: [
      "La sesión del minuto 00:34 desprende tres afirmaciones.",
      "Costos de agentes de voz: verificando.",
      "ElevenLabs Scribe v2: dos fuentes encontradas.",
      "Convex: verificado.",
    ],
    elements: claimMap,
  },
]
