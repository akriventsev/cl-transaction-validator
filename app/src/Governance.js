import './App.css';
import Async from "react-async"
import { Connection, PublicKey, clusterApiUrl } from '@solana/web3.js';
import {
    Program, Provider, web3
} from '@project-serum/anchor';
import idl from './proposal_validator.json';

import { getPhantomWallet } from '@solana/wallet-adapter-wallets';
import { useWallet } from '@solana/wallet-adapter-react';
require('@solana/wallet-adapter-react-ui/styles.css');


// const wallets = [
//     /* view list of available wallets at https://github.com/solana-labs/wallet-adapter#wallets */
//     getPhantomWallet()
// ]
const network = clusterApiUrl('devnet');

const opts = {
    preflightCommitment: "processed"
}
const programID = new PublicKey(idl.metadata.address);
const application_storage = new web3.PublicKey("A1hujPP5HvfU3uBrKfqMCp7ujeUzKQEr3a4ypeoP1aGL");

const StakeHoldersList = () => {
    const wallet = useWallet();

    async function getProvider() {
        /* create the provider and return it to the caller */
        /* network set to local network for now */
        const connection = new Connection(network, opts.preflightCommitment);

        const provider = new Provider(
            connection, wallet, opts.preflightCommitment,
        );
        return provider;
    }

    const fetchStakeHolders = async () => {
        const provider = await getProvider()
        /* create the program interface combining the idl, program ID, and provider */
        const program = new Program(idl, programID, provider);
        let pst = await program.account.applicationInfo.fetch(application_storage);
        console.log(pst);
        return pst;
    }
    return (
        <Async promiseFn={fetchStakeHolders}>
            {({ data, error, isPending }) => {
                if (isPending) return "Loading..."
                if (error) return `Something went wrong: ${error.message}`
                if (data)
                    var StakeHolders = [];
                data.stakeHolders.forEach(element => {
                    StakeHolders.push(<p key={element.toBase58()}>{element.toBase58()}</p>);
                });
                var Oracles = [];
                data.oracles.forEach(element => {
                    Oracles.push(<p key={element.toBase58()}>{element.toBase58()}</p>);
                });
                console.log(wallet);
                return (
                    <div>
                        <div><strong>StakeHolders:</strong>
                            {StakeHolders}</div>
                        <div><div>
                            <strong>Oracles:</strong>
                            {Oracles}
                        </div></div>
                    </div>

                )
            }}
        </Async>
    )
}



export default StakeHoldersList;