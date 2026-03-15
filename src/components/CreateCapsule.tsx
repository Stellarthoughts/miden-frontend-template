import { type FormEvent, useCallback, useEffect, useState } from "react";
import { useMidenFiWallet } from "@miden-sdk/miden-wallet-adapter";
import { useSyncState } from "@miden-sdk/react";
import { useCreateCapsule } from "@/hooks/useCreateCapsule";
import "./CreateCapsule.css";

interface WalletAsset {
  faucetId: string;
  amount: string;
}

export function CreateCapsule() {
  const { connected, requestAssets } = useMidenFiWallet();
  const { syncHeight } = useSyncState();
  const { createCapsule, isSubmitting, isWaiting, error, noteId, capsuleData } =
    useCreateCapsule();

  const [recipientAddress, setRecipientAddress] = useState("");
  const [message, setMessage] = useState("");
  const [noteType, setNoteType] = useState<"public" | "private">("private");
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  // Unlock mode
  const [unlockMode, setUnlockMode] = useState<"timestamp" | "blocks">("timestamp");
  const [unlockDate, setUnlockDate] = useState("");
  const [unlockBlocks, setUnlockBlocks] = useState("100");

  // Asset attachment
  const [walletAssets, setWalletAssets] = useState<WalletAsset[]>([]);
  const [selectedFaucet, setSelectedFaucet] = useState<string>("");
  const [attachAmount, setAttachAmount] = useState("");

  const busy = isSubmitting || isWaiting;
  const isFormDisabled = !connected || busy;

  const buttonLabel = isSubmitting
    ? "Submitting..."
    : isWaiting
      ? "Waiting for network..."
      : "Seal Capsule";

  // Fetch wallet assets when connected
  const fetchAssets = useCallback(async () => {
    if (!requestAssets || !connected) return;
    try {
      const assets = await requestAssets();
      setWalletAssets(assets ?? []);
      if (assets && assets.length > 0 && !selectedFaucet) {
        setSelectedFaucet(assets[0].faucetId);
      }
    } catch {
      // Wallet may not support requestAssets
    }
  }, [requestAssets, connected, selectedFaucet]);

  useEffect(() => {
    if (connected) fetchAssets();
  }, [connected, fetchAssets]);

  const selectedAsset = walletAssets.find((a) => a.faucetId === selectedFaucet);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCopyFeedback(null);

    let unlockTimestamp: number | null = null;
    let unlockHeight: number | null = null;

    if (unlockMode === "timestamp") {
      if (!unlockDate) return;
      unlockTimestamp = Math.floor(new Date(unlockDate).getTime() / 1000);
      if (unlockTimestamp <= Math.floor(Date.now() / 1000)) {
        return;
      }
    } else {
      const blocks = Number(unlockBlocks);
      if (!Number.isInteger(blocks) || blocks < 0) return;
      unlockHeight = (syncHeight ?? 0) + blocks;
    }

    // Parse asset amount
    let faucetId: string | null = null;
    let amount: bigint | null = null;
    if (attachAmount && selectedFaucet) {
      const parsed = BigInt(attachAmount);
      if (parsed > 0n) {
        faucetId = selectedFaucet;
        amount = parsed;
      }
    }

    await createCapsule({
      recipientAddress,
      unlockTimestamp,
      unlockHeight,
      message,
      noteType,
      faucetId,
      amount,
    });
  };

  const copyCapsuleData = async () => {
    if (!capsuleData) return;

    try {
      await navigator.clipboard.writeText(capsuleData);
      setCopyFeedback("Copied!");
    } catch {
      setCopyFeedback("Could not copy");
    }
  };

  const minDate = new Date(Date.now() + 60_000).toISOString().slice(0, 16);

  return (
    <section className="capsule-card">
      <h2>Create Capsule</h2>

      <form className="capsule-form" onSubmit={onSubmit}>
        <label>
          Recipient address
          <input
            value={recipientAddress}
            onChange={(event) => setRecipientAddress(event.target.value)}
            placeholder="mtst1..."
            disabled={isFormDisabled}
            required
          />
        </label>

        <label>
          Message
          <textarea
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder="Write a message for the future..."
            rows={4}
            maxLength={256}
            disabled={isFormDisabled}
            required
          />
        </label>

        <fieldset className="unlock-mode" disabled={isFormDisabled}>
          <legend>Unlock condition</legend>

          <div className="toggle-row">
            <label className={`toggle-option ${unlockMode === "timestamp" ? "active" : ""}`}>
              <input
                type="radio"
                name="unlock-mode"
                checked={unlockMode === "timestamp"}
                onChange={() => setUnlockMode("timestamp")}
              />
              Date & time
            </label>
            <label className={`toggle-option ${unlockMode === "blocks" ? "active" : ""}`}>
              <input
                type="radio"
                name="unlock-mode"
                checked={unlockMode === "blocks"}
                onChange={() => setUnlockMode("blocks")}
              />
              Block height
            </label>
          </div>

          {unlockMode === "timestamp" ? (
            <label>
              Unlock at
              <input
                type="datetime-local"
                value={unlockDate}
                onChange={(e) => setUnlockDate(e.target.value)}
                min={minDate}
                required
              />
            </label>
          ) : (
            <label>
              Unlock in N blocks
              <input
                type="number"
                min={0}
                step={1}
                value={unlockBlocks}
                onChange={(e) => setUnlockBlocks(e.target.value)}
                required
              />
              {syncHeight != null && (
                <span className="field-hint">
                  Current block: {syncHeight} → unlock at block {syncHeight + Number(unlockBlocks || 0)}
                </span>
              )}
            </label>
          )}
        </fieldset>

        <fieldset className="asset-section" disabled={isFormDisabled}>
          <legend>Attach tokens (optional)</legend>

          {walletAssets.length === 0 ? (
            <p className="field-hint">
              No tokens found in wallet. You can still create a message-only capsule.
            </p>
          ) : (
            <>
              {walletAssets.length > 1 && (
                <label>
                  Token
                  <select
                    value={selectedFaucet}
                    onChange={(e) => setSelectedFaucet(e.target.value)}
                  >
                    {walletAssets.map((asset) => (
                      <option key={asset.faucetId} value={asset.faucetId}>
                        {asset.faucetId.slice(0, 16)}... ({asset.amount})
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <label>
                Amount
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={attachAmount}
                  onChange={(e) => setAttachAmount(e.target.value)}
                  placeholder="0"
                />
                {selectedAsset && (
                  <span className="field-hint">
                    Available: {selectedAsset.amount}
                    {walletAssets.length === 1 && (
                      <> · {selectedAsset.faucetId.slice(0, 16)}...</>
                    )}
                  </span>
                )}
              </label>
            </>
          )}
        </fieldset>

        <fieldset className="note-type-toggle" disabled={isFormDisabled}>
          <legend>Note type</legend>
          <label>
            <input
              type="radio"
              name="note-type"
              value="private"
              checked={noteType === "private"}
              onChange={() => setNoteType("private")}
            />
            Private
          </label>
          <label>
            <input
              type="radio"
              name="note-type"
              value="public"
              checked={noteType === "public"}
              onChange={() => setNoteType("public")}
            />
            Public
          </label>
        </fieldset>

        <button type="submit" disabled={isFormDisabled}>
          {buttonLabel}
        </button>
      </form>

      {!connected && (
        <p className="capsule-muted">Connect a wallet to seal a capsule.</p>
      )}

      {error && <p className="capsule-error">{error}</p>}

      {noteId && capsuleData && (
        <div className="capsule-success">
          <p className="capsule-success-title">Capsule sealed!</p>
          <p className="capsule-note-id">Note ID: <code>{noteId}</code></p>
          <label className="capsule-data-label">
            Capsule data — share this with the recipient:
            <textarea
              className="capsule-data-blob"
              readOnly
              rows={4}
              value={capsuleData}
              onClick={(e) => (e.target as HTMLTextAreaElement).select()}
            />
          </label>
          <div className="capsule-success-actions">
            <button type="button" onClick={copyCapsuleData}>
              Copy capsule data
            </button>
            {copyFeedback && <span>{copyFeedback}</span>}
          </div>
        </div>
      )}
    </section>
  );
}
