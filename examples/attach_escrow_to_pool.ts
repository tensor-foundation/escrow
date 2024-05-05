import { KeyPairSigner, createKeyPairSignerFromBytes } from '@solana/signers';
import { keypairBytes, rpc } from "./common";
import type { PoolConfigArgs, AttachPoolToMarginAsyncInput } from "@tensor-foundation/escrow";
import { fetchPool, getAttachPoolToMarginInstructionAsync } from "@tensor-foundation/escrow";
import { address } from "@solana/addresses";
import { isSome } from "@solana/options";
import { simulateTxWithIxs } from "./helpers";

// attaches escrow to pool specified by its poolAddress
async function attachEscrowToPool(poolAddress: string) {
    const keypairSigner: KeyPairSigner = await createKeyPairSignerFromBytes(Buffer.from(keypairBytes), false);

    // fetch pool and retrieve its config
    const pool = await fetchPool(rpc, address(poolAddress)).catch(() => {
        throw new Error(`Rpc couldn't fetch pool with address ${poolAddress}, please make sure the input is a valid pool address and that your RPC URL is correct!`);
    });
    if (isSome(pool.data.margin)) {
        throw new Error(`${poolAddress} is already attached to shared escrow!`);
    }
    const poolConfigArgs = pool.data.config as PoolConfigArgs;
    const attachPoolToMarginAsyncInput: AttachPoolToMarginAsyncInput = {
        pool: pool.address,
        whitelist: pool.data.whitelist,
        solEscrow: pool.data.solEscrow,
        owner: keypairSigner,
        config: poolConfigArgs
    };
    const attachPoolIx = await getAttachPoolToMarginInstructionAsync(attachPoolToMarginAsyncInput);
    await simulateTxWithIxs(rpc, [attachPoolIx], keypairSigner);
}
attachEscrowToPool("7v5v8hVaPvuT3A13nh52XJs9nX11B3B8FAPfFtt4dwtR");