import { AccountClient, Idl, Program, utils } from "@project-serum/anchor";
import { AllAccountsMap } from "@project-serum/anchor/dist/cjs/program/namespace/types";
import { AccountInfo, Connection, PublicKey } from "@solana/web3.js";
import { Tensorswap } from "./tensorswap/idl/tensorswap";
import { TensorWhitelist } from "./tensor_whitelist/idl/tensor_whitelist";

export const getAccountRent = (conn: Connection, acct: AccountClient) => {
  return conn.getMinimumBalanceForRentExemption(acct.size);
};

export const getLamports = async (conn: Connection, acct: PublicKey) => {
  return (await conn.getAccountInfo(acct))?.lamports;
};

export const hexCode = (decCode: number) => "0x" + decCode.toString(16);

export const removeNullBytes = (str: string) => {
  return str
    .split("")
    .filter((char) => char.codePointAt(0))
    .join("");
};

type Decoder = (buffer: Buffer) => any;
export type DiscMap<T extends Idl> = Record<
  string,
  { decoder: Decoder; name: keyof AllAccountsMap<T> }
>;

export const genDiscToDecoderMap = <T extends Tensorswap | TensorWhitelist>(
  program: Program<T>
): DiscMap<T> => {
  return Object.fromEntries(
    program.idl.accounts.map((acc) => {
      const name = acc.name as keyof AllAccountsMap<T>;
      const capName = name.at(0)!.toUpperCase() + name.slice(1);

      return [
        utils.sha256.hash(`account:${capName}`).slice(0, 8),
        {
          decoder: (buffer: Buffer) =>
            program.coder.accounts.decode(name, buffer),
          name,
        },
      ];
    }) ?? []
  );
};

export const decodeAcct = <T extends Idl>(
  acct: AccountInfo<Buffer>,
  discMap: DiscMap<T>
) => {
  const disc = acct.data.toString("hex").slice(0, 8);
  const meta = discMap[disc];
  if (!meta) return null;

  return {
    name: meta.name,
    account: meta.decoder(acct.data),
  };
};
