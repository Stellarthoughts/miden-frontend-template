import { useCallback, useState } from "react";
import { useMidenFiWallet } from "@miden-sdk/miden-wallet-adapter";
import { useOpenCapsule } from "@/hooks/useOpenCapsule";
import "./CapsuleList.css";

interface ConsumableNote {
  noteId: string;
  senderAccountId: string | undefined;
  noteType: string | undefined;
}

export function CapsuleList() {
  const { connected, address, requestConsumableNotes } = useMidenFiWallet();
  const { openCapsule, isOpening, stage, error, noteId: importedNoteId, capsuleMessage } =
    useOpenCapsule();

  const [capsuleData, setCapsuleData] = useState("");
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [notes, setNotes] = useState<ConsumableNote[]>([]);
  const [isLoadingNotes, setIsLoadingNotes] = useState(false);
  const [notesError, setNotesError] = useState<string | null>(null);
  const [hasRefreshed, setHasRefreshed] = useState(false);

  const refreshNotes = useCallback(async () => {
    if (!requestConsumableNotes || !connected) return;

    setIsLoadingNotes(true);
    setNotesError(null);

    try {
      const consumable = await requestConsumableNotes();
      setNotes(
        consumable.map((n) => ({
          noteId: n.noteId,
          senderAccountId: n.senderAccountId,
          noteType: n.noteType as string | undefined,
        })),
      );
      setHasRefreshed(true);
    } catch (err) {
      setNotesError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoadingNotes(false);
    }
  }, [requestConsumableNotes, connected]);

  const openFromData = async (data: string) => {
    if (!address) return;

    setSuccessMessage(null);

    try {
      await openCapsule({ capsuleData: data });
      setSuccessMessage("Capsule opened!");
      setCapsuleData("");
    } catch {
      // Error state is already handled in the hook.
    }
  };

  const statusLabel =
    stage && stage !== "idle" ? `${stage}...` : "";

  return (
    <section className="capsule-list-card">
      <h2>Open Capsules</h2>

      <div className="capsule-section">
        <div className="capsule-section-header">
          <h3>Discoverable Capsules</h3>
          <button
            type="button"
            className="refresh-btn"
            onClick={refreshNotes}
            disabled={!connected || isLoadingNotes}
          >
            {isLoadingNotes ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        <p className="capsule-list-hint">
          Refresh discovers <strong>public</strong> capsules synced to your wallet.
          Private capsules must be opened using capsule data shared by the sender.
        </p>

        {!hasRefreshed && !isLoadingNotes && (
          <p className="capsule-list-muted">
            Press Refresh to check for discoverable capsules.
          </p>
        )}
        {isLoadingNotes && notes.length === 0 && (
          <p className="capsule-list-muted">Loading capsules...</p>
        )}
        {hasRefreshed && !isLoadingNotes && notes.length === 0 && (
          <p className="capsule-list-muted">
            No consumable capsules found.
          </p>
        )}

        {notes.length > 0 && (
          <ul className="capsule-items">
            {notes.map((note) => (
              <li key={note.noteId}>
                <div>
                  <code>{note.noteId}</code>
                  {note.senderAccountId && (
                    <span className="note-sender">
                      from {note.senderAccountId.slice(0, 12)}...
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="capsule-section">
        <h3>Open with capsule data</h3>
        <p className="capsule-list-muted">
          Paste the capsule data you received from the sender.
        </p>
        <textarea
          className="capsule-data-input"
          value={capsuleData}
          onChange={(event) => setCapsuleData(event.target.value)}
          placeholder="Paste capsule data here..."
          rows={4}
          disabled={!connected || !address || isOpening}
        />
        <button
          type="button"
          onClick={() => openFromData(capsuleData)}
          disabled={!connected || !address || isOpening || !capsuleData.trim()}
        >
          {isOpening ? statusLabel || "Opening..." : "Open Capsule"}
        </button>
      </div>

      {capsuleMessage && (
        <div className="capsule-message-reveal">
          <h3>Message from the past</h3>
          <p>{capsuleMessage}</p>
        </div>
      )}
      {importedNoteId && (
        <p className="capsule-list-muted">
          Note: <code>{importedNoteId}</code>
        </p>
      )}
      {successMessage && <p className="capsule-list-success">{successMessage}</p>}
      {notesError && <p className="capsule-list-error">{notesError}</p>}
      {error && <p className="capsule-list-error">{error}</p>}

      {!connected && (
        <p className="capsule-list-muted">Connect a wallet to open capsules.</p>
      )}
    </section>
  );
}
