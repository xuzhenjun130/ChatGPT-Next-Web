import { NextRequest, NextResponse } from "next/server";
import { auth } from "../auth";

interface Order {
  id: number;
  order_no: string;
  user_note: string;
  payment_id: number;
  total_price: string;
  create_time: string;
  update_time: string;
  order_detail_list: Object[][];
  prepay_id: string;
  address: Object;
  order_type: number;
  nonce_str: string;
  pay_timestamp: string;
  signature: string;
  sign_type: string;
  open_id: string;
}

async function handle(req: NextRequest) {
  const authResult = await auth(req);
  if (authResult.error) {
    return NextResponse.json(authResult, {
      status: 401,
    });
  }
  const post = await req.json();
  const data = {
    user_note: "chatgpt订单：" + post["type"],
    open_id: authResult.openid,
    payment_id: 1,
    order_detail_list: [
      {
        goods_id: post["type"] == "year" ? 2 : 1,
        buy_number_count: 1,
      },
    ],
  };
  const url = new URL(`${process.env.backend_url}/api/v1/gpt/create_order`);
  url.searchParams.append("_t", Date.now().toString());
  const rs = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-cache",
      Pragma: "no-cache",
      Expires: "0",
    },
    body: JSON.stringify(data),
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
  const order: Order = orderRs["data"];
  console.log(data, order);
  return NextResponse.json({ error: false, order: order }, { status: 200 });
}

export const POST = handle;
