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
  assets: { name: string; browser_download_url: string; size: number }[];
};

async function ghFetch<T>(path: string): Promise<T> {
  const res = await fetch(`https://api.github.com${path}`, {
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      Accept: "application/vnd.github+json",
    },
    next: { revalidate: 300 }, // cache 5 min
  });
  if (!res.ok) throw new Error(`GitHub API ${res.status}: ${path}`);
  return res.json();
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
  const res = await fetch(asset.browser_download_url, {
    headers: { Authorization: `Bearer ${GITHUB_TOKEN}`, Accept: "application/octet-stream" },
  });
  if (!res.ok) return null;
  return { stream: res.body, name: asset.name, size: asset.size };
}
