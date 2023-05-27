import { useDebouncedCallback } from "use-debounce";
import { useState, useRef, useEffect, useLayoutEffect } from "react";
import {
  ALL_MODELS,
  ModalConfigValidator,
  ModelConfig,
  ModelType,
  useUpdateStore,
} from "../store";

import SendWhiteIcon from "../icons/send-white.svg";
import BrainIcon from "../icons/brain.svg";
import RenameIcon from "../icons/rename.svg";
import ExportIcon from "../icons/share.svg";
import ReturnIcon from "../icons/return.svg";
import MenuIcon from "../icons/menu.svg";
import CopyIcon from "../icons/copy.svg";
import DownloadIcon from "../icons/download.svg";
import LoadingIcon from "../icons/three-dots.svg";
import PromptIcon from "../icons/prompt.svg";
import MaskIcon from "../icons/mask.svg";
import MaxIcon from "../icons/max.svg";
import MinIcon from "../icons/min.svg";
import ResetIcon from "../icons/reload.svg";

import LightIcon from "../icons/light.svg";
import DarkIcon from "../icons/dark.svg";
import AutoIcon from "../icons/auto.svg";
import BottomIcon from "../icons/bottom.svg";
import StopIcon from "../icons/pause.svg";
import ClearIcon from "../icons/clear.svg";
import LightningIcon from "../icons/lightning.svg";
import StarsIcon from "../icons/stars.svg";
import AddIcon from "../icons/add.svg";

import {
  Message,
  SubmitKey,
  useChatStore,
  BOT_HELLO,
  createMessage,
  useAccessStore,
  Theme,
  useAppConfig,
  DEFAULT_TOPIC,
} from "../store";

import {
  copyToClipboard,
  downloadAs,
  selectOrCopy,
  autoGrowTextArea,
  useMobileScreen,
  isMobileScreen,
  getQueryParams,
} from "../utils";

import dynamic from "next/dynamic";

import { ControllerPool } from "../requests";
import { Prompt, usePromptStore } from "../store/prompt";
import Locale from "../locales";

import { IconButton } from "./button";
import styles from "./home.module.scss";
import chatStyle from "./chat.module.scss";

import { ListItem, Modal, showModal, Select } from "./ui-lib";
import { useLocation, useNavigate } from "react-router-dom";
import { LAST_INPUT_KEY, Path, StoreKey } from "../constant";
import { Avatar } from "./emoji";
import { MaskAvatar, MaskConfig } from "./mask";
import { useMaskStore } from "../store/mask";
import { useCommand } from "../command";

const Markdown = dynamic(async () => (await import("./markdown")).Markdown, {
  loading: () => <LoadingIcon />,
});

function exportMessages(messages: Message[], topic: string) {
  const mdText =
    `# ${topic}\n\n` +
    messages
      .map((m) => {
        return m.role === "user"
          ? `## ${Locale.Export.MessageFromYou}:\n${m.content}`
          : `## ${Locale.Export.MessageFromChatGPT}:\n${m.content.trim()}`;
      })
      .join("\n\n");
  const filename = `${topic}.md`;

  showModal({
    title: Locale.Export.Title,
    children: (
      <div className="markdown-body">
        <pre className={styles["export-content"]}>{mdText}</pre>
      </div>
    ),
    actions: [
      <IconButton
        key="copy"
        icon={<CopyIcon />}
        bordered
        text={Locale.Export.Copy}
        onClick={() => copyToClipboard(mdText)}
      />,
      <IconButton
        key="download"
        icon={<DownloadIcon />}
        bordered
        text={Locale.Export.Download}
        onClick={() => downloadAs(mdText, filename)}
      />,
    ],
  });
}

