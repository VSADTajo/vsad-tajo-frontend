import { api } from './api'
import type { LoginResponse } from '@/types/Auth'

export async function loginService(email: string, password: string): Promise<LoginResponse> {
  console.log('API URL runtime:', import.meta.env.VITE_API_URL)

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

  localStorage.setItem('token', res.accessToken)
  localStorage.setItem('email', email)

  return res
}

export function isAuthenticated(): boolean {
  return !!localStorage.getItem('token')
}
