// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

pub mod constants;
pub mod error;
pub mod instructions;
pub mod state;

use anchor_lang::prelude::*;
use instructions::*;
use state::*;

declare_id!("TSWAPaqyCSx2KABk68Shruf4rp7CxcNi8hAsbdwmHbN");

#[program]
pub mod escrow_program {

    use super::*;

    // OFFLINE BY DEFAULT
    // pub fn withdraw_tswap_owned_spl(
    //     ctx: Context<WithdrawTswapOwnedSpl>,
    //     amount: u64,
    // ) -> Result<()> {
    //     instructions::withdraw_tswap_owned_spl::process_tswap_owned_spl(ctx, amount)
    // }

    pub fn init_margin_account(
        ctx: Context<InitMarginAccount>,
        margin_nr: u16,
        name: [u8; 32],
    ) -> Result<()> {
        instructions::init_margin_account::process_init_margin_account(ctx, margin_nr, name)
    }

    pub fn close_margin_account(ctx: Context<CloseMarginAccount>) -> Result<()> {
        instructions::close_margin_account::process_close_margin_account(ctx)
    }

    pub fn deposit_margin_account(ctx: Context<DepositMarginAccount>, lamports: u64) -> Result<()> {
        instructions::deposit_margin_account::process_deposit_margin_account(ctx, lamports)
    }

    pub fn withdraw_margin_account(
        ctx: Context<WithdrawMarginAccount>,
        lamports: u64,
    ) -> Result<()> {
        instructions::withdraw_margin_account::process_withdraw_margin_account(ctx, lamports)
    }

    pub fn withdraw_margin_account_cpi(
        ctx: Context<WithdrawMarginAccountCpi>,
        _bump: u8,
        lamports: u64,
    ) -> Result<()> {
        instructions::withdraw_margin_account_from_tbid::process_withdraw_margin_account_from_tbid(
            ctx, lamports,
        )
    }

    pub fn withdraw_margin_account_cpi_tamm(
        ctx: Context<WithdrawMarginAccountCpiTAmm>,
        _bump: u8,
        _pool_id: [u8; 32],
        lamports: u64,
    ) -> Result<()> {
        instructions::withdraw_margin_account_from_tamm::process_withdraw_margin_account_from_tamm(
            ctx, lamports,
        )
    }

    pub fn withdraw_margin_account_cpi_tcomp(
        ctx: Context<WithdrawMarginAccountCpiTcomp>,
        _bump: u8,
        _bid_id: Pubkey,
        lamports: u64,
    ) -> Result<()> {
        instructions::withdraw_margin_account_from_tcomp::process_withdraw_margin_account_from_tcomp(
            ctx, lamports,
        )
    }

    pub fn withdraw_margin_account_cpi_tlock(
        ctx: Context<WithdrawMarginAccountCpiTLock>,
        _bump: u8,
        _order_id: [u8; 32],
        lamports: u64,
    ) -> Result<()> {
        instructions::withdraw_margin_account_from_tlock::process_withdraw_margin_account_from_tlock(
            ctx, lamports,
        )
    }
}
