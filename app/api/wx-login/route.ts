import { NextRequest, NextResponse } from "next/server";

import * as auth from "../../libs/jwt";
import { getUserInfo } from "../auth";

async function handle(req: NextRequest) {
  //解析url地址参数
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const params =
    "appid=" +
    process.env.APP_ID +
    "&secret=" +
    process.env.SECRET +
    "&code=" +
    code;
  const wxUrl =
    "https://api.weixin.qq.com/sns/oauth2/access_token?" +
    params +
    "&grant_type=authorization_code";
  //获取微信用户信息
  const wxRes = await fetch(wxUrl);
  const wxData = await wxRes.json();
  console.log("wxData", wxData);
  //判断是否获取到用户信息
  if (wxData.errcode) {
    return NextResponse.json({
      error: "获取openid失败",
      errmsg: wxData.errmsg,
    });
  }
  //获取用户信息
  const userInfo = await getUserInfo(wxData.openid);
  console.log("userinfo", userInfo);
  if (userInfo.open_id) {
    //更新用户时间
    return auth.setUserCookie(wxData.openid, true);
  } else {
    // 关注公众号链接
    return auth.setUserCookie(wxData.openid, false);
  }
}

export const GET = handle;
