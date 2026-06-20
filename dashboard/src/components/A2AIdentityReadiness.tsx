"use client";

import { AlertTriangle, Link2, Radio, ShieldCheck, Wallet } from "lucide-react";
import { formatAddress, getWalletSession } from "@/lib/wallet";
import type { User } from "@/lib/auth";

type WsStatus = "connecting" | "connected" | "disconnected";

interface A2AIdentityReadinessProps {
  wsStatus: WsStatus;
  user: User | null;
}

const wsStatusLabels: Record<WsStatus, string> = {
  connected: "Connected",
  connecting: "Connecting",
  disconnected: "Fallback / Demo Mode",
};

export default function A2AIdentityReadiness({ wsStatus, user }: A2AIdentityReadinessProps) {
  const walletSession = getWalletSession();
  const backendStatus = user
    ? "JWT Authenticated"
    : walletSession
      ? "Frontend wallet session"
      : "Auth unknown";

  const cards = [
    {
      title: "Wallet Session",
      status: walletSession ? "Connected wallet" : "Not connected",
      detail: walletSession
        ? `${walletSession.walletName} · ${formatAddress(walletSession.address)}`
        : "Connect an EVM wallet from login/register for frontend dashboard access.",
      icon: Wallet,
    },
    {
      title: "Backend Auth",
      status: backendStatus,
      detail: user?.email ?? "Protected backend API calls still require email/password JWT until SIWE is available.",
      icon: ShieldCheck,
    },
    {
      title: "A2A WebSocket",
      status: wsStatusLabels[wsStatus],
      detail: "Agent-to-Agent telemetry channel for Mission Control readiness.",
      icon: Radio,
    },
  ];

  return (
    <section className="card p-5" aria-labelledby="a2a-identity-readiness-title">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm font-medium text-[var(--color-body-subtle)]">
            <Link2 className="h-4 w-4" aria-hidden="true" />
            Hybrid Wallet / Backend Auth
          </div>
          <h2
            id="a2a-identity-readiness-title"
            className="mt-1 text-base font-semibold text-[var(--color-heading)]"
            style={{ fontFamily: "var(--font-serif)" }}
          >
            A2A Identity & Backend Readiness
          </h2>
          <p className="mt-1 text-sm text-[var(--color-body-subtle)]">
            Frontend wallet connect is available while backend SIWE remains a planned milestone.
          </p>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-3">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.title}
              className="rounded-2xl border p-4"
              style={{
                borderColor: "var(--color-border-default)",
                background: "var(--color-neutral-primary-soft)",
              }}
            >
              <div className="flex items-start gap-3">
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl"
                  style={{
                    background: "var(--color-neutral-secondary-medium)",
                    border: "1px solid var(--color-border-default)",
                  }}
                >
                  <Icon className="h-5 w-5 text-[var(--color-body-subtle)]" aria-hidden="true" />
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.18em] text-[var(--color-body-muted)]">
                    {card.title}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-[var(--color-heading)]">{card.status}</p>
                  <p className="mt-1 text-sm text-[var(--color-body-subtle)]">{card.detail}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div
        className="mt-4 flex items-start gap-3 rounded-2xl p-4 text-sm"
        style={{
          background: "var(--color-warning-soft)",
          border: "1px solid var(--color-border-warning-subtle)",
          color: "var(--color-fg-warning)",
        }}
      >
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
        <p>
          Wallet connect is ready on the frontend. Backend sign-in-with-wallet is pending. Next backend
          milestone: add SIWE challenge/verify endpoint and issue the same auth cookie used by email login.
        </p>
      </div>
    </section>
  );
}
