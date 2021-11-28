#![allow(unused)]

use anchor_lang::prelude::*;
use anchor_lang::solana_program::{program::invoke_signed, system_instruction, system_program};

pub mod error;
use error::*;
pub mod structs;
use structs::*;

pub mod governance;
use governance::*;


use std::collections::BTreeMap;
use std::default;
use std::mem::size_of;

declare_id!("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");

#[program]
pub mod proposal_validator {
    
    

    use super::*;

    pub fn init(
        ctx: Context<Init>,
        application_id: Vec<u8>,
        stake_holders: Vec<Pubkey>,
        oracles: Vec<Pubkey>,
        initial_storage_bump_seed: u32,
    ) -> ProgramResult {
        ctx.accounts.initial_storage.application_id.copy_from_slice(&application_id[0..16]);
        for oracle in oracles.into_iter() {
            ctx.accounts.initial_storage.append_oracle(oracle);
        }
        for stakeholder in stake_holders.into_iter() {
            ctx.accounts.initial_storage.append_stake_holder(stakeholder);
        }
        Ok(())
    }
    
    pub fn submit_proposal(ctx: Context<SubmitProposalCtx>,bump: u32, proposal_type: u8, payload: Vec<u8>) -> ProgramResult {
        submit_proposal_exec(ctx, bump,proposal_type,payload)
    }
    pub fn init_proposal(ctx: Context<InitProposalCtx>,bump: u32, proposal_type: u8, payload: Vec<u8>) -> ProgramResult {
        init_proposal_exec(ctx, bump,proposal_type,payload)
    }

    pub fn add_stakeholders(ctx: Context<ExecuteGovernanceCtx>, keys: Vec<Pubkey>) -> ProgramResult {
        let payload = ExecuteGovernancePayload {
            operation: GovernanceOperation::AddStakeholders,
            keys: keys,
        };
        execute_governance(ctx, payload)
    }
    pub fn remove_stakeholders(ctx: Context<ExecuteGovernanceCtx>, keys: Vec<Pubkey>) -> ProgramResult {
        let payload = ExecuteGovernancePayload {
            operation: GovernanceOperation::RemoveStakeholders,
            keys: keys,
        };
        execute_governance(ctx, payload)
    }
    pub fn add_oracles(ctx: Context<ExecuteGovernanceCtx>, keys: Vec<Pubkey>) -> ProgramResult {
        let payload = ExecuteGovernancePayload {
            operation: GovernanceOperation::AddOracles,
            keys: keys,
        };
        execute_governance(ctx, payload)
    }
    pub fn remove_oracles(ctx: Context<ExecuteGovernanceCtx>, keys: Vec<Pubkey>) -> ProgramResult {
        let payload = ExecuteGovernancePayload {
            operation: GovernanceOperation::RemoveOracles,
            keys: keys,
        };
        execute_governance(ctx, payload)
    }

    pub fn test(ctx: Context<SubmitProposalCtx>, value: SubmitProposalArgs) -> ProgramResult {
        msg!("Payload: {:?} Oracle: {:?} Sign: {:?}", value.payload, value.oracle, value.sign);
        Ok(())
    }
    
    
}

pub fn submit_proposal_exec(ctx: Context<SubmitProposalCtx>, bump: u32, proposal_type: u8,payload: Vec<u8>) -> ProgramResult {
    
    match proposal_type {
        0x00 => {
            if !ctx.accounts.application.is_valid_stake_holder(ctx.accounts.payer.key()) {
                return Err(ErrorCode::OperationForbidden.into());
            }
        },
        _ => {
            if !ctx.accounts.application.is_valid_oracle(ctx.accounts.payer.key()) {
                return Err(ErrorCode::OperationForbidden.into());
            }
        }
    }
    
    let tmp_payload = payload.clone();
    let proposal_storage_seeds:&[&[u8]] = &[tmp_payload.as_slice(), b"proposal",&[proposal_type]];
    let proposal_storage = Pubkey::find_program_address(proposal_storage_seeds.clone(), ctx.program_id);
    let (proposal_storage, proposal_bump_seed) = proposal_storage;
    assert_eq!(proposal_storage, ctx.accounts.proposal_storage.key());
    msg!("tmp storage: {} bump seed {}",proposal_storage.clone(),proposal_bump_seed.clone());
    
    let mut bft = 0 as u8;
    ctx.accounts.proposal_storage.confirmations.push(ctx.accounts.payer.key());
    if proposal_type == 0x00 {
        bft = ctx.accounts.application.stakeholders_bft.clone();
    } else {
        bft = ctx.accounts.application.oracles_bft.clone();
    }
    
    if ctx.accounts.proposal_storage.confirmations.len() as u8 >= bft {
        ctx.accounts.proposal_storage.confirmed = true;
    }
    Ok(())
}


