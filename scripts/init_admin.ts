import Transport from "@ledgerhq/hw-transport-node-hid";
import Solana from "@ledgerhq/hw-app-solana";
import { AnchorProvider, Wallet } from "@project-serum/anchor";
import { Wallet as BaseWallet } from "@project-serum/anchor/dist/cjs/provider";
import { Connection, Keypair, PublicKey, Transaction } from "@solana/web3.js";
import {
  findTSwapPDA,
  TensorSwapSDK,
  TSWAP_COSIGNER,
  TSWAP_FEE_ACC,
} from "../src/tensorswap";
import {
  findWhitelistAuthPDA,
  TensorWhitelistSDK,
} from "../src/tensor_whitelist";
import { createInterface } from "readline";
import { readFileSync } from "fs";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { buildTx } from "@tensor-hq/tensor-common";
import { stringifyPKsAndBNs } from "../src";

const TSWAP_FEE_BPS = 0;

class LedgerWallet implements BaseWallet {
  path: string;
  solana: Solana;
  publicKey: PublicKey;

  static async initSolana() {
    const transport = await Transport.create();
    return new Solana(transport);
  }

  static defaultPath = "44'/501'";

  static async getPublicKey(solana: Solana, path: string) {
    return new PublicKey((await solana.getAddress(path)).address);
  }

  constructor(solana: Solana, path: string, publicKey: PublicKey) {
    this.solana = solana;
    this.path = path;
    this.publicKey = publicKey;
  }

  // This shit doesn't work.
  async signTransaction(tx: Transaction) {
    const { signature } = await this.solana.signTransaction(
      this.path,
      tx.serialize({ verifySignatures: false })
    );
    tx.addSignature(this.publicKey, signature);
    return tx;
  }

  async signAllTransactions(txs: Transaction[]) {
    for (const tx of txs) {
      await this.signTransaction(tx);
    }
    return txs;
  }
}

const _readKP = (file: string) =>
  Keypair.fromSeed(
    Uint8Array.from(JSON.parse(readFileSync(file).toString())).slice(0, 32)
  );

