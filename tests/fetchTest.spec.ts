import * as anchor from "@project-serum/anchor";
import { BN, Program, ProgramError, Provider, web3 } from "@project-serum/anchor";
import { expect } from "chai";
import { encodeGovernanceArgs } from './utils/structs';
import { keccak256 } from "@ethersproject/keccak256";
import { assert } from "console";


describe("Application", () => {
    const provider = anchor.Provider.env();
    // Configure the client to use the local cluster.
    anchor.setProvider(provider);

    const payer = web3.Keypair.generate();
    const program = anchor.workspace.ProposalValidator as Program;



    it("Preparing accounts", async () => {
        //const proposalStorage = new anchor.web3.PublicKey("G4XWPkq9rJdRAbJzQC4R3Vjd7ipvQXvRDwXaHzwWUJ3a");
        const application_storage = new anchor.web3.PublicKey("HvXZwkxaa28W3RApFpoivjLq8TPYCWrnKMFUC6wZmvpX");
        //let pst = await program.account.proposalInfo.fetch(proposalStorage);
        let pst = await program.account.applicationInfo.fetch(application_storage);
        console.log(pst);
    });






});