pub fn init_proposal_exec(ctx: Context<InitProposalCtx>, bump: u32, proposal_type: u8,payload: Vec<u8>) -> ProgramResult {
    
    match proposal_type {
        0x00 => {
            if !ctx.accounts.application.is_valid_stake_holder(ctx.accounts.payer.key()) {
                return Err(ErrorCode::OperationForbidden.into());
            }
        },
        _ => {
            if !ctx.accounts.application.is_valid_oracle(ctx.accounts.payer.key()) {
                return Err(ErrorCode::OperationForbidden.into());
            }
        }
    }
    
    let tmp_payload = payload.clone();
    let proposal_storage_seeds:&[&[u8]] = &[tmp_payload.as_slice(), b"proposal",&[proposal_type]];
    let proposal_storage = Pubkey::find_program_address(proposal_storage_seeds.clone(), ctx.program_id);
    let (proposal_storage, proposal_bump_seed) = proposal_storage;
    assert_eq!(proposal_storage, ctx.accounts.proposal_storage.key());
    msg!("tmp storage: {} bump seed {}",proposal_storage.clone(),proposal_bump_seed.clone());
    
    let mut bft = 0 as u8;
    ctx.accounts.proposal_storage.confirmations.push(ctx.accounts.payer.key());
    if proposal_type == 0x00 {
        bft = ctx.accounts.application.stakeholders_bft.clone();
    } else {
        bft = ctx.accounts.application.oracles_bft.clone();
    }
    
    if ctx.accounts.proposal_storage.confirmations.len() as u8 >= bft {
        ctx.accounts.proposal_storage.confirmed = true;
    }
    Ok(())
}



const HEADER_BYTES: u64 = 1;
const HAVE_VALUE: u8 = 0xA1;

#[derive(Accounts)]
#[instruction( application_id: Vec<u8>, stake_holders: Vec<Pubkey>, oracles: Vec<Pubkey>,initial_storage_bump_seed: u32)]
pub struct Init<'info> {
    #[account(mut, signer)]
    pub payer: AccountInfo<'info>,
    #[account(
        init, payer = payer, space = 1+1+(8+20*32)+(8+50*32),
        seeds = [b"init", payer.key.as_ref()],
        bump = initial_storage_bump_seed as u8
    )]
    pub initial_storage: ProgramAccount<'info, ApplicationInfo>,
    #[account(address = system_program::ID)]
    pub system_program: AccountInfo<'info>,
}



#[account]
#[derive(Default)]
pub struct StorageReference {
    pub storage: Pubkey,
}


#[derive(Accounts)]
#[instruction( bump_seed: u32, proposal_type: u8,payload: Vec<u8>)]
pub struct InitProposalCtx<'info> {
    #[account(mut, signer)]
    pub payer: AccountInfo<'info>,
    #[account()]
    pub application: ProgramAccount<'info, ApplicationInfo>,
    #[account(
        init, payer = payer, space = 800,
        seeds = [payload.as_slice().as_ref(),b"proposal",&[proposal_type]],
        bump = bump_seed as u8
    )]
    pub proposal_storage: ProgramAccount<'info,ProposalInfo>,
    #[account(address = system_program::ID)]
    pub system_program: AccountInfo<'info>,
}

#[derive(Accounts)]
#[instruction( bump_seed: u32, proposal_type: u8,payload: Vec<u8>)]
pub struct SubmitProposalCtx<'info> {
    #[account(mut, signer)]
    pub payer: AccountInfo<'info>,
    #[account()]
    pub application: ProgramAccount<'info, ApplicationInfo>,
    #[account(mut)]
    pub proposal_storage: ProgramAccount<'info,ProposalInfo>,
    #[account(address = system_program::ID)]
    pub system_program: AccountInfo<'info>,
}
