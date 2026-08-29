import { Show, SignUpButton } from "@clerk/nextjs"
import Link from "next/link"
import { FileText, MessagesSquare, ShieldCheck } from "lucide-react"

import { LandingHero } from "@/components/site/landing-hero"
import { SiteNavbar } from "@/components/site/navbar"
import { Button } from "@/components/ui/button"
import { GridPattern } from "@/components/ui/grid-pattern"

const backgroundSquares: Array<[number, number]> = [
  [4, 4], [5, 1], [8, 2], [5, 3], [5, 5],
  [10, 10], [12, 15], [15, 10], [10, 15],
  [18, 4], [22, 12], [27, 6],
]

const capabilities = [
  {
    icon: FileText,
    title: "Transcripción",
    detail: "El contenido hablado se transcribe mientras sucede, sin pausarlo ni retrasarlo.",
  },
  {
    icon: ShieldCheck,
    title: "Verificación",
    detail: "Las afirmaciones verificables se contrastan con evidencia consultable.",
  },
  {
    icon: MessagesSquare,
    title: "Thaily",
    detail: "Un acompañante que responde tus dudas sobre lo que se acaba de decir.",
  },
]

export default function Home() {
  return (
    <>
      <SiteNavbar />

      <main className="landing-shell">
        <GridPattern squares={backgroundSquares} className="landing-pattern" />

        <section className="landing-hero">
          <div className="hero-copy">
            <p className="hero-kicker"><i /> Verificación en vivo</p>
            <h1>Del dicho a la evidencia, mientras todavía se está hablando.</h1>
            <p className="hero-lead">
              Thally acompaña reuniones, clases y transmisiones: transcribe lo que se dice,
              detecta las afirmaciones que se pueden contrastar y te deja preguntar sobre
              ellas sin abandonar el contenido.
            </p>
            <div className="hero-actions">
              <Show when="signed-out">
                <SignUpButton mode="modal">
                  <Button size="lg">Empezar gratis</Button>
                </SignUpButton>
              </Show>
              <Show when="signed-in">
                <Button asChild size="lg">
                  <Link href="/workspace">Abrir workspace</Link>
                </Button>
              </Show>
            </div>
          </div>

          <LandingHero />
        </section>

        <section className="landing-capabilities" aria-label="Qué hace Thally">
          {capabilities.map(({ icon: Icon, title, detail }) => (
            <article key={title}>
              <Icon aria-hidden="true" />
              <h2>{title}</h2>
              <p>{detail}</p>
            </article>
          ))}
        </section>
      </main>
    </>
  )
}
