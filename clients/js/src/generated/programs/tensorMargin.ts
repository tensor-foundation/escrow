/**
 * This code was AUTOGENERATED using the kinobi library.
 * Please DO NOT EDIT THIS FILE, instead use visitors
 * to add features, then rerun kinobi to update it.
 *
 * @see https://github.com/metaplex-foundation/kinobi
 */

import { Address } from '@solana/addresses';
import { Program, ProgramWithErrors } from '@solana/programs';
import {
  TensorMarginProgramError,
  TensorMarginProgramErrorCode,
  getTensorMarginProgramErrorFromCode,
} from '../errors';
import { memcmp } from '../shared';

export const TENSOR_MARGIN_PROGRAM_ADDRESS =
  'TSWAPaqyCSx2KABk68Shruf4rp7CxcNi8hAsbdwmHbN' as Address<'TSWAPaqyCSx2KABk68Shruf4rp7CxcNi8hAsbdwmHbN'>;

export type TensorMarginProgram =
  Program<'TSWAPaqyCSx2KABk68Shruf4rp7CxcNi8hAsbdwmHbN'> &
    ProgramWithErrors<TensorMarginProgramErrorCode, TensorMarginProgramError>;

export function getTensorMarginProgram(): TensorMarginProgram {
  return {
    name: 'tensorMargin',
    address: TENSOR_MARGIN_PROGRAM_ADDRESS,
    getErrorFromCode(code: TensorMarginProgramErrorCode, cause?: Error) {
      return getTensorMarginProgramErrorFromCode(code, cause);
    },
  };
}

export enum TensorMarginAccount {
  NftAuthority,
  MarginAccount,
  NftDepositReceipt,
  Pool,
  SingleListing,
  TSwap,
  SolEscrow,
}

export function identifyTensorMarginAccount(
  account: { data: Uint8Array } | Uint8Array
): TensorMarginAccount {
  const data = account instanceof Uint8Array ? account : account.data;
  if (memcmp(data, new Uint8Array([194, 127, 219, 16, 219, 18, 250, 12]), 0)) {
    return TensorMarginAccount.NftAuthority;
  }
  if (
    memcmp(data, new Uint8Array([133, 220, 173, 213, 179, 211, 43, 238]), 0)
  ) {
    return TensorMarginAccount.MarginAccount;
  }
  if (memcmp(data, new Uint8Array([206, 255, 132, 254, 67, 78, 62, 96]), 0)) {
    return TensorMarginAccount.NftDepositReceipt;
  }
  if (memcmp(data, new Uint8Array([241, 154, 109, 4, 17, 177, 109, 188]), 0)) {
    return TensorMarginAccount.Pool;
  }
  if (memcmp(data, new Uint8Array([14, 114, 212, 140, 24, 134, 31, 24]), 0)) {
    return TensorMarginAccount.SingleListing;
  }
  if (memcmp(data, new Uint8Array([169, 211, 171, 36, 219, 189, 79, 188]), 0)) {
    return TensorMarginAccount.TSwap;
  }
  if (memcmp(data, new Uint8Array([75, 199, 250, 63, 244, 209, 235, 120]), 0)) {
    return TensorMarginAccount.SolEscrow;
  }
  throw new Error(
    'The provided account could not be identified as a tensorMargin account.'
  );
}

export enum TensorMarginInstruction {
  InitUpdateTswap,
  ReallocPool,
  WithdrawTswapFees,
  InitPool,
  ClosePool,
  DepositNft,
  WithdrawNft,
  DepositSol,
  WithdrawSol,
  BuyNft,
  SellNftTokenPool,
  SellNftTradePool,
  EditPool,
  InitMarginAccount,
  CloseMarginAccount,
  DepositMarginAccount,
  WithdrawMarginAccount,
  AttachPoolToMargin,
  DetachPoolFromMargin,
  SetPoolFreeze,
  TakeSnipe,
  EditPoolInPlace,
  List,
  Delist,
  BuySingleListing,
  EditSingleListing,
  WithdrawMmFee,
  WithdrawMarginAccountFromTBid,
  WithdrawMarginAccountFromTComp,
  WithdrawMarginAccountFromTLock,
  BuyNftT22,
  DepositNftT22,
  SellNftTokenPoolT22,
  SellNftTradePoolT22,
  WithdrawNftT22,
  BuySingleListingT22,
  ListT22,
  DelistT22,
  BuyNftWns,
  DepositNftWns,
  SellNftTokenPoolWns,
  SellNftTradePoolWns,
  WithdrawNftWns,
  BuySingleListingWns,
  ListWns,
  DelistWns,
}

