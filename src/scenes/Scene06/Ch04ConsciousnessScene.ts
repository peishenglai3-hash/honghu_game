import Phaser from "phaser";
import { onAction } from "@/common/actions";
import { actorDepth } from "@/common/displayDepth";
import {
	advanceNarrative,
	clearFade,
	fadeToBlack,
	hideChoices,
	hideDialogue,
	hideEndPanel,
	hideInfoPanel,
	hideItem,
	hidePrompt,
	hideResult,
	hideTask,
	playNarrative,
} from "@/common/ui";
import {
	mountLayeredMap,
	preloadLayeredMap,
	type LayeredMapObjectDocument,
} from "@/common/layeredMap";
import { useGameSaveStore } from "@/stores/modules/gameSave";
import { useGameStateStore } from "@/stores/modules/gameState";
import {
	CH04_WANGYE_TEMPLE_MAPS,
	type Ch04TempleShot,
} from "./ch04WangyeTempleMap";
import { CH04_CONSCIOUSNESS_NARRATIVE } from "./ch04Scene2.content";
import {
	createCh04TempleFlag,
	preloadCh04TempleCharacters,
	setupCh04TempleActors,
} from "./ch04TemplePresentation";
// @ts-ignore Shared JS helpers are intentionally untyped in the current project.
import { ensureActorVisualConfig, createActorVisualEntry } from "../../actor-collider.js";
// @ts-ignore Shared developer editor is JavaScript and used by existing scenes.
import { CollisionEditor } from "../../zone-editor.js";

const WORLD_W = 1664;
const WORLD_H = 936;
const CAMERA_ZOOM = 1280 / WORLD_W;
const SCENE_COMPLETE_FLAG = "CH04_SC02_COMPLETE";

/**
 * 第四章场景二：意识交错。
 *
 * 这是一个固定镜头的意识过渡：不创建玩家 CharacterBody、不注册移动
 * 输入、不添加碰撞体。唯一可用输入是推进 HUD 对话；场景结束后只发出
 * 一个事件，由导演层接收并接入后续穿越剧情。
 */
export class Ch04ConsciousnessScene extends Phaser.Scene {
	zoneEditor: any;
	shot: Ch04TempleShot = "SHOT_WIDE";
	definition = CH04_WANGYE_TEMPLE_MAPS.SHOT_WIDE;
	objectDocument!: LayeredMapObjectDocument;
	mapDocumentFile = "";
	actors: Phaser.GameObjects.Image[] = [];
	ambientActors: Phaser.GameObjects.Image[] = [];
	actorVisualProfiles: Record<string, any> = {};
	actorVisualEntries: any[] = [];
	instabilityGhosts: Phaser.GameObjects.Image[] = [];
	flagGraphic?: Phaser.GameObjects.Graphics;
	instabilityGraphic?: Phaser.GameObjects.Graphics;
	completed = false;

	get state() {
		return useGameStateStore().state;
	}

	constructor() {
		super("Ch04ConsciousnessScene");
	}

	init(data?: { shot?: Ch04TempleShot }) {
		this.shot = data?.shot && data.shot in CH04_WANGYE_TEMPLE_MAPS ? data.shot : "SHOT_WIDE";
		this.definition = CH04_WANGYE_TEMPLE_MAPS[this.shot];
		this.actors = [];
		this.ambientActors = [];
		this.actorVisualProfiles = {};
		this.actorVisualEntries = [];
		this.instabilityGhosts = [];
		this.flagGraphic = undefined;
		this.instabilityGraphic = undefined;
		this.completed = false;
	}

	preload() {
		this.definition = CH04_WANGYE_TEMPLE_MAPS[this.shot];
		preloadLayeredMap(this, this.definition);
		preloadCh04TempleCharacters(this);
	}

	create() {
		this.resetHud();
		this.sound.stopAll();
		this.cameras.main.setBackgroundColor("#c5b28f");

		const mounted = mountLayeredMap(this, this.definition);
		this.objectDocument = mounted.objectDocument;
		this.cameras.main
			.setBounds(0, 0, WORLD_W, WORLD_H)
			.setZoom(CAMERA_ZOOM)
			.centerOn(WORLD_W / 2, WORLD_H / 2);

		const people = setupCh04TempleActors(this, this.objectDocument, {
			unstable: true,
			animateAmbient: false,
		});
		this.actors = people.actors;
		this.ambientActors = people.ambientActors;
		this.instabilityGhosts = people.instabilityGhosts;
		this.flagGraphic = createCh04TempleFlag(this, 1);
		this.mapDocumentFile = `public/data/${this.definition.objectPath.replace(/^data\//, "")}`;
		this.registerTempleActorVisuals();
		this.setupZoneEditor();
		this.setupInstabilityDetails();

		this.completed = this.state.flags.has(SCENE_COMPLETE_FLAG);
		this.state.playerLocked = true;
		this.state.mode = "narrative";

		if (this.completed) {
			this.state.mode = "transition";
			hideDialogue();
			fadeToBlack();
		} else {
			this.time.delayedCall(160, () => {
				if (this.scene.isActive())
					playNarrative(CH04_CONSCIOUSNESS_NARRATIVE, () => this.completeScene());
			});
		}

		// 只接收叙事推进动作；没有移动、交互目标或物理输入注册。
		onAction(this, "INTERACT", () => this.handleAdvance());
		onAction(this, "ADVANCE", () => this.handleAdvance());
		if (import.meta.env.DEV) (window as any).ch04ConsciousnessGame = this;
	}

	resetHud() {
		hideEndPanel();
		hideTask();
		hideDialogue();
		hideInfoPanel();
		hideItem();
		hidePrompt();
		hideChoices();
		hideResult();
		clearFade();
	}

