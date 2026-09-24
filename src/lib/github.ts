const GITHUB_TOKEN = process.env.GITHUB_TOKEN!;
const ORG = "gamesense-cloud";

type Commit = {
  sha: string;
  commit: { message: string; author: { name: string; date: string } };
};

type Release = {
  tag_name: string;
  name: string;
  body: string;
  published_at: string;
  assets: { id: number; name: string; browser_download_url: string; size: number }[];
};

async function ghFetch<T>(path: string): Promise<T> {
  const res = await fetch(`https://api.github.com${path}`, {
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      Accept: "application/vnd.github+json",
    },
    next: { revalidate: 300 },
  });
  if (!res.ok) throw new Error(`GitHub API ${res.status}: ${path}`);
  return res.json();
}

async function downloadAsset(assetId: number, repo: string) {
  const res = await fetch(
    `https://api.github.com/repos/${ORG}/${repo}/releases/assets/${assetId}`,
    {
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        Accept: "application/octet-stream",
      },
      redirect: "follow",
    }
  );
  if (!res.ok) return null;
  return res;
}

export async function getCommits(repo: string, count = 30) {
  return ghFetch<Commit[]>(`/repos/${ORG}/${repo}/commits?per_page=${count}`);
}

export async function getLatestRelease(repo: string) {
  try {
    return await ghFetch<Release>(`/repos/${ORG}/${repo}/releases/latest`);
  } catch {
    return null;
  }
}

export async function getReleaseAssetStream(repo: string) {
  const release = await getLatestRelease(repo);
  if (!release || release.assets.length === 0) return null;
  const asset = release.assets[0];
  const res = await downloadAsset(asset.id, repo);
  if (!res) return null;
  return { stream: res.body, name: asset.name, size: asset.size };
}

export async function getReleaseAsset(repo: string, assetName: string) {
  const release = await getLatestRelease(repo);
  if (!release) return null;
  const asset = release.assets.find((a) => a.name === assetName);
  if (!asset) return null;
  const res = await downloadAsset(asset.id, repo);
  if (!res) return null;
  return { stream: res.body, name: asset.name, size: asset.size };
}

// ---- preset files: the private preset-files repo, handed to the client through /api/presets

const PRESET_REPO = "preset-files";
// Top-level folders of preset-files the client syncs into Documents\gscloud\<folder>.
export const PRESET_FOLDERS: readonly string[] = ["emotes"];

export type PresetFile = { path: string; size: number; sha: string };

type Tree = { tree: { path: string; type: string; size?: number; sha: string }[] };

// Every file under `folder/` with its git blob sha (the client hashes its copies the same way and
// only downloads what differs). Cached for 5 minutes, so a push shows up within that.
export async function getPresetFiles(folder: string): Promise<PresetFile[]> {
  let tree: Tree;
  try {
    tree = await ghFetch<Tree>(`/repos/${ORG}/${PRESET_REPO}/git/trees/HEAD?recursive=1`);
  } catch {
    return []; // empty repo (409) or GitHub unreachable
  }
  const prefix = `${folder}/`;
  return tree.tree
    .filter((e) => e.type === "blob" && e.path.startsWith(prefix))
    .map((e) => ({ path: e.path, size: e.size ?? 0, sha: e.sha }));
}

// One file's bytes, streamed straight from GitHub (raw media type, files up to 100 MB).
export async function getPresetFileStream(path: string) {
  const res = await fetch(
    `https://api.github.com/repos/${ORG}/${PRESET_REPO}/contents/${path
      .split("/")
      .map(encodeURIComponent)
      .join("/")}`,
    {
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        Accept: "application/vnd.github.raw",
      },
      cache: "no-store",
    }
  );
  if (!res.ok || !res.body) return null;
  return res.body;
}
