/*
 * @Author: 吴世扬 18368095041@163.com
 * @Date: 2026-08-13 08:10:50
 * @LastEditors: 吴世扬 18368095041@163.com
 * @LastEditTime: 2026-08-13 09:14:28
 * @FilePath: /github_honghu_game/vite.config.ts
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import { defineConfig, loadEnv, type Plugin } from "vite";
import vue from "@vitejs/plugin-vue";
import { writeFile } from "node:fs/promises";
import { readdir, stat } from "node:fs/promises";
import { createReadStream } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, relative, resolve } from "node:path";
import type { IncomingMessage } from "node:http";
import { fileURLToPath } from "node:url";

const projectRoot = dirname(fileURLToPath(import.meta.url));

const writableFiles = new Set([
	"public/data/scene01_manifest.json",
	"public/data/PRO02_logic.json",
	"public/data/PRO02_interactions.json",
	"public/data/ch01_sc01_chen_home_wake_manifest.json",
	"public/data/ch01_sc02_flashback_petition_manifest.json",
	"public/data/ch01_sc03_yard_manifest.json",
	"public/data/ch02_ancestral_hall_main_objects.json",
	"public/data/ch02_ancestral_hall_mainhall_close_objects.json",
	"public/data/ch02_ancestral_hall_sidewall_objects.json",
	"public/data/ch03_tu_compound_STATE_WAITING_objects.json",
	"public/data/ch03_tu_compound_STATE_GATE_CLOSED_objects.json",
	"public/data/ch03_tu_compound_STATE_GATE_ATTACK_objects.json",
	"public/data/ch03_tu_compound_STATE_FIRE_STARTED_objects.json",
	"public/data/ch03_tu_compound_STATE_GATE_BROKEN_objects.json",
	"public/data/ch03_tu_compound_STATE_AFTER_BATTLE_objects.json",
	"public/data/ch03_tu_compound_STATE_DEPARTURE_objects.json",
	"public/data/ch04_wangye_temple_shot_wide_objects.json",
	"public/data/ch04_wangye_temple_shot_medium_objects.json",
	"public/data/ch04_wangye_temple_shot_close_objects.json",
]);

const MAX_ZONE_REQUEST_BYTES = 256 * 1024;

type AssetManifestEntry = {
	path: string;
	bundle: string;
	bytes: number;
	sha256: string;
};

async function listPublicAssets(root: string, directory = root): Promise<string[]> {
	const entries = await readdir(directory, { withFileTypes: true });
	const files: string[] = [];
	for (const entry of entries) {
		const filePath = resolve(directory, entry.name);
		if (entry.isDirectory()) files.push(...(await listPublicAssets(root, filePath)));
		else if (entry.isFile() && relative(root, filePath).replaceAll("\\", "/").startsWith("assets/"))
			files.push(filePath);
	}
	return files;
}

async function sha256File(filePath: string): Promise<string> {
	const hash = createHash("sha256");
	for await (const chunk of createReadStream(filePath)) hash.update(chunk);
	return hash.digest("hex");
}

function assetBundle(assetPath: string): string {
	if (assetPath.startsWith("assets/ch01/") || assetPath.startsWith("assets/audio/ch01/")) return "chapter-01";
	if (assetPath.startsWith("assets/ch02/") || assetPath.startsWith("assets/audio/ch02/")) return "chapter-02";
	if (assetPath.startsWith("assets/ch03/") || assetPath.startsWith("assets/audio/ch03/")) return "chapter-03";
	if (assetPath.startsWith("assets/ch04/") || assetPath.startsWith("assets/audio/ch04/")) return "chapter-04";
	if (assetPath.startsWith("assets/video/") || assetPath.startsWith("assets/map/")) return "prologue";
	if (assetPath.startsWith("assets/audio/")) return "common-audio";
	if (assetPath.startsWith("assets/characters/")) return "common-characters";
	return "common-ui";
}

function assetManifestPlugin(): Plugin {
	return {
		name: "asset-manifest",
		apply: "build",
		async generateBundle() {
			const publicRoot = resolve(projectRoot, "public");
			const files = (await listPublicAssets(publicRoot)).sort();
			const assets: AssetManifestEntry[] = [];
			for (const filePath of files) {
				const assetPath = relative(publicRoot, filePath).replaceAll("\\", "/");
				const fileInfo = await stat(filePath);
				assets.push({
					path: `/${assetPath}`,
					bundle: assetBundle(assetPath),
					bytes: fileInfo.size,
					sha256: await sha256File(filePath),
				});
			}
			this.emitFile({
				type: "asset",
				fileName: "data/asset-manifest.json",
				source: `${JSON.stringify({ schemaVersion: 1, assets }, null, 2)}\n`,
			});
		},
	};
}

function isLoopbackAddress(address: string | undefined): boolean {
	return address === "127.0.0.1" || address === "::1" || address === "::ffff:127.0.0.1";
}

function isAllowedOrigin(origin: string | undefined): boolean {
	if (!origin) return true;
	try {
		const url = new URL(origin);
		return url.protocol === "http:" && isLoopbackAddress(url.hostname);
	} catch {
		return false;
	}
}

function zoneEditorApi(): Plugin {
	return {
		name: "zone-editor-api",
		configureServer(server) {
			server.middlewares.use("/__dev/save-zones", (request, response) => {
				response.setHeader("cache-control", "no-store");
				response.setHeader("content-type", "application/json; charset=utf-8");
				if (!isLoopbackAddress(request.socket.remoteAddress) || !isAllowedOrigin(request.headers.origin)) {
					response.statusCode = 403;
					return response.end(JSON.stringify({ error: "Local development access required" }));
				}
				if (request.method !== "POST") {
					response.statusCode = 405;
					response.setHeader("allow", "POST");
					return response.end(JSON.stringify({ error: "POST required" }));
				}
				const contentType = request.headers["content-type"]?.split(";", 1)[0].trim().toLowerCase();
				if (contentType !== "application/json") {
					response.statusCode = 415;
					return response.end(JSON.stringify({ error: "application/json required" }));
				}
				let body = "";
				let bodyBytes = 0;
				let ended = false;
				request.on("data", (chunk) => {
					if (ended) return;
					bodyBytes += Buffer.byteLength(chunk);
					if (bodyBytes > MAX_ZONE_REQUEST_BYTES) {
						ended = true;
						response.statusCode = 413;
						response.end(JSON.stringify({ error: "Request body too large" }));
						request.destroy();
						return;
					}
					body += chunk.toString("utf8");
				});
				request.on("end", async () => {
					if (ended) return;
					try {
						const { file, data } = JSON.parse(body);
						if (typeof file !== "string" || !writableFiles.has(file))
							throw new Error("File is not writable");
						if (!data || typeof data !== "object")
							throw new Error("Zone data must be an object");
						await writeFile(
							resolve(process.cwd(), file),
							`${JSON.stringify(data, null, 2)}\n`,
							"utf8",
						);
						response.end(JSON.stringify({ ok: true }));
					} catch (error) {
						response.statusCode = 400;
						response.end(
							error instanceof Error
								? error.message
								: "Unknown error",
						);
					}
				});
			});
		},
	};
}

export default defineConfig(({ command, mode }) => {
	const env = loadEnv(mode, process.cwd(), "");
	return {
		plugins: [vue(), assetManifestPlugin(), ...(command === "serve" ? [zoneEditorApi()] : [])],
		base: env.VITE_BASE || "/",
		cacheDir: ".vite-cache",
		resolve: {
			alias: {
				"@": resolve(projectRoot, "src"),
			},
		},
		server: {
			port: 5175,
			host: "127.0.0.1",
		},
	};
});
