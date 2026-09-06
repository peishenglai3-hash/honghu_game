import { assetPath } from "@/common/paths";

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
