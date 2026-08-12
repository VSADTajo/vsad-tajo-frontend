import { api } from './api'
import type { LoginResponse, UserInfo } from '@/types/Auth'

export async function loginService(email: string, password: string): Promise<LoginResponse> {
  const res = await api
    .post('auth/login', {
      json: {
        email,
        password,
      },
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    })
    .json<LoginResponse>()

  localStorage.setItem('token', res.refreshToken)
  localStorage.setItem('email', email)

  await fetchCurrentUser()

  return res
}

export async function fetchCurrentUser(): Promise<UserInfo> {
  const user = await api.get('auth/me').json<UserInfo>()

  localStorage.setItem('roles', JSON.stringify(user.roles))

  return user
}

export function isAuthenticated(): boolean {
  return !!localStorage.getItem('token')
}

export function getRoles(): string[] {
  const roles = localStorage.getItem('roles')
  return roles ? JSON.parse(roles) : []
}

export function hasRole(role: string): boolean {
  return getRoles().includes(role)
}
