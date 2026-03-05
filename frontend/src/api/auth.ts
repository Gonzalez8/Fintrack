import client from './client'
import type { User } from '@/types'

interface JWTLoginResponse {
  access: string
  user: User
}

interface JWTRefreshResponse {
  access: string
}

export const authApi = {
  // JWT auth (primary for SPA)
  tokenLogin: (username: string, password: string) =>
    client.post<JWTLoginResponse>('/auth/token/', { username, password }),

  tokenRefresh: () =>
    client.post<JWTRefreshResponse>('/auth/token/refresh/'),

  logout: () => client.post('/auth/logout/'),
  me: () => client.get<User>('/auth/me/'),
}
