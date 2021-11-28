//@ts-ignore
import Web3 from 'web3';
// This is a simple NodeJS app to display triggered events on a smart contract
// you need your contract ABI and deployed address and also a synced geth running
// github.com/shayanb
import abi from "./abi.json";
//var optionsABI = []
var contractAddress = "0x2b3e5DCB075fD319cF54ee51A4076C4dE263C564"

//@ts-ignore
var web3;

if (typeof web3 !== 'undefined') {
    web3 = new Web3(web3.currentProvider);
} else {
    // set the provider you want from Web3.providers
    web3 = new Web3(new Web3.providers.HttpProvider("wss://wsapi.fantom.network/"));
}

console.log("Eth Node Version: ", web3.version.node);
//console.log("Network: " ,web3.version.network, web3.version.ethereum);
console.log("Connected: ", web3.isConnected(), web3.currentProvider);
console.log("syncing: ", web3.eth.syncing, ", Latest Block: ", web3.eth.blockNumber);
console.log("Accounts[0]: ", web3.eth.accounts[0], ":", web3.eth.getBalance(web3.eth.accounts[0]).toNumber())

let OptionsContract = initContract(abi, contractAddress)



function initContract(contractAbi, contractAddress) {
    var MyContract = web3.eth.contract(contractAbi);
    var contractInstance = MyContract.at(contractAddress);
    var event = contractInstance.allEvents()
    console.log("listening for events on ", contractAddress)
    // watch for changes
    event.watch(function (error, result) { //This is where events can trigger changes in UI
        if (!error)
            console.log(result);
    });
    return contractInstance
}