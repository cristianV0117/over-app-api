export interface JwtPayload {
  id: string;
  email: string;
  name: string;
  role: "admin" | "user";
  /** Presente cuando un admin está viendo la app como otro usuario (claim JWT `imp`). */
  impersonatorId?: string;
}
