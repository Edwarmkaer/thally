import Link from "next/link"
import { Show, SignInButton, SignUpButton, UserButton } from "@clerk/nextjs"

import { Button } from "@/components/ui/button"

/**
 * Navbar único para landing y workspace.
 * Clerk Core 3 quitó <SignedIn>/<SignedOut>: el control de sesión es <Show when=...>.
 */
export function SiteNavbar() {
  return (
    <header className="app-navbar">
      <nav aria-label="Navegación principal">
        <Link href="/" className="brand-logo" aria-label="Thally, inicio">
          <span className="brand-wordmark">Thally</span>
        </Link>

        <div className="navbar-actions">
          <Show when="signed-out">
            <SignInButton mode="modal">
              <Button variant="ghost" size="sm">Login</Button>
            </SignInButton>
            <SignUpButton mode="modal">
              <Button size="sm">Sign up</Button>
            </SignUpButton>
          </Show>

          <Show when="signed-in">
            <Button asChild variant="ghost" size="sm">
              <Link href="/workspace">Workspace</Link>
            </Button>
            <UserButton />
          </Show>
        </div>
      </nav>
    </header>
  )
}
