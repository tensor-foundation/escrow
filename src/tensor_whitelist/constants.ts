import { PublicKey } from "@solana/web3.js";

export const TENSOR_WHITELIST_ADDR = new PublicKey(
  process.env.TWHITELIST_ADDR || "CyrMiKJphasn4kZLzMFG7cR9bZJ1rifGF37uSpJRxVi6"
);
