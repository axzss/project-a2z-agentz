import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import A2AIdentityReadiness from "../A2AIdentityReadiness";
import { saveWalletSession, clearWalletSession } from "@/lib/wallet";

const user = {
  id: 1,
  email: "operator@example.com",
  wallet_address: null,
};

describe("A2AIdentityReadiness", () => {
  beforeEach(() => {
    localStorage.clear();
    clearWalletSession();
  });

  it("shows JWT backend auth and connected A2A websocket", () => {
    render(<A2AIdentityReadiness wsStatus="connected" user={user} />);

    expect(screen.getByText("A2A Identity & Backend Readiness")).toBeTruthy();
    expect(screen.getByText("JWT Authenticated")).toBeTruthy();
    expect(screen.getByText("operator@example.com")).toBeTruthy();
    expect(screen.getByText("Connected")).toBeTruthy();
    expect(screen.getByText("Not connected")).toBeTruthy();
  });

  it("shows frontend wallet session and SIWE backend milestone", () => {
    saveWalletSession({
      address: "0x1234567890abcdef1234567890abcdef12345678",
      walletName: "MetaMask",
      chainId: "0x2105",
      connectedAt: "2026-06-21T00:00:00.000Z",
      frontendOnly: true,
    });

    render(<A2AIdentityReadiness wsStatus="disconnected" user={null} />);

    expect(screen.getByText("Connected wallet")).toBeTruthy();
    expect(screen.getByText(/MetaMask · 0x1234\.\.\.5678/)).toBeTruthy();
    expect(screen.getByText("Frontend wallet session")).toBeTruthy();
    expect(screen.getByText("Fallback / Demo Mode")).toBeTruthy();
    expect(screen.getByText(/Next backend milestone: add SIWE challenge\/verify endpoint/i)).toBeTruthy();
  });

  it("shows unknown auth and connecting websocket when neither JWT nor wallet exists", () => {
    render(<A2AIdentityReadiness wsStatus="connecting" user={null} />);

    expect(screen.getByText("Auth unknown")).toBeTruthy();
    expect(screen.getByText("Connecting")).toBeTruthy();
    expect(screen.getByText("Protected backend API calls still require email/password JWT until SIWE is available.")).toBeTruthy();
  });
});
