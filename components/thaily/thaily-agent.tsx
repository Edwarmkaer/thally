"use client"

import { useEffect, useId, useRef, useState } from "react"
import { useReducedMotion } from "motion/react"

import { NOTIF_BLUE, type DotRender } from "@/src/vendor/bloub/decor"
import { BotEngine, type BotFrame } from "@/src/vendor/bloub/engine"
import { EXPRESSION_BY_ID } from "@/src/vendor/bloub/expressions"
import type { StateId } from "@/src/vendor/bloub/states"

export type ThailyStatus =
  | "idle"
  | "listening"
  | "thinking"
  | "answering"
  | "success"
  | "error"

type ThailyAgentProps = {
  status?: ThailyStatus
  size?: number
  className?: string
}

const RADIUS = 100
const VIEWBOX_HALF = 158
const IDLE_EXPRESSIONS = ["attentif", "curieux", "heureux", "neutre"] as const

const stateByStatus: Record<ThailyStatus, StateId> = {
  idle: "idle",
  listening: "idle",
  thinking: "thinking",
  answering: "notify",
  success: "wink",
  error: "alert",
}

const statusLabel: Record<ThailyStatus, string> = {
  idle: "Thaily está disponible",
  listening: "Thaily está escuchando",
  thinking: "Thaily está revisando el contexto",
  answering: "Thaily está respondiendo",
  success: "Thaily terminó de responder",
  error: "Thaily necesita atención",
}

function Dot({ dot }: { dot: DotRender }) {
  const common = {
    fill: dot.color ?? "currentColor",
    opacity: dot.opacity,
  }

  if (dot.d) {
    return (
      <path
        {...common}
        d={dot.d}
        transform={`translate(${dot.x} ${dot.y}) rotate(${dot.rot ?? 0}) scale(${RADIUS})`}
      />
    )
  }

  return <circle {...common} cx={dot.x} cy={dot.y} r={dot.r} />
}

/**
 * React renderer for the framework-independent Bloub engine.
 * Upstream: https://github.com/jeremy-prt/bloub (MIT; see src/vendor/bloub/LICENSE).
 */
export function ThailyAgent({
  status = "idle",
  size = 176,
  className,
}: ThailyAgentProps) {
  const reduceMotion = useReducedMotion()
  const rawId = useId()
  const uid = rawId.replace(/[^a-zA-Z0-9_-]/g, "")
  const maskId = `thaily-mask-${uid}`
  const clockRef = useRef(0)
  const [engine] = useState(() => new BotEngine(RADIUS, stateByStatus[status]))
  const [frame, setFrame] = useState<BotFrame>(() => engine.sample(0))

  useEffect(() => {
    engine.setState(stateByStatus[status], clockRef.current)
    const animationFrame = requestAnimationFrame(() => {
      setFrame(engine.sample(clockRef.current))
    })
    return () => cancelAnimationFrame(animationFrame)
  }, [engine, status])

  useEffect(() => {
    if (status === "listening") {
      const attentive = EXPRESSION_BY_ID.get("attentif")
      if (attentive) engine.setExpression(attentive, clockRef.current)
      return
    }

    if (status !== "idle") {
      engine.setExpression(null, clockRef.current)
      return
    }

    let expressionIndex = 0
    const showNextExpression = () => {
      const expression = EXPRESSION_BY_ID.get(IDLE_EXPRESSIONS[expressionIndex])
      if (expression) engine.setExpression(expression, clockRef.current)
      expressionIndex = (expressionIndex + 1) % IDLE_EXPRESSIONS.length
    }

    showNextExpression()
    if (reduceMotion) return

    const interval = window.setInterval(showNextExpression, 2200)
    return () => window.clearInterval(interval)
  }, [engine, reduceMotion, status])

  useEffect(() => {
    if (reduceMotion) {
      const animationFrame = requestAnimationFrame(() => {
        setFrame(engine.sample(clockRef.current + 0.8))
      })
      return () => cancelAnimationFrame(animationFrame)
    }

    let animationFrame = 0
    const startedAt = performance.now() - clockRef.current * 1000

    const tick = (now: number) => {
      clockRef.current = (now - startedAt) / 1000
      setFrame(engine.sample(clockRef.current))
      animationFrame = requestAnimationFrame(tick)
    }

    animationFrame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(animationFrame)
  }, [engine, reduceMotion])

  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox={`${-VIEWBOX_HALF} ${-VIEWBOX_HALF} ${VIEWBOX_HALF * 2} ${VIEWBOX_HALF * 2}`}
      role="img"
      aria-label={statusLabel[status]}
    >
      <defs>
        <mask
          id={maskId}
          maskUnits="userSpaceOnUse"
          x={-VIEWBOX_HALF}
          y={-VIEWBOX_HALF}
          width={VIEWBOX_HALF * 2}
          height={VIEWBOX_HALF * 2}
        >
          <path d={frame.bodyPath} fill="white" />
          {frame.eyes.map((eye, index) => (
            <path
              key={index}
              d={eye.d}
              transform={eye.matrix}
              opacity={eye.alpha}
              fill="black"
            />
          ))}
          {frame.notch ? (
            <circle cx={frame.notch.x} cy={frame.notch.y} r={frame.notch.r} fill="black" />
          ) : null}
        </mask>

        {frame.arcs.map((arc) => (
          <linearGradient
            id={`${uid}-${arc.id}`}
            key={arc.id}
            gradientUnits="userSpaceOnUse"
            x1={arc.grad.x1}
            y1={arc.grad.y1}
            x2={arc.grad.x2}
            y2={arc.grad.y2}
          >
            {arc.grad.stops.map((color, index) => (
              <stop
                key={color + index}
                offset={index / Math.max(1, arc.grad.stops.length - 1)}
                stopColor={color}
              />
            ))}
          </linearGradient>
        ))}
      </defs>

      <g fill="none" strokeLinecap="round">
        {frame.arcs.map((arc) => (
          <path
            key={`back-${arc.id}`}
            d={arc.back}
            stroke={`url(#${uid}-${arc.id})`}
            strokeWidth={arc.width}
            opacity={arc.opacity}
          />
        ))}
      </g>

      {frame.dotsBehind ? (
        <g>{frame.dots.map((dot, index) => <Dot key={index} dot={dot} />)}</g>
      ) : null}

      <g opacity={frame.bodyAlpha}>
        <path d={frame.bodyPath} fill="var(--thaily-eye-surface)" />
        <g mask={`url(#${maskId})`}>
          <rect
            x={-VIEWBOX_HALF}
            y={-VIEWBOX_HALF}
            width={VIEWBOX_HALF * 2}
            height={VIEWBOX_HALF * 2}
            fill="currentColor"
          />
        </g>
      </g>

      {!frame.dotsBehind ? (
        <g>{frame.dots.map((dot, index) => <Dot key={index} dot={dot} />)}</g>
      ) : null}

      {frame.notif ? (
        <circle cx={frame.notif.x} cy={frame.notif.y} r={frame.notif.r} fill={NOTIF_BLUE} />
      ) : null}

      <g fill="none" strokeLinecap="round">
        {frame.arcs.map((arc) => (
          <path
            key={`front-${arc.id}`}
            d={arc.front}
            stroke={`url(#${uid}-${arc.id})`}
            strokeWidth={arc.width}
            opacity={arc.opacity}
          />
        ))}
      </g>
    </svg>
  )
}
