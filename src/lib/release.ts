export const GITHUB_API_LATEST_RELEASE =
  "https://api.github.com/repos/HakkanShah/Shadow-AI/releases/latest";

export const WINDOWS_ASSET_PATTERN = /^Shadow-Setup-.*\.exe$/i;

export type GithubReleaseAsset = {
  name?: string;
  browser_download_url?: string;
};

export type GithubLatestRelease = {
  tag_name?: string;
  name?: string;
  html_url?: string;
  assets?: GithubReleaseAsset[];
};

export const normalizeReleaseVersion = (tagName: string | null | undefined): string | null => {
  const normalized = String(tagName || "").trim();
  if (!normalized) return null;
  return normalized.replace(/^v/i, "") || null;
};

export const fetchLatestRelease = async (): Promise<GithubLatestRelease | null> => {
  try {
    const response = await fetch(GITHUB_API_LATEST_RELEASE, {
      headers: {
        Accept: "application/vnd.github+json",
        "User-Agent": "ShadowWeb/latest-release",
      },
      next: { revalidate: 300 },
    });

    if (!response.ok) return null;
    return (await response.json()) as GithubLatestRelease;
  } catch {
    return null;
  }
};
