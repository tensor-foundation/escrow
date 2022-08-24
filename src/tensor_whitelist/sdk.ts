import { IDL, TensorWhitelist } from "./idl/tensor_whitelist";
import { Keypair, PublicKey, SystemProgram } from "@solana/web3.js";
import { Coder, Program, Provider } from "@project-serum/anchor";
import { TENSOR_WHITELIST_ADDR } from "./constants";
import { findCollectionWhitelistPDA, findWhitelistAuthPDA } from "./pda";

export class TensorWhitelistSDK {
  program: Program<TensorWhitelist>;

  constructor({
    idl = IDL,
    addr = TENSOR_WHITELIST_ADDR,
    provider,
    coder,
  }: {
    idl?: any; //todo better typing
    addr?: PublicKey;
    provider?: Provider;
    coder?: Coder;
  }) {
    this.program = new Program<TensorWhitelist>(idl, addr, provider, coder);
  }

  // --------------------------------------- fetchers

  async fetchWhitelistAuthority(authority: PublicKey) {
    return this.program.account.whitelistAuthority.fetch(authority);
  }

  async fetchCollectionWhitelist(whitelist: PublicKey) {
    return this.program.account.collectionWhitelist.fetch(whitelist);
  }

  // --------------------------------------- finders

  // --------------------------------------- methods

  //main signature: owner
  async initUpdateAuthority(owner: PublicKey, newOwner: PublicKey) {
    const [authPda, authPdaBump] = await findWhitelistAuthPDA({});

    const ix = await this.program.methods
      .initUpdateAuthority(newOwner)
      .accounts({
        whitelistAuthority: authPda,
        owner,
        systemProgram: SystemProgram.programId,
      })
      .instruction();

    return { tx: { ixs: [ix], extraSigners: [] }, authPda, authPdaBump };
  }

  //main signature: owner
  async initUpdateWhitelist(
    owner: PublicKey,
    uuid: number[],
    rootHash: number[] | null = null,
    name: number[] | null = null
  ) {
    const [authPda, authPdaBump] = await findWhitelistAuthPDA({});
    const [whitelistPda, whitelistPdaBump] = await findCollectionWhitelistPDA({
      uuid,
    });

    const ix = await this.program.methods
      .initUpdateWl(authPdaBump, uuid, rootHash, name)
      .accounts({
        whitelist: whitelistPda,
        whitelistAuthority: authPda,
        owner,
        systemProgram: SystemProgram.programId,
      })
      .instruction();

    return {
      tx: { ixs: [ix], extraSigners: [] },
      authPda,
      authPdaBump,
      whitelistPda,
      whitelistPdaBump,
    };
  }
}
