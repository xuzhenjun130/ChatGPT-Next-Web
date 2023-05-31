import { create } from "zustand";
import { persist } from "zustand/middleware";
import { StoreKey } from "../constant";
import { getHeaders } from "../client/api";
import { BOT_HELLO } from "./chat";
import { ALL_MODELS } from "./config";
import { UserInfoInterface, getCookie, getQueryParams } from "../utils";

export interface AccessControlStore {
  accessCode: string;
  token: string;

  needCode: boolean;
  hideUserApiKey: boolean;
  openaiUrl: string;

  vipExpire: string;
  updateVipExpire: (_: string) => void;
  //每日额度
  chat_gpt_3_reward: number;
  chat_gpt_4_reward: number;
  //奖励额度
  chat_gpt_3: number;
  chat_gpt_4: number;
  //更新奖励额度
  updateChatGpt3Reward: (_: number) => void;
  updateChatGpt4Reward: (_: number) => void;
  //更新每日额度
  updateChatGpt3: (_: number) => void;
  updatechatGpt4: (_: number) => void;
  //次数减少
  decrementChatGpt3Reward: () => void;
  decrementChatGpt4Reward: () => void;
  decrementChatGpt3: () => void;
  decrementChatGpt4: () => void;

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

      chat_gpt_3_reward: 0,
      chat_gpt_4_reward: 0,
      chat_gpt_3: 0,
      chat_gpt_4: 0,

      vipExpire: "",

      updateVipExpire(ext: string) {
        set(() => ({ vipExpire: ext }));
      },

      updateChatGpt3Reward(remainder: number) {
        set(() => ({ chat_gpt_3_reward: remainder }));
      },
      updateChatGpt4Reward(remainder: number) {
        set(() => ({ chat_gpt_4_reward: remainder }));
      },
      updateChatGpt3(total: number) {
        set(() => ({ chat_gpt_3: total }));
      },
      updatechatGpt4(total: number) {
        set(() => ({ chat_gpt_4: total }));
      },
      decrementChatGpt3Reward() {
        set((state) => ({ chat_gpt_3_reward: state.chat_gpt_3_reward - 1 }));
      },
      decrementChatGpt4Reward() {
        set((state) => ({ chat_gpt_4_reward: state.chat_gpt_4_reward - 1 }));
      },
      decrementChatGpt3() {
        set((state) => ({ chat_gpt_3: state.chat_gpt_3 - 1 }));
      },
      decrementChatGpt4() {
        set((state) => ({ chat_gpt_4: state.chat_gpt_4 - 1 }));
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
        return true;
      },
      fetchUser() {
        if (fetchStateUser > 0) return;
        fetchStateUser = 1;
        fetch("/api/user", {
          method: "get",
        })
          .then((res) => {
            if (res.status === 200) {
              res.json().then((res: UserInfoInterface) => {
                console.log("[User] got user from server", res);
                this.updateChatGpt3Reward(res.chat_gpt_3_reward);
                this.updateChatGpt4Reward(res.chat_gpt_4_reward);
                this.updateChatGpt3(res.chat_gpt_3);
                this.updatechatGpt4(res.chat_gpt_4);
                this.updateVipExpire(res.expire_time);
                // set(() => ({ ...res }));
              });
            } else {
              console.error("[User] failed to fetch user", res.text);
              location.href = "/?login=1#/chat";
            }
          })
          .catch(() => {
            console.error("[User] failed to fetch user");
            location.href = "/?login=1#/chat";
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
