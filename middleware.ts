import { NextRequest, NextResponse } from 'next/server'

const COOKIE_NAME = 'birtask_token'

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Always pass through Next.js internals and static files
  if (
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/icons/') ||
    pathname.startsWith('/images/')
  ) {
    return NextResponse.next()
  }

  // Always pass through all API routes
  if (pathname.startsWith('/api/')) {
    return NextResponse.next()
  }

  const token = req.cookies.get(COOKIE_NAME)?.value

  // Not authenticated → redirect to /login (except if already on /login)
  if (!token && pathname !== '/login') {
    const loginUrl = new URL('/login', req.url)
    return NextResponse.redirect(loginUrl)
  }

  // Authenticated → redirect away from /login to dashboard
  if (token && pathname === '/login') {
    const homeUrl = new URL('/', req.url)
    return NextResponse.redirect(homeUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
