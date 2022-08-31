import { AccountClient } from "@project-serum/anchor";
import { Connection, PublicKey } from "@solana/web3.js";

export const getAccountRent = (conn: Connection, acct: AccountClient) => {
  return conn.getMinimumBalanceForRentExemption(acct.size);
};

export const getLamports = async (conn: Connection, acct: PublicKey) => {
  return (await conn.getAccountInfo(acct))?.lamports;
};

export const hexCode = (decCode: number) => "0x" + decCode.toString(16);
