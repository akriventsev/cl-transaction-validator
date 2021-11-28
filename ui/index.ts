import express from 'express'
import * as anchor from "@project-serum/anchor";
import { BN, Program, ProgramError, Provider, web3 } from "@project-serum/anchor";
import { Connection } from '@solana/web3.js';
import idl from '../target/idl/proposal_validator.json';
import main_wallet from '../wallet.json'
import { keccak256 } from '@ethersproject/keccak256';


import oracle1 from "../keys/oracle_1.json"
import oracle2 from "../keys/oracle_2.json"
import oracle3 from "../keys/oracle_3.json"
import oracle4 from "../keys/oracle_4.json"


const programID = new anchor.web3.PublicKey(idl.metadata.address);
const proposalStorage = new anchor.web3.PublicKey("CxGoNCUiX3rTYt4HAYyS4CTYymaj7U99kE3dBynwtfd3");
const application_storage = new anchor.web3.PublicKey("A1hujPP5HvfU3uBrKfqMCp7ujeUzKQEr3a4ypeoP1aGL");
console.log("storage", proposalStorage.toBase58())
const wallet = anchor.web3.Keypair.generate();
async function getProvider() {
    console.log(main_wallet);
    let b = Buffer.from(main_wallet);
    //@ts-ignore
    let wallet1 = anchor.web3.Keypair.fromSecretKey(b);
    /* create the provider and return it to the caller */
    /* network set to local network for now */
    const network = "https://api.devnet.solana.com";
    const connection = new Connection(network);

    const provider = new Provider(
        connection, new anchor.Wallet(wallet1), {}
    );
    return provider;
}


function getPayload() {
    let b = Buffer.from("00000000000000000000000000000000000000000000000000000000000000a8000000000000000000000000000000000000000000000000000000000161826d0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000004200000000000000000000000000000000000000000000000004f67116976d720ff3ecdd8727e8b9bb6efe1d6a3e83b3f6f1827dde8f8526dbfd6e38e3d8307702ca8469bae6c56c15000000000000000000000000000000000000000000000000");
    let h = keccak256(b);
    let payload = Buffer.from(h.substring(2), "hex");

    return payload;
}


const app = express();
const port = 5000;
app.get('/', async (request, response) => {
    const provider = await getProvider();
    // Configure the client to use the local cluster.
    anchor.setProvider(provider);
    //const program = anchor.workspace.ProposalValidator as Program;
    //console.log(program);

    //@ts-ignore
    const program = new Program(idl, programID, provider);
    //console.log(program.account.proposalInfo);
    let pst = await program.account.proposalInfo.fetch(proposalStorage);
    console.log(pst);
    response.send('Hello world!');
});


app.get('/prop', async function (req, res) {
    const provider = await getProvider();
    // Configure the client to use the local cluster.
    anchor.setProvider(provider);
    //const program = anchor.workspace.ProposalValidator as Program;
    //console.log(program);

    //@ts-ignore
    const program = new Program(idl, programID, provider);
    //console.log(program.account.proposalInfo);
    //@ts-ignore
    let pst = await program.account.proposalInfo.fetch(req.query.address);
    //@ts-ignore
    let confirmations = [];
    //@ts-ignore
    pst.confirmations.forEach(element => {
        //@ts-ignore
        confirmations.push(element.toBase58());
    });
    //@ts-ignore
    res.send(confirmations);
});


app.get('/validate', async (request, response) => {
    let oracles = [
        //anchor.web3.Keypair.fromSecretKey(Buffer.from(oracle1)),
        anchor.web3.Keypair.fromSecretKey(Buffer.from(oracle2)),
        anchor.web3.Keypair.fromSecretKey(Buffer.from(oracle3)),
        anchor.web3.Keypair.fromSecretKey(Buffer.from(oracle4)),
    ]
    oracles.forEach(element => {
        console.log(element.publicKey.toBase58());
    });


    const provider = await getProvider();
    // Configure the client to use the local cluster.
    anchor.setProvider(provider);
    //const program = anchor.workspace.ProposalValidator as Program;
    //console.log(program);

    //@ts-ignore
    const program = new Program(idl, programID, provider);

    let pst = await program.account.applicationInfo.fetch(application_storage);
    console.log(pst.oracles);
    //@ts-ignore
    pst.oracles.forEach(element => {
        //@ts-ignore
        console.log(element.toBase58());
    });

    let payload = getPayload();

    const [proposalStorage, proposalStorageBumpSeed] =
        await web3.PublicKey.findProgramAddress(
            [payload, Buffer.from("proposal"), Buffer.from([0x01])],
            program.programId
        );

    await program.rpc.initProposal(proposalStorageBumpSeed, 0x01, payload, {
        accounts: {
            payer: oracles[0].publicKey,
            proposalStorage: proposalStorage,
            application: application_storage,
            systemProgram: web3.SystemProgram.programId,
        },
        signers: [oracles[0]],
    });

    await program.rpc.submitProposal(proposalStorageBumpSeed, 0x01, payload, {
        accounts: {
            payer: oracles[1].publicKey,
            proposalStorage: proposalStorage,
            application: application_storage,
            systemProgram: web3.SystemProgram.programId,
        },
        signers: [oracles[1]],
    });
    await program.rpc.submitProposal(proposalStorageBumpSeed, 0x01, payload, {
        accounts: {
            payer: oracles[2].publicKey,
            proposalStorage: proposalStorage,
            application: application_storage,
            systemProgram: web3.SystemProgram.programId,
        },
        signers: [oracles[2]],
    });
    //console.log(pst);
    response.send('Done');
});
app.listen(port, () => console.log(`Running on port ${port}`));