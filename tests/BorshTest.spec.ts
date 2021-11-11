// @ts-ignore
import { web3 } from "@project-serum/anchor";
import { encodeGovernanceArgs } from './utils/structs';
import { keccak256 } from "@ethersproject/keccak256";




describe("Application", () => {

    it("Is initialized!", async () => {
        let oracles = [];
        for (let i = 0; i < 3; i++) {
            const oracle = web3.Keypair.generate();
            oracles.push(oracle.publicKey)
        }

        let gp = {
            operation: { AddOracles: {} },
            keys: oracles
        };

        let b = encodeGovernanceArgs(gp);
        let h = keccak256(b);
        console.log("BORSH: ", b.length, b);
        console.log("KECCAK: ", h.length, h, Buffer.from(h.substring(2), "hex"));
    });


});