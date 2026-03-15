import { useCallback, useState } from "react";
import { useSyncState } from "@miden-sdk/react";
import { Transaction, useMidenFiWallet } from "@miden-sdk/miden-wallet-adapter";
import {
  AccountId,
  Felt,
  FeltArray,
  FungibleAsset,
  Note,
  NoteAssets,
  NoteInputs,
  NoteMetadata,
  NoteRecipient,
  NoteScript,
  NoteTag,
  NoteType,
  OutputNote,
  OutputNoteArray,
  Package,
  TransactionRequestBuilder,
} from "@miden-sdk/miden-sdk";
import { NETWORK_SYNC_DELAY_MS, NEVER_SENTINEL } from "@/config";
import { randomWord } from "@/lib/miden";

type CreateCapsuleParams = {
  recipientAddress: string;
  /** Unix timestamp in seconds for time-based unlock. null = disabled. */
  unlockTimestamp: number | null;
  /** Absolute block height for block-based unlock. null = disabled. */
  unlockHeight: number | null;
  message: string;
  noteType: "public" | "private";
  /** Faucet ID (bech32) for the asset to attach. null = no asset. */
  faucetId: string | null;
  /** Amount to attach (bigint-compatible). null = no asset. */
  amount: bigint | null;
};

export function useCreateCapsule() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isWaiting, setIsWaiting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [noteId, setNoteId] = useState<string | null>(null);
  const [capsuleData, setCapsuleData] = useState<string | null>(null);

  const { address: walletAddress, requestTransaction } = useMidenFiWallet();
  const { syncHeight, sync } = useSyncState();

  const createCapsule = useCallback(
    async ({
      recipientAddress,
      unlockTimestamp,
      unlockHeight,
      message,
      noteType,
      faucetId,
      amount,
    }: CreateCapsuleParams) => {
      if (!walletAddress || !requestTransaction) {
        setError("Connect a wallet before creating a capsule");
        return;
      }

      if (!Number.isFinite(syncHeight)) {
        setError("Sync height is not ready yet");
        return;
      }

      // At least one unlock condition must be set
      if (unlockTimestamp === null && unlockHeight === null) {
        setError("Set either a date/time or block height unlock");
        return;
      }

      setError(null);
      setNoteId(null);
      setCapsuleData(null);
      setIsSubmitting(true);

      try {
        const buf = await fetch("/packages/time_capsule_note.masp").then((response) =>
          response.arrayBuffer(),
        );
        const pkg = Package.deserialize(new Uint8Array(buf));
        const noteScript = NoteScript.fromPackage(pkg);

        const senderAccountId = AccountId.fromBech32(walletAddress);
        const recipientAccountId = AccountId.fromBech32(recipientAddress.trim());

        // Build note inputs with layout:
        // [0] unlock_timestamp, [1] unlock_height,
        // [2] recipient prefix, [3] recipient suffix, [4..] message
        const tsValue = unlockTimestamp !== null ? BigInt(unlockTimestamp) : NEVER_SENTINEL;
        const heightValue = unlockHeight !== null ? BigInt(unlockHeight) : NEVER_SENTINEL;

        const messageFelts = message
          .split("")
          .map((char) => new Felt(BigInt(char.charCodeAt(0))));

        const noteInputFelts = new FeltArray([
          new Felt(tsValue),
          new Felt(heightValue),
          recipientAccountId.prefix(),
          recipientAccountId.suffix(),
          ...messageFelts,
        ]);

        const inputs = new NoteInputs(noteInputFelts);
        const recipient = new NoteRecipient(randomWord(), noteScript, inputs);
        const tag = NoteTag.withAccountTarget(recipientAccountId);

        const visibility = noteType === "public" ? NoteType.Public : NoteType.Private;
        const metadata = new NoteMetadata(senderAccountId, visibility, tag);

        // Build assets — attach fungible tokens if specified
        let noteAssets: NoteAssets;
        if (faucetId && amount && amount > 0n) {
          const faucetAccountId = AccountId.fromBech32(faucetId);
          const asset = new FungibleAsset(faucetAccountId, amount);
          noteAssets = new NoteAssets([asset]);
        } else {
          noteAssets = new NoteAssets();
        }

        const note = new Note(noteAssets, metadata, recipient);
        const outputNote = OutputNote.full(note);
        const createdNoteId = outputNote.id().toString();

        // Serialize the raw Note (preserves full metadata) for the recipient
        const serializedBytes = note.serialize();
        let binaryStr = "";
        for (let i = 0; i < serializedBytes.length; i++) {
          binaryStr += String.fromCharCode(serializedBytes[i]);
        }
        const base64Blob = btoa(binaryStr);

        const txRequest = new TransactionRequestBuilder()
          .withOwnOutputNotes(new OutputNoteArray([outputNote]))
          .build();

        const tx = Transaction.createCustomTransaction(
          walletAddress,
          recipientAddress.trim(),
          txRequest,
        );

        await requestTransaction(tx);
        setNoteId(createdNoteId);
        setCapsuleData(base64Blob);
        setIsSubmitting(false);

        setIsWaiting(true);
        await new Promise((resolve) => setTimeout(resolve, NETWORK_SYNC_DELAY_MS));
        await sync();
        setIsWaiting(false);
      } catch (err) {
        setIsSubmitting(false);
        setIsWaiting(false);
        setError(err instanceof Error ? err.message : String(err));
      }
    },
    [requestTransaction, sync, syncHeight, walletAddress],
  );

  return {
    createCapsule,
    isSubmitting,
    isWaiting,
    error,
    noteId,
    capsuleData,
  };
}
