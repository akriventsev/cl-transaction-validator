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

  var application_storage: anchor.web3.PublicKey;

  var validStakeholders: anchor.web3.Keypair[] = [];
  var validOracles: anchor.web3.Keypair[] = [];

  for (let i = 0; i < 4; i++) {
    const stakeholder = web3.Keypair.generate();
    validStakeholders.push(stakeholder)
    console.log("STAKEHOLDER ", stakeholder.secretKey);
  }

  for (let i = 0; i < 4; i++) {
    const oracle = web3.Keypair.generate();
    validOracles.push(oracle)
    console.log("ORACLE ", oracle.secretKey);
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

    let st = await program.account.applicationInfo.fetch(initialStorage);
    if (st.stakeHolders.length != 4) {
      assert("Invalid stakeHolders count");
    }
    if (st.oracles.length != 4) {
      assert("Invalid oracles count");
    }
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
    let payload = Buffer.from(h.substring(2), "hex");
    const [proposalStorage, proposalStorageBumpSeed] =
      await web3.PublicKey.findProgramAddress(
        [payload, Buffer.from("proposal"), Buffer.from([0x00])],
        program.programId
      );

    await program.rpc.initProposal(proposalStorageBumpSeed, 0x00, payload, {
      accounts: {
        payer: validStakeholders[0].publicKey,
        proposalStorage: proposalStorage,
        application: application_storage,
        systemProgram: web3.SystemProgram.programId,
      },
      signers: [validStakeholders[0]],
    });
    await Promise.all(validStakeholders.map(async (stakeholder) => {
      let tx = await program.rpc.submitProposal(proposalStorageBumpSeed, 0x00, payload, {
        accounts: {
          payer: stakeholder.publicKey,
          proposalStorage: proposalStorage,
          application: application_storage,
          systemProgram: web3.SystemProgram.programId,
        },
        signers: [stakeholder],
      });
    }));


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
    let st = await program.account.applicationInfo.fetch(application_storage);
    if (st.oracles.length != 5) {
      assert("Invalid oracles count");
    }
  });

  it("Remove oracle by valid stakeholders", async () => {

    let OraclesToRemove: web3.PublicKey[] = [validOracles[0].publicKey];
    let gp = {
      operation: { RemoveOracles: {} },
      keys: OraclesToRemove
    }
    let b = encodeGovernanceArgs(gp);
    let h = keccak256(b);
    let payload = Buffer.from(h.substring(2), "hex");
    const [proposalStorage, proposalStorageBumpSeed] =
      await web3.PublicKey.findProgramAddress(
        [payload, Buffer.from("proposal"), Buffer.from([0x00])],
        program.programId
      );

    await program.rpc.initProposal(proposalStorageBumpSeed, 0x00, payload, {
      accounts: {
        payer: validStakeholders[0].publicKey,
        proposalStorage: proposalStorage,
        application: application_storage,
        systemProgram: web3.SystemProgram.programId,
      },
      signers: [validStakeholders[0]],
    });
    await Promise.all(validStakeholders.map(async (stakeholder) => {
      let tx = await program.rpc.submitProposal(proposalStorageBumpSeed, 0x00, payload, {
        accounts: {
          payer: stakeholder.publicKey,
          proposalStorage: proposalStorage,
          application: application_storage,
          systemProgram: web3.SystemProgram.programId,
        },
        signers: [stakeholder],
      });
    }));
    console.log("PROPOSAL STORAGE: ", proposalStorage.toBase58());
    console.log("PROPOSAL INFO: ", program.account.proposalInfo);
    let pst = program.account.proposalInfo.fetch(proposalStorage);
    // @ts-ignore
    if (!pst.confirmed) {
      assert("not confirmed");
    }

    await program.rpc.removeOracles(OraclesToRemove, {
      accounts: {
        payer: validStakeholders[2].publicKey,
        proposalStorage: proposalStorage,
        application: application_storage,
        systemProgram: web3.SystemProgram.programId,
      },
      signers: [validStakeholders[2]],
    });

    let st = await program.account.applicationInfo.fetch(application_storage);
    if (st.oracles.length != 4) {
      assert("Invalid oracles count");
    }
    validOracles.forEach((element, index) => {
      if (index == 0) validOracles.splice(index, 1);
    });
  });

  it("Add stakeholder by valid stakeholders", async () => {

    let newStakeholder = web3.Keypair.generate();
    let newStakeholders: web3.PublicKey[] = [newStakeholder.publicKey];

    var transaction = new web3.Transaction();

    transaction.add(
      web3.SystemProgram.transfer({
        fromPubkey: payer.publicKey,
        toPubkey: newStakeholder.publicKey,
        lamports: web3.LAMPORTS_PER_SOL / 10, // number of SOL to send
      }),
    );

    // Sign transaction, broadcast, and confirm
    var signature = await web3.sendAndConfirmTransaction(provider.connection, transaction, [
      payer,
    ]);

    let gp = {
      operation: { AddStakeholders: {} },
      keys: newStakeholders
    }
    let b = encodeGovernanceArgs(gp);
    let h = keccak256(b);
    let payload = Buffer.from(h.substring(2), "hex");
    const [proposalStorage, proposalStorageBumpSeed] =
      await web3.PublicKey.findProgramAddress(
        [payload, Buffer.from("proposal"), Buffer.from([0x00])],
        program.programId
      );

    await program.rpc.initProposal(proposalStorageBumpSeed, 0x00, payload, {
      accounts: {
        payer: validStakeholders[0].publicKey,
        proposalStorage: proposalStorage,
        application: application_storage,
        systemProgram: web3.SystemProgram.programId,
      },
      signers: [validStakeholders[0]],
    });

    await Promise.all(validStakeholders.map(async (stakeholder) => {
      let tx = await program.rpc.submitProposal(proposalStorageBumpSeed, 0x00, payload, {
        accounts: {
          payer: stakeholder.publicKey,
          proposalStorage: proposalStorage,
          application: application_storage,
          systemProgram: web3.SystemProgram.programId,
        },
        signers: [stakeholder],
      });
    }));


    await program.rpc.addStakeholders(newStakeholders, {
      accounts: {
        payer: validStakeholders[2].publicKey,
        proposalStorage: proposalStorage,
        application: application_storage,
        systemProgram: web3.SystemProgram.programId,
      },
      signers: [validStakeholders[2]],
    });

    validStakeholders.push(newStakeholder);
    let st = await program.account.applicationInfo.fetch(application_storage);

    if (st.stakeHolders.length != 5) {
      assert("Invalid stakeholders count");
    }

  });

  it("Remove stakeholder by valid stakeholders", async () => {

    let StakeHoldersToRemove: web3.PublicKey[] = [validOracles[0].publicKey];
    let gp = {
      operation: { RemoveStakeholders: {} },
      keys: StakeHoldersToRemove
    }
    let b = encodeGovernanceArgs(gp);
    let h = keccak256(b);
    let payload = Buffer.from(h.substring(2), "hex");
    const [proposalStorage, proposalStorageBumpSeed] =
      await web3.PublicKey.findProgramAddress(
        [payload, Buffer.from("proposal"), Buffer.from([0x00])],
        program.programId
      );
    await program.rpc.initProposal(proposalStorageBumpSeed, 0x00, payload, {
      accounts: {
        payer: validStakeholders[0].publicKey,
        proposalStorage: proposalStorage,
        application: application_storage,
        systemProgram: web3.SystemProgram.programId,
      },
      signers: [validStakeholders[0]],
    });
    await Promise.all(validStakeholders.map(async (stakeholder) => {
      let tx = await program.rpc.submitProposal(proposalStorageBumpSeed, 0x00, payload, {
        accounts: {
          payer: stakeholder.publicKey,
          proposalStorage: proposalStorage,
          application: application_storage,
          systemProgram: web3.SystemProgram.programId,
        },
        signers: [stakeholder],
      });
    }));

    await program.rpc.removeStakeholders(StakeHoldersToRemove, {
      accounts: {
        payer: validStakeholders[2].publicKey,
        proposalStorage: proposalStorage,
        application: application_storage,
        systemProgram: web3.SystemProgram.programId,
      },
      signers: [validStakeholders[2]],
    });
    let st = await program.account.applicationInfo.fetch(application_storage);

    if (st.stakeHolders.length != 4) {
      assert("Invalid stakeholders count");
    }
    validStakeholders.forEach((element, index) => {
      if (index == 0) validStakeholders.splice(index, 1);
    });

  });

  it("Submit proposal by invalid stakeholder", async () => {
    let fakeStakeholder = web3.Keypair.generate();

    var transaction = new web3.Transaction();

    transaction.add(
      web3.SystemProgram.transfer({
        fromPubkey: payer.publicKey,
        toPubkey: fakeStakeholder.publicKey,
        lamports: web3.LAMPORTS_PER_SOL / 10, // number of SOL to send
      }),
    );

    // Sign transaction, broadcast, and confirm
    var signature = await web3.sendAndConfirmTransaction(provider.connection, transaction, [
      payer,
    ]);

    let OraclesToRemove: web3.PublicKey[] = [validOracles[0].publicKey];
    let gp = {
      operation: { RemoveOracles: {} },
      keys: OraclesToRemove
    }
    let b = encodeGovernanceArgs(gp);
    let h = keccak256(b);
    let payload = Buffer.from(h.substring(2), "hex");
    const [proposalStorage, proposalStorageBumpSeed] =
      await web3.PublicKey.findProgramAddress(
        [payload, Buffer.from("proposal"), Buffer.from([0x00])],
        program.programId
      );
    // @ts-ignore
    console.old_log = console.log;
    console.log = function () { };
    try {

      await program.rpc.initProposal(proposalStorageBumpSeed, 0x00, payload, {
        accounts: {
          payer: validStakeholders[0].publicKey,
          proposalStorage: proposalStorage,
          application: application_storage,
          systemProgram: web3.SystemProgram.programId,
        },
        signers: [validStakeholders[0]],
      });
      console.log('Populating dropdown with cities'); // prints nothing
      let tx = await program.rpc.submitProposal(0x00, payload, {
        accounts: {
          payer: fakeStakeholder.publicKey,
          proposalStorage: proposalStorage,
          application: application_storage,
          systemProgram: web3.SystemProgram.programId,
        },
        signers: [fakeStakeholder],
      });

      if (tx != "") {
        assert();
      }
    } catch (error) {
      // @ts-ignore
      console.log = console.old_log;
      // @ts-ignore
      let msg: string = error.toString();
      if (msg != "Operation forbidden")
        assert(msg, "Operation forbidden");
    }
    // @ts-ignore
    console.log = console.old_log;
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
