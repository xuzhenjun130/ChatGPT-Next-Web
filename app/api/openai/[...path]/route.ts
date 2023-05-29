import { prettyObject } from "@/app/utils/format";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "../../auth";
import { requestOpenai } from "../../common";
import { ModelType } from "@/app/store";

async function handle(
  req: NextRequest,
  { params }: { params: { path: string[] } },
) {
  console.log("[OpenAI Route] params ", params);

  const authResult = await auth(req);
  if (authResult.error) {
    return NextResponse.json(authResult, {
      status: 401,
    });
  }

  // 判断 用户请求次数是否超过限制
  const body = await req.json();

  const model = body.model as ModelType;
  let apiModel = "3.5";
  if (model == "gpt-4") {
    apiModel = "4";
  }
  const url = new URL(`${process.env.backend_url}/api/v1/gpt/dialogue`);
  url.searchParams.append("_t", Date.now().toString());
  const rs = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-cache",
      Pragma: "no-cache",
      Expires: "0",
    },
    body: JSON.stringify({
      open_id: authResult.openid,
      chat_gpt_version: apiModel,
    }),
  });
  const textBody = await rs.text();
  if (!textBody) {
    return new Response(
      "获取用户信息失败，请先关注我们的微信公众号号：小豹智能 \n ![](/q.jpg)",
    );
  }
  console.log("/api/v1/gpt/dialogue", textBody);
  const recordRs = JSON.parse(textBody) as any;
  const num = recordRs.data.remain_num;

  if (num <= 0) {
    return new Response("您的额度不足，请求次数超过限制");
  }

  try {
    return await requestOpenai(req, model, body);
  } catch (e) {
    console.error("[OpenAI] ", e);
    return NextResponse.json(prettyObject(e));
  }
}

export const GET = handle;
export const POST = handle;

export const runtime = "edge";
