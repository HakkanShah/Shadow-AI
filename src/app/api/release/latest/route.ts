import { NextResponse } from "next/server";
import { RELEASE_NOTES_URL } from "@/lib/site";
import { fetchLatestRelease, normalizeReleaseVersion, WINDOWS_ASSET_PATTERN } from "@/lib/release";

export const runtime = "nodejs";

export async function GET() {
  const release = await fetchLatestRelease();

  const version = normalizeReleaseVersion(release?.tag_name);
  const windowsAsset = (release?.assets || []).find((asset) =>
    WINDOWS_ASSET_PATTERN.test(String(asset.name || "").trim())
  );

  const response = NextResponse.json({
    version,
    tag: String(release?.tag_name || "").trim() || null,
    name: String(release?.name || "").trim() || null,
    releaseNotesUrl: release?.html_url || RELEASE_NOTES_URL,
    windowsDownloadUrl: windowsAsset?.browser_download_url || null,
  });

  response.headers.set("Cache-Control", "public, s-maxage=300, stale-while-revalidate=1800");
  return response;
}
