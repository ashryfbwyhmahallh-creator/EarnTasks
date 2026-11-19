export type WithdrawalMethodType = "game" | "cash";
export type WithdrawalAudience = "user" | "creator";
export interface WithdrawalMethodField {
  key: string; label: string; placeholder: string; kind: "player_id" | "email";
}
export interface WithdrawalMethod {
  id: string; name: string; type: WithdrawalMethodType; icon: string;
  currency_reward: string; minimum_usd: string; minimum_points: number;
  required_fields: WithdrawalMethodField[]; enabled: boolean;
  audiences: WithdrawalAudience[];
}

// Regular users: gaming rewards + USDT (NO PayPal).
export const USER_WITHDRAWAL_METHODS: WithdrawalMethod[] = [
  { id: "fc_mobile", name: "FC Mobile", type: "game", icon: "\u26BD", currency_reward: "FC Points",
    minimum_usd: "1", minimum_points: 100, enabled: true, audiences: ["user"],
    required_fields: [{ key: "player_id", label: "FC Mobile Player/User ID", placeholder: "Enter your FC Mobile ID", kind: "player_id" }] },
  { id: "efootball", name: "eFootball", type: "game", icon: "\u26BD", currency_reward: "eFootball Coins",
    minimum_usd: "2", minimum_points: 200, enabled: true, audiences: ["user"],
    required_fields: [{ key: "player_id", label: "eFootball User ID", placeholder: "Enter your eFootball ID", kind: "player_id" }] },
  { id: "pubg_mobile", name: "PUBG Mobile", type: "game", icon: "\u{1FA96}", currency_reward: "UC",
    minimum_usd: "1", minimum_points: 100, enabled: true, audiences: ["user"],
    required_fields: [{ key: "player_id", label: "PUBG Mobile Player ID", placeholder: "Enter your PUBG Mobile ID", kind: "player_id" }] },
  { id: "free_fire", name: "Free Fire", type: "game", icon: "\u{1F525}", currency_reward: "Diamonds",
    minimum_usd: "1", minimum_points: 100, enabled: true, audiences: ["user"],
    required_fields: [{ key: "player_id", label: "Free Fire Player ID", placeholder: "Enter your Free Fire ID", kind: "player_id" }] },
  { id: "usdt", name: "USDT", type: "cash", icon: "\u{1FA99}", currency_reward: "USDT (TRC20)",
    minimum_usd: "5", minimum_points: 500, enabled: true, audiences: ["user"],
    required_fields: [{ key: "wallet", label: "USDT Wallet Address (TRC20)", placeholder: "T...", kind: "player_id" }] },
];

// Creators / affiliates: PayPal and USDT (with network).
export const CREATOR_WITHDRAWAL_METHODS: WithdrawalMethod[] = [
  { id: "paypal", name: "PayPal", type: "cash", icon: "\u{1F4B3}", currency_reward: "PayPal",
    minimum_usd: "5", minimum_points: 500, enabled: true, audiences: ["creator"],
    required_fields: [{ key: "email", label: "PayPal email", placeholder: "you@example.com", kind: "email" }] },
  { id: "usdt", name: "USDT", type: "cash", icon: "\u{1FA99}", currency_reward: "USDT",
    minimum_usd: "5", minimum_points: 500, enabled: true, audiences: ["creator"],
    required_fields: [
      { key: "wallet", label: "USDT Wallet Address", placeholder: "T...", kind: "player_id" },
      { key: "network", label: "Network (e.g. TRC20, ERC20, BEP20)", placeholder: "TRC20", kind: "player_id" },
    ] },
];

// Legacy combined list (kept for backwards compatibility).
export const WITHDRAWAL_METHODS: WithdrawalMethod[] = [...USER_WITHDRAWAL_METHODS, ...CREATOR_WITHDRAWAL_METHODS.filter((m) => !USER_WITHDRAWAL_METHODS.some((u) => u.id === m.id))];

export function getWithdrawalMethods(audience: WithdrawalAudience): WithdrawalMethod[] {
  const source = audience === "creator" ? CREATOR_WITHDRAWAL_METHODS : USER_WITHDRAWAL_METHODS;
  return source.filter((m) => m.enabled);
}

export function getWithdrawalMethod(id: string, audience: WithdrawalAudience = "user"): WithdrawalMethod | undefined {
  return getWithdrawalMethods(audience).find((m) => m.id === id);
}
