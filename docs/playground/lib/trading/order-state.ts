export type OrderState = "planned" | "submitting" | "unknown" | "accepted" | "partially_filled" | "filled" | "canceled" | "rejected";
const transitions: Record<OrderState, readonly OrderState[]> = {
  planned: ["submitting", "rejected"],
  submitting: ["unknown", "accepted", "rejected"],
  unknown: ["unknown", "accepted", "partially_filled", "filled", "canceled", "rejected"],
  accepted: ["accepted", "partially_filled", "filled", "canceled", "rejected"],
  partially_filled: ["partially_filled", "filled", "canceled"],
  filled: ["filled"], canceled: ["canceled"], rejected: ["rejected"],
};

/** Order updates are monotonic; a late NEW event can never undo a fill. */
export function transitionOrder(current: OrderState, next: OrderState): OrderState {
  if (!transitions[current].includes(next)) throw new Error(`invalid order transition: ${current} -> ${next}`);
  return next;
}

export function nextReconciliationAction(state: OrderState): "submit" | "lookup" | "none" {
  if (state === "planned") return "submit";
  if (state === "submitting" || state === "unknown" || state === "accepted" || state === "partially_filled") return "lookup";
  return "none";
}
