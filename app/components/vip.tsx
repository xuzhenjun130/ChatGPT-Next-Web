import { IconButton } from "./button";
import { ErrorBoundary } from "./error";
import styles from "./vip.module.scss";
import CloseIcon from "../icons/close.svg";
import ShareIcon from "../icons/share.svg";
import CopyIcon from "../icons/copy.svg";
import PayIcon from "../icons/pay.svg";
import { Path } from "../constant";
import { useNavigate } from "react-router-dom";
import Locale, { AllLangs, changeLang, getLang } from "../locales";

import {
  Input,
  List,
  ListItem,
  Modal,
  PasswordInput,
  Popover,
  Select,
  Card,
  showToast,
} from "./ui-lib";
import { useEffect, useState } from "react";
import { copyToClipboard, getCookie } from "../utils";

import { useAccessStore } from "../store";

function ShareModal(props: { onClose?: () => void }) {
  const openid = getCookie("open_id") as string;
  return (
    <div className="modal-mask">
      <Modal
        onClose={props.onClose}
        title={"邀请好友使用"}
        actions={[
          <IconButton
            key="copy"
            icon={<CopyIcon />}
            bordered
            text={"复制邀请链接"}
            onClick={() =>
              copyToClipboard(
                "我发现了个可以免费使用chatGPT的公众号【小豹智能】，还支持GPT4，你试试 " +
                  location.protocol +
                  "//" +
                  location.host +
                  "/?q=" +
                  encodeURIComponent(openid) +
                  "#/chat",
              )
            }
          />,
        ]}
      >
        <ul>
          <li>
            邀请一人即可获免费获取GPT-4模型：每日额度
            <span className="price">1</span>次
          </li>
          <li>
            可免费获取GTP-3.5模型额外奖励<span className="price">20</span>次
          </li>
          <li>
            可免费获取GTP-4模型额外奖励<span className="price">5</span>次
          </li>
        </ul>
      </Modal>
    </div>
  );
}

//支付
async function toPay(type: string) {
  if (!(window as any).WeixinJSBridge) {
    return alert("请在微信在打开页面！");
  }
  const rs = await fetch("/api/pay", {
    method: "post",
    body: JSON.stringify({ type }),
  });
  const body = await rs.text();
  console.log("api/pay", body);
  let data = {} as any;
  if (body) {
    data = JSON.parse(body) as any;
    if (data.error) {
      showToast(data.error, undefined, 6000);
      return;
    }
  } else {
    showToast("支付失败,接口错误", undefined, 6000);
    return;
  }

  const order = data.order;

  const params = {
    appId: "wx991f37ebb3e61d7d", // 公众号名称，由商户传入
    timeStamp: order.pay_timestamp, // 时间戳，自1970年以来的秒数
    nonceStr: order.nonce_str, // 随机串
    package: "prepay_id=" + order.prepay_id,
    signType: "RSA", // 微信签名方式
    paySign: order.signature, // 微信签名
  };
  console.log(params);

  (window as any).WeixinJSBridge.invoke(
    "getBrandWCPayRequest",
    params,
    function (res: any) {
      if (res.err_msg == "get_brand_wcpay_request:ok") {
        // 使用以上方式判断前端返回,微信固定返回'res.err_msg'为'get_brand_wcpay_request:ok'
        // 支付成功后的回调函数
        alert("支付成功");
        location.reload();
      }
      if (res.err_msg == "get_brand_wcpay_request:cancel") {
        // 用户取消支付后的回调函数
        alert("用户取消支付");
      }
      // 可以增加其他的错误处理
    },
  );
}

