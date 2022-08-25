import { PublicKey } from "@solana/web3.js";
import { TENSOR_WHITELIST_ADDR } from "./constants";

export const findWhitelistAuthPDA = ({ program }: { program?: PublicKey }) => {
  return PublicKey.findProgramAddress([], program ?? TENSOR_WHITELIST_ADDR);
};

export const findWhitelistPDA = ({
  program,
  uuid,
}: {
  program?: PublicKey;
  uuid: number[];
}) => {
  return PublicKey.findProgramAddress(
    [Buffer.from(uuid)],
    program ?? TENSOR_WHITELIST_ADDR
  );
};
