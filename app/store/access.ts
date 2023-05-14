import { create } from "zustand";
import { persist } from "zustand/middleware";
import { StoreKey } from "../constant";
import { getHeaders } from "../requests";
import { BOT_HELLO } from "./chat";
import { ALL_MODELS } from "./config";

export interface AccessControlStore {
  accessCode: string;
  token: string;

  needCode: boolean;
  hideUserApiKey: boolean;
  openaiUrl: string;

  remainderGpt3: number;
  remainderGpt4: number;

  totalGpt3: number;
  totalGpt4: number;
  //更新剩余次数
  updateRemainderGpt3: (_: number) => void;
  updateRemainderGpt4: (_: number) => void;
  //更新总次数
  updateTotalGpt3: (_: number) => void;
  updateTotalGpt4: (_: number) => void;
  //次数减少
  decrementRemainderGpt3: () => void;
  decrementRemainderGpt4: () => void;

  updateToken: (_: string) => void;
  updateCode: (_: string) => void;
  enabledAccessControl: () => boolean;
  isAuthorized: () => boolean;
  fetch: () => void;
}

// 读取指定名称的 cookie
function getCookie(name: string) {
  let cookies = document.cookie.split("; ");
  for (let i = 0; i < cookies.length; i++) {
    let parts = cookies[i].split("=");
    if (parts[0] === name) {
      return decodeURIComponent(parts[1]);
    }
  }
  return null;
}

let fetchState = 0; // 0 not fetch, 1 fetching, 2 done

export const useAccessStore = create<AccessControlStore>()(
  persist(
    (set, get) => ({
      token: "",
      accessCode: "",
      needCode: true,
      hideUserApiKey: false,
      openaiUrl: "/api/openai/",

      remainderGpt3: 0,
      remainderGpt4: 0,
      totalGpt3: 0,
      totalGpt4: 0,

      updateRemainderGpt3(remainder: number) {
        set(() => ({ remainderGpt3: remainder }));
      },
      updateRemainderGpt4(remainder: number) {
        set(() => ({ remainderGpt4: remainder }));
      },
      updateTotalGpt3(total: number) {
        set(() => ({ totalGpt3: total }));
      },
      updateTotalGpt4(total: number) {
        set(() => ({ totalGpt4: total }));
      },
      decrementRemainderGpt3() {
        set((state) => ({ remainderGpt3: state.remainderGpt3 - 1 }));
      },
      decrementRemainderGpt4() {
        set((state) => ({ remainderGpt4: state.remainderGpt4 - 1 }));
      },

      enabledAccessControl() {
        get().fetch();

        return get().needCode;
      },
      updateCode(code: string) {
        set(() => ({ accessCode: code }));
      },
      updateToken(token: string) {
        set(() => ({ token }));
      },
      isAuthorized() {
        const token = getCookie("user_token");
        if (!token) {
          return false;
        }
        return true;
        //get().fetch();
        // has token or has code or disabled access control
        // return (
        //   !!get().token || !!get().accessCode || !get().enabledAccessControl()
        // );
      },
      fetch() {
        if (fetchState > 0) return;
        fetchState = 1;
        fetch("/api/config", {
          method: "post",
          body: null,
          headers: {
            ...getHeaders(),
          },
        })
          .then((res) => res.json())
          .then((res: DangerConfig) => {
            console.log("[Config] got config from server", res);
            set(() => ({ ...res }));

            if (!res.enableGPT4) {
              ALL_MODELS.forEach((model) => {
                if (model.name.startsWith("gpt-4")) {
                  (model as any).available = false;
                }
              });
            }

            if ((res as any).botHello) {
              BOT_HELLO.content = (res as any).botHello;
            }
          })
          .catch(() => {
            console.error("[Config] failed to fetch config");
          })
          .finally(() => {
            fetchState = 2;
          });
      },
    }),
    {
      name: StoreKey.Access,
      version: 1,
    },
  ),
);