	setupInstabilityDetails() {
		const detail = this.add.graphics().setDepth(actorDepth(468)).setAlpha(0.08);
		// 对联文字无法从已烘焙的 L04 图层中逐字重排，因此只用极低对比度
		// 的“套印偏移”提示错位，不覆盖、不改写史料文字。
		detail.lineStyle(2, 0x6f5e51, 0.75);
		for (const x of [466, 1190]) {
			detail.lineBetween(x, 255, x, 508);
			detail.lineBetween(x + 3, 268, x + 3, 514);
		}
		this.instabilityGraphic = detail;
		this.tweens.add({
			targets: detail,
			alpha: 0.15,
			duration: 1100,
			yoyo: true,
			repeat: -1,
			ease: "Sine.InOut",
		});

		const veil = this.add
			.rectangle(WORLD_W / 2, WORLD_H / 2, WORLD_W, WORLD_H, 0x403a46, 0.035)
			.setDepth(1450);
		this.tweens.add({
			targets: veil,
			alpha: 0.075,
			duration: 1500,
			yoyo: true,
			repeat: -1,
			ease: "Sine.InOut",
		});
	}

	/* ===== P 键开发者工具：角色贴图识别 ===== */

	registerTempleActorVisuals() {
		for (const actor of this.actors) {
			this.registerTempleActorVisual(actor.name, actor, actor.x, actor.y);
		}
	}

	registerTempleActorVisual(id: string, actor: Phaser.GameObjects.Image, x: number, y: number) {
		const profile = this.actorVisualProfiles[id]
			?? (this.actorVisualProfiles[id] = ensureActorVisualConfig(this.objectDocument as any, id, actor.displayHeight || 100, { x, y }));
		if (!Array.isArray(profile.position)) {
			profile.position = [x + (profile.offset?.[0] ?? 0), y + (profile.offset?.[1] ?? 0)];
			profile.offset = [0, 0];
		}
		if (!this.actorVisualEntries.some((entry) => entry.id === id)) {
			this.actorVisualEntries.push(createActorVisualEntry({
				id,
				label: `NPC · ${id}`,
				getActor: () => actor,
				getProfile: () => this.actorVisualProfiles[id],
				getAnchor: () => ({ x, y }),
				onPositionChange: () => this.applyActorVisualPosition(id),
				absolutePosition: true,
				tileSize: 1,
			}));
		}
		this.applyActorVisualHeight(id, profile.display_height);
	}

	applyActorVisualHeight(id: string, height: number) {
		if (!Number.isFinite(height) || height <= 0) return;
		const actor = this.actorVisualEntries.find((entry) => entry.id === id)?.getActor?.();
		const source = actor?.texture?.getSourceImage?.() as HTMLImageElement | undefined;
		if (!actor || !source?.height) return;
		actor.setDisplaySize(Math.round((source.width / source.height) * height), height);
		actor.setVisible(this.actorVisualProfiles[id]?.enabled !== false);
		this.applyActorVisualPosition(id);
	}

	applyActorVisualPosition(id: string) {
		const actor = this.actorVisualEntries.find((entry) => entry.id === id)?.getActor?.();
		const profile = this.actorVisualProfiles[id];
		if (!actor || !profile) return;
		const position = profile.position;
		const offset = profile.offset ?? [0, 0];
		actor.setPosition(position?.[0] ?? actor.x + offset[0], position?.[1] ?? actor.y + offset[1]);
	}

	setupZoneEditor() {
		if (!import.meta.env.DEV) return;
		const documents = { [this.mapDocumentFile]: this.objectDocument };
		this.zoneEditor = new CollisionEditor(this, {
			documents,
			tileSize: 1,
			snapStep: 1,
			getCollisions: () => [],
			getInteractions: () => [],
			getForegrounds: () => [],
			getWorldSize: () => [WORLD_W, WORLD_H],
			getActorColliders: () => [],
			getActorVisuals: () => this.actorVisualEntries,
			onActorVisualChange: (id: string, height: number) => this.applyActorVisualHeight(id, height),
			replaceDocuments: (next: any) => {
				this.objectDocument = next[this.mapDocumentFile];
				for (const actor of [...this.actors, ...this.instabilityGhosts]) actor.destroy();
				this.actors = [];
				this.ambientActors = [];
				this.instabilityGhosts = [];
				this.actorVisualEntries = [];
				this.flagGraphic?.destroy();
				const people = setupCh04TempleActors(this, this.objectDocument, {
					unstable: true,
					animateAmbient: false,
				});
				this.actors = people.actors;
				this.ambientActors = people.ambientActors;
				this.instabilityGhosts = people.instabilityGhosts;
				this.flagGraphic = createCh04TempleFlag(this, 1);
				this.registerTempleActorVisuals();
			},
			onChange: () => {},
		});
	}

	handleAdvance() {
		if (this.state.inNarrative) advanceNarrative();
	}

	completeScene() {
		if (this.completed) return;
		this.completed = true;
		this.state.flags.add(SCENE_COMPLETE_FLAG);
		this.state.mode = "transition";
		this.state.playerLocked = true;
		hideDialogue();
		useGameSaveStore().autosave("CH04_CONSCIOUSNESS");
		fadeToBlack();
		this.time.delayedCall(1000, () => {
			if (this.scene.isActive()) this.game.events.emit("ch04:consciousness-complete");
		});
	}

	shutdown() {
		if (import.meta.env.DEV && (window as any).ch04ConsciousnessGame === this)
			delete (window as any).ch04ConsciousnessGame;
	}
}
