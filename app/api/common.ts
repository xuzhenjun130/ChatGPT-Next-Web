import { NextRequest } from "next/server";
import { ModelType } from "../store";
import { getServerSideConfig } from "../config/server";

// export const OPENAI_URL = "api.openai.com";
export const OPENAI_URL = "sherman.deno.dev";
const DEFAULT_PROTOCOL = "https";
const PROTOCOL = process.env.PROTOCOL ?? DEFAULT_PROTOCOL;
const BASE_URL = process.env.BASE_URL ?? OPENAI_URL;

function getRandomElementFromString(str: string): string {
  const arr = str.split(",");
  const randomIndex = Math.floor(Math.random() * arr.length);
  return arr[randomIndex];
}

export async function requestOpenai(
  req: NextRequest,
  model: ModelType,
  body: any,
) {
  const controller = new AbortController();
  const serverConfig = getServerSideConfig();
  let apiKey = serverConfig.apiKey as string;
  if (model == "gpt-4") {
    apiKey = serverConfig.api4Key as string;
  } else if (apiKey?.indexOf(",") > 0) {
    apiKey = getRandomElementFromString(apiKey); //gpt3 随机选择一个key
  }

  const authValue = ("Bearer " + apiKey) as string;
  const openaiPath = `${req.nextUrl.pathname}${req.nextUrl.search}`.replaceAll(
    "/api/openai/",
    "",
  );

  let baseUrl = BASE_URL;

  if (!baseUrl.startsWith("http")) {
    baseUrl = `${PROTOCOL}://${baseUrl}`;
  }

  console.log("[Proxy] ", openaiPath);
  console.log("[Base Url]", baseUrl);

  if (process.env.OPENAI_ORG_ID) {
    console.log("[Org ID]", process.env.OPENAI_ORG_ID);
  }

  const timeoutId = setTimeout(() => {
    controller.abort();
  }, 10 * 60 * 1000);

  const fetchUrl = `${baseUrl}/${openaiPath}`;
  const fetchOptions: RequestInit = {
    headers: {
      "Content-Type": "application/json",
      Authorization: authValue,
      ...(process.env.OPENAI_ORG_ID && {
        "OpenAI-Organization": process.env.OPENAI_ORG_ID,
      }),
    },
    cache: "no-store",
    method: req.method,
    body: JSON.stringify(body),
    signal: controller.signal,
  };

  try {
    const res = await fetch(fetchUrl, fetchOptions);

    if (res.status === 401) {
      // to prevent browser prompt for credentials
      const newHeaders = new Headers(res.headers);
      newHeaders.delete("www-authenticate");
      return new Response(res.body, {
        status: res.status,
        statusText: res.statusText,
        headers: newHeaders,
      });
    }

    return res;
  } finally {
    clearTimeout(timeoutId);
  }
}
