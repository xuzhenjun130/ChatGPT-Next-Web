import { NextRequest } from "next/server";
import { getServerSideConfig } from "../config/server";
import md5 from "spark-md5";
import { ACCESS_CODE_PREFIX } from "../constant";
import * as jwt from "../libs/jwt";

const serverConfig = getServerSideConfig();

function getIP(req: NextRequest) {
  let ip = req.ip ?? req.headers.get("x-real-ip");
  const forwardedFor = req.headers.get("x-forwarded-for");

  if (!ip && forwardedFor) {
    ip = forwardedFor.split(",").at(0) ?? "";
  }

  return ip;
}

function parseApiKey(bearToken: string) {
  const token = bearToken.trim().replaceAll("Bearer ", "").trim();
  const isOpenAiKey = !token.startsWith(ACCESS_CODE_PREFIX);

  return {
    accessCode: isOpenAiKey ? "" : token.slice(ACCESS_CODE_PREFIX.length),
    apiKey: isOpenAiKey ? token : "",
  };
}

export async function auth(req: NextRequest) {
  try {
    const decoded = await jwt.verifyAuth(req);
    if (!decoded) {
      return {
        error: true,
        msg: "token 验证失败，请重新登录",
      };
    } else {
      return {
        openid: decoded.jti,
        error: false,
      };
    }
  } catch (e) {
    console.log("token 解析失败", e);
    return {
      error: true,
      msg: "token 验证失败，请重新登录",
    };
  }

  // const authToken = req.headers.get("Authorization") ?? "";

  // // check if it is openai api key or user token
  // const { accessCode, apiKey: token } = parseApiKey(authToken);

  // const hashedCode = md5.hash(accessCode ?? "").trim();

  // console.log("[Auth] allowed hashed codes: ", [...serverConfig.codes]);
  // console.log("[Auth] got access code:", accessCode);
  // console.log("[Auth] hashed access code:", hashedCode);
  // console.log("[User IP] ", getIP(req));
  // console.log("[Time] ", new Date().toLocaleString());

  // if (serverConfig.needCode && !serverConfig.codes.has(hashedCode) && !token) {
  //   return {
  //     error: true,
  //     needAccessCode: true,
  //     msg: "Please go settings page and fill your access code.",
  //   };
  // }

  // // if user does not provide an api key, inject system api key
  // if (!token) {
  //   const apiKey = serverConfig.apiKey;
  //   if (apiKey) {
  //     console.log("[Auth] use system api key");
  //     req.headers.set("Authorization", `Bearer ${apiKey}`);
  //   } else {
  //     console.log("[Auth] admin did not provide an api key");
  //     return {
  //       error: true,
  //       msg: "Empty Api Key",
  //     };
  //   }
  // } else {
  //   console.log("[Auth] use user api key");
  // }

  // return {
  //   error: false,
  // };
}

export interface UserInfoInterface {
  open_id: string;
  expire_time: string;
  chat_gpt_3_reward: number;
  chat_gpt_4_reward: number;
  chat_gpt_3: number;
  chat_gpt_4: number;
}

// 获取用户信息
export async function getUserInfo(open_id: string) {
  const rs = await fetch(process.env.backend_url + "/api/v1/gpt/userinfo", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      open_id: open_id,
    }),
  });
  const userRs = await rs.json();
  const userInfo = userRs["data"] as UserInfoInterface;
  return userInfo;
}
