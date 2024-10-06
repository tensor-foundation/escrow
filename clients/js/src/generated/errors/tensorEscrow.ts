/**
 * This code was AUTOGENERATED using the kinobi library.
 * Please DO NOT EDIT THIS FILE, instead use visitors
 * to add features, then rerun kinobi to update it.
 *
 * @see https://github.com/kinobi-so/kinobi
 */

/** BadOwner: bad owner */
export const TENSOR_ESCROW_ERROR__BAD_OWNER = 0x1780; // 6016
/** BadMargin: bad margin account passed */
export const TENSOR_ESCROW_ERROR__BAD_MARGIN = 0x178b; // 6027

export type TensorEscrowError =
  | typeof TENSOR_ESCROW_ERROR__BAD_MARGIN
  | typeof TENSOR_ESCROW_ERROR__BAD_OWNER;

let tensorEscrowErrorMessages: Record<TensorEscrowError, string> | undefined;
if (process.env.NODE_ENV !== 'production') {
  tensorEscrowErrorMessages = {
    [TENSOR_ESCROW_ERROR__BAD_MARGIN]: `bad margin account passed`,
    [TENSOR_ESCROW_ERROR__BAD_OWNER]: `bad owner`,
  };
}

export function getTensorEscrowErrorMessage(code: TensorEscrowError): string {
  if (process.env.NODE_ENV !== 'production') {
    return (tensorEscrowErrorMessages as Record<TensorEscrowError, string>)[
      code
    ];
  }

  return 'Error message not available in production bundles.';
}
