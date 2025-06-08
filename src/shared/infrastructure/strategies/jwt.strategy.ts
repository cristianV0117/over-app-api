import { Injectable } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req) => {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-return
          return req?.cookies?.token;
        },
      ]),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || "secretKey",
    });
  }

  validate(payload: any) {
    return { id: payload.sub, email: payload.email, name: payload.name };
  }
}