export function SessionConfigModel(props: { onClose: () => void }) {
  const chatStore = useChatStore();
  const session = chatStore.currentSession();
  const maskStore = useMaskStore();
  const navigate = useNavigate();

  return (
    <div className="modal-mask">
      <Modal
        title={Locale.Context.Edit}
        onClose={() => props.onClose()}
        actions={[
          <IconButton
            key="reset"
            icon={<ResetIcon />}
            bordered
            text={Locale.Chat.Config.Reset}
            onClick={() =>
              confirm(Locale.Memory.ResetConfirm) && chatStore.resetSession()
            }
          />,
          <IconButton
            key="copy"
            icon={<CopyIcon />}
            bordered
            text={Locale.Chat.Config.SaveAs}
            onClick={() => {
              navigate(Path.Masks);
              setTimeout(() => {
                maskStore.create(session.mask);
              }, 500);
            }}
          />,
        ]}
      >
        <MaskConfig
          mask={session.mask}
          updateMask={(updater) => {
            const mask = { ...session.mask };
            updater(mask);
            chatStore.updateCurrentSession((session) => (session.mask = mask));
          }}
          extraListItems={
            session.mask.modelConfig.sendMemory ? (
              <ListItem
                title={`${Locale.Memory.Title} (${session.lastSummarizeIndex} of ${session.messages.length})`}
                subTitle={session.memoryPrompt || Locale.Memory.EmptyContent}
              ></ListItem>
            ) : (
              <></>
            )
          }
        ></MaskConfig>
      </Modal>
    </div>
  );
}

function PromptToast(props: {
  showToast?: boolean;
  showModal?: boolean;
  setShowModal: (_: boolean) => void;
}) {
  const chatStore = useChatStore();
  const session = chatStore.currentSession();
  const context = session.mask.context;

  return (
    <div className={chatStyle["prompt-toast"]} key="prompt-toast">
      {props.showToast && (
        <div
          className={chatStyle["prompt-toast-inner"] + " clickable"}
          role="button"
          onClick={() => props.setShowModal(true)}
        >
          <BrainIcon />
          <span className={chatStyle["prompt-toast-content"]}>
            {Locale.Context.Toast(context.length)}
          </span>
        </div>
      )}
      {props.showModal && (
        <SessionConfigModel onClose={() => props.setShowModal(false)} />
      )}
    </div>
  );
}

function useSubmitHandler() {
  const config = useAppConfig();
  const submitKey = config.submitKey;

  const shouldSubmit = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key !== "Enter") return false;
    if (e.key === "Enter" && e.nativeEvent.isComposing) return false;
    return (
      (config.submitKey === SubmitKey.AltEnter && e.altKey) ||
      (config.submitKey === SubmitKey.CtrlEnter && e.ctrlKey) ||
      (config.submitKey === SubmitKey.ShiftEnter && e.shiftKey) ||
      (config.submitKey === SubmitKey.MetaEnter && e.metaKey) ||
      (config.submitKey === SubmitKey.Enter &&
        !e.altKey &&
        !e.ctrlKey &&
        !e.shiftKey &&
        !e.metaKey)
    );
  };

  return {
    submitKey,
    shouldSubmit,
  };
}

export function PromptHints(props: {
  prompts: Prompt[];
  onPromptSelect: (prompt: Prompt) => void;
}) {
  const noPrompts = props.prompts.length === 0;
  const [selectIndex, setSelectIndex] = useState(0);
  const selectedRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSelectIndex(0);
  }, [props.prompts.length]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (noPrompts) return;
      if (e.metaKey || e.altKey || e.ctrlKey) {
        return;
      }
      // arrow up / down to select prompt
      const changeIndex = (delta: number) => {
        e.stopPropagation();
        e.preventDefault();
        const nextIndex = Math.max(
          0,
          Math.min(props.prompts.length - 1, selectIndex + delta),
        );
        setSelectIndex(nextIndex);
        selectedRef.current?.scrollIntoView({
          block: "center",
        });
      };

      if (e.key === "ArrowUp") {
        changeIndex(1);
      } else if (e.key === "ArrowDown") {
        changeIndex(-1);
      } else if (e.key === "Enter") {
        const selectedPrompt = props.prompts.at(selectIndex);
        if (selectedPrompt) {
          props.onPromptSelect(selectedPrompt);
        }
      }
    };

    window.addEventListener("keydown", onKeyDown);

    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [noPrompts, selectIndex]);

  if (noPrompts) return null;
  return (
    <div className={styles["prompt-hints"]}>
      {props.prompts.map((prompt, i) => (
        <div
          ref={i === selectIndex ? selectedRef : null}
          className={
            styles["prompt-hint"] +
            ` ${i === selectIndex ? styles["prompt-hint-selected"] : ""}`
          }
          key={prompt.title + i.toString()}
          onClick={() => props.onPromptSelect(prompt)}
          onMouseEnter={() => setSelectIndex(i)}
        >
          <div className={styles["hint-title"]}>{prompt.title}</div>
          <div className={styles["hint-content"]}>{prompt.content}</div>
        </div>
      ))}
    </div>
  );
}

