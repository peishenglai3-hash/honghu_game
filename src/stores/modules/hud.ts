import { computed, ref, reactive } from "vue";
import { defineStore } from "pinia";
import { useGameStateStore } from "@/stores/modules/gameState";
import { useGameSaveStore } from "@/stores";
import { defaultAvatarForSpeaker } from "@/common/avatarCatalog";
import type { PortraitResult } from "@/common/actionProfileSystem";

// ===== 类型定义 =====

export interface NarrativeEntry {
  entry_id: string;
  kind: string;
  speaker_id?: string;
  speaker_name?: string;
  text: string;
  style: string;
  cps?: number;
  advance?: string;
  avatar_id?: string;
  sfx?: string;
}

export interface TaskCard {
  title: string;
  detail: string;
  guidance?: string;
}

export interface TaskCardEntry extends TaskCard {
  id: number;
}

export interface ItemPanel {
  icon: string;
  title: string;
  text: string;
  closable: boolean;
}

export interface InfoPanel {
  title: string;
  items: string[];
  continueLabel?: string;
  onContinue?: () => void;
}

export interface ChoiceItem {
  id: string;
  label: string;
  detail: string;
  disabled?: boolean;
}

export interface ChoicePanel {
  title: string;
  items: ChoiceItem[];
  onChoose: (id: string) => void;
}

export interface ResultPanelData {
  image: string;
  result: [string, string];
  hint?: string;
  /**
   * Optional page sequence for a result that needs to reveal several authored
   * images and text blocks. Existing one-page result panels remain unchanged.
   */
  pages?: ResultPanelPage[];
  pageIndex?: number;
  onComplete?: () => void;
}

export interface ResultPanelPage {
  image: string;
  result: [string, string];
}

export interface EndPanel {
  title: string;
  hint: string;
  buttonLabel: string;
  next: "title" | "chapter2" | "chapter3" | "chapter4" | null;
  checkpoint: string;
  summary: string;
}

export interface PortraitPanelData {
  portrait: PortraitResult;
  posterSrc: string;
  coreTendency: string;
}

export interface CombatHudData {
  visible: boolean;
  hp: number;
  maxHp: number;
  ammo: number;
  reserve: number;
  weapon: "pistol" | "longgun";
  weaponLabel: string;
  objective: string;
  captured: number;
  captureTotal: number;
  pursuitProgress: number;
  status: string;
}

export interface DevPlayerMotionConfig {
  movement_multiplier?: number;
  animation_multiplier?: number;
}

// ===== 内部状态（模块级，非响应式） =====

let _flavorTimer: number | null = null;
let _narrativeTimer: number | null = null;
let _narrativeQueue: NarrativeEntry[] = [];
let _narrativeIndex = 0;
let _narrativeOnComplete: (() => void) | null = null;
let _taskId = 0;
let _testTaskIndex = 0;
const DEV_PLAYER_TUNING_DEFAULT = 1;
const DEV_PLAYER_TUNING_MIN = 0.25;
const DEV_PLAYER_TUNING_MAX = 3;

function clampDevPlayerTuning(value: number): number {
  return Math.min(DEV_PLAYER_TUNING_MAX, Math.max(DEV_PLAYER_TUNING_MIN, value));
}

function normalizedDevPlayerTuning(value: unknown, fallback = DEV_PLAYER_TUNING_DEFAULT): number {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? clampDevPlayerTuning(numeric) : fallback;
}

