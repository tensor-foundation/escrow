import * as anchor from "@project-serum/anchor";
import { Keypair } from "@solana/web3.js";
import { waitMS } from "@tensor-hq/tensor-common/dist/util";
import chai, { expect } from "chai";
import chaiAsPromised from "chai-as-promised";
import { buildAndSendTx, generateTreeOfSize, removeNullBytes } from "./shared";
import { TensorWhitelistSDK } from "../src";

chai.use(chaiAsPromised);

const provider = anchor.AnchorProvider.env();
const sdk = new TensorWhitelistSDK({ provider });

describe("tensor_whitelist", () => {
  it("inits/updates authority", async () => {
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

  it.only("inits/updates whitelist", async () => {
    //init authority
    const {
      tx: { ixs },
    } = await sdk.initUpdateAuthority(provider.publicKey, provider.publicKey);
    await buildAndSendTx(provider, ixs);
    await waitMS(2000);

    //fail init'ing a whitelist w/o name or root hash
    const uuid = "0001c1a567594e34aeebccf4b49e73f8";
    const name = "hello_world";
    expect(uuid.length).to.eq(32);
    const { root } = generateTreeOfSize(100, Keypair.generate().publicKey);

    const {
      tx: { ixs: initWlBad },
    } = await sdk.initUpdateWhitelist(
      provider.publicKey,
      Buffer.from(uuid).toJSON().data
    );
    await expect(buildAndSendTx(provider, initWlBad)).to.be.rejectedWith(
      "0x1771"
    );

    const {
      tx: { ixs: initWlBad2 },
    } = await sdk.initUpdateWhitelist(
      provider.publicKey,
      Buffer.from(uuid).toJSON().data,
      root
    );
    await expect(buildAndSendTx(provider, initWlBad2)).to.be.rejectedWith(
      "0x1772"
    );

    //init ok
    const {
      tx: { ixs: initWlGood },
      whitelistPda,
    } = await sdk.initUpdateWhitelist(
      provider.publicKey,
      Buffer.from(uuid).toJSON().data,
      root,
      Buffer.from(name.padEnd(32, "\0")).toJSON().data
    );
    await buildAndSendTx(provider, initWlGood);
    await waitMS(2000);

    let wlAcc = await sdk.fetchCollectionWhitelist(whitelistPda);
    expect(String.fromCharCode(...wlAcc.uuid)).to.eq(uuid);
    expect(removeNullBytes(String.fromCharCode(...wlAcc.name))).to.eq(name);
    expect(wlAcc.rootHash).to.deep.eq(root);

    //update ok
    const uuid2 = "0001c1a567594e34aeebccf4b49e2222";
    const name2 = "hello_world2222";
    const { root: root2 } = generateTreeOfSize(
      100,
      Keypair.generate().publicKey
    );

    const {
      tx: { ixs: initWlGood2 },
      whitelistPda: whitelistPda2,
    } = await sdk.initUpdateWhitelist(
      provider.publicKey,
      Buffer.from(uuid2).toJSON().data,
      root2,
      Buffer.from(name2.padEnd(32, "\0")).toJSON().data
    );
    await buildAndSendTx(provider, initWlGood2);
    await waitMS(2000);

    wlAcc = await sdk.fetchCollectionWhitelist(whitelistPda2);
    expect(String.fromCharCode(...wlAcc.uuid)).to.eq(uuid2);
    expect(removeNullBytes(String.fromCharCode(...wlAcc.name))).to.eq(name2);
    expect(wlAcc.rootHash).to.deep.eq(root2);
  });
});
