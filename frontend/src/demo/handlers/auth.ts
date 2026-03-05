import { http, HttpResponse } from 'msw'
import { store } from '../store'

const DEMO_USER = { id: 1, username: 'demo' }
const DEMO_ACCESS_TOKEN = 'demo-access-token'

export const authHandlers = [
  // JWT login (primary endpoint used by the SPA)
  http.post('/api/auth/token/', () => {
    store.isLoggedIn = true
    return HttpResponse.json(
      { access: DEMO_ACCESS_TOKEN, user: DEMO_USER },
      { status: 200 },
    )
  }),

  // JWT refresh (called on page load to restore session from cookie)
  http.post('/api/auth/token/refresh/', () => {
    if (store.isLoggedIn) {
      return HttpResponse.json({ access: DEMO_ACCESS_TOKEN })
    }
    return new HttpResponse(null, { status: 401 })
  }),

  // Logout (blacklist refresh token + clear cookie — demo just resets state)
  http.post('/api/auth/logout/', () => {
    store.isLoggedIn = false
    return new HttpResponse(null, { status: 200 })
  }),

  // Current user
  http.get('/api/auth/me/', () => {
    if (store.isLoggedIn) {
      return HttpResponse.json(DEMO_USER)
    }
    return new HttpResponse(null, { status: 401 })
  }),

  // Legacy session login (kept for compatibility with /admin/ flow in tests)
  http.get('/api/auth/login/', () => {
    return new HttpResponse(null, { status: 200 })
  }),
  http.post('/api/auth/login/', () => {
    store.isLoggedIn = true
    return HttpResponse.json(DEMO_USER, { status: 200 })
  }),
]
