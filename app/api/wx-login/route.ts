import { NextRequest, NextResponse } from "next/server";
import { MySQLDatabase } from "../../mysql";
import * as auth from "../../libs/jwt";
import { redis } from "../../redis";
import { cache_prefix } from "../../constant";

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
  //判断是否获取到用户信息
  if (wxData.errcode) {
    return NextResponse.json({
      error: "获取openid失败",
      errmsg: wxData.errmsg,
    });
  }
  //查询mysql数据库是否存在该用户
  const db = new MySQLDatabase();
  await db.connect();
  const data = await db.getDataByOpenid(wxData.openid);

  if (data) {
    //更新用户时间
    await db.updateUpdateTime(wxData.openid);
    await db.disconnect();
    const cache = redis();
    const key = cache_prefix + wxData.openid;
    if (!(await cache.exists(key))) {
      //判断是否存在
      await cache.set(key, JSON.stringify(data)); //存入redis
    }
    return auth.setUserCookie(wxData.openid);
  } else {
    await db.disconnect();
    // 关注公众号链接
    const url =
      "http://" + process.env.domain + "/q.jpg#​" + wxData.openid + "&";
    return NextResponse.redirect(url);
  }
}

export const GET = handle;
