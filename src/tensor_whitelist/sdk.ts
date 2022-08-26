import { IDL, TensorWhitelist } from "./idl/tensor_whitelist";
import { Commitment, PublicKey, SystemProgram } from "@solana/web3.js";
import { Coder, Program, Provider } from "@project-serum/anchor";
import { TENSOR_WHITELIST_ADDR } from "./constants";
import { findWhitelistAuthPDA, findWhitelistPDA } from "./pda";

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

  async fetchAuthority(authority: PublicKey, commitment?: Commitment) {
    return this.program.account.authority.fetch(authority, commitment);
  }

  async fetchWhitelist(whitelist: PublicKey, commitment?: Commitment) {
    return this.program.account.whitelist.fetch(whitelist, commitment);
  }

  // --------------------------------------- finders

  // --------------------------------------- methods

  //main signature: owner
  async initUpdateAuthority(owner: PublicKey, newOwner: PublicKey) {
    const [authPda, authPdaBump] = await findWhitelistAuthPDA({});

    const builder = this.program.methods
      .initUpdateAuthority(newOwner)
      .accounts({
        whitelistAuthority: authPda,
        owner,
        systemProgram: SystemProgram.programId,
      });

    return {
      builder,
      tx: { ixs: [await builder.instruction()], extraSigners: [] },
      authPda,
      authPdaBump,
    };
  }

  //main signature: owner
  async initUpdateWhitelist(
    owner: PublicKey,
    uuid: number[],
    rootHash: number[] | null = null,
    name: number[] | null = null
  ) {
    const [authPda, authPdaBump] = await findWhitelistAuthPDA({});
    const [whitelistPda, whitelistPdaBump] = await findWhitelistPDA({
      uuid,
    });

    const builder = this.program.methods
      .initUpdateWhitelist(authPdaBump, uuid, rootHash, name)
      .accounts({
        whitelist: whitelistPda,
        whitelistAuthority: authPda,
        owner,
        systemProgram: SystemProgram.programId,
      });

    return {
      builder,
      tx: { ixs: [await builder.instruction()], extraSigners: [] },
      authPda,
      authPdaBump,
      whitelistPda,
      whitelistPdaBump,
    };
  }
}
