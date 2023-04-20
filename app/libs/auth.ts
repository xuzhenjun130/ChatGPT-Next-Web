import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { SignJWT, jwtVerify } from "jose";

interface UserJwtPayload {
  jti: string;
  iat: number;
}

export class AuthError extends Error {}

/**
 * Verifies the user's JWT token and returns its payload if it's valid.
 */
export async function verifyAuth(req: NextRequest) {
  const token = req.cookies.get("user_token")?.value;

  if (!token) {
    return false;
  }

  try {
    const verified = await jwtVerify(
      token,
      new TextEncoder().encode(process.env.API_KEY),
    );
    return verified.payload as UserJwtPayload;
  } catch (err) {
    return false;
  }
}

/**
 * Adds the user token cookie to a response.
 */
export async function genToken(username: string) {
  return await new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setJti(username)
    .setIssuedAt()
    .setExpirationTime("24h")
    .sign(new TextEncoder().encode(process.env.API_KEY));
}
