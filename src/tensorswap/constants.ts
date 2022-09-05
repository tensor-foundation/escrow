import { PublicKey } from "@solana/web3.js";

export const TENSORSWAP_ADDR = new PublicKey(
  process.env.TENSORSWAP_ADDR || "EcBj1yGnNmya7uGjkrroX8jupyoJn29uTGEk5jv21WPA"
);

export const TSWAP_FEE_ACC = new PublicKey(
  process.env.TSWAP_FEE_ACC || "5u1vB9UeQSCzzwEhmKPhmQH1veWP9KZyZ8xFxFrmj8CK"
);