function useScrollToBottom() {
  // for auto-scroll
  const scrollRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const scrollToBottom = () => {
    const dom = scrollRef.current;
    if (dom) {
      setTimeout(() => (dom.scrollTop = dom.scrollHeight), 1);
    }
  };

  // auto scroll
  useLayoutEffect(() => {
    autoScroll && scrollToBottom();
  });

  return {
    scrollRef,
    autoScroll,
    setAutoScroll,
    scrollToBottom,
  };
}

export function ChatActions(props: {
  showPromptModal: () => void;
  scrollToBottom: () => void;
  showPromptHints: () => void;
  hitBottom: boolean;
}) {
  const [clearAllData, clearSessions] = useChatStore((state) => [
    state.clearAllData,
    state.clearSessions,
  ]);
  const config = useAppConfig();
  const navigate = useNavigate();
  const chatStore = useChatStore();

  // switch themes
  const theme = config.theme;
  function nextTheme() {
    const themes = [Theme.Auto, Theme.Light, Theme.Dark];
    const themeIndex = themes.indexOf(theme);
    const nextIndex = (themeIndex + 1) % themes.length;
    const nextTheme = themes[nextIndex];
    config.update((config) => (config.theme = nextTheme));
  }

  // stop all responses
  const couldStop = ControllerPool.hasPending();
  const stopAll = () => ControllerPool.stopAll();

  return (
    <div className={chatStyle["chat-input-actions"]}>
      {/* 清除所有会话 */}
      <div
        className={`${chatStyle["chat-input-action"]} clickable`}
        onClick={() => {
          const confirmed = window.confirm(`确定要清除所有会话记录吗?`);
          if (confirmed) {
            clearSessions();
          }
        }}
        title={Locale.Settings.Actions.ClearAll}
      >
        <ClearIcon />
      </div>
      {couldStop && (
        <div
          className={`${chatStyle["chat-input-action"]} clickable`}
          onClick={stopAll}
        >
          <StopIcon />
        </div>
      )}
      {!props.hitBottom && (
        <div
          className={`${chatStyle["chat-input-action"]} clickable`}
          onClick={props.scrollToBottom}
        >
          <BottomIcon />
        </div>
      )}
      {props.hitBottom && (
        <div
          className={`${chatStyle["chat-input-action"]} clickable`}
          onClick={props.showPromptModal}
        >
          <BrainIcon />
        </div>
      )}

      <div
        className={`${chatStyle["chat-input-action"]} clickable`}
        onClick={nextTheme}
      >
        {theme === Theme.Auto ? (
          <AutoIcon />
        ) : theme === Theme.Light ? (
          <LightIcon />
        ) : theme === Theme.Dark ? (
          <DarkIcon />
        ) : null}
      </div>

      <div
        className={`${chatStyle["chat-input-action"]} clickable`}
        onClick={props.showPromptHints}
      >
        <PromptIcon />
      </div>

      <div
        className={`${chatStyle["chat-input-action"]} clickable`}
        onClick={() => {
          navigate(Path.Masks);
        }}
      >
        <MaskIcon />
      </div>
      {isMobileScreen() && (
        <div
          className={`${chatStyle["chat-input-action"]} clickable`}
          onClick={() => {
            if (config.dontShowMaskSplashScreen) {
              chatStore.newSession();
              navigate(Path.Chat);
            } else {
              navigate(Path.NewChat);
            }
          }}
        >
          <AddIcon />
          新聊天
        </div>
      )}
    </div>
  );
}

