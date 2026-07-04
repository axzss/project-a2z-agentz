"use client";

import React, { useEffect, useState } from "react";
import { Wallet, X, Loader2 } from "lucide-react";
import { useWalletConnect } from "@/hooks/useWalletConnect";
import type { WalletSession, WalletStatus } from "@/lib/wallet";
import { useAuth } from "@/components/AuthProvider";
import { getWalletNonce } from "@/lib/auth";

interface WalletConnectModalProps {
  open: boolean;
  onClose: () => void;
  onConnected?: (session: WalletSession) => void;
  onContinue?: () => void;
}

function statusLabel(status: WalletStatus) {
  if (status === "detected") return "Detected";
  if (status === "available") return "Available";
  if (status === "open_wallet_browser") return "Open in wallet browser";
  return "Install required";
}

function statusStyle(status: WalletStatus) {
  if (status === "detected") {
    return {
      color: "var(--color-fg-success)",
      borderColor: "var(--color-fg-success)",
      background: "color-mix(in srgb, var(--color-fg-success) 12%, transparent)",
    };
  }
  if (status === "open_wallet_browser") {
    return {
      color: "var(--color-fg-info)",
      borderColor: "var(--color-fg-info)",
      background: "color-mix(in srgb, var(--color-fg-info) 12%, transparent)",
    };
  }
  return {
    color: "var(--color-fg-warning)",
    borderColor: "var(--color-fg-warning)",
    background: "color-mix(in srgb, var(--color-fg-warning) 12%, transparent)",
  };
}

export default function WalletConnectModal({
  open,
  onClose,
  onConnected,
}: WalletConnectModalProps) {
  const wallet = useWalletConnect();
  const { loginWithWallet, loginAsGuest } = useAuth();
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4 backdrop-blur-sm"
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="wallet-connect-title"
        className="w-full max-w-md rounded-2xl border p-5 shadow-2xl"
        style={{
          background: "var(--color-surface)",
          borderColor: "var(--color-border-default)",
        }}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-xl"
              style={{
                background:
                  "linear-gradient(135deg, var(--color-brand), var(--color-accent-purple))",
              }}
            >
              <Wallet className="h-5 w-5" aria-hidden="true" style={{ color: "#ffffff" }} />
            </div>
            <div>
              <h2
                id="wallet-connect-title"
                className="text-lg font-bold"
                style={{ color: "var(--color-heading)" }}
              >
                Connect Wallet
              </h2>
              <p className="mt-1 text-sm" style={{ color: "var(--color-body-subtle)" }}>
                Choose an active EVM wallet for Base Network.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close wallet connect modal"
            className="rounded-lg border p-2 focus-ring"
            style={{
              borderColor: "var(--color-border-default)",
              color: "var(--color-body)",
            }}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-5 space-y-2">
          {wallet.wallets.map((option) => (
            <button
              key={option.id}
              onClick={async () => {
                setAuthError(null);
                setAuthLoading(true);
                try {
                  const session = await wallet.connect(option);
                  if (!session) {
                    setAuthLoading(false);
                    return;
                  }

                  if (!option.provider) {
                    loginAsGuest();
                    onClose();
                    return;
                  }

                  const nonce = await getWalletNonce();
                  const message = `Sign in to A2Z Agentz\nAddress: ${session.address}\nNonce: ${nonce}`;
                  
                  const signature = await option.provider.request({
                    method: "personal_sign",
                    params: [message, session.address],
                  });

                  if (!signature || typeof signature !== "string") {
                    throw new Error("No signature returned from wallet");
                  }

                  await loginWithWallet(session.address, signature);
                  
                  onConnected?.(session);
                  onClose();
                } catch (err: unknown) {
                  console.error(err);
                  setAuthError(
                    err instanceof Error
                      ? err.message
                      : "Authentication failed. Please try again."
                  );
                } finally {
                  setAuthLoading(false);
                }
              }}
              disabled={wallet.state === "connecting" || authLoading}
              aria-label={`Connect ${option.name}`}
              className="flex w-full items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left transition-all hover:opacity-85 disabled:opacity-60 focus-ring"
              style={{
                borderColor: "var(--color-border-default)",
                background: "var(--color-neutral-secondary-medium)",
              }}
            >
              <span>
                <span
                  className="block text-sm font-semibold"
                  style={{ color: "var(--color-heading)" }}
                >
                  {option.name}
                </span>
                <span className="block text-xs" style={{ color: "var(--color-body-subtle)" }}>
                  {option.description}
                </span>
              </span>
              <span
                className="rounded-full border px-2 py-1 text-[10px] font-semibold"
                style={statusStyle(option.status)}
              >
                {statusLabel(option.status)}
              </span>
            </button>
          ))}
        </div>

        {(wallet.state === "connecting" || authLoading) && (
          <p className="mt-3 flex items-center gap-2 text-sm" style={{ color: "var(--color-body-subtle)" }}>
            <Loader2 className="h-4 w-4 animate-spin text-[var(--color-fg-brand)]" aria-hidden="true" />
            Waiting for wallet & signature approval...
          </p>
        )}

        {(wallet.error || authError) && (
          <p
            role="alert"
            className="mt-3 rounded-xl border p-3 text-sm"
            style={{
              color: "var(--color-fg-danger)",
              borderColor: "var(--color-fg-danger)",
              background: "color-mix(in srgb, var(--color-fg-danger) 12%, transparent)",
            }}
          >
            {wallet.error || authError}
          </p>
        )}

        <div
          className="mt-4 rounded-xl border p-3 text-xs"
          style={{
            color: "var(--color-fg-success)",
            borderColor: "var(--color-fg-success)",
            background: "color-mix(in srgb, var(--color-fg-success) 10%, transparent)",
          }}
        >
          🔒 Connection is secured using end-to-end cryptographic signatures.
        </div>
      </div>
    </div>
  );
}
