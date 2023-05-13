import { NextRequest, NextResponse } from "next/server";
import { SignJWT, jwtVerify } from "jose";

interface UserJwtPayload {
  jti: string;
  iat: number;
}
/**
 * Returns a Response object with a JSON body
 */
function htmlResponse(status: number, data: any, init?: ResponseInit) {
  return new NextResponse(data, {
    ...init,
    status,
    headers: {
      ...init?.headers,
      "Content-Type": "text/html",
    },
  });
}

export class AuthError extends Error {}

/**
 * Verifies the user's JWT token and returns its payload if it's valid.
 */
export async function verifyAuth(req: NextRequest) {
  const token = req.cookies.get("user_token")?.value;

  if (!token) throw new AuthError("Missing user token");

  try {
    const verified = await jwtVerify(
      token,
      new TextEncoder().encode(process.env.API_KEY),
    );
    return verified.payload as UserJwtPayload;
  } catch (err) {
    throw new AuthError("Your token has expired.");
  }
}

/**
 * Adds the user token cookie to a response.
 */
export async function setUserCookie(username: string) {
  const token = await new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setJti(username)
    .setIssuedAt()
    .setExpirationTime("24h")
    .sign(new TextEncoder().encode(process.env.API_KEY));
  //登录成功
  //跳转到首页
  const res = htmlResponse(
    200,
    '<script>window.location.href="/#/chat"</script>',
  );
  res.cookies.set("user_token", token, {
    // httpOnly: true,
    maxAge: 60 * 60 * 24, // 24 hours in seconds
  });

  return res;
}

/**
 * Expires the user token cookie
 */
export function expireUserCookie() {
  const res = htmlResponse(200, "ok");
  res.cookies.set("user_token", "", { maxAge: 0 });
  return res;
}
