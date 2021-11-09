import * as anchor from "@project-serum/anchor";
import { Program, Provider, web3 } from "@project-serum/anchor";
import { expect } from "chai";
import * as borsh from "borsh";
import { hex } from "@project-serum/anchor/dist/cjs/utils/bytes";

describe("Application", () => {
  const provider = anchor.Provider.env();

  // Configure the client to use the local cluster.
  anchor.setProvider(provider);

  it("Is initialized!", async () => {
    const program = anchor.workspace.SplTokenGen as Program;
    const application_id = Buffer.from("application_1234");

    const payer = web3.Keypair.generate();

    const airtx = await provider.connection.requestAirdrop(
      payer.publicKey,
      web3.LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(airtx);

    const [initialStorage, initialStorageBumpSeed] =
      await web3.PublicKey.findProgramAddress(
        [Buffer.from("init"), payer.publicKey.toBuffer()],
        program.programId
      );

    console.log("init_storage ", initialStorage.toBase58())
    // const [initialStorage, initialStorageBumpSeed] =
    //   await web3.PublicKey.findProgramAddress(
    //     [Buffer.from("init"), storageReference.toBuffer()],
    //     program.programId
    //   );
    let stakeholders = [];
    for (let i = 0; i < 10; i++) {
      const stakeholder = web3.Keypair.generate();
      stakeholders.push(stakeholder.publicKey)
    }

    let oracles = [];
    for (let i = 0; i < 15; i++) {
      const oracle = web3.Keypair.generate();
      oracles.push(oracle.publicKey)
    }
    await program.rpc.init(application_id, stakeholders, oracles, initialStorageBumpSeed, {
      accounts: {
        payer: payer.publicKey,
        initialStorage: initialStorage,
        systemProgram: web3.SystemProgram.programId,
      },
      signers: [payer],
    });

    // const data = await getStorage(provider, program, storageReference);
    // expect(data).to.be.eq(null);

    // const [nextStorage, nextStorageBumpSeed] =
    //   await web3.PublicKey.findProgramAddress(
    //     [Buffer.from("next"), initialStorage.toBuffer()],
    //     program.programId
    //   );
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
