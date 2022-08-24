import { Keypair, PublicKey } from "@solana/web3.js";
import { Coder, Program, Provider } from "@project-serum/anchor";
import { IDL, Tensorswap } from "./idl/tensorswap";
import { TSwapAddr } from "./constants";

export class TSwapSDK {
  program: Program<Tensorswap>;

  //can build ixs without provider, but need provider for
  constructor({
    idl = IDL,
    addr = TSwapAddr,
    provider,
    coder,
  }: {
    idl?: any; //todo better typing
    addr?: PublicKey;
    provider?: Provider;
    coder?: Coder;
  }) {
    this.program = new Program<Tensorswap>(idl, addr, provider, coder);
  }

  // --------------------------------------- fetchers

  async fetchTSwap(tswap: PublicKey) {
    return this.program.account.tensorswap.fetch(tswap);
  }

  // --------------------------------------- finders

  // --------------------------------------- swap methods

  async initTSwap(payer: PublicKey, tSwap?: Keypair) {
    const usedTSwap = tSwap ?? Keypair.generate();
    const extraSigners = [usedTSwap];

    const ix = await this.program.methods
      .initTswap()
      .accounts({
        tswap: usedTSwap.publicKey,
        payer,
      })
      .instruction();

    return { tx: { ixs: [ix], extraSigners }, tSwap: usedTSwap };
  }

  // --------------------------------------- pool methods
}
