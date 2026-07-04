import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import WalletConnectModal from "../WalletConnectModal";

const mockLoginWithWallet = vi.fn();
const mockLoginAsGuest = vi.fn();

vi.mock("@/components/AuthProvider", () => ({
  useAuth: () => ({
    loginWithWallet: mockLoginWithWallet,
    loginAsGuest: mockLoginAsGuest,
  }),
}));

vi.mock("@/lib/auth", () => ({
  getWalletNonce: vi.fn(async () => "test-nonce-123"),
}));

function setEthereum(provider: unknown) {
  Object.defineProperty(window, "ethereum", {
    value: provider,
    configurable: true,
    writable: true,
  });
}

describe("WalletConnectModal", () => {
  beforeEach(() => {
    localStorage.clear();
    document.cookie = "a2z-wallet-session=; Max-Age=0; path=/";
    setEthereum(undefined);
    vi.clearAllMocks();
  });

  it("does not render when closed", () => {
    render(<WalletConnectModal open={false} onClose={vi.fn()} />);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("renders wallet options when open", async () => {
    render(<WalletConnectModal open onClose={vi.fn()} />);
    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(await screen.findByText("MetaMask")).toBeTruthy();
    expect(screen.getByText("Coinbase Wallet")).toBeTruthy();
    expect(screen.getByText("Rabby")).toBeTruthy();
    expect(screen.getByText("Browser Wallet")).toBeTruthy();
  });

  it("connects detected wallet, prompts personal_sign, and calls loginWithWallet", async () => {
    const request = vi.fn(async ({ method }: { method: string }) => {
      if (method === "eth_requestAccounts") {
        return ["0x1234567890abcdef1234567890abcdef12345678"];
      }
      if (method === "eth_chainId") return "0x2105";
      if (method === "personal_sign") return "mock-sig-000";
      return null;
    });
    setEthereum({ isMetaMask: true, request });
    const onConnected = vi.fn();

    render(<WalletConnectModal open onClose={vi.fn()} onConnected={onConnected} />);
    await userEvent.click(await screen.findByRole("button", { name: /connect metamask/i }));

    await waitFor(() => {
      expect(request).toHaveBeenCalledWith({
        method: "personal_sign",
        params: [
          expect.stringContaining("test-nonce-123"),
          "0x1234567890abcdef1234567890abcdef12345678",
        ],
      });
    });
    expect(mockLoginWithWallet).toHaveBeenCalledWith(
      "0x1234567890abcdef1234567890abcdef12345678",
      "mock-sig-000"
    );
    expect(onConnected).toHaveBeenCalled();
  });

  it("shows rejected connection error", async () => {
    const request = vi.fn(async () => {
      throw new Error("User rejected");
    });
    setEthereum({ isMetaMask: true, request });

    render(<WalletConnectModal open onClose={vi.fn()} />);
    await userEvent.click(await screen.findByRole("button", { name: /connect metamask/i }));

    await waitFor(() => {
      expect(screen.getByText(/Connection rejected/i)).toBeTruthy();
    });
  });

  it("allows connecting mock wallet when no provider exists (demo/guest mode)", async () => {
    render(<WalletConnectModal open onClose={vi.fn()} />);
    
    // In demo mode, clicking should trigger loginAsGuest
    await userEvent.click(await screen.findByRole("button", { name: /connect metamask/i }));
    
    await waitFor(() => {
      expect(mockLoginAsGuest).toHaveBeenCalled();
    });
  });
});
