export interface JwtPayload {
  jti: string;
  nombreUsuario: string;
  sub: string;
  rol: string;
  iat: number;
  exp: number;
  permissions: string[];
}
