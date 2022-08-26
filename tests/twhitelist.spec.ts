import { Keypair, PublicKey } from "@solana/web3.js";
import chai, { expect } from "chai";
import chaiAsPromised from "chai-as-promised";
import {
  buildAndSendTx,
  generateTreeOfSize,
  removeNullBytes,
  TEST_PROVIDER,
  wlSdk,
} from "./shared";

chai.use(chaiAsPromised);

describe("tensor_whitelist", () => {
  let authPda: PublicKey;

  it("inits authority", async () => {
    //init
    const {
      tx: { ixs },
      authPda: authPda_,
    } = await wlSdk.initUpdateAuthority(
      TEST_PROVIDER.publicKey,
      TEST_PROVIDER.publicKey
    );
    authPda = authPda_;
    await buildAndSendTx(TEST_PROVIDER, ixs);

    let authAcc = await wlSdk.fetchAuthority(authPda);
    expect(authAcc.owner.toBase58()).to.eq(TEST_PROVIDER.publicKey.toBase58());
  });

  it.skip("updates authority", async () => {
    //update (good)
    const tempAuth = Keypair.generate();
    const {
      tx: { ixs: updateGood },
    } = await wlSdk.initUpdateAuthority(
      TEST_PROVIDER.publicKey,
      tempAuth.publicKey
    );
    await buildAndSendTx(TEST_PROVIDER, updateGood);

    let authAcc = await wlSdk.fetchAuthority(authPda);
    authAcc = await wlSdk.fetchAuthority(authPda);
    expect(authAcc.owner.toBase58()).to.eq(tempAuth.publicKey.toBase58());

    //update (bad - provider no longer current owner, should fail)
    const {
      tx: { ixs: updateBad },
    } = await wlSdk.initUpdateAuthority(
      TEST_PROVIDER.publicKey,
      TEST_PROVIDER.publicKey
    );
    await expect(buildAndSendTx(TEST_PROVIDER, updateBad)).to.be.rejectedWith(
      "0x1770"
    );

    //update (good again - transfer back)
    const {
      tx: { ixs: updateGood2 },
    } = await wlSdk.initUpdateAuthority(
      tempAuth.publicKey,
      TEST_PROVIDER.publicKey
    );
    await buildAndSendTx(TEST_PROVIDER, updateGood2, [tempAuth]);

    authAcc = await wlSdk.fetchAuthority(authPda);
    expect(authAcc.owner.toBase58()).to.eq(TEST_PROVIDER.publicKey.toBase58());
  });

  it.skip("inits/updates whitelist", async () => {
    //fail init'ing a whitelist w/o name or root hash
    const uuid = "0001c1a567594e34aeebccf4b49e73f8";
    const name = "hello_world";
    expect(uuid.length).to.eq(32);
    const { root } = generateTreeOfSize(100, Keypair.generate().publicKey);

    const {
      tx: { ixs: initWlBad },
    } = await wlSdk.initUpdateWhitelist(
      TEST_PROVIDER.publicKey,
      Buffer.from(uuid).toJSON().data
    );
    await expect(buildAndSendTx(TEST_PROVIDER, initWlBad)).to.be.rejectedWith(
      "0x1771"
    );

    const {
      tx: { ixs: initWlBad2 },
    } = await wlSdk.initUpdateWhitelist(
      TEST_PROVIDER.publicKey,
      Buffer.from(uuid).toJSON().data,
      root
    );
    await expect(buildAndSendTx(TEST_PROVIDER, initWlBad2)).to.be.rejectedWith(
      "0x1772"
    );

    //init ok
    const {
      tx: { ixs: initWlGood },
      whitelistPda,
    } = await wlSdk.initUpdateWhitelist(
      TEST_PROVIDER.publicKey,
      Buffer.from(uuid).toJSON().data,
      root,
      Buffer.from(name.padEnd(32, "\0")).toJSON().data
    );
    await buildAndSendTx(TEST_PROVIDER, initWlGood);

    let wlAcc = await wlSdk.fetchWhitelist(whitelistPda);
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
    } = await wlSdk.initUpdateWhitelist(
      TEST_PROVIDER.publicKey,
      Buffer.from(uuid2).toJSON().data,
      root2,
      Buffer.from(name2.padEnd(32, "\0")).toJSON().data
    );
    await buildAndSendTx(TEST_PROVIDER, initWlGood2);

    wlAcc = await wlSdk.fetchWhitelist(whitelistPda2);
    expect(String.fromCharCode(...wlAcc.uuid)).to.eq(uuid2);
    expect(removeNullBytes(String.fromCharCode(...wlAcc.name))).to.eq(name2);
    expect(wlAcc.rootHash).to.deep.eq(root2);
  });
});
