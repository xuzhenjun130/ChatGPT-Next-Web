import { NextRequest, NextResponse } from "next/server";
import QRCode from "qrcode";
// 生成关注公众号二维码
async function handle(req: NextRequest) {
  //解析url地址参数
  const url = new URL(req.url);
  const openid = url.searchParams.get("q");

  const url2 = new URL(`${process.env.backend_url}/api/v1/gpt/token`);
  url2.searchParams.append("_t", Date.now().toString());
  const rs = await fetch(url2, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-cache",
      Pragma: "no-cache",
      Expires: "0",
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
  const url3 = new URL(
    "https://api.weixin.qq.com/cgi-bin/qrcode/create?access_token=" + token,
  );
  url3.searchParams.append("_t", Date.now().toString());
  const rsWx = await fetch(url3, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-cache",
      Pragma: "no-cache",
      Expires: "0",
    },
    body: JSON.stringify({
      expire_seconds: 2592000,
      action_name: "QR_STR_SCENE",
      action_info: { scene: { scene_str: openid } },
    }),
  });

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
