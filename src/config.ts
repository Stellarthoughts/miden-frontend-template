export const EXPLORER_BASE_URL = "https://testnet.midenscan.com";
export const NETWORK_SYNC_DELAY_MS = 10_000;
export const APP_NAME = "Chronovault";
export const MIDEN_RPC_URL =
  import.meta.env.VITE_MIDEN_RPC_URL ?? "testnet";
export const MIDEN_PROVER =
  (import.meta.env.VITE_MIDEN_PROVER as "testnet" | "local") ?? "testnet";

// Max safe Felt value in Goldilocks field (p - 1).
// Used as "never" sentinel to disable unlock conditions.
export const NEVER_SENTINEL = 18_446_744_069_414_584_320n;
