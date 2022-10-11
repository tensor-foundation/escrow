use crate::*;
use anchor_spl::token::Mint;
use tensor_whitelist::{self, Whitelist};
use vipers::throw_err;

#[derive(Accounts)]
#[instruction(config: PoolConfig)]
pub struct MigrateReceiptV1ToV2<'info> {
    #[account(
        seeds = [], bump = tswap.bump[0],
        constraint = tswap_owner.key() == tswap.owner
    )]
    pub tswap: Box<Account<'info, TSwap>>,

    #[account(
        seeds = [
            tswap.key().as_ref(),
            owner.key().as_ref(),
            whitelist.key().as_ref(),
            &[config.pool_type as u8],
            &[config.curve_type as u8],
            &config.starting_price.to_le_bytes(),
            &config.delta.to_le_bytes()
        ],
        bump = pool.bump[0],
        has_one = tswap, has_one = owner, has_one = whitelist,
        has_one = nft_authority,
    )]
    pub pool: Box<Account<'info, Pool>>,

    /// Needed for pool seeds derivation / will be stored inside pool
    #[account(
        seeds = [&whitelist.uuid],
        bump,
        seeds::program = tensor_whitelist::ID
    )]
    pub whitelist: Box<Account<'info, Whitelist>>,

    #[account(
        seeds = [b"nft_auth".as_ref(), &nft_authority.random_seed],
        bump = nft_authority.bump[0],
        has_one = pool,
    )]
    pub nft_authority: Box<Account<'info, NftAuthority>>,

    /// CHECK: used in seed derivation - NOT A SIGNER, COZ WE'RE MIGRATING ON THEIR BEHALF
    pub owner: AccountInfo<'info>,

    #[account(mut)]
    pub tswap_owner: Signer<'info>,

    /// CHECK: seed in nft_escrow & nft_receipt
    pub nft_mint: Box<Account<'info, Mint>>,

    #[account(
        mut,
        seeds=[
            b"nft_receipt".as_ref(),
            nft_mint.key().as_ref(),
        ],
        bump = nft_receipt.bump,
    )]
    pub nft_receipt: Box<Account<'info, NftDepositReceipt>>,

    pub system_program: Program<'info, System>,
}

impl<'info> Validate<'info> for MigrateReceiptV1ToV2<'info> {
    fn validate(&self) -> Result<()> {
        if self.pool.version != 2 || self.pool.nft_authority == Pubkey::default() {
            throw_err!(WrongPoolVersion);
        }

        if self.nft_receipt.nft_authority != self.pool.key() {
            throw_err!(WrongPool);
        }

        Ok(())
    }
}

#[access_control(ctx.accounts.validate())]
pub fn handler(ctx: Context<MigrateReceiptV1ToV2>) -> Result<()> {
    let receipt = &mut ctx.accounts.nft_receipt;
    receipt.nft_authority = ctx.accounts.pool.nft_authority.key();

    Ok(())
}
