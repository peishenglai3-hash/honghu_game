import Phaser from "phaser";
import { onAction } from "@/common/actions";
import {
	advanceNarrative,
	clearFade,
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
import { CH04_WANGYE_TEMPLE_SCENE1 } from "./ch04Scene1.content";
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
const SCENE_COMPLETE_FLAG = "CH04_SCENE1_COMPLETE";
const FLAG_REVEAL_ENTRY = "CH04_SC01_FLAG_REVEAL";

/**
 * 第四章场景一：戴家场王爷庙戏台。
 *
 * 这是固定镜头叙事，不开放自由移动。地图 L01-L04/L06-L07 由统一的
 * layered-map 管线挂载，人物从 L05 的命名出生点运行时生成，远景人影
 * 只用于表现“画面之外还有人”，不把四千人做成独立节点。
 */
export class Ch04WangyeTempleScene extends Phaser.Scene {
	zoneEditor: any;
	shot: Ch04TempleShot = "SHOT_WIDE";
	definition = CH04_WANGYE_TEMPLE_MAPS.SHOT_WIDE;
	objectDocument!: LayeredMapObjectDocument;
	mapDocumentFile = "";
	actors: Phaser.GameObjects.Image[] = [];
	ambientActors: Phaser.GameObjects.Image[] = [];
	actorVisualProfiles: Record<string, any> = {};
	actorVisualEntries: any[] = [];
	flagGraphic?: Phaser.GameObjects.Graphics;
	narrativeEntryListener?: (event: Event) => void;
	completed = false;

	get state() {
		return useGameStateStore().state;
	}

	constructor() {
		super("Ch04WangyeTempleScene");
	}

	init(data?: { shot?: Ch04TempleShot }) {
		this.shot = data?.shot && data.shot in CH04_WANGYE_TEMPLE_MAPS ? data.shot : "SHOT_WIDE";
		this.definition = CH04_WANGYE_TEMPLE_MAPS[this.shot];
		this.actors = [];
		this.ambientActors = [];
		this.actorVisualProfiles = {};
		this.actorVisualEntries = [];
		this.flagGraphic = undefined;
		this.narrativeEntryListener = undefined;
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
		this.objectDocument = mounted.objectDocument as LayeredMapObjectDocument;
		this.cameras.main
			.setBounds(0, 0, WORLD_W, WORLD_H)
			.setZoom(CAMERA_ZOOM)
			.centerOn(WORLD_W / 2, WORLD_H / 2);

		const people = setupCh04TempleActors(this, this.objectDocument);
		this.actors = people.actors;
		this.ambientActors = people.ambientActors;
		this.flagGraphic = createCh04TempleFlag(this, 0);
		this.mapDocumentFile = `public/data/${this.definition.objectPath.replace(/^data\//, "")}`;
		this.registerTempleActorVisuals();
		this.setupZoneEditor();
		this.setupNarrativeEntryListener();
		this.completed = this.state.flags.has(SCENE_COMPLETE_FLAG);
		this.state.playerLocked = true;
		this.state.mode = this.completed ? "end" : "narrative";

		if (this.completed) {
			this.revealFlag(true);
		} else {
			this.time.delayedCall(160, () => {
				if (this.scene.isActive()) playNarrative(CH04_WANGYE_TEMPLE_SCENE1, () => this.completeScene());
			});
		}

		onAction(this, "INTERACT", () => this.handleAdvance());
		onAction(this, "ADVANCE", () => this.handleAdvance());
		if (import.meta.env.DEV) (window as any).ch04WangyeTempleGame = this;
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

	revealFlag(immediate = false) {
		if (!this.flagGraphic) return;
		if (immediate) {
			this.flagGraphic.setAlpha(1);
			return;
		}
		this.tweens.add({ targets: this.flagGraphic, alpha: 1, duration: 480, ease: "Cubic.Out" });
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
				for (const actor of this.actors) actor.destroy();
				this.actors = [];
				this.ambientActors = [];
				this.actorVisualEntries = [];
				this.flagGraphic?.destroy();
				const people = setupCh04TempleActors(this, this.objectDocument);
				this.actors = people.actors;
				this.ambientActors = people.ambientActors;
				this.flagGraphic = createCh04TempleFlag(this, this.completed ? 1 : 0);
				this.registerTempleActorVisuals();
			},
			onChange: () => {},
		});
	}

	setupNarrativeEntryListener() {
		this.narrativeEntryListener = (event: Event) => {
			const entryId = (event as CustomEvent<{ entryId?: string }>).detail?.entryId;
			if (entryId === FLAG_REVEAL_ENTRY) this.revealFlag();
		};
		window.addEventListener("honghu:narrative-entry", this.narrativeEntryListener);
	}

	handleAdvance() {
		if (this.state.inNarrative) advanceNarrative();
	}

	completeScene() {
		if (this.completed) return;
		this.completed = true;
		this.state.flags.add(SCENE_COMPLETE_FLAG);
		this.state.mode = "end";
		this.state.playerLocked = true;
		useGameSaveStore().autosave("CH04_WANGYE_TEMPLE");
		this.game.events.emit("ch04:wangye-temple-complete");
	}

	shutdown() {
		if (this.narrativeEntryListener)
			window.removeEventListener("honghu:narrative-entry", this.narrativeEntryListener);
		this.narrativeEntryListener = undefined;
		if (import.meta.env.DEV && (window as any).ch04WangyeTempleGame === this)
			delete (window as any).ch04WangyeTempleGame;
	}
}