function inferTaskGuidance(task: TaskCard): string | undefined {
	const text = `${task.title} ${task.detail}`;

	// 任务提示必须按剧情节点匹配，不能用“门边”等泛化词兜底。
	// 第二章的正厅、渔民和第一章的半掩木门都可能出现“门边”，
	// 但它们对应的是不同的交互对象；标题优先能避免提示串线。
	const guidanceRules: Array<[RegExp, string]> = [
		[/名字留在纸上.*查看纪念碑|查看纪念碑、笔记或采访设备/, "查看纪念碑、笔记和采访设备"],
		[/名字留在纸上|纪念碑附近|碑文|确认笔记中的那个名字/, "前往纪念碑查看碑文与姓名"],
		[/整理今天的材料|录音听完了|没写完的问题补完/, "先听录音再补完问题"],
		[/完成三处固定观察/, "依次查看铜盆、书案与门边衣物"],
		[/回应家人|家人的问话/, "找到家人并回应这段问话"],
		[/查看未干的墨|回到书案|查看纸与笔/, "回到书案查看纸张与未干的墨"],
		[/门外有人/, "走到半掩木门前查看来人"],
		[/离开陈家|推开半掩的木门/, "推开半掩木门进入院子"],
		[/闪回·状纸.*状纸写好了|状纸写好了.*交给渔民/, "把写好的状纸交给渔民"],
		[/闪回·状纸/, "到门边听渔民把话说完"],
		[/院墙阴影下：联络通知/, "走近右侧联络人听通知"],
		[/走到院墙下|院墙阴影下|联络人/, "前往院墙下与联络人交谈"],

		[/抵达·陈家祠堂/, "前往正厅门口听取接应"],
		[/正厅内的部署/, "在正厅门口听取行动部署"],
		[/闪回二/, "按 E 进入抓壮丁闪回"],
		[/祠堂会议：宣布战时纪律/, "前往正厅矮桌旁听纪律"],
		[/正式选择一：接受小组安排/, "找黄色感叹号标记的负责人"],
		[/正式选择一｜完成/, "前往侧墙物资包裹处"],
		[/物资准备/, "到侧墙包裹旁找组长"],
		[/正式选择二：协助准备｜完成/, "按 E 进入出发前交代"],

		[/第三章·杜家大院外围/, "前往隐蔽处等待行动"],
		[/行动前重新安排/, "查看组长重新安排的任务"],
		[/交互一.*等待行动时的观察/, "在隐蔽处选择观察重点"],
		[/闪回三/, "按 E 进入门外闪回"],
		[/行动开始：三路同时展开/, "按 E 开始三路合围行动"],
		[/大门受阻：决定火攻榨房/, "前往组长处听火攻安排"],
		[/交互二：大门合拢后/, "选择先稳住哪一处"],
		[/交互三：撞门前/, "在前门附近选择进入位置"],
		[/交互三完成|大门撞开：三路合拢/, "进入院内控制团丁并跟随"],
		[/交互四：杜老三逃走后/, "找组长确认院内控制安排"],
		[/战后清点：行动结束后的第一件事/, "找组长选择优先协助事项"],
		[/交互六：月饼的处理/, "找组长决定月饼如何处理"],
		[/行动结束：三路结果汇合/, "找组长听取三路汇合结果"],
		[/行动前撤换|行动后撤回|暂停参与|突入暂时受阻/, "按 E 查看撤回安排"],

		[/补完序章|怎样补完这句话|最终选择/, "阅读材料后选择补完答案"],
		[/画像结算/, "查看本次画像结算结果"],
	];

	for (const [pattern, guidance] of guidanceRules) {
		if (pattern.test(text)) return guidance;
	}
	return undefined;
}

// ===== 覆盖层场景类型（全屏流程组件，同一时刻只显示一个） =====

export type SceneOverlay = "Scene1Overlay" | "Scene2Overlay" | "Scene3Overlay" | null;

// ===== Pinia Store（Setup Store 风格） =====

