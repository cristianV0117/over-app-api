import { PassportStrategy } from "@nestjs/passport";
import { Injectable } from "@nestjs/common";
import { Strategy, Profile } from "passport-google-oauth20";

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, "google") {
  constructor() {
    super({
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: `${process.env.BACKEND_URL}/auth/google/callback`,
      scope: ["email", "profile"],
    });
  }

  authorizationParams(): Record<string, string> {
    return {
      prompt: "select_account",
    };
  }

  validate(accessToken: string, refreshToken: string, profile: Profile) {
    return {
      email: profile.emails?.[0].value,
      name: profile.displayName,
      provider: "google",
    };
  }
}
