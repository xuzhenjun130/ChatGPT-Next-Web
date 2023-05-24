import { createParser } from "eventsource-parser";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "../../auth";
import { requestOpenai } from "../../common";
import { redis } from "../../../redis";
import { cache_prefix } from "@/app/constant";
import { ModelType } from "@/app/store";

async function createStream(res: Response) {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  const stream = new ReadableStream({
    async start(controller) {
      function onParse(event: any) {
        if (event.type === "event") {
          const data = event.data;
          // https://beta.openai.com/docs/api-reference/completions/create#completions/create-stream
          if (data === "[DONE]") {
            controller.close();
            return;
          }
          try {
            const json = JSON.parse(data);
            const text = json.choices[0].delta.content;
            const queue = encoder.encode(text);
            controller.enqueue(queue);
          } catch (e) {
            controller.error(e);
          }
        }
      }

      const parser = createParser(onParse);
      for await (const chunk of res.body as any) {
        parser.feed(decoder.decode(chunk, { stream: true }));
      }
    },
  });
  return stream;
}

function formatResponse(msg: any) {
  const jsonMsg = ["```json\n", JSON.stringify(msg, null, "  "), "\n```"].join(
    "",
  );
  return new Response(jsonMsg);
}

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

  const rs = await fetch(process.env.backend_url + "/api/v1/gpt/dialogue", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      open_id: authResult.openid,
      chat_gpt_version: apiModel,
    }),
  });
  const textBody = await rs.text();
  console.log("/api/v1/gpt/dialogue", textBody);
  const recordRs = JSON.parse(textBody) as any;
  const num = recordRs.data.remain_num;

  if (num <= 0) {
    return NextResponse.json({
      error: "您的额度不足，请求次数超过限制",
    });
  }

  try {
    const api = await requestOpenai(req, model, body);

    const contentType = api.headers.get("Content-Type") ?? "";
    console.log("contentType", contentType);
    // streaming response
    if (contentType.includes("stream")) {
      const stream = await createStream(api);
      const res = new Response(stream);
      res.headers.set("Content-Type", contentType);
      return res;
    }

    // try to parse error msg
    try {
      const mayBeErrorBody = await api.json();
      if (mayBeErrorBody.error) {
        console.error("[OpenAI Response] ", mayBeErrorBody);
        return formatResponse(mayBeErrorBody);
      } else {
        const res = new Response(JSON.stringify(mayBeErrorBody));
        res.headers.set("Content-Type", "application/json");
        res.headers.set("Cache-Control", "no-cache");
        return res;
      }
    } catch (e) {
      console.error("[OpenAI Parse] ", e);
      return formatResponse({
        msg: "invalid response from openai server",
        error: e,
      });
    }
  } catch (e) {
    console.error("[OpenAI] ", e);
    return formatResponse(e);
  }
}

export const GET = handle;
export const POST = handle;

export const runtime = "edge";
