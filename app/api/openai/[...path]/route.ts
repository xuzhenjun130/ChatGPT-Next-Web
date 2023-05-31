import { prettyObject } from "@/app/utils/format";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "../../auth";
import { requestOpenai } from "../../common";
import Atlas from "atlas-fetch-data-api";
import * as jwt from "../../../libs/jwt";

async function handle(
  req: NextRequest,
  { params }: { params: { path: string[] } },
) {
  console.log("[OpenAI Route] params ", params);
  const accessCode = req.headers.get("access-code");
  const authResult = await auth(req);
  if (authResult.error && (!accessCode || accessCode.length < 5)) {
    return NextResponse.json(authResult, {
      status: 401,
    });
  }
  let token = "";
  if (!authResult.openid) {
    console.log("没有jwt验证成功，则需要验证数据库");
    // MongoDB init by URL Endpoint
    const atlasAPI = new Atlas({
      dataSource: "Cluster0",
      database: "chat_db",
      apiKey: process.env.MONGODB_KEY + "",
      apiUrl: process.env.MONGODB_URI + "",
    });

    let userRes = await atlasAPI.findOne({
      collection: "users",
      filter: { key: accessCode },
    });
    const tips =
      "您的链接授权已过期，为了避免恶意盗刷，\n 请关注微信公众号【code思维】\n回复关键词：`ai`  获取授权链接 \n ![](/wx.png)";

    if (!userRes || !userRes.document) {
      return new Response(tips);
    }

    const user = userRes.document;

    console.log(
      new Date(user["expire"]).getTime() < new Date().getTime(),
      user["expire"],
      new Date().getTime(),
    );
    if (new Date(user["expire"]).getTime() < new Date().getTime()) {
      // 判断用户是否过期
      return new Response(tips);
    }
    token = await jwt.genToken(user["username"]);
  }

  try {
    const res = await requestOpenai(req);
    if (token) {
      res.headers.set("Set-Cookie", `user_token=${token}; Path=/; HttpOnly`);
    }
    return res;
  } catch (e) {
    console.error("[OpenAI] ", e);
    return NextResponse.json(prettyObject(e));
  }
}

export const GET = handle;
export const POST = handle;

export const runtime = "edge";
