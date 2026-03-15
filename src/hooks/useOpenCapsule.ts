import { useCallback, useState } from "react";
import { Transaction, useMidenFiWallet } from "@miden-sdk/miden-wallet-adapter";
import {
  Note,
  NoteAndArgs,
  NoteAndArgsArray,
  TransactionRequestBuilder,
} from "@miden-sdk/miden-sdk";

type OpenCapsuleParams = {
  capsuleData: string;
};

function decodeMessage(note: Note): string {
  try {
    const recipient = note.recipient();
    const inputs = recipient.inputs();
    const allValues = inputs.values(); // Felt[]

    // Inputs layout: [0] unlock_timestamp, [1] unlock_height,
    // [2] recipient prefix, [3] recipient suffix, [4..] message ASCII felts
    if (allValues.length <= 4) return "";

    const chars: string[] = [];
    for (let i = 4; i < allValues.length; i++) {
      const code = Number(allValues[i].asInt());
      if (code > 0 && code < 128) {
        chars.push(String.fromCharCode(code));
      }
    }
    return chars.join("");
  } catch {
    return "";
  }
}

export function useOpenCapsule() {
  const [localError, setLocalError] = useState<string | null>(null);
  const [noteIdStr, setNoteIdStr] = useState<string | null>(null);
  const [capsuleMessage, setCapsuleMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [stage, setStage] = useState<string>("idle");
  const { address, requestTransaction } = useMidenFiWallet();

  const openCapsule = useCallback(
    async ({ capsuleData }: OpenCapsuleParams) => {
      const trimmedData = capsuleData.trim();

      if (!trimmedData) {
        const message = "Capsule data is required";
        setLocalError(message);
        throw new Error(message);
      }

      if (!address || !requestTransaction) {
        const message = "Connect a wallet first";
        setLocalError(message);
        throw new Error(message);
      }

      setLocalError(null);
      setNoteIdStr(null);
      setCapsuleMessage(null);
      setIsLoading(true);
      setStage("decoding");

      try {
        // Decode the base64 capsule data into raw Note bytes
        const binaryString = atob(trimmedData);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }

        // Deserialize the full Note (includes metadata, script, inputs, recipient)
        const note = Note.deserialize(bytes);
        const noteId = note.id().toString();
        setNoteIdStr(noteId);

        setStage("building");
        const noteAndArgs = new NoteAndArgs(note);
        const inputNotes = new NoteAndArgsArray([noteAndArgs]);
        const txRequest = new TransactionRequestBuilder()
          .withInputNotes(inputNotes)
          .build();

        const tx = Transaction.createCustomTransaction(
          address,
          address,
          txRequest,
          [noteId],
          [bytes],
        );

        setStage("submitting");
        await requestTransaction(tx);
        setStage("complete");

        const message = decodeMessage(note);
        if (message) setCapsuleMessage(message);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        setLocalError(message);
        setStage("idle");
        throw err instanceof Error ? err : new Error(message);
      } finally {
        setIsLoading(false);
      }
    },
    [address, requestTransaction],
  );

  return {
    openCapsule,
    isOpening: isLoading,
    stage,
    error: localError,
    noteId: noteIdStr,
    capsuleMessage,
  };
}
