import { Injectable } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || "secretKey",
    });
  }

  validate(payload: {
    sub: string;
    email?: string;
    name?: string;
    role?: string;
    imp?: string;
  }) {
    return {
      id: payload.sub,
      email: payload.email ?? "",
      name: payload.name ?? "",
      role: (payload.role === "admin" ? "admin" : "user") as "admin" | "user",
      impersonatorId: typeof payload.imp === "string" ? payload.imp : undefined,
    };
  }
}
