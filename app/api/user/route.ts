import { NextRequest, NextResponse } from "next/server";
import { cache_prefix } from "../../constant";
import { auth } from "../auth";
import { redis } from "../../redis";

async function handle(req: NextRequest) {
  const authResult = await auth(req);
  if (authResult.error) {
    return NextResponse.json(authResult, {
      status: 401,
    });
  }
  const cache = redis();
  const key = cache_prefix + authResult.openid;
  const data = await cache.get(key);

  if (data) {
    return NextResponse.json(JSON.parse(data));
  }
  return NextResponse.json({
    error: "获取用户信息失败",
  });
}

export const GET = handle;
