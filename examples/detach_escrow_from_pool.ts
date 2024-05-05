
import { KeyPairSigner, createKeyPairSignerFromBytes } from '@solana/signers';
import { keypairBytes, rpc } from "./common";
import type { PoolConfigArgs, DetachPoolFromMarginAsyncInput } from "@tensor-foundation/escrow";
import { fetchPool, getDetachPoolFromMarginInstructionAsync } from "@tensor-foundation/escrow";
import { address } from "@solana/addresses";
import { isNone } from "@solana/options";
import { simulateTxWithIxs } from "./helpers";

// detaches escrow wallet from pool specified via its poolAddress
async function detachEscrowFromPool(poolAddress: string) {
    const keypairSigner: KeyPairSigner = await createKeyPairSignerFromBytes(Buffer.from(keypairBytes), false);

    // fetch pool and retrieve its config
    const pool = await fetchPool(rpc, address(poolAddress)).catch(() => {
        throw new Error(`Rpc couldn't fetch pool with address ${poolAddress}, please make sure the input is a valid pool address and that your RPC URL is correct!`);
    });
    if (isNone(pool.data.margin)) {
        throw new Error(`${poolAddress} is not attached to shared escrow, can't detach!`);
    }
    const poolConfigArgs = pool.data.config as PoolConfigArgs;
    const detachPoolFromMarginAsyncInput: DetachPoolFromMarginAsyncInput = {
        pool: pool.address,
        whitelist: pool.data.whitelist,
        solEscrow: pool.data.solEscrow,
        owner: keypairSigner,
        config: poolConfigArgs,
    };
    const detachPoolIx = await getDetachPoolFromMarginInstructionAsync(detachPoolFromMarginAsyncInput);
    await simulateTxWithIxs(rpc, [detachPoolIx], keypairSigner);
}
detachEscrowFromPool("7v5v8hVaPvuT3A13nh52XJs9nX11B3B8FAPfFtt4dwtR");