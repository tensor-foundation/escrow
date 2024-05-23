/**
 * This code was AUTOGENERATED using the kinobi library.
 * Please DO NOT EDIT THIS FILE, instead use visitors
 * to add features, then rerun kinobi to update it.
 *
 * @see https://github.com/kinobi-so/kinobi
 */

import {
  Address,
  containsBytes,
  fixEncoderSize,
  getBytesEncoder,
} from '@solana/web3.js';
import {
  ParsedCloseMarginAccountInstruction,
  ParsedDepositMarginAccountInstruction,
  ParsedInitMarginAccountInstruction,
  ParsedInitUpdateTswapInstruction,
  ParsedWithdrawMarginAccountCpiTammInstruction,
  ParsedWithdrawMarginAccountCpiTcompInstruction,
  ParsedWithdrawMarginAccountCpiTlockInstruction,
  ParsedWithdrawMarginAccountFromTBidInstruction,
  ParsedWithdrawMarginAccountInstruction,
} from '../instructions';

export const TENSOR_ESCROW_PROGRAM_ADDRESS =
  'TSWAPaqyCSx2KABk68Shruf4rp7CxcNi8hAsbdwmHbN' as Address<'TSWAPaqyCSx2KABk68Shruf4rp7CxcNi8hAsbdwmHbN'>;

export enum TensorEscrowAccount {
  NftAuthority,
  MarginAccount,
  TSwap,
}

export function identifyTensorEscrowAccount(
  account: { data: Uint8Array } | Uint8Array
): TensorEscrowAccount {
  const data = account instanceof Uint8Array ? account : account.data;
  if (
    containsBytes(
      data,
      fixEncoderSize(getBytesEncoder(), 8).encode(
        new Uint8Array([194, 127, 219, 16, 219, 18, 250, 12])
      ),
      0
    )
  ) {
    return TensorEscrowAccount.NftAuthority;
  }
  if (
    containsBytes(
      data,
      fixEncoderSize(getBytesEncoder(), 8).encode(
        new Uint8Array([133, 220, 173, 213, 179, 211, 43, 238])
      ),
      0
    )
  ) {
    return TensorEscrowAccount.MarginAccount;
  }
  if (
    containsBytes(
      data,
      fixEncoderSize(getBytesEncoder(), 8).encode(
        new Uint8Array([169, 211, 171, 36, 219, 189, 79, 188])
      ),
      0
    )
  ) {
    return TensorEscrowAccount.TSwap;
  }
  throw new Error(
    'The provided account could not be identified as a tensorEscrow account.'
  );
}

export enum TensorEscrowInstruction {
  InitUpdateTswap,
  InitMarginAccount,
  CloseMarginAccount,
  DepositMarginAccount,
  WithdrawMarginAccount,
  WithdrawMarginAccountFromTBid,
  WithdrawMarginAccountCpiTamm,
  WithdrawMarginAccountCpiTcomp,
  WithdrawMarginAccountCpiTlock,
}

