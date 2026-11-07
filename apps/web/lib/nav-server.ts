export { MAINNET, NearRpc, rheaQuote } from "@wtn/chain";
import { MAINNET } from "@wtn/chain";

/** NAV always prices against mainnet liquidity (testnet tokens have no market). */
export const NETWORK_CONFIGS_FOR_NAV = MAINNET;
