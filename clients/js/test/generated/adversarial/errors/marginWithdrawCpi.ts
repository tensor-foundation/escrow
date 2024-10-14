/**
 * This code was AUTOGENERATED using the kinobi library.
 * Please DO NOT EDIT THIS FILE, instead use visitors
 * to add features, then rerun kinobi to update it.
 *
 * @see https://github.com/kinobi-so/kinobi
 */

/** WithdrawError: Error withdrawing from margin account */
export const MARGIN_WITHDRAW_CPI_ERROR__WITHDRAW_ERROR = 0x1770; // 6000

export type MarginWithdrawCpiError =
  typeof MARGIN_WITHDRAW_CPI_ERROR__WITHDRAW_ERROR;

let marginWithdrawCpiErrorMessages:
  | Record<MarginWithdrawCpiError, string>
  | undefined;
if (process.env.NODE_ENV !== 'production') {
  marginWithdrawCpiErrorMessages = {
    [MARGIN_WITHDRAW_CPI_ERROR__WITHDRAW_ERROR]: `Error withdrawing from margin account`,
  };
}

export function getMarginWithdrawCpiErrorMessage(
  code: MarginWithdrawCpiError
): string {
  if (process.env.NODE_ENV !== 'production') {
    return (
      marginWithdrawCpiErrorMessages as Record<MarginWithdrawCpiError, string>
    )[code];
  }

  return 'Error message not available in production bundles.';
}