function LimitTipsModal(props: { onClose?: () => void }) {
  const navigate = useNavigate();
  return (
    <div className="modal-mask">
      <Modal
        onClose={props.onClose}
        title={"您的可用额度不足"}
        actions={[
          <IconButton
            key="copy"
            icon={<BottomIcon />}
            bordered
            text={"查看订阅"}
            onClick={() => navigate(Path.Vip)}
          />,
        ]}
      >
        <ul>
          <li>您可以付费购买</li>
          <li>或者邀请朋友关注我们的公众号，即可免费获取额度</li>
        </ul>
      </Modal>
    </div>
  );
}

export function Chat() {
  type RenderMessage = Message & { preview?: boolean };

  const chatStore = useChatStore();
  const [session, sessionIndex] = useChatStore((state) => [
    state.currentSession(),
    state.currentSessionIndex,
  ]);
  const config = useAppConfig();
  const fontSize = config.fontSize;

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [userInput, setUserInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { submitKey, shouldSubmit } = useSubmitHandler();
  const { scrollRef, setAutoScroll, scrollToBottom } = useScrollToBottom();
  const [hitBottom, setHitBottom] = useState(true);
  const isMobileScreen = useMobileScreen();
  const navigate = useNavigate();

  const onChatBodyScroll = (e: HTMLElement) => {
    const isTouchBottom = e.scrollTop + e.clientHeight >= e.scrollHeight - 100;
    setHitBottom(isTouchBottom);
  };

  // prompt hints
  const promptStore = usePromptStore();
  const [promptHints, setPromptHints] = useState<Prompt[]>([]);
  const onSearch = useDebouncedCallback(
    (text: string) => {
      setPromptHints(promptStore.search(text));
    },
    100,
    { leading: true, trailing: true },
  );

  const onPromptSelect = (prompt: Prompt) => {
    setPromptHints([]);
    inputRef.current?.focus();
    setTimeout(() => setUserInput(prompt.content), 60);
  };

  // auto grow input
  const [inputRows, setInputRows] = useState(2);
  const measure = useDebouncedCallback(
    () => {
      const rows = inputRef.current ? autoGrowTextArea(inputRef.current) : 1;
      const inputRows = Math.min(
        20,
        Math.max(2 + Number(!isMobileScreen), rows),
      );
      setInputRows(inputRows);
    },
    100,
    {
      leading: true,
      trailing: true,
    },
  );

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(measure, [userInput]);

  // only search prompts when user input is short
  const SEARCH_TEXT_LIMIT = 30;
  const onInput = (text: string) => {
    setUserInput(text);
    const n = text.trim().length;

    // clear search results
    if (n === 0) {
      setPromptHints([]);
    } else if (!config.disablePromptHint && n < SEARCH_TEXT_LIMIT) {
      // check if need to trigger auto completion
      if (text.startsWith("/")) {
        let searchText = text.slice(1);
        onSearch(searchText);
      }
    }
  };
  const accessStore = useAccessStore();
  const [activeTab, setActiveTab] = useState("tab1"); //模型选择
  const [shouldShowLimitTipsModal, setShowLimitTipsModal] = useState(false);

  const doSubmit = (userInput: string) => {
    if (userInput.trim() === "") return;
    setIsLoading(true);
    let currentModel = "gpt-3.5-turbo" as ModelType;
    if (activeTab === "tab2") {
      currentModel = "gpt-4";
    }
    //已发送消息，则继续使用消息中的模型
    if (session.messages.length > 0) {
      currentModel = session.messages[1].model as ModelType;
    }
    //检查是否有额度
    if (
      currentModel == "gpt-3.5-turbo" &&
      accessStore.chat_gpt_3 + accessStore.chat_gpt_3_reward <= 0
    ) {
      //弹窗提示错误
      setShowLimitTipsModal(true);
      return true;
    }
    if (
      currentModel == "gpt-4" &&
      accessStore.chat_gpt_4 + accessStore.chat_gpt_4_reward <= 0
    ) {
      //弹窗提示错误
      setShowLimitTipsModal(true);
      return true;
    }

    chatStore.onUserInput(userInput, currentModel).then(() => {
      setIsLoading(false);
      //扣减额度
      if (currentModel == "gpt-3.5-turbo") {
        if (accessStore.chat_gpt_3_reward > 0) {
          accessStore.decrementChatGpt3Reward();
        } else {
          accessStore.decrementChatGpt3();
        }
      } else {
        if (accessStore.chat_gpt_4_reward > 0) {
          accessStore.decrementChatGpt4Reward();
        } else {
          accessStore.decrementChatGpt4();
        }
      }
    });
    localStorage.setItem(LAST_INPUT_KEY, userInput);
    setUserInput("");
    setPromptHints([]);
    if (!isMobileScreen) inputRef.current?.focus();
    setAutoScroll(true);
  };

  // stop response
  const onUserStop = (messageId: number) => {
    ControllerPool.stop(sessionIndex, messageId);
  };

  // check if should send message
  const onInputKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // if ArrowUp and no userInput, fill with last input
    if (
      e.key === "ArrowUp" &&
      userInput.length <= 0 &&
      !(e.metaKey || e.altKey || e.ctrlKey)
    ) {
      setUserInput(localStorage.getItem(LAST_INPUT_KEY) ?? "");
      e.preventDefault();
      return;
    }
    if (shouldSubmit(e)) {
      doSubmit(userInput);
      e.preventDefault();
    }
  };
  const onRightClick = (e: any, message: Message) => {
    // copy to clipboard
    if (selectOrCopy(e.currentTarget, message.content)) {
      e.preventDefault();
    }
  };

  const findLastUserIndex = (messageId: number) => {
    // find last user input message and resend
    let lastUserMessageIndex: number | null = null;
    for (let i = 0; i < session.messages.length; i += 1) {
      const message = session.messages[i];
      if (message.id === messageId) {
        break;
      }
      if (message.role === "user") {
        lastUserMessageIndex = i;
      }
    }

    return lastUserMessageIndex;
  };

  const deleteMessage = (userIndex: number) => {
    chatStore.updateCurrentSession((session) =>
      session.messages.splice(userIndex, 2),
    );
  };

  const onDelete = (botMessageId: number) => {
    const userIndex = findLastUserIndex(botMessageId);
    if (userIndex === null) return;
    deleteMessage(userIndex);
  };

  const onResend = (botMessageId: number) => {
    // find last user input message and resend
    const userIndex = findLastUserIndex(botMessageId);
    if (userIndex === null) return;

    setIsLoading(true);
    const content = session.messages[userIndex].content;
    deleteMessage(userIndex);
    let currentModel = "gpt-3.5-turbo" as ModelType;
    if (activeTab === "tab2") {
      currentModel = "gpt-4";
    }
    //已发送消息，则继续使用消息中的模型
    if (session.messages.length > 0) {
      currentModel = session.messages[1].model as ModelType;
    }
    chatStore
      .onUserInput(content, currentModel)
      .then(() => setIsLoading(false));
    inputRef.current?.focus();
  };

  const context: RenderMessage[] = session.mask.context.slice();

  if (
    context.length === 0 &&
    session.messages.at(0)?.content !== BOT_HELLO.content
  ) {
    const copiedHello = Object.assign({}, BOT_HELLO);
    if (!accessStore.isAuthorized()) {
      //扫码关注公众号
      let qrcode = "[](/q.jpg)";
      const q = getQueryParams("q");
      const shareMark = localStorage.getItem(StoreKey.Share); //分享标记
      let shareUser = q;
      if (shareMark) {
        shareUser = shareMark;
      }
      if (shareUser) {
        // 有q参数，则是分享链接，动态生成推荐二维码
        qrcode = "[](/api/share?q=" + shareUser + ")";
      }
      copiedHello.content = Locale.Error.Unauthorized + qrcode;
    }
    context.push(copiedHello);
  }

  //console.log("context", "聊天窗口");
  // preview messages
  const messages = context
    .concat(session.messages as RenderMessage[])
    .concat(
      isLoading
        ? [
            {
              ...createMessage({
                role: "assistant",
                content: "……",
              }),
              preview: true,
            },
          ]
        : [],
    )
    .concat(
      userInput.length > 0 && config.sendPreviewBubble
        ? [
            {
              ...createMessage({
                role: "user",
                content: userInput,
              }),
              preview: true,
            },
          ]
        : [],
    );

  const [showPromptModal, setShowPromptModal] = useState(false);

  const renameSession = () => {
    const newTopic = prompt(Locale.Chat.Rename, session.topic);
    if (newTopic && newTopic !== session.topic) {
      chatStore.updateCurrentSession((session) => (session.topic = newTopic!));
    }
  };

  const location = useLocation();
  const isChat = location.pathname === Path.Chat;
  const autoFocus = !isMobileScreen || isChat; // only focus in chat page

  useCommand({
    fill: setUserInput,
    submit: (text) => {
      doSubmit(text);
    },
  });
  // 模型选择切换
  let modelSelect = (
    <ul className="tabs">
      <li
        className={activeTab === "tab1" ? "tab active-tab" : "tab"}
        onClick={() => {
          setActiveTab("tab1");
        }}
      >
        <button
          className="button"
          title="速度较快模型，非常适用于大多数日常任务"
        >
          <LightningIcon className="lighting" />
          GPT-3.5
        </button>
      </li>
      <li
        className={activeTab === "tab2" ? "tab active-tab" : "tab"}
        onClick={() => {
          setActiveTab("tab2");
        }}
      >
        <button
          className="button"
          title="最强模型，非常适合需要创新和高级推理的任务。"
        >
          <StarsIcon className="stars" />
          GPT-4
        </button>
      </li>
    </ul>
  );

  if (session.messages.length > 0) {
    if (session.messages[1].model == "gpt-3.5-turbo") {
      modelSelect = (
        <ul className="tabs">
          <li className="tab">
            <button className="button">
              <LightningIcon className="lighting" />
              GPT-3.5
            </button>
          </li>
        </ul>
      );
    } else if (session.messages[1].model == "gpt-4") {
      modelSelect = (
        <ul className="tabs">
          <li className="tab">
            <button className="button">
              <StarsIcon className="stars" />
              GPT-4
            </button>
          </li>
        </ul>
      );
    }
  }

  return (
    <div className={styles.chat} key={session.id}>
      <div className="window-header">
        <div className="window-header-title">
          <div
            className={`window-header-main-title " ${styles["chat-body-title"]}`}
            onClickCapture={renameSession}
          >
            {!session.topic ? DEFAULT_TOPIC : session.topic}
          </div>
          <div className="window-header-sub-title">
            {Locale.Chat.SubTitle(session.messages.length)}
          </div>
        </div>
        <div className="window-actions">
          <div className={"window-action-button" + " " + styles.mobile}>
            <IconButton
              icon={<MenuIcon />}
              bordered
              title={Locale.Chat.Actions.ChatList}
              onClick={() => navigate(Path.Home)}
            />
          </div>
          <div className="window-action-button">
            <IconButton
              icon={<RenameIcon />}
              bordered
              onClick={renameSession}
            />
          </div>
          <div className="window-action-button">
            <IconButton
              icon={<ExportIcon />}
              bordered
              title={Locale.Chat.Actions.Export}
              onClick={() => {
                exportMessages(
                  session.messages.filter((msg) => !msg.isError),
                  session.topic,
                );
              }}
            />
          </div>
          {!isMobileScreen && (
            <div className="window-action-button">
              <IconButton
                icon={config.tightBorder ? <MinIcon /> : <MaxIcon />}
                bordered
                onClick={() => {
                  config.update(
                    (config) => (config.tightBorder = !config.tightBorder),
                  );
                }}
              />
            </div>
          )}
        </div>

        {/* <PromptToast
          showToast={!hitBottom}
          showModal={showPromptModal}
          setShowModal={setShowPromptModal}
        /> */}
      </div>
      <div className="window-header-model">{modelSelect}</div>

      <div
        className={styles["chat-body"]}
        ref={scrollRef}
        onScroll={(e) => onChatBodyScroll(e.currentTarget)}
        onMouseDown={() => inputRef.current?.blur()}
        onWheel={(e) => setAutoScroll(hitBottom && e.deltaY > 0)}
        onTouchStart={() => {
          inputRef.current?.blur();
          setAutoScroll(false);
        }}
      >
        {messages.map((message, i) => {
          const isUser = message.role === "user";
          const showActions =
            !isUser &&
            i > 0 &&
            !(message.preview || message.content.length === 0);
          const showTyping = message.preview || message.streaming;

          return (
            <div
              key={i}
              className={
                isUser ? styles["chat-message-user"] : styles["chat-message"]
              }
            >
              <div className={styles["chat-message-container"]}>
                <div className={styles["chat-message-avatar"]}>
                  {message.role === "user" ? (
                    <Avatar avatar={config.avatar} />
                  ) : (
                    <MaskAvatar mask={session.mask} />
                  )}
                </div>
                {showTyping && (
                  <div className={styles["chat-message-status"]}>
                    {Locale.Chat.Typing}
                  </div>
                )}
                <div className={styles["chat-message-item"]}>
                  {showActions && (
                    <div className={styles["chat-message-top-actions"]}>
                      {message.streaming ? (
                        <div
                          className={styles["chat-message-top-action"]}
                          onClick={() => onUserStop(message.id ?? i)}
                        >
                          {Locale.Chat.Actions.Stop}
                        </div>
                      ) : (
                        <>
                          <div
                            className={styles["chat-message-top-action"]}
                            onClick={() => onDelete(message.id ?? i)}
                          >
                            {Locale.Chat.Actions.Delete}
                          </div>
                          <div
                            className={styles["chat-message-top-action"]}
                            onClick={() => onResend(message.id ?? i)}
                          >
                            {Locale.Chat.Actions.Retry}
                          </div>
                        </>
                      )}

                      <div
                        className={styles["chat-message-top-action"]}
                        onClick={() => copyToClipboard(message.content)}
                      >
                        {Locale.Chat.Actions.Copy}
                      </div>
                    </div>
                  )}
                  <Markdown
                    content={message.content}
                    loading={
                      (message.preview || message.content.length === 0) &&
                      !isUser
                    }
                    onContextMenu={(e) => onRightClick(e, message)}
                    onDoubleClickCapture={() => {
                      if (!isMobileScreen) return;
                      setUserInput(message.content);
                    }}
                    fontSize={fontSize}
                    parentRef={scrollRef}
                    defaultShow={i >= messages.length - 10}
                  />
                </div>
                {!isUser && !message.preview && (
                  <div className={styles["chat-message-actions"]}>
                    <div className={styles["chat-message-action-date"]}>
                      {message.date.toLocaleString()}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className={styles["chat-input-panel"]}>
        <PromptHints prompts={promptHints} onPromptSelect={onPromptSelect} />

        <ChatActions
          showPromptModal={() => setShowPromptModal(true)}
          scrollToBottom={scrollToBottom}
          hitBottom={hitBottom}
          showPromptHints={() => {
            // Click again to close
            if (promptHints.length > 0) {
              setPromptHints([]);
              return;
            }

            inputRef.current?.focus();
            setUserInput("/");
            onSearch("");
          }}
        />
        <div className={styles["chat-input-panel-inner"]}>
          <textarea
            ref={inputRef}
            className={styles["chat-input"]}
            placeholder={Locale.Chat.Input(submitKey)}
            onInput={(e) => onInput(e.currentTarget.value)}
            value={userInput}
            onKeyDown={onInputKeyDown}
            onFocus={() => setAutoScroll(true)}
            onBlur={() => setAutoScroll(false)}
            rows={inputRows}
            autoFocus={autoFocus}
          />
          <IconButton
            icon={<SendWhiteIcon />}
            text={Locale.Chat.Send}
            className={styles["chat-input-send"]}
            type="primary"
            onClick={() => doSubmit(userInput)}
          />
        </div>
      </div>
      {shouldShowLimitTipsModal && (
        <LimitTipsModal onClose={() => setShowLimitTipsModal(false)} />
      )}
    </div>
  );
}
