import { assetPath } from "@/common/paths";
import { cachePwaUrls } from "@/common/pwa";

export type AssetBundle =
	| "prologue"
	| "chapter-01"
	| "chapter-02"
	| "chapter-03"
	| "chapter-04"
	| "common-audio"
	| "common-characters"
	| "common-ui";

export type AssetManifestEntry = {
	path: string;
	bundle: AssetBundle;
	bytes: number;
	sha256: string;
};

export type AssetManifest = {
	schemaVersion: 1;
	assets: AssetManifestEntry[];
};

let manifestPromise: Promise<AssetManifest | null> | undefined;

function isManifest(value: unknown): value is AssetManifest {
	if (!value || typeof value !== "object") return false;
	const manifest = value as Partial<AssetManifest>;
	return manifest.schemaVersion === 1 && Array.isArray(manifest.assets);
}

export function loadAssetManifest(): Promise<AssetManifest | null> {
	manifestPromise ??= fetch(assetPath("/data/asset-manifest.json"), { cache: "no-store" })
		.then(async (response) => {
			if (!response.ok) return null;
			const value: unknown = await response.json();
			return isManifest(value) ? value : null;
		})
		.catch(() => null);
	return manifestPromise;
}

export function assetUrlsForBundle(
	manifest: AssetManifest,
	bundle: AssetBundle,
): string[] {
	return manifest.assets
		.filter((asset) => asset.bundle === bundle)
		.map((asset) => assetPath(asset.path));
}

/** 请求服务工作线程缓存一个章节；下载由用户或章节入口显式触发。 */
export async function requestAssetBundleCache(bundle: AssetBundle): Promise<number> {
	const manifest = await loadAssetManifest();
	if (!manifest) return 0;
	const urls = assetUrlsForBundle(manifest, bundle);
	cachePwaUrls(urls);
	return urls.length;
}
