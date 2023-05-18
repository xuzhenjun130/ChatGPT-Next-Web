import { IconButton } from "./button";
import { ErrorBoundary } from "./error";
import styles from "./vip.module.scss";
import CloseIcon from "../icons/close.svg";
import { Path } from "../constant";
import { useNavigate } from "react-router-dom";
import Locale, { AllLangs, changeLang, getLang } from "../locales";
import Head from "next/head";
import {
  Input,
  List,
  ListItem,
  Modal,
  PasswordInput,
  Popover,
  Select,
  Card,
} from "./ui-lib";

export function Vip() {
  const navigate = useNavigate();
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

        <h2>我的额度</h2>
        <table className={styles["usage-table"]}>
          <thead>
            <tr>
              <th>模型</th>
              <th>类型</th>
              <th>剩余</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td rowSpan={2}>GPT-3.5</td>
              <td>每日额度</td>
              <td>
                <span>29</span>
              </td>
            </tr>
            <tr>
              <td>奖励额度</td>
              <td>
                <span>300</span>
              </td>
            </tr>
            <tr>
              <td rowSpan={2}>GPT-4</td>
              <td>每日额度</td>
              <td>
                <span>20</span>
              </td>
            </tr>
            <tr>
              <td>奖励额度</td>
              <td>
                <span>1</span>
              </td>
            </tr>
            <tr>
              <td>每日额度</td>
              <td>每日凌晨恢复</td>
              <td></td>
            </tr>
            <tr>
              <td>奖励额度</td>
              <td>优先使用，用了就没，次日不会恢复</td>
              <td></td>
            </tr>
          </tbody>
        </table>
      </div>
    </ErrorBoundary>
  );
}
