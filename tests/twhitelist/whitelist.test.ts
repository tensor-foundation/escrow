import { Keypair, PublicKey } from "@solana/web3.js";
import chai, { expect } from "chai";
import chaiAsPromised from "chai-as-promised";
import { TensorWhitelistSDK } from "../../src";
import {
  buildAndSendTx,
  generateTreeOfSize,
  testInitWLAuthority,
  TEST_PROVIDER,
  waitMS,
  wlSdk,
} from "../shared";

chai.use(chaiAsPromised);

describe("tensor whitelist", () => {
  let authPda: PublicKey;
  let tlistOwner: Keypair;

  // inits authority
  before(async () => {
    ({ authPda, tlistOwner } = await testInitWLAuthority());
  });

  it("updates authority", async () => {
    //update (good)
    const tempAuth = Keypair.generate();
    const {
      tx: { ixs: updateGood },
    } = await wlSdk.initUpdateAuthority({
      cosigner: TEST_PROVIDER.publicKey,
      owner: tlistOwner.publicKey,
      newCosigner: tempAuth.publicKey,
      newOwner: tempAuth.publicKey,
    });
    await buildAndSendTx({ ixs: updateGood, extraSigners: [tlistOwner] });

    let authAcc = await wlSdk.fetchAuthority(authPda);
    expect(authAcc.cosigner.toBase58()).to.eq(tempAuth.publicKey.toBase58());
    expect(authAcc.owner.toBase58()).to.eq(tempAuth.publicKey.toBase58());

    // Wait a bit since we previously sent the exact same tx above
    // and w/ the same blockhash this will be duplicate.
    await waitMS(1000);

    const desiredNewOwnerAndAuth = {
      newCosigner: TEST_PROVIDER.publicKey,
      newOwner: tlistOwner.publicKey,
    };

    //update (bad - provider no longer current owner, should fail)
    const {
      tx: { ixs: updateBad },
    } = await wlSdk.initUpdateAuthority({
      cosigner: TEST_PROVIDER.publicKey, //<-- this is wrong
      owner: tempAuth.publicKey,
      ...desiredNewOwnerAndAuth,
    });
    await expect(
      buildAndSendTx({
        ixs: updateBad,
        extraSigners: [tempAuth],
      })
    ).to.be.rejectedWith("0x1770");

    //update (bad - provider no longer current authority, should fail)
    const {
      tx: { ixs: updateBad2 },
    } = await wlSdk.initUpdateAuthority({
      cosigner: tempAuth.publicKey,
      owner: tlistOwner.publicKey, //<-- this is wrong
      ...desiredNewOwnerAndAuth,
    });
    await expect(
      buildAndSendTx({
        ixs: updateBad2,
        extraSigners: [tempAuth, tlistOwner],
      })
    ).to.be.rejectedWith("0x1775");

    //update (good again - transfer back)
    const {
      tx: { ixs: updateGood2 },
    } = await wlSdk.initUpdateAuthority({
      cosigner: tempAuth.publicKey,
      owner: tempAuth.publicKey,
      ...desiredNewOwnerAndAuth,
    });
    await buildAndSendTx({
      ixs: updateGood2,
      extraSigners: [tempAuth],
    });

    authAcc = await wlSdk.fetchAuthority(authPda);
    expect(authAcc.cosigner.toBase58()).to.eq(
      TEST_PROVIDER.publicKey.toBase58()
    );
    expect(authAcc.owner.toBase58()).to.eq(tlistOwner.publicKey.toBase58());
  });

  // ---------------------------- Whitelist

  it("inits/updates whitelist", async () => {
    // --------------------------------------- bad inits

    const uuid = wlSdk.genWhitelistUUID();
    const uuidBuffer = TensorWhitelistSDK.uuidToBuffer(uuid);
    const name = "hello_world";
    const nameBuffer = TensorWhitelistSDK.nameToBuffer(name);
    expect(uuidBuffer.length).to.eq(32);
    expect(nameBuffer.length).to.eq(32);
    const { root } = generateTreeOfSize(100, [Keypair.generate().publicKey]);

    //all 3 methods missing
    const {
      tx: { ixs: initWlBad },
    } = await wlSdk.initUpdateWhitelist({
      cosigner: TEST_PROVIDER.publicKey,
      uuid: uuidBuffer,
    });
    await expect(buildAndSendTx({ ixs: initWlBad })).to.be.rejectedWith(
      "0x1771"
    );

    //name missing
    const {
      tx: { ixs: initWlBad2 },
    } = await wlSdk.initUpdateWhitelist({
      cosigner: TEST_PROVIDER.publicKey,
      uuid: uuidBuffer,
      rootHash: root,
    });
    await expect(buildAndSendTx({ ixs: initWlBad2 })).to.be.rejectedWith(
      "0x1772"
    );

    // --------------------------------------- merkle proof

    //init ok
    const {
      tx: { ixs: initWlGood },
      whitelistPda,
    } = await wlSdk.initUpdateWhitelist({
      cosigner: TEST_PROVIDER.publicKey,
      uuid: uuidBuffer,
      rootHash: root,
      name: nameBuffer,
    });
    await buildAndSendTx({ ixs: initWlGood });

    let wlAcc = await wlSdk.fetchWhitelist(whitelistPda);
    expect(TensorWhitelistSDK.bufferToUuid(wlAcc.uuid)).to.eq(uuid);
    expect(TensorWhitelistSDK.bufferToName(wlAcc.name)).to.eq(name);
    expect(wlAcc.rootHash).to.deep.eq(root);
    expect(wlAcc.voc).to.be.null;
    expect(wlAcc.fvc).to.be.null;

    //update ok
    const uuid2 = wlSdk.genWhitelistUUID();
    const name2 = "hello_world2222";
    const { root: root2 } = generateTreeOfSize(100, [
      Keypair.generate().publicKey,
    ]);

    const {
      tx: { ixs: initWlGood2 },
      whitelistPda: whitelistPda2,
    } = await wlSdk.initUpdateWhitelist({
      cosigner: TEST_PROVIDER.publicKey,
      uuid: TensorWhitelistSDK.uuidToBuffer(uuid2),
      rootHash: root2,
      name: TensorWhitelistSDK.nameToBuffer(name2),
    });
    await buildAndSendTx({ ixs: initWlGood2 });

    wlAcc = await wlSdk.fetchWhitelist(whitelistPda2);
    expect(TensorWhitelistSDK.bufferToUuid(wlAcc.uuid)).to.eq(uuid2);
    expect(TensorWhitelistSDK.bufferToName(wlAcc.name)).to.eq(name2);
    expect(wlAcc.rootHash).to.deep.eq(root2);
    expect(wlAcc.voc).to.be.null;
    expect(wlAcc.fvc).to.be.null;

    // --------------------------------------- voc

    const randomKey = Keypair.generate().publicKey;

    const {
      tx: { ixs: initWlGood3 },
      whitelistPda: whitelistPda3,
    } = await wlSdk.initUpdateWhitelist({
      cosigner: TEST_PROVIDER.publicKey,
      uuid: uuidBuffer,
      name: nameBuffer,
      voc: randomKey,
    });
    await buildAndSendTx({ ixs: initWlGood3 });

    wlAcc = await wlSdk.fetchWhitelist(whitelistPda3);
    expect(wlAcc.voc?.toBase58()).to.eq(randomKey.toBase58());
    expect(wlAcc.fvc).to.be.null;

    // --------------------------------------- fvc

    const {
      tx: { ixs: initWlGood4 },
      whitelistPda: whitelistPda4,
    } = await wlSdk.initUpdateWhitelist({
      cosigner: TEST_PROVIDER.publicKey,
      uuid: uuidBuffer,
      name: nameBuffer,
      fvc: randomKey,
    });
    await buildAndSendTx({ ixs: initWlGood4 });

    wlAcc = await wlSdk.fetchWhitelist(whitelistPda4);
    expect(wlAcc.voc).to.be.null;
    expect(wlAcc.fvc?.toBase58()).to.eq(randomKey.toBase58());
  });

  it("freezes/unfreezes/handles frozen whitelist", async () => {
    const uuid = wlSdk.genWhitelistUUID();
    const uuidBuffer = TensorWhitelistSDK.uuidToBuffer(uuid);
    const name = "hello_world";
    const nameBuffer = TensorWhitelistSDK.nameToBuffer(name);
    expect(uuidBuffer.length).to.eq(32);
    expect(nameBuffer.length).to.eq(32);
    const { root } = generateTreeOfSize(100, [Keypair.generate().publicKey]);
    const { root: root2 } = generateTreeOfSize(100, [
      Keypair.generate().publicKey,
    ]);
    const { root: root3 } = generateTreeOfSize(100, [
      Keypair.generate().publicKey,
    ]);

    //create wl
    const {
      tx: { ixs: initWlGood },
    } = await wlSdk.initUpdateWhitelist({
      cosigner: TEST_PROVIDER.publicKey,
      uuid: uuidBuffer,
      rootHash: root,
      name: nameBuffer,
    });
    await buildAndSendTx({ ixs: initWlGood });

    //freeze it
    const {
      tx: { ixs: freezeWlIxs },
      whitelistPda,
    } = await wlSdk.freezeWhitelist({
      uuid: uuidBuffer,
      cosigner: TEST_PROVIDER.publicKey,
    });
    await buildAndSendTx({ ixs: freezeWlIxs, extraSigners: [] });
    let wlAcc = await wlSdk.fetchWhitelist(whitelistPda);
    expect(wlAcc.frozen).to.be.true;

    //try to update a frozen WL w/o freeze auth sig (should fail)
    const {
      tx: { ixs: updateWlBadIxs },
    } = await wlSdk.initUpdateWhitelist({
      cosigner: TEST_PROVIDER.publicKey,
      uuid: uuidBuffer,
      rootHash: root2,
    });
    await expect(buildAndSendTx({ ixs: updateWlBadIxs })).to.be.rejectedWith(
      "0x1775"
    );
    wlAcc = await wlSdk.fetchWhitelist(whitelistPda);
    expect(wlAcc.rootHash).to.deep.eq(root);

    //try to update a frozen WL w/ wrong freeze auth (should fail)
    const badOwner = Keypair.generate();
    const {
      tx: { ixs: updateWlBadIxs2 },
    } = await wlSdk.initUpdateWhitelist({
      cosigner: TEST_PROVIDER.publicKey,
      owner: badOwner.publicKey,
      uuid: uuidBuffer,
      rootHash: root2,
    });
    await expect(
      buildAndSendTx({ ixs: updateWlBadIxs2, extraSigners: [badOwner] })
    ).to.be.rejectedWith("0x1775");
    wlAcc = await wlSdk.fetchWhitelist(whitelistPda);
    expect(wlAcc.rootHash).to.deep.eq(root);

    //update w/ freeze auth (should succeed)
    const {
      tx: { ixs: updateWlOkIxs },
    } = await wlSdk.initUpdateWhitelist({
      cosigner: TEST_PROVIDER.publicKey,
      owner: tlistOwner.publicKey,
      uuid: uuidBuffer,
      rootHash: root2,
    });
    await buildAndSendTx({
      ixs: updateWlOkIxs,
      extraSigners: [tlistOwner],
    });
    wlAcc = await wlSdk.fetchWhitelist(whitelistPda);
    expect(wlAcc.rootHash).to.deep.eq(root2);

    //try to unfreeze with wrong authority (should fail)
    const {
      tx: { ixs: unfreezeWlBadIxs },
    } = await wlSdk.unfreezeWhitelist({
      uuid: uuidBuffer,
      owner: badOwner.publicKey,
    });
    await expect(
      buildAndSendTx({
        ixs: unfreezeWlBadIxs,
        extraSigners: [badOwner],
      })
    ).to.be.rejectedWith("0x7d1");

    //unfreeze it
    const {
      tx: { ixs: unfreezeWlIxs },
    } = await wlSdk.unfreezeWhitelist({
      uuid: uuidBuffer,
      owner: tlistOwner.publicKey,
    });
    await buildAndSendTx({
      ixs: unfreezeWlIxs,
      extraSigners: [tlistOwner],
    });
    wlAcc = await wlSdk.fetchWhitelist(whitelistPda);
    expect(wlAcc.frozen).to.be.false;

    //update w/o freeze auth (should succeed)
    const {
      tx: { ixs: updateWlOkIxs2 },
    } = await wlSdk.initUpdateWhitelist({
      cosigner: TEST_PROVIDER.publicKey,
      uuid: uuidBuffer,
      rootHash: root3,
    });
    await buildAndSendTx({ ixs: updateWlOkIxs2 });
    wlAcc = await wlSdk.fetchWhitelist(whitelistPda);
    expect(wlAcc.rootHash).to.deep.eq(root3);
  });

  it("reallocs ok", async () => {
    const uuid = wlSdk.genWhitelistUUID();
    const uuidBuffer = TensorWhitelistSDK.uuidToBuffer(uuid);
    const name = "hello_world";
    const nameBuffer = TensorWhitelistSDK.nameToBuffer(name);
    expect(uuidBuffer.length).to.eq(32);
    expect(nameBuffer.length).to.eq(32);
    const { root } = generateTreeOfSize(100, [Keypair.generate().publicKey]);
    const { root: root2 } = generateTreeOfSize(100, [
      Keypair.generate().publicKey,
    ]);
    const { root: root3 } = generateTreeOfSize(100, [
      Keypair.generate().publicKey,
    ]);

    //create wl
    const {
      tx: { ixs: initWlGood },
    } = await wlSdk.initUpdateWhitelist({
      cosigner: TEST_PROVIDER.publicKey,
      uuid: uuidBuffer,
      rootHash: root,
      name: nameBuffer,
    });
    await buildAndSendTx({ ixs: initWlGood });

    const {
      tx: { ixs: reallocAuthIxs },
    } = await wlSdk.reallocAuthority({ cosigner: TEST_PROVIDER.publicKey });
    await buildAndSendTx({ ixs: reallocAuthIxs });

    const {
      tx: { ixs: reallocWlIxs },
    } = await wlSdk.reallocWhitelist({
      cosigner: TEST_PROVIDER.publicKey,
      uuid: TensorWhitelistSDK.uuidToBuffer(uuid),
    });
    //fails coz new version alerady stored
    await expect(buildAndSendTx({ ixs: reallocWlIxs })).to.be.rejectedWith(
      wlSdk.getErrorCodeHex("BadWhitelist")
    );
  });
});