export function identifyTensorEscrowInstruction(
  instruction: { data: Uint8Array } | Uint8Array
): TensorEscrowInstruction {
  const data =
    instruction instanceof Uint8Array ? instruction : instruction.data;
  if (
    containsBytes(
      data,
      fixEncoderSize(getBytesEncoder(), 8).encode(
        new Uint8Array([140, 185, 54, 172, 15, 94, 31, 155])
      ),
      0
    )
  ) {
    return TensorEscrowInstruction.InitUpdateTswap;
  }
  if (
    containsBytes(
      data,
      fixEncoderSize(getBytesEncoder(), 8).encode(
        new Uint8Array([10, 54, 68, 252, 130, 97, 39, 52])
      ),
      0
    )
  ) {
    return TensorEscrowInstruction.InitMarginAccount;
  }
  if (
    containsBytes(
      data,
      fixEncoderSize(getBytesEncoder(), 8).encode(
        new Uint8Array([105, 215, 41, 239, 166, 207, 1, 103])
      ),
      0
    )
  ) {
    return TensorEscrowInstruction.CloseMarginAccount;
  }
  if (
    containsBytes(
      data,
      fixEncoderSize(getBytesEncoder(), 8).encode(
        new Uint8Array([190, 85, 242, 60, 119, 81, 33, 192])
      ),
      0
    )
  ) {
    return TensorEscrowInstruction.DepositMarginAccount;
  }
  if (
    containsBytes(
      data,
      fixEncoderSize(getBytesEncoder(), 8).encode(
        new Uint8Array([54, 73, 150, 208, 207, 5, 18, 17])
      ),
      0
    )
  ) {
    return TensorEscrowInstruction.WithdrawMarginAccount;
  }
  if (
    containsBytes(
      data,
      fixEncoderSize(getBytesEncoder(), 8).encode(
        new Uint8Array([186, 26, 199, 134, 220, 177, 32, 72])
      ),
      0
    )
  ) {
    return TensorEscrowInstruction.WithdrawMarginAccountFromTBid;
  }
  if (
    containsBytes(
      data,
      fixEncoderSize(getBytesEncoder(), 8).encode(
        new Uint8Array([35, 89, 16, 235, 226, 89, 248, 45])
      ),
      0
    )
  ) {
    return TensorEscrowInstruction.WithdrawMarginAccountCpiTamm;
  }
  if (
    containsBytes(
      data,
      fixEncoderSize(getBytesEncoder(), 8).encode(
        new Uint8Array([201, 156, 163, 27, 243, 14, 36, 237])
      ),
      0
    )
  ) {
    return TensorEscrowInstruction.WithdrawMarginAccountCpiTcomp;
  }
  if (
    containsBytes(
      data,
      fixEncoderSize(getBytesEncoder(), 8).encode(
        new Uint8Array([207, 235, 166, 255, 163, 162, 149, 44])
      ),
      0
    )
  ) {
    return TensorEscrowInstruction.WithdrawMarginAccountCpiTlock;
  }
  throw new Error(
    'The provided instruction could not be identified as a tensorEscrow instruction.'
  );
}

export type ParsedTensorEscrowInstruction<
  TProgram extends string = 'TSWAPaqyCSx2KABk68Shruf4rp7CxcNi8hAsbdwmHbN',
> =
  | ({
      instructionType: TensorEscrowInstruction.InitUpdateTswap;
    } & ParsedInitUpdateTswapInstruction<TProgram>)
  | ({
      instructionType: TensorEscrowInstruction.InitMarginAccount;
    } & ParsedInitMarginAccountInstruction<TProgram>)
  | ({
      instructionType: TensorEscrowInstruction.CloseMarginAccount;
    } & ParsedCloseMarginAccountInstruction<TProgram>)
  | ({
      instructionType: TensorEscrowInstruction.DepositMarginAccount;
    } & ParsedDepositMarginAccountInstruction<TProgram>)
  | ({
      instructionType: TensorEscrowInstruction.WithdrawMarginAccount;
    } & ParsedWithdrawMarginAccountInstruction<TProgram>)
  | ({
      instructionType: TensorEscrowInstruction.WithdrawMarginAccountFromTBid;
    } & ParsedWithdrawMarginAccountFromTBidInstruction<TProgram>)
  | ({
      instructionType: TensorEscrowInstruction.WithdrawMarginAccountCpiTamm;
    } & ParsedWithdrawMarginAccountCpiTammInstruction<TProgram>)
  | ({
      instructionType: TensorEscrowInstruction.WithdrawMarginAccountCpiTcomp;
    } & ParsedWithdrawMarginAccountCpiTcompInstruction<TProgram>)
  | ({
      instructionType: TensorEscrowInstruction.WithdrawMarginAccountCpiTlock;
    } & ParsedWithdrawMarginAccountCpiTlockInstruction<TProgram>);
