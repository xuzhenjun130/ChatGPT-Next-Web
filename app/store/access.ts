import { create } from "zustand";
import { persist } from "zustand/middleware";
import { StoreKey } from "../constant";
import { getHeaders } from "../requests";
import { BOT_HELLO } from "./chat";
import { ALL_MODELS } from "./config";
import { getCookie } from "../utils";

export interface AccessControlStore {
  accessCode: string;
  token: string;

  needCode: boolean;
  hideUserApiKey: boolean;
  openaiUrl: string;

  vipExpire: string;
  updateVipExpire: (_: string) => void;

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
  fetchUser: () => void;
}

let fetchState = 0; // 0 not fetch, 1 fetching, 2 done
let fetchStateUser = 0; // 0 not fetch, 1 fetching, 2 done

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

      vipExpire: "",

      updateVipExpire(ext: string) {
        set(() => ({ vipExpire: ext }));
      },

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
        get().fetchUser();
        return true;
        //get().fetch();
        // has token or has code or disabled access control
        // return (
        //   !!get().token || !!get().accessCode || !get().enabledAccessControl()
        // );
      },
      fetchUser() {
        if (fetchStateUser > 0) return;
        fetchStateUser = 1;
        fetch("/api/user", {
          method: "post",
        })
          .then((res) => {
            if (res.status === 200) {
              res.json().then((res) => {
                console.log("[User] got user from server", res);
                this.updateRemainderGpt3(res.limit["gpt3.5"].remainder);
                this.updateRemainderGpt4(res.limit["gpt4"].remainder);
                this.updateTotalGpt3(res.limit["gpt3.5"].total);
                this.updateTotalGpt4(res.limit["gpt4"].total);
                this.updateVipExpire(res.limit["vip_expire"]);
                // set(() => ({ ...res }));
              });
            }
          })
          .catch(() => {
            console.error("[User] failed to fetch user");
          })
          .finally(() => {
            fetchStateUser = 2;
          });
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
