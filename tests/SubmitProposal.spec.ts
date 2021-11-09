import * as anchor from "@project-serum/anchor";
import { Program, Provider, web3 } from "@project-serum/anchor";
import { expect } from "chai";
import * as borsh from "borsh";

describe("SplTokenGen", () => {
  const provider = anchor.Provider.env();

  // Configure the client to use the local cluster.
  anchor.setProvider(provider);

  it("SubmitProposal!", async () => {
    const program = anchor.workspace.SplTokenGen as Program;

    const payer = web3.Keypair.generate();

    const airtx = await provider.connection.requestAirdrop(
      payer.publicKey,
      web3.LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(airtx);

    const payload = Buffer.from("31111111111111111111111111111111");

    const [proposalStorage, proposalStorageBumpSeed] =
      await web3.PublicKey.findProgramAddress(
        [payload, Buffer.from("proposal")],
        program.programId
      );

    console.log("Karamba!!!!", program.idl.types);


    const args = [
      {
        oracle: Buffer.from("22222222222222222222222222222222"),
        sign: Buffer.from("53333333333333333333333333333333")
      },
      {
        oracle: Buffer.from("66666666666666666666666666666666"),
        sign: Buffer.from("77777777777777777777777777777777")
      },
    ]

    await args.forEach(async arg => {
      program.rpc.submitProposal(payload, arg.oracle, arg.sign, {
        accounts: {
          payer: payer.publicKey,
          proposalStorage: proposalStorage,
          systemProgram: web3.SystemProgram.programId,
        },
        signers: [payer],
      });

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
