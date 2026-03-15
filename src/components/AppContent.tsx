import { useState } from "react";
import { useMiden, useSyncState } from "@miden-sdk/react";
import { useMidenFiWallet } from "@miden-sdk/miden-wallet-adapter";
import { CreateCapsule } from "@/components/CreateCapsule";
import { CapsuleList } from "@/components/CapsuleList";
import "./AppContent.css";

function WalletButton() {
  const { connected, address, connect, disconnect, connecting } =
    useMidenFiWallet();

  if (connecting) {
    return <button className="wallet-btn" disabled>Connecting...</button>;
  }

  if (connected && address) {
    return (
      <button className="wallet-btn connected" onClick={disconnect}>
        {address.slice(0, 10)}...{address.slice(-4)}
      </button>
    );
  }

  return (
    <button className="wallet-btn" onClick={connect}>
      Connect Wallet
    </button>
  );
}

function AppBody() {
  const { isReady, isInitializing, error } = useMiden();
  const { syncHeight } = useSyncState();
  const [activeTab, setActiveTab] = useState<"create" | "open">("create");

  if (error) {
    return (
      <div className="status-message">
        <p>Failed to initialize Miden client</p>
        <p className="error">{error.message}</p>
      </div>
    );
  }

  if (isInitializing || !isReady) {
    return (
      <div className="status-message">
        Connect your wallet above to initialize the Miden client.
      </div>
    );
  }

  return (
    <>
      <div className="tab-row" role="tablist" aria-label="Chronovault actions">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "create"}
          className={activeTab === "create" ? "tab active" : "tab"}
          onClick={() => setActiveTab("create")}
        >
          Create
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "open"}
          className={activeTab === "open" ? "tab active" : "tab"}
          onClick={() => setActiveTab("open")}
        >
          Open
        </button>
      </div>

      <section className="tab-content">
        {activeTab === "create" ? <CreateCapsule /> : <CapsuleList />}
      </section>

      <p className="sync-height">
        Synced block: {syncHeight ?? "syncing..."}
      </p>

      <details className="how-to">
        <summary>How it works</summary>
        <ol>
          <li><strong>Create</strong> — fill in a recipient address, choose an unlock condition (date/time or block height), write a message, then seal. You'll get a blob of capsule data.</li>
          <li><strong>Share</strong> — send the capsule data to the recipient out-of-band (email, chat, carrier pigeon). For private capsules this is the only way they can open it.</li>
          <li><strong>Open</strong> — the recipient pastes the capsule data and opens it once the unlock condition is met. Public capsules can also be discovered via Refresh.</li>
        </ol>
      </details>
    </>
  );
}

export function AppContent() {
  return (
    <main className="app-shell">
      <header className="brand-header">
        <p className="brand-kicker">Private digital time capsules on Miden</p>
        <h1>Chronovault</h1>
      </header>

      <div className="wallet-section">
        <WalletButton />
      </div>

      <AppBody />
    </main>
  );
}
