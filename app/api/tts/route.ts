import { NextRequest, NextResponse } from "next/server";
import { auth } from "../auth";

async function handle(req: NextRequest) {
  const accessCode = req.headers.get("access-code");
  const authResult = await auth(req);
  if (authResult.error && (!accessCode || accessCode.length < 5)) {
    return NextResponse.json(authResult, {
      status: 401,
    });
  }
  const reqBody = await req.json();
  const key = process.env.tts_key as string;
  const endpoint = process.env.tts_end as string;

  const body = `<speak version='1.0' xml:lang='zh-CN'>
    <voice xml:lang='zh-CN' xml:gender='Male' name='zh-CN-YunxiNeural'>
      ${reqBody.msg}
    </voice>
  </speak>`;

  const response = (await fetch(endpoint, {
    method: "post",
    headers: {
      "Content-Type": "application/ssml+xml",
      "X-Microsoft-OutputFormat": "audio-16khz-128kbitrate-mono-mp3",
      "Ocp-Apim-Subscription-Key": key,
      "Cache-Control": "no-cache",
      Pragma: "no-cache",
      Expires: "0",
    },
    body: body,
  })) as any;
  return new Response(response.body);
}

export const POST = handle;