function convertToStandardDateFormat(dateString: string): string {
  const date = new Date(dateString);

  const year = date.getFullYear();
  const month = padZero(date.getMonth() + 1); // Months are zero-based
  const day = padZero(date.getDate());

  const hours = padZero(date.getHours());
  const minutes = padZero(date.getMinutes());
  const seconds = padZero(date.getSeconds());

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

function padZero(num: number): string {
  return num < 10 ? "0" + num : num.toString();
}

export function Vip() {
  const accessStore = useAccessStore();
  accessStore.fetchUser();
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://res.wx.qq.com/open/js/jweixin-1.6.0.js";
    script.async = true;
    document.body.appendChild(script);
  }, []);
  const navigate = useNavigate();
  const [shouldShowShareModal, setShowShareModal] = useState(false);
  return (
    <ErrorBoundary>
      <div className="window-header">
        <div className="window-header-title">
          <div className="window-header-main-title">我的订阅</div>
          <div className="window-header-sub-title">解锁更多可能</div>
        </div>
        <div className="window-actions">
          <div className="window-action-button">
            <IconButton
              icon={<ShareIcon />}
              text="免费获取奖励额度"
              bordered
              title="分享"
              onClick={() => setShowShareModal(true)}
            />
          </div>
          <div className="window-action-button">
            <IconButton
              icon={<CloseIcon />}
              onClick={() => navigate(Path.Home)}
              bordered
              title={Locale.Settings.Actions.Close}
            />
          </div>
        </div>
      </div>
      <div className={styles["vip"]}>
        <div className={styles.container}>
          <strong>我的额度</strong>
          {accessStore.vipExpire && (
            <div className="window-header-sub-title">
              到期时间:{convertToStandardDateFormat(accessStore.vipExpire)}
            </div>
          )}
          <table className={styles["usage-table"]}>
            <thead>
              <tr>
                <th>模型</th>
                <th>类型</th>
                <th>剩余次数</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td rowSpan={2}>GPT-3.5</td>
                <td>每日额度</td>
                <td>
                  <span>{accessStore.chat_gpt_3}</span>
                </td>
              </tr>
              <tr>
                <td>奖励额度</td>
                <td>
                  <span>{accessStore.chat_gpt_3_reward}</span>
                </td>
              </tr>
              <tr>
                <td rowSpan={2}>GPT-4</td>
                <td>每日额度</td>
                <td>
                  <span>{accessStore.chat_gpt_4}</span>
                </td>
              </tr>
              <tr>
                <td>奖励额度</td>
                <td>
                  <span>{accessStore.chat_gpt_4_reward}</span>
                </td>
              </tr>
              <tr>
                <td colSpan={3}>
                  <ul>
                    <li>每日额度: 每日凌晨恢复</li>
                    <li>奖励额度: 优先扣除，用了就没</li>
                    <li>免费GPT-4: 每天1次，需要邀请关注我们公众号才能激活</li>
                  </ul>
                </td>
              </tr>
            </tbody>
          </table>

          <div className={styles["pricing-table"]}>
            <div className={styles["pricing-card"]}>
              <h2>免费用户</h2>
              <ul>
                <li>
                  GPT-3.5: 每天<span className={styles.uses}>30</span>次
                </li>
                <li>
                  GPT-4: 每天<span className={styles.uses}>1</span>次
                </li>
              </ul>
            </div>
            <div className={styles["pricing-card"]}>
              <h2>付费用户</h2>
              <ul>
                <li>
                  GPT-3.5: 每天<span className={styles.uses}>300</span>次
                </li>
                <li>
                  GPT-4: 每天<span className={styles.uses}>20</span>次
                </li>
              </ul>
            </div>
          </div>
        </div>
        <div className={styles["pay_card"]}>
          <List>
            <ListItem title="月付">
              <IconButton
                className={styles["price"]}
                icon={<PayIcon />}
                text="￥19.99"
                bordered
                textClassName={styles["price_num"]}
                title="月付"
                onClick={() => {
                  toPay("month");
                }}
              />
            </ListItem>
            <ListItem title="年付">
              <IconButton
                className={styles["price"]}
                icon={<PayIcon />}
                text="￥199.9"
                bordered
                textClassName={styles["price_num"]}
                title="年付"
                onClick={() => toPay("year")}
              />
            </ListItem>
          </List>
        </div>

        {shouldShowShareModal && (
          <ShareModal onClose={() => setShowShareModal(false)} />
        )}
      </div>
    </ErrorBoundary>
  );
}