(async () => {
  const args = await yargs(hideBin(process.argv))
    .command(
      "init TWL + TSwap authorities",
      "initializes the TWhitelist and TSwap authorities w/ an initial_authority.json, cosigner.json, and Ledger root authority"
    )
    .option("localnet", {
      alias: "l",
      describe: "hits localnet instead of mainnet",
      type: "boolean",
      default: false,
    })
    .option("skip_wl", {
      alias: "sw",
      describe: "skip whitelist init",
      type: "boolean",
      default: false,
    })
    .option("skip_tswap", {
      alias: "st",
      describe: "skip tswap init",
      type: "boolean",
      default: false,
    }).argv;

  console.log(`LOCALNET: ${args.localnet}`);

  const io = createInterface({ input: process.stdin, output: process.stdout });

  // TODO: fix for ledger.
  // Initialize ledger wallet.
  // const expectedLedger = new PublicKey("99cmWwQMqMFzMPx85rvZYKwusGSjZUDsu6mqYV4iisiz");
  // const solana = await LedgerWallet.initSolana();
  // const tswapAuthority = await LedgerWallet.getPublicKey(
  //   solana,
  //   LedgerWallet.defaultPath
  // );
  // const ledgerWallet = new LedgerWallet(
  //   solana,
  //   LedgerWallet.defaultPath,
  //   tswapAuthority
  // );
  // if (!tswapAuthority.equals(expectedLedger))
  //   throw new Error(
  //     `Ledger address ${tswapAuthority.toBase58()} != tswap root ${expectedLedger.toBase58()}`
  //   );
  // console.log(`TSwap authority: ${tswapAuthority.toBase58()}`);

  // Read in cosigner.
  const cosigner = _readKP("cosigner.json");
  if (!cosigner.publicKey.equals(TSWAP_COSIGNER))
    throw new Error(
      `local cosigner ${cosigner.publicKey.toBase58()} != tswap cosigner ${TSWAP_COSIGNER.toBase58()}`
    );
  console.log(`Cosigner: ${cosigner.publicKey.toBase58()}`);

  // Init SDKs + connections.
  const conn = new Connection(
    args.localnet
      ? "http://localhost:8899"
      : "https://api.mainnet-beta.solana.com"
  );
  const initAuthority = _readKP("initial_authority.json");
  const provider = new AnchorProvider(conn, new Wallet(initAuthority), {
    commitment: "confirmed",
  });
  const swapSdk = new TensorSwapSDK({ provider });
  const wlSdk = new TensorWhitelistSDK({ provider });
  console.log(`Initial authority: ${provider.wallet.publicKey.toBase58()}`);

  // Init WL authority.
  if (!args.skip_wl) {
    const owner = provider.publicKey;
    const newOwner = provider.publicKey;
    console.log(
      `TWhitelist owner: ${owner.toBase58()}, newOwner: ${newOwner.toBase58()}`
    );
    const result = await new Promise((res) => {
      io.question(
        `Please confirm by typing new owner [${newOwner.toBase58()}]: `,
        (inp) => {
          res(inp);
        }
      );
    });
    if (result !== newOwner.toBase58()) {
      console.error(
        `input ${result} !== newOwner ${newOwner.toBase58()}, EXITING`
      );
      return;
    }

    // WL only needs initial authority to sign off.
    const {
      tx: { ixs },
    } = await wlSdk.initUpdateAuthority(owner, newOwner);

    const { tx } = await buildTx({
      connections: [provider.connection],
      instructions: ixs,
      additionalSigners: [],
      feePayer: provider.publicKey,
    });
    await provider.wallet.signTransaction(tx);
    const sig = await provider.sendAndConfirm(tx);

    console.log(
      `upserted authority (owner: ${owner.toBase58()}, newOwner: ${newOwner.toBase58()}), sig: ${sig}`
    );
    console.log(
      stringifyPKsAndBNs(
        await wlSdk.fetchAuthority(findWhitelistAuthPDA({})[0])
      )
    );
  }

  // Init TSwap authority.
  if (!args.skip_tswap) {
    // TODO: figure out how to get ledger to work.
    // const owner = ledgerWallet.publicKey;
    // const newOwner = ledgerWallet.publicKey;
    const owner = provider.publicKey;
    const newOwner = provider.publicKey;
    console.log(`TSwap fee acc: ${TSWAP_FEE_ACC}, fee (bps): ${TSWAP_FEE_BPS}`);
    console.log(
      `TSwap owner: ${owner.toBase58()}, newOwner: ${newOwner.toBase58()}`
    );
    const result = await new Promise((res) => {
      io.question(
        `Please confirm by typing new owner [${newOwner.toBase58()}]: `,
        (inp) => {
          res(inp);
        }
      );
    });
    if (result !== newOwner.toBase58()) {
      console.error(
        `input ${result} !== newOwner ${newOwner.toBase58()}, EXITING`
      );
      return;
    }

    const {
      tx: { ixs },
    } = await swapSdk.initUpdateTSwap({
      owner,
      newOwner,
      config: {
        feeBps: TSWAP_FEE_BPS,
      },
      feeVault: TSWAP_FEE_ACC,
      cosigner: cosigner.publicKey,
    });

    // Needs both ledger + cosigner to sign off.
    const { tx } = await buildTx({
      connections: [provider.connection],
      instructions: ixs,
      additionalSigners: [cosigner],
      feePayer: provider.publicKey,
    });
    // TODO: figuer out ledger.
    // await ledgerWallet.signTransaction(tx);
    await provider.wallet.signTransaction(tx);
    const sig = await provider.sendAndConfirm(tx, [cosigner]);
    console.log(
      `upserted TSwap (owner: ${owner.toBase58()}, newOwner: ${newOwner.toBase58()}, cosigner: ${cosigner.publicKey.toBase58()}, fees: ${TSWAP_FEE_BPS}), sig: ${sig}`
    );
    console.log(
      stringifyPKsAndBNs(await swapSdk.fetchTSwap(findTSwapPDA({})[0]))
    );
  }

  io.close();
})();
