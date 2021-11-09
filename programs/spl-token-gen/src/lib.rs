#![allow(unused)]

use anchor_lang::prelude::*;
use anchor_lang::solana_program::{program::invoke_signed, system_instruction, system_program};

pub mod error;
pub mod structs;
use structs::*;


use std::collections::BTreeMap;
use std::mem::size_of;

declare_id!("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");

#[program]
pub mod spl_token_gen {
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
    
    pub fn submit_proposal(ctx: Context<SubmitProposalCtx>, payload: Vec<u8>, oracle: Vec<u8>, sign: Vec<u8>) -> ProgramResult {
        submit_or_create_proposal(ctx, payload,oracle,sign)
    }

    // pub fn set(ctx: Context<Set>, value: Vec<u8>) -> ProgramResult {
    //     set_or_clear(ctx, Some(value))
    // }

    // pub fn clear(ctx: Context<Set>) -> ProgramResult {
    //     set_or_clear(ctx, None)
    // }

    pub fn test(ctx: Context<SubmitProposalCtx>, value: SubmitProposalArgs) -> ProgramResult {
        msg!("Payload: {:?} Oracle: {:?} Sign: {:?}", value.payload, value.oracle, value.sign);
        Ok(())
    }
    
    
}

pub fn submit_or_create_proposal(ctx: Context<SubmitProposalCtx>, payload: Vec<u8>, oracle: Vec<u8>, sign: Vec<u8>) -> ProgramResult {
   
    
   let tmp_payload = payload.clone();
    let proposal_storage_seeds:&[&[u8]] = &[tmp_payload.as_slice(), b"proposal"];
    let proposal_storage = Pubkey::find_program_address(proposal_storage_seeds.clone(), ctx.program_id);
    let (proposal_storage, proposal_bump_seed) = proposal_storage;
    assert_eq!(&proposal_storage, ctx.accounts.proposal_storage.key);
    msg!("tmp storage: {} bump seed {}",proposal_storage.clone(),proposal_bump_seed.clone());
    

    let mut created = false;
    {
        let mut data = match ctx.accounts.proposal_storage.data.try_borrow_mut() {
            Ok(mut it) => {
                {
                   msg!("data borrowed");
                    let mut proposal = {
                        let this = Proposal::deserialize(std::borrow::BorrowMut::borrow_mut(&mut it.as_ref()));
                        match this {
                            Ok(mut t) =>  {
                                assert_eq!(t.clone().payload, payload.clone());
                                t.signs.insert(oracle.clone(), sign.clone());
                                let s = t.clone().try_to_vec()?;
                                it.as_mut()[..s.len()].copy_from_slice(s.as_slice());
                                created = true;
                            },
                            Err(e) => {
                                msg!("called `Result::unwrap_err()` on an `Err` value");
                                created = false;
                            }
                        }
                    };
                   
                } 
            },
            Err(err) => {
                created = false;
            },
        };
    }
    
    if !created {
        let from = ctx.accounts.payer.key;
        let to = ctx.accounts.proposal_storage.key;
        let lamports = 10000;
        let space = 8+8+16*20 as u64;
        let owner = ctx.program_id;

        invoke_signed(
            &system_instruction::create_account(from, to, lamports, space, owner),
            &[
                ctx.accounts.payer.clone(),
                ctx.accounts.proposal_storage.clone(),
                ctx.accounts.system_program.clone(),
            ],
            &[&[
                payload.clone().as_ref(),
                b"proposal",
                &[proposal_bump_seed],
            ]],
        )?;

        let mut data =  ctx.accounts.proposal_storage.data.borrow_mut();
        let mut proposal = Proposal::default();
        proposal.payload = payload;
        proposal.signs.insert(oracle,sign);
        let s = proposal.try_to_vec()?;
        data[..s.len()].copy_from_slice(s.as_slice());
    }
    

    Ok(())
}

// pub fn set_or_clear(ctx: Context<Set>, application_id: [u8;32], stakeholders: Vec<Pubkey>, oracles: Vec<Pubkey>) -> ProgramResult {

//     let next_storage_seeds = &[b"next", ctx.accounts.storage.key.as_ref()];
//     let next_storage = Pubkey::find_program_address(next_storage_seeds, ctx.program_id);
//     let (next_storage, next_storage_bump_seed) = next_storage;
//     assert_eq!(&next_storage, ctx.accounts.next_storage.key);

//     {
//         let from = ctx.accounts.payer.key;
//         let to = ctx.accounts.next_storage.key;
//         let lamports = 10000;
//         let space = HEADER_BYTES + value.as_ref().map(Vec::len).unwrap_or_default() as u64;
//         let owner = ctx.program_id;

//         invoke_signed(
//             &system_instruction::create_account(from, to, lamports, space, owner),
//             &[
//                 ctx.accounts.payer.clone(),
//                 ctx.accounts.next_storage.clone(),
//                 ctx.accounts.system_program.clone(),
//             ],
//             &[&[
//                 b"next",
//                 ctx.accounts.storage.key.as_ref(),
//                 &[next_storage_bump_seed],
//             ]],
//         )?;
//     }

//     {
//         let mut data = ctx.accounts.next_storage.data.borrow_mut();
        
//         if let Some(value) = value {
//             data[1..].copy_from_slice(&value);
//             data[0] = HAVE_VALUE;
//         } else {
//             assert_eq!(data[0], 0);
//         }
//     }

//     ctx.accounts.storage_reference.storage = next_storage;

//     Ok(())
// }


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

#[derive(Accounts)]
pub struct Set<'info> {
    #[account(mut, signer)]
    pub payer: AccountInfo<'info>,
    #[account(mut, has_one = storage)]
    pub storage_reference: ProgramAccount<'info, StorageReference>,
    #[account(mut, owner = *program_id)]
    pub storage: AccountInfo<'info>,
    #[account(
        mut,
        constraint = next_storage.owner == &system_program::ID,
        constraint = next_storage.data.borrow().is_empty(),
    )]
    pub next_storage: AccountInfo<'info>,
    #[account(address = system_program::ID)]
    pub system_program: AccountInfo<'info>,
}

#[account]
#[derive(Default)]
pub struct StorageReference {
    pub storage: Pubkey,
}

#[derive(Default, AnchorSerialize,AnchorDeserialize,Clone)]
struct Proposal {
    pub payload: Vec<u8>,
    pub signs: BTreeMap<Vec<u8>,Vec<u8>>
}


#[derive(Accounts)]
pub struct SubmitProposalCtx<'info> {
    #[account(mut, signer)]
    pub payer: AccountInfo<'info>,
    #[account(mut)]
    pub proposal_storage: AccountInfo<'info>,
    #[account(address = system_program::ID)]
    pub system_program: AccountInfo<'info>,
}