export function identifyTensorMarginInstruction(
  instruction: { data: Uint8Array } | Uint8Array
): TensorMarginInstruction {
  const data =
    instruction instanceof Uint8Array ? instruction : instruction.data;
  if (memcmp(data, new Uint8Array([140, 185, 54, 172, 15, 94, 31, 155]), 0)) {
    return TensorMarginInstruction.InitUpdateTswap;
  }
  if (memcmp(data, new Uint8Array([114, 128, 37, 167, 71, 227, 40, 178]), 0)) {
    return TensorMarginInstruction.ReallocPool;
  }
  if (
    memcmp(data, new Uint8Array([27, 229, 128, 105, 115, 125, 180, 151]), 0)
  ) {
    return TensorMarginInstruction.WithdrawTswapFees;
  }
  if (
    memcmp(data, new Uint8Array([116, 233, 199, 204, 115, 159, 171, 36]), 0)
  ) {
    return TensorMarginInstruction.InitPool;
  }
  if (memcmp(data, new Uint8Array([140, 189, 209, 23, 239, 62, 239, 11]), 0)) {
    return TensorMarginInstruction.ClosePool;
  }
  if (memcmp(data, new Uint8Array([93, 226, 132, 166, 141, 9, 48, 101]), 0)) {
    return TensorMarginInstruction.DepositNft;
  }
  if (
    memcmp(data, new Uint8Array([142, 181, 191, 149, 82, 175, 216, 100]), 0)
  ) {
    return TensorMarginInstruction.WithdrawNft;
  }
  if (memcmp(data, new Uint8Array([108, 81, 78, 117, 125, 155, 56, 200]), 0)) {
    return TensorMarginInstruction.DepositSol;
  }
  if (memcmp(data, new Uint8Array([145, 131, 74, 136, 65, 137, 42, 38]), 0)) {
    return TensorMarginInstruction.WithdrawSol;
  }
  if (memcmp(data, new Uint8Array([96, 0, 28, 190, 49, 107, 83, 222]), 0)) {
    return TensorMarginInstruction.BuyNft;
  }
  if (memcmp(data, new Uint8Array([57, 44, 192, 48, 83, 8, 107, 48]), 0)) {
    return TensorMarginInstruction.SellNftTokenPool;
  }
  if (memcmp(data, new Uint8Array([131, 82, 125, 77, 13, 157, 36, 90]), 0)) {
    return TensorMarginInstruction.SellNftTradePool;
  }
  if (memcmp(data, new Uint8Array([50, 174, 34, 36, 3, 166, 29, 204]), 0)) {
    return TensorMarginInstruction.EditPool;
  }
  if (memcmp(data, new Uint8Array([10, 54, 68, 252, 130, 97, 39, 52]), 0)) {
    return TensorMarginInstruction.InitMarginAccount;
  }
  if (memcmp(data, new Uint8Array([105, 215, 41, 239, 166, 207, 1, 103]), 0)) {
    return TensorMarginInstruction.CloseMarginAccount;
  }
  if (memcmp(data, new Uint8Array([190, 85, 242, 60, 119, 81, 33, 192]), 0)) {
    return TensorMarginInstruction.DepositMarginAccount;
  }
  if (memcmp(data, new Uint8Array([54, 73, 150, 208, 207, 5, 18, 17]), 0)) {
    return TensorMarginInstruction.WithdrawMarginAccount;
  }
  if (memcmp(data, new Uint8Array([187, 105, 211, 137, 224, 59, 29, 227]), 0)) {
    return TensorMarginInstruction.AttachPoolToMargin;
  }
  if (memcmp(data, new Uint8Array([182, 54, 73, 38, 188, 87, 185, 101]), 0)) {
    return TensorMarginInstruction.DetachPoolFromMargin;
  }
  if (
    memcmp(data, new Uint8Array([110, 201, 190, 64, 166, 186, 105, 131]), 0)
  ) {
    return TensorMarginInstruction.SetPoolFreeze;
  }
  if (memcmp(data, new Uint8Array([10, 151, 48, 226, 248, 24, 227, 231]), 0)) {
    return TensorMarginInstruction.TakeSnipe;
  }
  if (memcmp(data, new Uint8Array([125, 191, 119, 113, 6, 14, 164, 23]), 0)) {
    return TensorMarginInstruction.EditPoolInPlace;
  }
  if (memcmp(data, new Uint8Array([54, 174, 193, 67, 17, 41, 132, 38]), 0)) {
    return TensorMarginInstruction.List;
  }
  if (memcmp(data, new Uint8Array([55, 136, 205, 107, 107, 173, 4, 31]), 0)) {
    return TensorMarginInstruction.Delist;
  }
  if (memcmp(data, new Uint8Array([245, 220, 105, 73, 117, 98, 78, 141]), 0)) {
    return TensorMarginInstruction.BuySingleListing;
  }
  if (memcmp(data, new Uint8Array([88, 38, 236, 212, 31, 185, 18, 166]), 0)) {
    return TensorMarginInstruction.EditSingleListing;
  }
  if (
    memcmp(data, new Uint8Array([54, 150, 129, 126, 135, 205, 149, 120]), 0)
  ) {
    return TensorMarginInstruction.WithdrawMmFee;
  }
  if (memcmp(data, new Uint8Array([186, 26, 199, 134, 220, 177, 32, 72]), 0)) {
    return TensorMarginInstruction.WithdrawMarginAccountFromTBid;
  }
  if (memcmp(data, new Uint8Array([201, 156, 163, 27, 243, 14, 36, 237]), 0)) {
    return TensorMarginInstruction.WithdrawMarginAccountFromTComp;
  }
  if (
    memcmp(data, new Uint8Array([207, 235, 166, 255, 163, 162, 149, 44]), 0)
  ) {
    return TensorMarginInstruction.WithdrawMarginAccountFromTLock;
  }
  if (memcmp(data, new Uint8Array([155, 219, 126, 245, 170, 199, 51, 79]), 0)) {
    return TensorMarginInstruction.BuyNftT22;
  }
  if (memcmp(data, new Uint8Array([208, 34, 6, 147, 95, 218, 49, 160]), 0)) {
    return TensorMarginInstruction.DepositNftT22;
  }
  if (memcmp(data, new Uint8Array([149, 234, 31, 103, 26, 36, 166, 49]), 0)) {
    return TensorMarginInstruction.SellNftTokenPoolT22;
  }
  if (memcmp(data, new Uint8Array([124, 145, 23, 52, 72, 113, 85, 9]), 0)) {
    return TensorMarginInstruction.SellNftTradePoolT22;
  }
  if (memcmp(data, new Uint8Array([112, 55, 80, 231, 181, 190, 92, 12]), 0)) {
    return TensorMarginInstruction.WithdrawNftT22;
  }
  if (memcmp(data, new Uint8Array([102, 89, 66, 0, 5, 68, 84, 216]), 0)) {
    return TensorMarginInstruction.BuySingleListingT22;
  }
  if (memcmp(data, new Uint8Array([9, 117, 93, 230, 221, 4, 199, 212]), 0)) {
    return TensorMarginInstruction.ListT22;
  }
  if (memcmp(data, new Uint8Array([216, 72, 73, 18, 204, 82, 123, 26]), 0)) {
    return TensorMarginInstruction.DelistT22;
  }
  if (memcmp(data, new Uint8Array([216, 253, 106, 29, 182, 243, 0, 78]), 0)) {
    return TensorMarginInstruction.BuyNftWns;
  }
  if (memcmp(data, new Uint8Array([245, 148, 241, 58, 13, 253, 40, 195]), 0)) {
    return TensorMarginInstruction.DepositNftWns;
  }
  if (memcmp(data, new Uint8Array([40, 78, 241, 78, 204, 238, 46, 143]), 0)) {
    return TensorMarginInstruction.SellNftTokenPoolWns;
  }
  if (memcmp(data, new Uint8Array([169, 175, 125, 88, 1, 16, 130, 7]), 0)) {
    return TensorMarginInstruction.SellNftTradePoolWns;
  }
  if (memcmp(data, new Uint8Array([51, 152, 143, 163, 1, 238, 156, 119]), 0)) {
    return TensorMarginInstruction.WithdrawNftWns;
  }
  if (memcmp(data, new Uint8Array([28, 14, 132, 207, 212, 248, 121, 199]), 0)) {
    return TensorMarginInstruction.BuySingleListingWns;
  }
  if (
    memcmp(data, new Uint8Array([212, 193, 161, 215, 128, 43, 190, 204]), 0)
  ) {
    return TensorMarginInstruction.ListWns;
  }
  if (
    memcmp(data, new Uint8Array([131, 226, 161, 134, 233, 132, 243, 159]), 0)
  ) {
    return TensorMarginInstruction.DelistWns;
  }
  throw new Error(
    'The provided instruction could not be identified as a tensorMargin instruction.'
  );
}
