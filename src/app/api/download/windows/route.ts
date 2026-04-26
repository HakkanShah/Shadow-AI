import { NextResponse } from "next/server";
import { RELEASE_REPO_URL } from "@/lib/site";

export const runtime = "nodejs";

const GITHUB_API_LATEST_RELEASE = "https://api.github.com/repos/HakkanShah/Shadow-AI/releases/latest";
const WINDOWS_ASSET_PATTERN = /^Shadow-Setup-.*\.exe$/i;
const FALLBACK_RELEASE_URL = `${RELEASE_REPO_URL}/releases/latest`;

type GithubReleaseAsset = {
  name?: string;
  browser_download_url?: string;
};

type GithubLatestRelease = {
  html_url?: string;
  assets?: GithubReleaseAsset[];
};

const redirectTo = (target: string) => {
  const response = NextResponse.redirect(target, { status: 302 });
  response.headers.set("Cache-Control", "public, s-maxage=300, stale-while-revalidate=1800");
  return response;
};

export async function GET() {
  try {
    const response = await fetch(GITHUB_API_LATEST_RELEASE, {
      headers: {
        Accept: "application/vnd.github+json",
        "User-Agent": "ShadowWeb/latest-download",
      },
      next: { revalidate: 300 },
    });

    if (!response.ok) {
      return redirectTo(FALLBACK_RELEASE_URL);
    }

    const release = (await response.json()) as GithubLatestRelease;
    const windowsAsset = (release.assets || []).find((asset) =>
      WINDOWS_ASSET_PATTERN.test(String(asset.name || "").trim())
    );

    if (windowsAsset?.browser_download_url) {
      return redirectTo(windowsAsset.browser_download_url);
    }

    return redirectTo(release.html_url || FALLBACK_RELEASE_URL);
  } catch {
    return redirectTo(FALLBACK_RELEASE_URL);
  }
}
