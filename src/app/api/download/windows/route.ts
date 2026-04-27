import { NextResponse } from "next/server";
import { RELEASE_REPO_URL } from "@/lib/site";
import { fetchLatestRelease, WINDOWS_ASSET_PATTERN } from "@/lib/release";

export const runtime = "nodejs";

const FALLBACK_RELEASE_URL = `${RELEASE_REPO_URL}/releases/latest`;

const redirectTo = (target: string) => {
  const response = NextResponse.redirect(target, { status: 302 });
  response.headers.set("Cache-Control", "public, s-maxage=300, stale-while-revalidate=1800");
  return response;
};

export async function GET() {
  try {
    const release = await fetchLatestRelease();
    if (!release) return redirectTo(FALLBACK_RELEASE_URL);
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
