import { NextRequest } from "next/server";
import { getServerSideConfig } from "../config/server";
import md5 from "spark-md5";
import { ACCESS_CODE_PREFIX } from "../constant";

import * as jwt from "../libs/jwt";
const serverConfig = getServerSideConfig();
import { OPENAI_URL } from "./common";

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
        error: "token 验证失败",
        msg: "请重新登录",
      };
    } else {
      return {
        openid: decoded.jti,
        error: false,
      };
    }
  } catch (e) {
    //console.log("token 解析失败", e);
    return {
      error: "token 解析失败",
      msg: "请重新登录",
    };
  }
}

export interface UserInfoInterface {
  open_id: string;
  expire_time: string;
  chat_gpt_3_reward: number;
  chat_gpt_4_reward: number;
  chat_gpt_3: number;
  chat_gpt_4: number;
}

// 定义请求返回的数据结构
interface UserInfoResponse {
  code: number;
  msg: string;
  data: UserInfoInterface;
}

// 获取用户信息
export async function getUserInfo(open_id: string): Promise<UserInfoInterface> {
  const url = new URL(`${process.env.backend_url}/api/v1/gpt/userinfo`);
  url.searchParams.append("_t", Date.now().toString());
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-cache",
      Pragma: "no-cache",
      Expires: "0",
    },
    body: JSON.stringify({
      open_id: open_id,
    }),
  });

  const textBody = await response.text();
  if (!textBody) {
    return {} as UserInfoInterface;
  }
  console.log("getUserInfo", textBody, open_id);
  const userInfoResponse = JSON.parse(textBody) as UserInfoResponse;

  if (userInfoResponse.code !== 200) {
    // 如果请求成功但返回的数据不是期望的格式，抛出一个错误
    throw new Error(`获取用户信息失败，错误信息：${userInfoResponse.msg}`);
  }

  return userInfoResponse.data;
}
