import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi, describe, it, expect, beforeEach } from "vitest";

vi.mock("@miden-sdk/react", () => import("@/__tests__/mocks/miden-sdk-react"));
vi.mock("@miden-sdk/miden-wallet-adapter", () => ({
  useMidenFiWallet: () => ({
    connected: false,
    address: null,
    connect: vi.fn(),
    disconnect: vi.fn(),
    connecting: false,
  }),
}));
vi.mock("@/components/CreateCapsule", () => ({
  CreateCapsule: () => <div data-testid="create-capsule">Create Mock</div>,
}));
vi.mock("@/components/CapsuleList", () => ({
  CapsuleList: () => <div data-testid="capsule-list">List Mock</div>,
}));

import { useMiden, useSyncState } from "@miden-sdk/react";
import { AppContent } from "../AppContent";

describe("AppContent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders main content when Miden is ready", () => {
    render(<AppContent />);

    expect(screen.getByText("Chronovault")).toBeInTheDocument();
    expect(
      screen.getByText("Private digital time capsules on Miden"),
    ).toBeInTheDocument();
    expect(screen.getByText("Connect Wallet")).toBeInTheDocument();
    expect(screen.getByTestId("create-capsule")).toBeInTheDocument();
  });

  it("shows sync height from testnet", () => {
    render(<AppContent />);
    expect(screen.getByText(/Synced block: 12345/)).toBeInTheDocument();
  });

  it("shows syncing indicator when syncHeight is null", () => {
    vi.mocked(useSyncState).mockReturnValue({
      syncHeight: null as unknown as number,
      isSyncing: true,
      lastSyncTime: null,
      error: null,
      sync: vi.fn(),
    });

    render(<AppContent />);
    expect(screen.getByText(/syncing\.\.\./)).toBeInTheDocument();
  });

  it("switches to Open tab", async () => {
    render(<AppContent />);
    const user = userEvent.setup();

    await user.click(screen.getByRole("tab", { name: "Open" }));

    expect(screen.getByTestId("capsule-list")).toBeInTheDocument();
  });

  it("shows loading message during initialization", () => {
    vi.mocked(useMiden).mockReturnValue({
      client: null,
      isReady: false,
      isInitializing: true,
      error: null,
      sync: vi.fn(),
      runExclusive: vi.fn(),
      prover: null,
      signerAccountId: null,
    });

    render(<AppContent />);
    expect(
      screen.getByText("Connect your wallet above to initialize the Miden client."),
    ).toBeInTheDocument();
  });

  it("shows error message on initialization failure", () => {
    vi.mocked(useMiden).mockReturnValue({
      client: null,
      isReady: false,
      isInitializing: false,
      error: new Error("WASM failed to load"),
      sync: vi.fn(),
      runExclusive: vi.fn(),
      prover: null,
      signerAccountId: null,
    });

    render(<AppContent />);
    expect(
      screen.getByText("Failed to initialize Miden client"),
    ).toBeInTheDocument();
    expect(screen.getByText("WASM failed to load")).toBeInTheDocument();
  });
});
