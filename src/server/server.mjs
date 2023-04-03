import FlightSuretyAppArtifact from "../../build/contracts/FlightSuretyApp.json" assert { type: "json" };
import Web3 from "web3";

// CONST
let N_ORACLES = 25;

// Flight status codees
const STATUS_CODE_UNKNOWN = 0;
const STATUS_CODE_ON_TIME = 10;
const STATUS_CODE_LATE_AIRLINE = 20;
const STATUS_CODE_LATE_WEATHER = 30;
const STATUS_CODE_LATE_TECHNICAL = 40;
const STATUS_CODE_LATE_OTHER = 50;
let statuses = [STATUS_CODE_LATE_AIRLINE];

// Initialise Web3
let web3 = new Web3(
    new Web3.providers.WebsocketProvider("ws://localhost:7545")
);
let accounts = await web3.eth.getAccounts();
web3.eth.defaultAccount = accounts[0];

// Initialise Contract
const networkId = await web3.eth.net.getId();
const deployedNetworkApp = FlightSuretyAppArtifact.networks[networkId];
let flightSuretyApp = await new web3.eth.Contract(
    FlightSuretyAppArtifact.abi,
    deployedNetworkApp.address
);
let { submitOracleResponse, getMyIndexes, REGISTRATION_FEE, registerOracle } =
    flightSuretyApp.methods;

// Spin up 20+ Oracles
let fee = await REGISTRATION_FEE().call();
for (let a = 0; a < N_ORACLES; a++) {
    await registerOracle().send({
        from: accounts[a],
        value: fee,
    });
    let result = await getMyIndexes().call({
        from: accounts[a],
    });
    console.log(`Oracle ${a} : ${result[0]}, ${result[1]}, ${result[2]}`);
}

// Subscribe to OracleRequest event and respond with all oracles available
flightSuretyApp.events.OracleRequest(
    {
        fromBlock: await web3.eth.getBlockNumber(),
    },
    (err, event) => submitResponse(err, event)
);

async function submitResponse(error, event) {
    let { airline, flight, flightTimestamp, index } = event.returnValues;

    for (let a = 0; a < N_ORACLES; a++) {
        let indices = await getMyIndexes().call({
            from: accounts[a],
        });

        console.log(index, indices);
        if (indices.includes(index)) {
            console.log(
                "Matched oracle",
                airline,
                flight,
                flightTimestamp,
                index,
                indices
            );
            let choice = statuses.sample();
            console.log(`Choice ${choice}`);
            await submitOracleResponse(
                airline,
                flight,
                flightTimestamp,
                choice
            ).send({ from: accounts[a] });
        }
    }
}

// Get random item from array
Array.prototype.sample = function () {
    return this[Math.floor(Math.random() * this.length)];
};
