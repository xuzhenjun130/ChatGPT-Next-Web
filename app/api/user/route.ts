import { NextRequest, NextResponse } from "next/server";
import { auth, getUserInfo } from "../auth";

async function handle(req: NextRequest) {
  const authResult = await auth(req);
  if (authResult.error) {
    return NextResponse.json(authResult, {
      status: 401,
    });
  }
  const userInfo = await getUserInfo(authResult.openid as string);

  if (userInfo.open_id) {
    return NextResponse.json(userInfo);
  }
  return NextResponse.json({
    error: "获取用户信息失败",
  });
}

export const POST = handle;
