import { clerkMiddleware } from "@clerk/nextjs/server"

// Next.js 16 renombró middleware.ts a proxy.ts.
// Sin createRouteMatcher: está deprecado en Clerk Core 3 porque el match por path
// puede divergir del routing real de Next y dejar recursos protegidos alcanzables.
// La protección vive en cada recurso — ver app/workspace/page.tsx.
export default clerkMiddleware()

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
}
