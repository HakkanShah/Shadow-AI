"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  INSTALL_SECTION_ID,
  RELEASE_NOTES_URL,
  RELEASE_REPO_URL,
  WINDOWS_DOWNLOAD_URL,
} from "@/lib/site";
import s from "./landing.module.css";

const features = [
  { title: "Invisible", body: "Filtered from Zoom, Teams, Meet, and OBS at the OS level." },
  { title: "Five modes", body: "QA · Aptitude · Coding · Interview · Meeting." },
  { title: "Local-first", body: "Whisper + Ollama on your machine. Cloud is opt-in." },
  { title: "Frameless", body: "Always on top. Click-through. Full hotkey control." },
];

const modes = [
  { key: "/qa", name: "QA", desc: "Snap a screenshot, get the solution." },
  { key: "/apti", name: "Aptitude", desc: "Quant and logic with proper math notation." },
  { key: "/coding", name: "Coding", desc: "Algorithms, syntax-highlighted code." },
  { key: "/interview", name: "Interview", desc: "Real-time coaching, live mic." },
  { key: "/meeting", name: "Meeting", desc: "Transcript, summary, action items." },
];

type LatestReleasePayload = {
  version: string | null;
  releaseNotesUrl: string | null;
};

export default function LandingPage() {
  const [latestVersion, setLatestVersion] = useState<string | null>(null);
  const [latestReleaseNotesUrl, setLatestReleaseNotesUrl] = useState<string>(RELEASE_NOTES_URL);

  useEffect(() => {
    let cancelled = false;

    const loadLatestRelease = async () => {
      try {
        const response = await fetch("/api/release/latest", { cache: "no-store" });
        if (!response.ok) return;

        const payload = (await response.json()) as LatestReleasePayload;
        if (cancelled) return;

        if (payload.version) {
          setLatestVersion(payload.version);
        }
        if (payload.releaseNotesUrl) {
          setLatestReleaseNotesUrl(payload.releaseNotesUrl);
        }
      } catch {
        // Fall back to generic latest-release copy.
      }
    };

    void loadLatestRelease();
    return () => {
      cancelled = true;
    };
  }, []);

  const latestVersionLabel = latestVersion ? `v${latestVersion}` : "latest";
  const heroBuildLabel = latestVersion ? `${latestVersionLabel} beta active` : "Latest Windows build · beta active";
  const windowsInstallerLabel = latestVersion
    ? `Windows 10 / 11 · 64-bit · ${latestVersionLabel} installer`
    : "Windows 10 / 11 · 64-bit · latest stable installer";

  return (
    <main className={s.page}>
      <div className={s.bgGrid} />
      <div className={s.bgGlow} />

      <div className={s.navWrap}>
        <div className={s.nav}>
          <Link href="/" className={s.brand}>
            <Logo size={20} />
            Shadow
          </Link>
          <nav className={s.navLinks}>
            <a href="#modes">Modes</a>
            <a href={`#${INSTALL_SECTION_ID}`}>Install</a>
            <a href={RELEASE_REPO_URL}>GitHub</a>
          </nav>
          <a href={`#${INSTALL_SECTION_ID}`} className={s.navCta}>
            Get Shadow
          </a>
        </div>
      </div>

      <section className={s.hero}>
        <div className={s.container}>
          <div className={s.heroGrid}>
            <div>
              <span className={s.eyebrow}>
                <span className={s.eyebrowDot} />
                Shadow engine inside
              </span>

              <h1 className={s.title}>
                The overlay
                <br />
                <span className={s.titleGhost}>they can&apos;t see.</span>
              </h1>

              <p className={s.subtitle}>
                A frameless desktop AI for interviews, coding rounds, aptitude, and meetings.
                Local-first. Filtered out of Zoom, Teams, and Meet at the OS level.
              </p>

              <div className={s.ctas}>
                <a href={`#${INSTALL_SECTION_ID}`} className={s.btnPrimary}>
                  <DownloadIcon size={16} />
                  Download
                </a>
                <a href="#modes" className={s.btnGhost}>
                  See features
                </a>
              </div>

              <p className={s.metaRow}>
                <span className={s.metaDot} />
                {heroBuildLabel}
              </p>
            </div>

            <div className={s.stage}>
              <div className={s.stageGlow} />
              <div className={s.stageEye}>
                <Image src="/eye.png" alt="" width={460} height={460} priority />
              </div>

              <div className={s.cardHeard}>
                <div className={s.cardLabel}>
                  HEARD
                  <span className={s.recDot} />
                </div>
                <p className={s.cardText}>
                  &ldquo;Design a notification service for ten million users...&rdquo;
                </p>
              </div>

              <div className={s.cardDraft}>
                <div className={`${s.cardLabel} ${s.cardLabelViolet}`}>
                  DRAFT
                  <span style={{ color: "var(--ink-mute)" }}>Cmd + Enter</span>
                </div>
                <p className={s.cardText}>
                  Read/write split. Producer fans events to a queue; workers route per channel.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className={s.featureBand}>
        <div className={s.container}>
          <div className={s.featureGrid}>
            {features.map((f) => (
              <div key={f.title} className={s.featureCell}>
                <h3 className={s.featureTitle}>{f.title}</h3>
                <p className={s.featureBody}>{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="modes" className={s.modes}>
        <div className={s.container}>
          <header className={s.sectionHeader}>
            <span className={s.sectionEyebrow}>
              <span /> Five modes · One overlay
            </span>
            <h2 className={s.sectionTitle}>
              Built for the moment<span>.</span>
            </h2>
            <p className={s.sectionSub}>
              Each mode swaps the system prompt and the way the answer renders. Cycle them with{" "}
              <kbd
                style={{
                  border: "1px solid var(--rule)",
                  borderRadius: 4,
                  padding: "1px 6px",
                  background: "rgba(255,255,255,0.04)",
                  fontSize: 11,
                }}
              >
                Ctrl+Alt+M
              </kbd>
              .
            </p>
          </header>

          <div className={s.modeGrid}>
            {modes.map((m) => (
              <div key={m.key} className={s.modeCell}>
                <p className={s.modeKey}>{m.key}</p>
                <p className={s.modeName}>{m.name}</p>
                <p className={s.modeDesc}>{m.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id={INSTALL_SECTION_ID} className={s.install}>
        <div className={s.container}>
          <header className={s.sectionHeader}>
            <span className={s.sectionEyebrow}>
              <span /> Free during beta
            </span>
            <h2 className={s.sectionTitle}>
              Install Shadow<span>.</span>
            </h2>
            <p className={s.sectionSub}>
              Run it once. Auto-updates after that. API keys live in your OS keychain and never on disk.
            </p>
          </header>

          <div className={s.platformGrid}>
            <a href={WINDOWS_DOWNLOAD_URL} className={s.platform}>
              <div className={s.platformIconWrap}>
                <WindowsIcon size={28} />
                <span className={s.platformLiveDot} />
              </div>
              <h3 className={s.platformOs}>Windows</h3>
              <p className={s.platformSub}>{windowsInstallerLabel}</p>
              <span className={s.platformCta}>
                <DownloadIcon size={16} />
                Download .exe
              </span>
            </a>

            <div className={`${s.platform} ${s.platformDisabled}`}>
              <div className={`${s.platformIconWrap} ${s.platformIconCyan}`}>
                <AppleIcon size={28} />
              </div>
              <h3 className={s.platformOs}>macOS</h3>
              <p className={s.platformSub}>Apple Silicon · Intel</p>
              <span className={`${s.platformCta} ${s.platformCtaCyan}`}>Coming soon</span>
            </div>
          </div>

          <p className={s.installFootnote}>
            MIT licensed · auto-updates · keys in OS keychain
          </p>
        </div>
      </section>

      <footer className={s.footer}>
        <div className={s.container}>
          <div className={s.footerInner}>
            <span>© 2026 Shadow · by Hakkan Shah</span>
            <div className={s.footerLinks}>
              <a href={RELEASE_REPO_URL}>github</a>
              <a href={latestReleaseNotesUrl}>{latestVersion ? `${latestVersionLabel} release` : "latest release"}</a>
              <span className={s.footerOnline}>
                <span className={s.metaDot} />
                online
              </span>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}

function Logo({ size = 24 }: { size?: number }) {
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} fill="none">
      <path
        d="M2 16 C 8 6, 24 6, 30 16 C 24 26, 8 26, 2 16 Z"
        stroke="white"
        strokeOpacity="0.9"
        strokeWidth="1.6"
      />
      <circle cx="16" cy="16" r="6" stroke="#b86bff" strokeWidth="1.6" />
      <circle cx="16" cy="16" r="2.6" fill="#b86bff" />
    </svg>
  );
}

function DownloadIcon({ size = 16 }: { size?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 3v12" />
      <path d="m6 11 6 6 6-6" />
      <path d="M5 21h14" />
    </svg>
  );
}

function WindowsIcon({ size = 24 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="white">
      <path d="M3 5.5 11 4v8H3zM12 4l9-1.5V12h-9zM3 13h8v8L3 19.5zM12 13h9v8.5L12 20z" />
    </svg>
  );
}

function AppleIcon({ size = 24 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="white">
      <path d="M16.4 12.6c0-2.3 1.9-3.4 2-3.5-1.1-1.6-2.8-1.8-3.4-1.8-1.4-.2-2.8.9-3.5.9-.7 0-1.9-.9-3.1-.8-1.6 0-3.1.9-3.9 2.4-1.7 2.9-.4 7.2 1.2 9.6.8 1.2 1.7 2.5 3 2.4 1.2 0 1.6-.8 3.1-.8s1.8.8 3.1.8c1.3 0 2.1-1.2 2.9-2.4.9-1.4 1.3-2.7 1.3-2.7s-2.5-1-2.7-3.1zM14.2 5.7c.6-.7 1-1.8 1-2.8-.9 0-2 .6-2.6 1.3-.6.6-1.1 1.7-1 2.7 1 .1 2-.5 2.6-1.2z" />
    </svg>
  );
}
