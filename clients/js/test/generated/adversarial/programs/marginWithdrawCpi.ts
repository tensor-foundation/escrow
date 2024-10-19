/**
 * This code was AUTOGENERATED using the kinobi library.
 * Please DO NOT EDIT THIS FILE, instead use visitors
 * to add features, then rerun kinobi to update it.
 *
 * @see https://github.com/kinobi-so/kinobi
 */

import {
  containsBytes,
  fixEncoderSize,
  getBytesEncoder,
  type Address,
} from '@solana/web3.js';
import {
  type ParsedProcessWithdrawMarginAccountFromTammCpiInstruction,
  type ParsedWithdrawFromTammMarginInstruction,
  type ParsedWithdrawFromTammMarginSignedInstruction,
  type ParsedWithdrawFromTcmpMarginInstruction,
  type ParsedWithdrawFromTcmpMarginSignedInstruction,
} from '../instructions';

export const MARGIN_WITHDRAW_CPI_PROGRAM_ADDRESS =
  '6yJwyDaYK2q9gMLtRnJukEpskKsNzMAqiCRikRaP2g1F' as Address<'6yJwyDaYK2q9gMLtRnJukEpskKsNzMAqiCRikRaP2g1F'>;

export enum MarginWithdrawCpiAccount {
  Pool,
  BidState,
}

export function identifyMarginWithdrawCpiAccount(
  account: { data: Uint8Array } | Uint8Array
): MarginWithdrawCpiAccount {
  const data = account instanceof Uint8Array ? account : account.data;
  if (
    containsBytes(
      data,
      fixEncoderSize(getBytesEncoder(), 8).encode(
        new Uint8Array([241, 154, 109, 4, 17, 177, 109, 188])
      ),
      0
    )
  ) {
    return MarginWithdrawCpiAccount.Pool;
  }
  if (
    containsBytes(
      data,
      fixEncoderSize(getBytesEncoder(), 8).encode(
        new Uint8Array([155, 197, 5, 97, 189, 60, 8, 183])
      ),
      0
    )
  ) {
    return MarginWithdrawCpiAccount.BidState;
  }
  throw new Error(
    'The provided account could not be identified as a marginWithdrawCpi account.'
  );
}

export enum MarginWithdrawCpiInstruction {
  WithdrawFromTammMargin,
  WithdrawFromTammMarginSigned,
  ProcessWithdrawMarginAccountFromTammCpi,
  WithdrawFromTcmpMargin,
  WithdrawFromTcmpMarginSigned,
}

export function identifyMarginWithdrawCpiInstruction(
  instruction: { data: Uint8Array } | Uint8Array
): MarginWithdrawCpiInstruction {
  const data =
    instruction instanceof Uint8Array ? instruction : instruction.data;
  if (
    containsBytes(
      data,
      fixEncoderSize(getBytesEncoder(), 8).encode(
        new Uint8Array([19, 157, 14, 131, 206, 43, 39, 247])
      ),
      0
    )
  ) {
    return MarginWithdrawCpiInstruction.WithdrawFromTammMargin;
  }
  if (
    containsBytes(
      data,
      fixEncoderSize(getBytesEncoder(), 8).encode(
        new Uint8Array([251, 48, 129, 62, 159, 191, 103, 93])
      ),
      0
    )
  ) {
    return MarginWithdrawCpiInstruction.WithdrawFromTammMarginSigned;
  }
  if (
    containsBytes(
      data,
      fixEncoderSize(getBytesEncoder(), 8).encode(
        new Uint8Array([245, 28, 173, 174, 238, 203, 22, 119])
      ),
      0
    )
  ) {
    return MarginWithdrawCpiInstruction.ProcessWithdrawMarginAccountFromTammCpi;
  }
  if (
    containsBytes(
      data,
      fixEncoderSize(getBytesEncoder(), 8).encode(
        new Uint8Array([117, 209, 203, 211, 80, 218, 224, 87])
      ),
      0
    )
  ) {
    return MarginWithdrawCpiInstruction.WithdrawFromTcmpMargin;
  }
  if (
    containsBytes(
      data,
      fixEncoderSize(getBytesEncoder(), 8).encode(
        new Uint8Array([48, 23, 246, 232, 19, 81, 187, 157])
      ),
      0
    )
  ) {
    return MarginWithdrawCpiInstruction.WithdrawFromTcmpMarginSigned;
  }
  throw new Error(
    'The provided instruction could not be identified as a marginWithdrawCpi instruction.'
  );
}

export type ParsedMarginWithdrawCpiInstruction<
  TProgram extends string = '6yJwyDaYK2q9gMLtRnJukEpskKsNzMAqiCRikRaP2g1F',
> =
  | ({
      instructionType: MarginWithdrawCpiInstruction.WithdrawFromTammMargin;
    } & ParsedWithdrawFromTammMarginInstruction<TProgram>)
  | ({
      instructionType: MarginWithdrawCpiInstruction.WithdrawFromTammMarginSigned;
    } & ParsedWithdrawFromTammMarginSignedInstruction<TProgram>)
  | ({
      instructionType: MarginWithdrawCpiInstruction.ProcessWithdrawMarginAccountFromTammCpi;
    } & ParsedProcessWithdrawMarginAccountFromTammCpiInstruction<TProgram>)
  | ({
      instructionType: MarginWithdrawCpiInstruction.WithdrawFromTcmpMargin;
    } & ParsedWithdrawFromTcmpMarginInstruction<TProgram>)
  | ({
      instructionType: MarginWithdrawCpiInstruction.WithdrawFromTcmpMarginSigned;
    } & ParsedWithdrawFromTcmpMarginSignedInstruction<TProgram>);
