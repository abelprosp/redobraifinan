import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token
    const { pathname } = req.nextUrl

    // Se está na área do dashboard e não tem companyId
    if (pathname.startsWith("/dashboard") && !token?.companyId) {
      // Permitir acesso mas pode limitar funcionalidades
      // return NextResponse.redirect(new URL("/setup-company", req.url))
    }

    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl

        // Páginas públicas
        const publicPaths = ["/", "/login", "/register", "/api/auth"]
        
        if (publicPaths.some(path => pathname.startsWith(path))) {
          return true
        }

        // Rotas protegidas requerem token
        return !!token
      },
    },
  }
)

// ============================================================================
// ROTAS QUE REQUEREM AUTENTICAÇÃO
// ============================================================================
// Nota: As seguintes rotas são PÚBLICAS e NÃO estão no matcher:
// - /api/webhook/*      → Webhook público para consulta de boletos
// - /api/cron/*         → Cron jobs (protegidos por CRON_SECRET)
// - /api/auth/*         → Autenticação NextAuth
// ============================================================================

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/api/boletos/:path*",
    "/api/clientes/:path*",
    "/api/contas/:path*",
    "/api/transacoes/:path*",
    "/api/integracoes/:path*",
    "/api/sicredi/:path*",
    "/api/dashboard/:path*",
  ],
}
