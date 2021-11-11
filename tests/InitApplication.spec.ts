import * as anchor from "@project-serum/anchor";
import { BN, Program, Provider, web3 } from "@project-serum/anchor";
import * as borsh from "borsh";
import { expect } from "chai";
import { encodeGovernanceArgs } from './utils/structs';
import { keccak256 } from "@ethersproject/keccak256";

import { hex } from "@project-serum/anchor/dist/cjs/utils/bytes";
import { publicKey } from "@project-serum/anchor/dist/cjs/utils";

export enum GovernanceOperation {
  AddStakeholders = 0,
  RemoveStakeholders = 1,
  AddOracles = 2,
  RemoveOracles = 3
};


class GovernancePayload {
  operation = GovernanceOperation.AddOracles;
  keys = <anchor.web3.PublicKey[]>[];
  constructor(fields: { operation: GovernanceOperation, keys: anchor.web3.PublicKey[] } | undefined = undefined) {
    if (fields) {
      this.operation = fields.operation;
      this.keys = fields.keys;
    }
  }
}
//Borsh schema definition for greeting accounts
const GovernancePayloadSchema = new Map([
  [GovernancePayload, { kind: 'struct', fields: [['operation', 'enum'], ['keys', 'array']] }],
]);



describe("Application", () => {
  const provider = anchor.Provider.env();
  // Configure the client to use the local cluster.
  anchor.setProvider(provider);

  const payer = web3.Keypair.generate();
  const program = anchor.workspace.SplTokenGen as Program;

  var application_storage: anchor.web3.PublicKey;

  var validStakeholders: anchor.web3.Keypair[] = [];
  var validOracles: anchor.web3.Keypair[] = [];

  for (let i = 0; i < 4; i++) {
    const stakeholder = web3.Keypair.generate();
    validStakeholders.push(stakeholder)
  }

  for (let i = 0; i < 4; i++) {
    const oracle = web3.Keypair.generate();
    validOracles.push(oracle)
  }

  it("Preparing accounts", async () => {
    const airtx = await provider.connection.requestAirdrop(
      payer.publicKey,
      web3.LAMPORTS_PER_SOL * 5
    );
    await provider.connection.confirmTransaction(airtx);

    var transaction = new web3.Transaction();
    validStakeholders.forEach(stakeholder => {
      transaction.add(
        web3.SystemProgram.transfer({
          fromPubkey: payer.publicKey,
          toPubkey: stakeholder.publicKey,
          lamports: web3.LAMPORTS_PER_SOL / 10, // number of SOL to send
        }),
      );
    });
    // Sign transaction, broadcast, and confirm
    var signature = await web3.sendAndConfirmTransaction(provider.connection, transaction, [
      payer,
    ]);
    console.log('SIGNATURE', signature);
  });




  it("Is initialized!", async () => {

    const application_id = Buffer.from("application_1234");

    const [initialStorage, initialStorageBumpSeed] =
      await web3.PublicKey.findProgramAddress(
        [Buffer.from("init"), payer.publicKey.toBuffer()],
        program.programId
      );
    application_storage = initialStorage;

    console.log("init_storage ", initialStorage.toBase58())
    let initStakeholders: anchor.web3.PublicKey[] = [];
    validStakeholders.forEach(element => {
      initStakeholders.push(element.publicKey);
    });
    let initOracles: anchor.web3.PublicKey[] = [];
    validOracles.forEach(element => {
      initOracles.push(element.publicKey);
    });
    await program.rpc.init(application_id, initStakeholders, initOracles, initialStorageBumpSeed, {
      accounts: {
        payer: payer.publicKey,
        initialStorage: initialStorage,
        systemProgram: web3.SystemProgram.programId,
      },
      signers: [payer],
    });



  });

  it("Add oracle by valid stakeholders", async () => {

    let newOracle = web3.Keypair.generate();
    let newOracles: web3.PublicKey[] = [newOracle.publicKey];
    let gp = {
      operation: { AddOracles: {} },
      keys: newOracles
    }
    let b = encodeGovernanceArgs(gp);
    let h = keccak256(b);
    console.log("BORSH: ", b.length, b);
    console.log("KECCAK: ", h.length, h, Buffer.from(h.substring(2), "hex"));
    let payload = Buffer.from(h.substring(2), "hex");
    const [proposalStorage, proposalStorageBumpSeed] =
      await web3.PublicKey.findProgramAddress(
        [payload, Buffer.from("proposal"), Buffer.from([0x00])],
        program.programId
      );
    payload = Buffer.from(payload, 32);
    console.log("Payload ", payload.toString('hex'));
    console.log("Proposal storage ", proposalStorage.toBase58());
    console.log("Application storage ", application_storage.toBase58());
    console.log("Stakeholder ", validStakeholders[0].publicKey.toBase58());

    await Promise.all(validStakeholders.map(async (stakeholder) => {
      console.log("submit proposal from ", stakeholder.publicKey.toBase58());
      let tx = await program.rpc.submitProposal(0x00, payload, stakeholder.publicKey.toBuffer(), Buffer.from("77777777777777777777777777777777"), {
        accounts: {
          payer: stakeholder.publicKey,
          proposalStorage: proposalStorage,
          application: application_storage,
          systemProgram: web3.SystemProgram.programId,
        },
        signers: [stakeholder],
      });
      console.log("Tx: ", tx);
    }));

    console.log("try to execute governance");
    await program.rpc.addOracles(newOracles, {
      accounts: {
        payer: validStakeholders[2].publicKey,
        proposalStorage: proposalStorage,
        application: application_storage,
        systemProgram: web3.SystemProgram.programId,
      },
      signers: [validStakeholders[2]],
    });
    validOracles.push(newOracle);
  });

  it("Remove oracle by valid stakeholders", async () => {

    let OraclesToRemove: web3.PublicKey[] = [validOracles[0].publicKey];
    let gp = {
      operation: { RemoveOracles: {} },
      keys: OraclesToRemove
    }
    let b = encodeGovernanceArgs(gp);
    let h = keccak256(b);
    console.log("BORSH: ", b.length, b);
    console.log("KECCAK: ", h.length, h, Buffer.from(h.substring(2), "hex"));
    let payload = Buffer.from(h.substring(2), "hex");
    const [proposalStorage, proposalStorageBumpSeed] =
      await web3.PublicKey.findProgramAddress(
        [payload, Buffer.from("proposal"), Buffer.from([0x00])],
        program.programId
      );
    payload = Buffer.from(payload, 32);
    console.log("Payload ", payload.toString('hex'));
    console.log("Proposal storage ", proposalStorage.toBase58());
    console.log("Application storage ", application_storage.toBase58());
    console.log("Stakeholder ", validStakeholders[0].publicKey.toBase58());

    await Promise.all(validStakeholders.map(async (stakeholder) => {
      console.log("submit proposal from ", stakeholder.publicKey.toBase58());
      let tx = await program.rpc.submitProposal(0x00, payload, stakeholder.publicKey.toBuffer(), Buffer.from("77777777777777777777777777777777"), {
        accounts: {
          payer: stakeholder.publicKey,
          proposalStorage: proposalStorage,
          application: application_storage,
          systemProgram: web3.SystemProgram.programId,
        },
        signers: [stakeholder],
      });
      console.log("Tx: ", tx);
    }));

    console.log("try to execute governance");
    await program.rpc.removeOracles(OraclesToRemove, {
      accounts: {
        payer: validStakeholders[2].publicKey,
        proposalStorage: proposalStorage,
        application: application_storage,
        systemProgram: web3.SystemProgram.programId,
      },
      signers: [validStakeholders[2]],
    });

  });

});

async function getStorage(
  provider: Provider,
  program: Program,
  storageReference: web3.PublicKey
) {
  const storageReferenceValue = await program.account.storageReference.fetch(
    storageReference
  );
  const storage = storageReferenceValue.storage;

  const storageAccountInfo = await provider.connection.getAccountInfo(storage);

  if (storageAccountInfo !== null) {
    const data = storageAccountInfo.data;

    expect(data.length).to.be.gt(0);

    const header = data[0];
    const payload = data.slice(1);
    if (header === 0) {
      return null;
    } else {
      return payload;
    }
  }

  return null;
}
