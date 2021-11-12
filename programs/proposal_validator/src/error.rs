use anchor_lang::prelude::*;



#[error]
pub enum ErrorCode {
    #[msg("Stakeholder already exists")]
    StakeholderAlreadyExists,
    #[msg("Stakeholder BFT error")]
    StakeHoldersBFTError,
    #[msg("Proposal already executed")]
    ProposalAlreadyExecuted,
    #[msg("Operation forbidden")]
    OperationForbidden,
    #[msg("Proposal type not supported")]
    ProposalTypeNotSupported,
    
}