export const useHudStore = defineStore("hud", () => {
  const gameState = useGameStateStore();
  const gameSave = useGameSaveStore();

  // --- overlay scene (intro video / future full-screen flows) ---
  const overlay = ref<SceneOverlay>(null);

  // --- title sub panels ---
  const title = reactive({ loadOpen: false, settingsOpen: false });

  // --- developer player tuning ---
  const devPlayerTuning = reactive({
    movementMultiplier: DEV_PLAYER_TUNING_DEFAULT,
    animationMultiplier: DEV_PLAYER_TUNING_DEFAULT,
  });

  // --- task card ---
  const taskCards = ref<TaskCardEntry[]>([]);
  const taskCenterId = ref<number | null>(null);
  const taskWindowStart = ref(0);
  const taskCenter = computed(() => taskCenterId.value !== null);
  const visibleTaskCards = computed(() =>
    taskCards.value.slice(taskWindowStart.value, taskWindowStart.value + 3),
  );
  const taskWindowCount = computed(() => Math.max(1, taskCards.value.length - 2));

  // --- interaction prompt ---
  const prompt = ref("");

  // --- dialogue ---
  const dialogue = reactive({
    visible: false,
    style: "narration" as string,
    speaker: "",
    avatarSrc: "",
    fullText: "",
    displayedText: "",
    cps: 14,
    typing: false,
    hint: "空格 继续",
  });

  // --- item panel ---
  const itemPanel = ref<ItemPanel | null>(null);

  // --- full-screen factual/context card ---
  const infoPanel = ref<InfoPanel | null>(null);

  // --- choice panel ---
  const choicePanel = ref<ChoicePanel | null>(null);

  // --- result panel ---
  const resultPanelVisible = ref(false);
  const resultPanel = ref<ResultPanelData | null>(null);

  // --- scene fade ---
  const sceneFade = ref(false);

  // --- pause ---
  const paused = ref(false);

  // --- flavor toast ---
  const flavorToast = ref("");

  // --- end panel ---
  const endPanel = ref<EndPanel | null>(null);

  // --- final portrait result (independent from chapter-complete dialog) ---
  const portraitPanel = ref<PortraitPanelData | null>(null);

  // --- 通关致谢滚动字幕（与画像结算分离，沿用画像场景 BGM） ---
  const creditsVisible = ref(false);

  // --- transition overlay ---
  const transition = reactive({
    active: false,
    subtitleVisible: true,
    subtitleStyle: "cue" as string,
    kindText: "",
    text: "",
    dateVisible: false,
    dateText: "",
    revealShown: false,
    revealFadeIn: false,
    revealSrc: "",
  });

  // --- 第三章突入战斗 HUD（只展示场景事件，不持有战斗规则） ---
  const combatHud = reactive<CombatHudData>({
    visible: false,
    hp: 100,
    maxHp: 100,
    ammo: 12,
    reserve: 48,
    weapon: "pistol",
    weaponLabel: "短枪",
    objective: "",
    captured: 0,
    captureTotal: 3,
    pursuitProgress: 0,
    status: "",
  });

  // --- global lock ---
  const playerLocked = ref(false);

  function resetDevPlayerTuning() {
    devPlayerTuning.movementMultiplier = DEV_PLAYER_TUNING_DEFAULT;
    devPlayerTuning.animationMultiplier = DEV_PLAYER_TUNING_DEFAULT;
  }

  function applyDevPlayerMotionFromJson(config?: DevPlayerMotionConfig) {
    devPlayerTuning.movementMultiplier = normalizedDevPlayerTuning(config?.movement_multiplier);
    devPlayerTuning.animationMultiplier = normalizedDevPlayerTuning(config?.animation_multiplier);
  }

  function devPlayerMotionJson(): DevPlayerMotionConfig {
    return {
      movement_multiplier: normalizedDevPlayerTuning(devPlayerTuning.movementMultiplier),
      animation_multiplier: normalizedDevPlayerTuning(devPlayerTuning.animationMultiplier),
    };
  }

  // ===== 内部函数 =====

  function _renderCurrentEntry() {
    const entry = _narrativeQueue[_narrativeIndex];
    if (!entry) {
      _finishNarrative();
      return;
    }
		if (typeof window !== "undefined")
			window.dispatchEvent(
				new CustomEvent("honghu:narrative-entry", {
					detail: { entryId: entry.entry_id },
				}),
			);
    const cps = Math.max(4, Math.round((entry.cps || 14) * gameSave.getTextSpeedMult()));
    dialogue.visible = true;
    dialogue.style = entry.style || "narration";
    dialogue.speaker = entry.speaker_name || "";
		// 内容可显式指定头像；叙述/音效提示不伪装成角色头像，
		// 对白和心理描写则按发言者回退到统一头像目录。
		dialogue.avatarSrc =
			entry.avatar_id ||
			(entry.kind === "dialogue" || entry.kind === "thought"
				? defaultAvatarForSpeaker(entry.speaker_name || "")
				: "");
    dialogue.fullText = entry.text;
    dialogue.displayedText = "";
    dialogue.cps = cps;
    dialogue.typing = true;
    dialogue.hint = "空格 继续";

    // 打字动画
    if (_narrativeTimer) window.clearInterval(_narrativeTimer);
    const chars = [...entry.text];
    let cursor = 0;
    _narrativeTimer = window.setInterval(() => {
      dialogue.displayedText = chars.slice(0, ++cursor).join("");
      if (cursor >= chars.length) {
        window.clearInterval(_narrativeTimer!);
        _narrativeTimer = null;
        dialogue.typing = false;
      }
    }, Math.max(20, 1000 / cps));
  }

  function _finishNarrative() {
    dialogue.visible = false;
    dialogue.typing = false;
    if (_narrativeTimer) window.clearInterval(_narrativeTimer);
    _narrativeTimer = null;
    playerLocked.value = false;
    gameState.state.inNarrative = false;
    gameState.state.playerLocked = false;
    const done = _narrativeOnComplete;
    _narrativeOnComplete = null;
    _narrativeQueue = [];
    done?.();
  }

  // ===== Actions =====

  // --- 风味气泡 ---
  function showFlavor(text: string) {
    flavorToast.value = text;
    if (_flavorTimer) window.clearTimeout(_flavorTimer);
    _flavorTimer = window.setTimeout(() => {
      flavorToast.value = "";
    }, 2600);
  }

  // --- 叙事链 ---
  function playNarrative(entries: NarrativeEntry[], onComplete?: () => void) {
    _narrativeQueue = entries;
    _narrativeIndex = 0;
    _narrativeOnComplete = onComplete ?? null;
    dialogue.visible = true;
    playerLocked.value = true;
    gameState.state.inNarrative = true;
    gameState.state.playerLocked = true;
    _renderCurrentEntry();
  }

  function advanceNarrative() {
    if (!dialogue.visible) return;
    if (dialogue.typing) {
      // 跳过打字
      if (_narrativeTimer) window.clearInterval(_narrativeTimer);
      _narrativeTimer = null;
      dialogue.typing = false;
      dialogue.displayedText = dialogue.fullText;
      return;
    }
    _narrativeIndex += 1;
    _renderCurrentEntry();
  }

  function hideDialogue() {
    dialogue.visible = false;
    dialogue.typing = false;
    if (_narrativeTimer) window.clearInterval(_narrativeTimer);
    _narrativeTimer = null;
    _narrativeQueue = [];
    _narrativeOnComplete = null;
    gameState.state.inNarrative = false;
  }

  // --- 物品面板 ---
  function showItem(item: { icon: string; title: string; text: string }) {
    itemPanel.value = { ...item, closable: true };
    playerLocked.value = true;
  }

  function showItemPassive(item: { icon: string; title: string; text: string }) {
    itemPanel.value = { ...item, closable: false };
  }

  function closeItem() {
    itemPanel.value = null;
    playerLocked.value = false;
  }

  function hideItem() {
    itemPanel.value = null;
  }

  function showInfoPanel(panel: InfoPanel) {
    infoPanel.value = panel;
    gameState.state.playerLocked = true;
  }

  function closeInfoPanel() {
    const onContinue = infoPanel.value?.onContinue;
    infoPanel.value = null;
    onContinue?.();
  }

  function hideInfoPanel() {
    infoPanel.value = null;
  }

  function itemPanelOpen(): boolean {
    return itemPanel.value !== null;
  }

  // --- 选择面板 ---
  function showChoices(
    items: ChoiceItem[],
    onChoose: (id: string) => void,
    titleStr: string = "走访结束前，最后确认什么？",
  ) {
    // 选择面板只呈现“选什么”，不泄露画像/风险的后端权重。
    // 具体数值仍保留在 FormalChoiceDefinition 中，由统一系统结算，
    // 这样既不改变存档和分支逻辑，也避免未来新增 ChoicePanel UI 时误把 detail 渲染给玩家。
    const presentationItems = items.map((item) => ({ ...item, detail: "" }));
    choicePanel.value = { title: titleStr, items: presentationItems, onChoose };
  }

  function hideChoices() {
    choicePanel.value = null;
  }

  // --- 结果面板 ---
  function showResult(choice: ResultPanelData) {
    resultPanel.value = choice;
    resultPanelVisible.value = true;
  }

  function hideResult() {
    resultPanelVisible.value = false;
    resultPanel.value = null;
  }

  /**
   * Advance a multi-page authored result. This is intentionally separate from
   * advanceNarrative so a choice result cannot accidentally advance a scene's
   * dialogue queue or expose backend choice effects in the HUD.
   */
  function advanceResult(): boolean {
    if (!resultPanelVisible.value || !resultPanel.value) return false;
    const current = resultPanel.value;
    const pages = current.pages ?? [];
    const index = current.pageIndex ?? 0;
    if (index + 1 < pages.length) {
      const next = pages[index + 1];
      resultPanel.value = {
        ...current,
        image: next.image,
        result: next.result,
        pageIndex: index + 1,
      };
      return true;
    }

    const onComplete = current.onComplete;
    hideResult();
    onComplete?.();
    return true;
  }

  // --- 任务卡片（两段式：居中强制确认 → 右上角待办） ---
  function showTask(task: TaskCard, centerWhenEmpty = true) {
    const shouldCenter = centerWhenEmpty && taskCards.value.length === 0;
    const entry = { ...task, guidance: task.guidance || inferTaskGuidance(task), id: ++_taskId };
    taskCards.value.unshift(entry);
    taskWindowStart.value = 0;
    gameState.state.taskOpen = true;
    if (shouldCenter) {
      gameState.state.taskPreviousLock = gameState.state.playerLocked;
      gameState.state.playerLocked = true;
      taskCenterId.value = entry.id;
    }
  }

  function closeTask() {
    if (!gameState.state.taskOpen) return;
    // 第一段：居中 → 缩到右上角
    if (taskCenterId.value !== null) {
      taskCenterId.value = null;
      gameState.state.playerLocked = ["explore", "leave_walk"].includes(gameState.state.mode)
        ? false
        : gameState.state.taskPreviousLock;
      return;
    }
    // 第二段：右上角 → 彻底关闭
    taskCards.value.splice(taskWindowStart.value, 1);
    taskWindowStart.value = Math.min(
      taskWindowStart.value,
      Math.max(0, taskCards.value.length - 3),
    );
    gameState.state.taskOpen = taskCards.value.length > 0;
  }

  function hideTask() {
    gameState.state.taskOpen = false;
    taskCards.value = [];
    taskCenterId.value = null;
    taskWindowStart.value = 0;
  }

  function taskNeedsConfirmation(): boolean {
    return taskCenterId.value !== null;
  }

  function showNewerTasks() {
    taskWindowStart.value = Math.max(0, taskWindowStart.value - 1);
  }

  function showOlderTasks() {
    taskWindowStart.value = Math.min(
      Math.max(0, taskCards.value.length - 3),
      taskWindowStart.value + 1,
    );
  }

  function addTestTask() {
    _testTaskIndex += 1;
    showTask({
      title: `测试任务 ${_testTaskIndex}`,
      detail: "仅用于查看任务堆叠与切换效果，不会写入 JSON。",
    }, false);
  }

  // --- 交互提示 ---
  function showPrompt(text: string) {
    prompt.value = text;
  }

  function hidePrompt() {
    prompt.value = "";
  }

  // --- 淡入淡出 ---
  function fadeToBlack() {
    sceneFade.value = true;
  }

  function clearFade() {
    sceneFade.value = false;
  }

  // --- 暂停 ---
  function togglePause() {
    paused.value = !paused.value;
	gameState.state.paused = paused.value;
  }

  // --- overlay scene ---
  function showOverlay(scene: Exclude<SceneOverlay, null>) {
    overlay.value = scene;
  }

  function hideOverlay() {
    overlay.value = null;
  }

  function hideIntro() {
    overlay.value = null;
  }

  // --- 结算 ---
  function showEndPanel(
    save: {
      checkpointLabel: string;
      checkpoint: string;
      profile: Record<string, number>;
      choiceTag: string | null;
      fixed: string[];
      risk: { identity: number; execution: number; coordination: number };
    },
    endMeta?: {
      title?: string;
      hint?: string;
      buttonLabel?: string;
		next?: "title" | "chapter2" | "chapter3" | "chapter4" | null;
    },
  ) {
    endPanel.value = {
      title: endMeta?.title ?? "序章·名字留在纸上｜完成",
      hint: endMeta?.hint ?? "第一章·陈继南家中醒来",
      buttonLabel: endMeta?.buttonLabel ?? "进入第一章",
      next: endMeta?.next ?? null,
      checkpoint: `固定回退点：${save.checkpointLabel}（${save.checkpoint}）`,
      summary: "你的选择已经被记录，后续安排与最终画像将在故事中逐步显现。",
    };
  }

  function hideEndPanel() {
    endPanel.value = null;
  }

  function showPortraitResult(data: PortraitPanelData) {
    portraitPanel.value = data;
    playerLocked.value = true;
    gameState.state.playerLocked = true;
    gameState.state.mode = "end";
  }

  function hidePortraitResult() {
    portraitPanel.value = null;
  }

  function showCredits() {
    creditsVisible.value = true;
    playerLocked.value = true;
    gameState.state.playerLocked = true;
    gameState.state.mode = "end";
  }

  function hideCredits() {
    creditsVisible.value = false;
  }

  function showCombatHud(data: Partial<CombatHudData> = {}) {
    Object.assign(combatHud, data, { visible: true });
  }

  function updateCombatHud(data: Partial<CombatHudData>) {
    Object.assign(combatHud, data);
  }

  function hideCombatHud() {
    combatHud.visible = false;
  }

  return {
    overlay,
    title,
    taskCards,
    devPlayerTuning,
    taskCenter,
    taskCenterId,
    taskWindowStart,
    taskWindowCount,
    visibleTaskCards,
    prompt,
    dialogue,
    itemPanel,
    infoPanel,
    choicePanel,
    resultPanelVisible,
    resultPanel,
    sceneFade,
    paused,
    flavorToast,
    endPanel,
    portraitPanel,
    creditsVisible,
    transition,
    combatHud,
    playerLocked,
    // actions
    showFlavor,
    resetDevPlayerTuning,
    applyDevPlayerMotionFromJson,
    devPlayerMotionJson,
    playNarrative,
    advanceNarrative,
    hideDialogue,
    showItem,
    showItemPassive,
    closeItem,
    hideItem,
    showInfoPanel,
    closeInfoPanel,
    hideInfoPanel,
    itemPanelOpen,
    showChoices,
    hideChoices,
    showResult,
    hideResult,
    advanceResult,
    showTask,
    closeTask,
    hideTask,
    taskNeedsConfirmation,
    showNewerTasks,
    showOlderTasks,
    addTestTask,
    showPrompt,
    hidePrompt,
    fadeToBlack,
    clearFade,
    togglePause,
    showOverlay,
    hideOverlay,
    hideIntro,
    showEndPanel,
    hideEndPanel,
    showPortraitResult,
    hidePortraitResult,
    showCredits,
    hideCredits,
    showCombatHud,
    updateCombatHud,
    hideCombatHud,
  };
});
