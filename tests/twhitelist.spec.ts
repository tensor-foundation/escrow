import * as anchor from "@project-serum/anchor";
import { Keypair, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import { waitMS } from "@tensor-hq/tensor-common/dist/util";
import BN from "bn.js";
import chai, { expect } from "chai";
import chaiAsPromised from "chai-as-promised";
import { buildAndSendTx, generateTreeOfSize } from "./shared";
import { TensorWhitelistSDK } from "../src";

chai.use(chaiAsPromised);

const provider = anchor.AnchorProvider.env();
const sdk = new TensorWhitelistSDK({ provider });

describe("tensor_whitelist", () => {
  it.only("inits/updates authority", async () => {
    //init
    const {
      tx: { ixs },
      authPda,
    } = await sdk.initUpdateAuthority(provider.publicKey, provider.publicKey);
    await buildAndSendTx(provider, ixs);
    await waitMS(2000);

    let authAcc = await sdk.fetchWhitelistAuthority(authPda);
    expect(authAcc.owner.toBase58()).to.eq(provider.publicKey.toBase58());

    //update (good)
    const tempAuth = Keypair.generate();
    const {
      tx: { ixs: updateGood },
    } = await sdk.initUpdateAuthority(provider.publicKey, tempAuth.publicKey);
    await buildAndSendTx(provider, updateGood);
    await waitMS(2000);

    authAcc = await sdk.fetchWhitelistAuthority(authPda);
    expect(authAcc.owner.toBase58()).to.eq(tempAuth.publicKey.toBase58());

    //update (bad - provider no longer current owner, should fail)
    const {
      tx: { ixs: updateBad },
    } = await sdk.initUpdateAuthority(provider.publicKey, provider.publicKey);
    await expect(buildAndSendTx(provider, updateBad)).to.be.rejectedWith(
      "0x1770"
    );

    //update (good again - transfer back)
    const {
      tx: { ixs: updateGood2 },
    } = await sdk.initUpdateAuthority(tempAuth.publicKey, provider.publicKey);
    await buildAndSendTx(provider, updateGood2, [tempAuth]);
    await waitMS(2000);

    authAcc = await sdk.fetchWhitelistAuthority(authPda);
    expect(authAcc.owner.toBase58()).to.eq(provider.publicKey.toBase58());
  });
});
