

use std::{collections::BTreeMap, fmt::Result};

use anchor_lang::prelude::*;

const MAX_STAKEHOLDERS_COUNT: u8 = 20;
const MAX_ORACLES_COUNT: u8 = 20;

#[derive(Default, Clone,AnchorSerialize,AnchorDeserialize)]
pub struct SubmitProposalArgs {
    pub payload: Vec<u8>,
    pub oracle: [u8;32],
    pub sign: [u8;32]
}

#[account]
#[derive(Default)]
pub struct ProposalInfo {
    pub confirmed: bool,
    pub done: bool,
    pub proposal_type: u8,
    pub payload: Vec<u8>,
    //pub signs: BTreeMap<Vec<u8>,Vec<u8>>,
    pub confirmations: Vec<Pubkey>,
    //pub proof_transaction: Vec<u8>
}

#[account]
#[derive(Default)]
pub struct ApplicationInfo {
    pub stakeholders_bft:u8,
    pub oracles_bft:u8,
    pub application_id: [u8;16],
    pub stake_holders: Vec<Pubkey>,
    pub oracles: Vec<Pubkey>
}


impl ApplicationInfo {
    
    pub fn is_valid_stake_holder(&self,stake_holder: Pubkey) -> bool {
        if self.stake_holders.iter().any(|&key| key==stake_holder) {
            return true;
        }
        return false;
    }

    pub fn is_valid_oracle(&self,oracle: Pubkey) -> bool {
        if self.oracles.iter().any(|&key| key==oracle) {
            return true;
        }
        return false;
    }
    pub fn append_stake_holder(&mut self,stake_holder: Pubkey) -> Result {
        if self.stake_holders.iter().any(|&key| key==stake_holder) {
            return Ok(());
        }
        self.stake_holders.push(stake_holder);
        let bft = self.stake_holders.len()*2/3;
        self.stakeholders_bft = bft as u8;
        Ok(())
    }

    pub fn remove_stake_holder(&mut self,stake_holder: Pubkey) -> Result {
        if self.stake_holders.iter().any(|&key| key==stake_holder) {
            let b: Vec<Pubkey> = self.stake_holders.clone().into_iter().filter(|key| *key != stake_holder).collect();
            self.stake_holders = b;
            let bft = self.stake_holders.len()*2/3;
            self.stakeholders_bft = bft as u8;
        }
        Ok(())
    }

    pub fn append_oracle(&mut self,oracle: Pubkey) -> Result {
        if self.oracles.iter().any(|&key| key==oracle) {
            return Ok(());
        }
        self.oracles.push(oracle);
        let bft = self.oracles.len()*2/3;
        self.oracles_bft = bft as u8;
        Ok(())
    }

    pub fn remove_oracle(&mut self,oracle: Pubkey) -> Result {
        if self.oracles.iter().any(|&key| key==oracle) {
            let b: Vec<Pubkey> = self.oracles.clone().into_iter().filter(|key| *key != oracle).collect();
            self.oracles = b;
            let bft = self.oracles.len()*2/3;
            self.oracles_bft = bft as u8;
        }
        Ok(())
    }

}


#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn it_works() {
        assert_eq!(2 + 2, 4);
    }
    
    #[test]
    fn add_oracle() {
        let mut  app = ApplicationInfo::default();
        let mut keys = Vec::new();
        for _n in 1..6 {
            let k = Pubkey::new_unique();
            keys.push(k.clone());
            app.append_oracle(k);
        }
        
        assert_eq!(app.oracles.len(),5);  
    }
    #[test]
    fn remove_oracle() {
        let mut  app = ApplicationInfo::default();
        let mut keys = Vec::new();
        for _n in 1..6 {
            let k = Pubkey::new_unique();
            keys.push(k.clone());
            app.append_oracle(k);
        }
        app.remove_oracle(keys[0].clone());
        assert_eq!(app.oracles.len(),4);  
    }

    #[test]
    fn add_stakeholder() {
        let mut  app = ApplicationInfo::default();
        let mut keys = Vec::new();
        for _n in 1..6 {
            let k = Pubkey::new_unique();
            keys.push(k.clone());
            app.append_stake_holder(k);
        }
        
        assert_eq!(app.stake_holders.len(),5);  
    }
    #[test]
    fn remove_stakeholder() {
        let mut  app = ApplicationInfo::default();
        let mut keys = Vec::new();
        for _n in 1..6 {
            let k = Pubkey::new_unique();
            keys.push(k.clone());
            app.append_stake_holder(k);
        }
        app.remove_stake_holder(keys[0].clone());
        assert_eq!(app.stake_holders.len(),4);  
    }

}



