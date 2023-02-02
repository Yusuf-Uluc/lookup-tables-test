use anchor_lang::prelude::*;

declare_id!("BVqsAZ8qSWK7TiF88WnyVnjKX83H3Ehz6Py5hNm8ReVJ");

#[program]
pub mod testing {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>, initial_data: String) -> Result<()> {
        ctx.accounts.new_account.data = initial_data.to_string();
        msg!("Initialized data to {}", initial_data);
        Ok(())
    }

    pub fn update(ctx: Context<Update>, new_data: String) -> Result<()> {
        ctx.accounts.my_account.data = new_data.to_string();
        msg!("Updated data to {}", new_data);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(
        init, 
        payer = authority,
        // give it some extra space since we're using a String
        space = 100, 
    )]
    pub new_account: Account<'info, MyAccount>,

    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Update<'info> {
    #[account(mut)]
    pub my_account: Account<'info, MyAccount>,

    #[account(mut)]
    pub signer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[account]
pub struct MyAccount {
    pub data: String,
}
