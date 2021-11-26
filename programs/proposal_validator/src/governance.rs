#![allow(unused)]
use anchor_lang::prelude::*;
use anchor_lang::solana_program::keccak;
use anchor_lang::solana_program::{program::invoke_signed, system_instruction, system_program};


use super::error::*;
//pub mod structs;
use super::structs::*;

pub fn execute_governance(ctx: Context<ExecuteGovernanceCtx>, payload: ExecuteGovernancePayload) -> ProgramResult {
    let buf = payload.try_to_vec()?;
    let hash = keccak::hash(buf.as_slice());
    let operation_payload = hash.to_bytes();
    
    let proposal_storage_seeds:&[&[u8]] = &[operation_payload[..].as_ref(), b"proposal", &[0x00 as u8]];
    let proposal_storage = Pubkey::find_program_address(proposal_storage_seeds.clone(), ctx.program_id);
    let (proposal_storage, proposal_bump_seed) = proposal_storage;
    assert_eq!(&proposal_storage, ctx.accounts.proposal_storage.key);
    let mut data =  ctx.accounts.proposal_storage.data.borrow_mut();
    
    let mut proposal = ProposalInfo::deserialize(std::borrow::BorrowMut::borrow_mut(&mut data.as_ref()))?;
    if proposal.done {
        return  Err(ErrorCode::ProposalAlreadyExecuted.into());
    }
    msg!("accounts application stakeholders BFT {}", ctx.accounts.application.stakeholders_bft.clone());
    msg!("proposal confirmations count {}", proposal.confirmations.len());
    if proposal.confirmations.len() as u8 <= ctx.accounts.application.stakeholders_bft {
        return Err(ErrorCode::StakeHoldersBFTError.into())
    }
    
    for key in payload.keys.into_iter() {
        match payload.operation.clone() {
            GovernanceOperation::AddStakeholders => {
                ctx.accounts.application.append_stake_holder(key);
            },
            GovernanceOperation::RemoveStakeholders => {
                ctx.accounts.application.remove_stake_holder(key);
            },
            GovernanceOperation::AddOracles => {
                ctx.accounts.application.append_oracle(key);
            },
            GovernanceOperation::RemoveOracles => {
                ctx.accounts.application.remove_oracle(key);
            }
        }
        
    }
    
    proposal.confirmed = true;
    let s = proposal.try_to_vec()?;
    data[..s.len()].copy_from_slice(s.as_slice());

    
    Ok(())
}



#[derive(Accounts)]
pub struct ExecuteGovernanceCtx<'info> {
    #[account(mut, signer)]
    pub payer: AccountInfo<'info>,
    #[account(mut)]
    pub application: ProgramAccount<'info, ApplicationInfo>,
    #[account(mut)]
    pub proposal_storage: AccountInfo<'info>,
    #[account(address = system_program::ID)]
    pub system_program: AccountInfo<'info>,
}

#[derive(AnchorSerialize,AnchorDeserialize, Clone)]
pub enum GovernanceOperation  {
    AddStakeholders,
    RemoveStakeholders,
    AddOracles,
    RemoveOracles
}
impl Default for GovernanceOperation {
    fn default() -> Self { GovernanceOperation::AddOracles }
}

#[derive(Default,AnchorSerialize,AnchorDeserialize,Clone)]
pub struct ExecuteGovernancePayload {
    pub operation: GovernanceOperation,
    pub keys: Vec<Pubkey>,
}
