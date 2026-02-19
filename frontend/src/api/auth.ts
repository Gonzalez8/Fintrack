import client from './client'
import type { User } from '@/types'

export const authApi = {
  getCsrf: () => client.get('/auth/login/'),
  login: (username: string, password: string) =>
    client.post<User>('/auth/login/', { username, password }),
  logout: () => client.post('/auth/logout/'),
  me: () => client.get<User>('/auth/me/'),
}
