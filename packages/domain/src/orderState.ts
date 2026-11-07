/** Mint/reload order lifecycle. Mirrored by contracts/core OrderStatus. */
export const ORDER_STATES = [
  "QUOTE_READY",
  "ESCROWED",
  "RANDOMNESS_COMMITTED",
  "TRAITS_ASSIGNED",
  "SWAPS_PENDING",
  "FULLY_BACKED_LOCKED",
  "FAILED_PRE_EXECUTION",
  "REFUND_PENDING",
  "REFUNDED",
  "PARTIAL_EXECUTION_RECOVERY",
  "PAUSED",
] as const;
export type OrderState = (typeof ORDER_STATES)[number];

/** NFT backing lifecycle (after a funded mint exists). */
export const NFT_STATES = ["FULLY_BACKED_LOCKED", "UNLOCKED", "REDEEMING", "REDEEMED_EMPTY"] as const;
export type NftState = (typeof NFT_STATES)[number];

const T: Record<OrderState, OrderState[]> = {
  QUOTE_READY: ["ESCROWED"],
  ESCROWED: ["RANDOMNESS_COMMITTED", "FAILED_PRE_EXECUTION", "PAUSED"],
  RANDOMNESS_COMMITTED: ["TRAITS_ASSIGNED", "FAILED_PRE_EXECUTION"],
  TRAITS_ASSIGNED: ["SWAPS_PENDING", "FAILED_PRE_EXECUTION", "PAUSED"],
  SWAPS_PENDING: ["SWAPS_PENDING", "FULLY_BACKED_LOCKED", "FAILED_PRE_EXECUTION", "PARTIAL_EXECUTION_RECOVERY"],
  FULLY_BACKED_LOCKED: [],
  FAILED_PRE_EXECUTION: ["REFUND_PENDING"],
  REFUND_PENDING: ["REFUNDED"],
  REFUNDED: [],
  PARTIAL_EXECUTION_RECOVERY: ["SWAPS_PENDING", "REFUND_PENDING"],
  PAUSED: ["ESCROWED", "TRAITS_ASSIGNED", "FAILED_PRE_EXECUTION"],
};

export function canTransition(from: OrderState, to: OrderState): boolean {
  return T[from].includes(to);
}

export function assertTransition(from: OrderState, to: OrderState): void {
  if (!canTransition(from, to)) throw new Error(`Illegal order transition ${from} -> ${to}`);
}

export const isTerminal = (s: OrderState): boolean => T[s].length === 0;

export type NftAction = "transfer" | "list" | "buy" | "redeem" | "reload";

/** What may happen to an NFT in each backing state. Mirrors contract guards. */
export function nftActionAllowed(state: NftState, action: NftAction): boolean {
  switch (state) {
    case "FULLY_BACKED_LOCKED":
      return action === "transfer" || action === "list" || action === "buy";
    case "UNLOCKED":
      return action !== "reload";
    case "REDEEMING":
      return false;
    case "REDEEMED_EMPTY":
      return action === "transfer" || action === "list" || action === "buy" || action === "reload";
  }
}
