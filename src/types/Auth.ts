export interface LoginResponse {
  accessToken: string
  expiresIn: string
  tokenType: string
  refreshToken: string
  refreshExpiresIn: string
}

export interface UserInfo {
  userId: string
  email: string
  name: string
  roles: string[]
}
