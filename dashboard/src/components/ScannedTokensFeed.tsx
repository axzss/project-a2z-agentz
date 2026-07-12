"use client";

import { useMemo } from "react";
import { useDashboard } from "./DashboardContext";
import { ScanSearch, TrendingUp, Hash, Radio } from "lucide-react";

/**
 * Live feed of Agent A (Scout) scan results.
 *
 * Reads from `agentMessages` (already populated by the WebSocket / polling
 * fallback with the rich per-token payload broadcast by the backend:
 * { score, source (farcaster|dexscreener), target, category, passed }).
 * Surfaces the actual scraper output instead of just the aggregated
 * "Projects Scanned" counter.
 */
export default function ScannedTokensFeed() {
  const { agentMessages } = useDashboard();

  const scans = useMemo(() => {
    return agentMessages
      .filter(
        (m) =>
          m.sender === "agent_a" &&
          m.metadata &&
          typeof m.metadata.score === "number" &&
          m.metadata.target,
      )
      .slice(-12)
      .reverse();
  }, [agentMessages]);

  return (
    <div
      className="card flex flex-col h-[400px]"
      style={{ borderRadius: "var(--radius-base)" }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 sm:px-5 py-3 flex-shrink-0"
        style={{ borderBottom: "1px solid var(--color-border-muted)" }}
      >
        <div className="flex items-center gap-2.5">
          <div
            className="flex items-center justify-center w-7 h-7 rounded-lg"
            style={{ background: "var(--color-brand-softer)" }}
          >
            <ScanSearch className="w-3.5 h-3.5" style={{ color: "var(--color-fg-purple)" }} />
          </div>
          <h5
            className="text-sm font-semibold"
            style={{ color: "var(--color-heading)", fontFamily: "var(--font-serif)" }}
          >
            Latest Agent A Scans
          </h5>
          <span
            className="flex items-center gap-1.5 text-[11px] px-2 py-0.5 rounded-full border font-medium"
            style={{
              background: "var(--color-success-soft)",
              color: "var(--color-fg-success)",
              borderColor: "var(--color-border-success-subtle)",
            }}
          >
            <span className="w-1.5 h-1.5 rounded-full animate-pulse-glow" style={{ background: "var(--color-fg-success)" }} />
            Live
          </span>
        </div>
        <span className="text-[11px]" style={{ color: "var(--color-body-subtle)" }}>
          Farcaster + DexScreener
        </span>
      </div>

      {/* Rows */}
      <div
        ref={undefined}
        className="flex-1 overflow-y-auto px-3 sm:px-4 py-3 space-y-1.5"
        style={{ fontFamily: "var(--font-mono)" }}
        aria-live="polite"
        aria-label="Agent A scan results"
        role="log"
      >
        {scans.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <p className="text-sm font-medium" style={{ color: "var(--color-body-subtle)" }}>
              Waiting for scans...
            </p>
            <p className="text-xs mt-1.5" style={{ color: "var(--color-fg-disabled)" }}>
              Agent A (Scout) scan results will appear here
            </p>
          </div>
        )}

        {scans.map((m) => {
          const meta = m.metadata!;
          const score = meta.score ?? 0;
          const src = (meta.source as string) || "dexscreener";
          const isFarcaster = src === "farcaster";
          const passed = meta.passed === true;
          const scoreColor =
            score >= 70
              ? "var(--color-fg-success)"
              : score >= 40
                ? "var(--color-fg-warning)"
                : "var(--color-fg-danger)";

          return (
            <div
              key={m.id}
              className="flex items-center gap-3 py-2 px-2 rounded-md hover:bg-white/[0.02] transition-colors"
            >
              {/* Score pill */}
              <span
                className="flex-shrink-0 w-12 text-center font-bold text-[12px] px-1.5 py-1 rounded border tabular-nums"
                style={{
                  color: scoreColor,
                  background: `color-mix(in srgb, ${scoreColor} 10%, transparent)`,
                  borderColor: `color-mix(in srgb, ${scoreColor} 25%, transparent)`,
                }}
              >
                {score}
              </span>

              {/* Source badge */}
              <span
                className="flex-shrink-0 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wider"
                style={{
                  background: isFarcaster ? "var(--color-brand-softer)" : "var(--color-neutral-secondary-soft)",
                  color: isFarcaster ? "var(--color-fg-purple)" : "var(--color-body-subtle)",
                }}
              >
                {isFarcaster ? <Radio className="w-2.5 h-2.5" /> : <TrendingUp className="w-2.5 h-2.5" />}
                {src}
              </span>

              {/* Project + target */}
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-medium truncate" style={{ color: "var(--color-heading)" }}>
                  {meta.projectName || "Unknown"}
                </p>
                <p className="text-[10px] truncate flex items-center gap-1" style={{ color: "var(--color-fg-disabled)" }}>
                  <Hash className="w-2.5 h-2.5" />
                  {meta.target}
                </p>
              </div>

              {/* Passed / rejected */}
              <span
                className="flex-shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full"
                style={{
                  background: passed ? "var(--color-success-soft)" : "var(--color-neutral-secondary-soft)",
                  color: passed ? "var(--color-fg-success)" : "var(--color-body-subtle)",
                }}
              >
                {passed ? "QUEUED" : "SCAN"}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
