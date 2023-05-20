import { NextRequest, NextResponse } from "next/server";
import QRCode from "qrcode";
// 生成关注公众号二维码
async function handle(req: NextRequest) {
  //解析url地址参数
  const url = new URL(req.url);
  const openid = url.searchParams.get("q");

  const rs = await fetch(process.env.backend_url + "/api/v1/gpt/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
  });
  const orderRs = await rs.json();
  if (orderRs.code != 200) {
    return NextResponse.json(
      {
        error: orderRs.msg,
      },
      {
        status: 501,
      },
    );
  }
  const token = orderRs["data"]["token"];
  const rsWx = await fetch(
    "https://api.weixin.qq.com/cgi-bin/qrcode/create?access_token=" + token,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        expire_seconds: 2592000,
        action_name: "QR_STR_SCENE",
        action_info: { scene: { scene_str: openid } },
      }),
    },
  );

  const dataRsWx = await rsWx.json();

  const qr = await QRCode.toDataURL(dataRsWx["url"]);
  //生成二维码图片
  // 提取基本64编码部分
  const base64String = qr.split(",")[1];
  // 返回二维码图片
  const buffer = Buffer.from(base64String, "base64");

  return new Response(buffer, {
    headers: {
      "Content-Type": "image/png",
    },
  });
}

export const GET = handle;
