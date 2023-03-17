import FlightSuretyApp from '../../build/contracts/FlightSuretyApp.json';
import FlightSuretyData from '../../build/contracts/FlightSuretyData.json';
import Config from './config.json';
import Web3 from 'web3';
import express from 'express';
import "babel-polyfill";

let config = Config['localhost'];
let web3 = new Web3(new Web3.providers.WebsocketProvider(config.url.replace('http', 'ws')));
web3.eth.defaultAccount = web3.eth.accounts[0];

let flightSuretyApp = new web3.eth.Contract(FlightSuretyApp.abi, config.appAddress);
// let flightSuretyData = new web3.eth.Contract(FlightSuretyData.abi, config.dataAddress);

// uint8 private constant STATUS_CODE_UNKNOWN = 0;
// uint8 private constant STATUS_CODE_ON_TIME = 10;
// uint8 private constant STATUS_CODE_LATE_AIRLINE = 20;
// uint8 private constant STATUS_CODE_LATE_WEATHER = 30;
// uint8 private constant STATUS_CODE_LATE_TECHNICAL = 40;
// uint8 private constant STATUS_CODE_LATE_OTHER = 50;

const statusCodes = [0, 10, 20, 30, 40, 50];

let oracles = [];
let accounts = [];
let owner = null;

const registerOracles = async () => {
  oracles.forEach( oracle => {
    registerOracle(oracle);
  }); 

};

const registerOracle = async (oracle) => {
  await flightSuretyApp.methods.registerOracle().send({
    from: oracle.address,
    value: web3.utils.toWei("1", 'ether'),
    gas: 4712388,
  }, async (err, result) => {

      let indices = await flightSuretyApp.methods
      .getMyIndexes()
      .call({"from": oracle.address, "gas": 4712388});

      oracle.indices = indices;
      console.log('Oracle address:', oracle.address, 'indices:', oracle.indices);
  });
};

web3.eth.getAccounts((error, acct) => {
  accounts = acct;
  owner = acct[0];

  for (let i = 10; i < 30; i++) {
    let oracle = {
      address: accounts[i],
    };
    oracles.push(oracle);
  }
  
  registerOracles();
});

function getRandomStatusCode() {
  const random = Math.floor(Math.random() * statusCodes.length);
  console.log(random, statusCodes[random]);
  return statusCodes[random];
}

flightSuretyApp.events.OracleRequest({fromBlock: 'latest'}, 
  function (error, event) { 
    let index = event.returnValues.index;
    let airline = event.returnValues.airline;
    let flight = event.returnValues.flight;
    let timestamp = event.returnValues.timestamp;

    console.log(`>>>> index: ${index}, airline: ${airline}, flight: ${flight}, timestamp: ${timestamp},`);

    oracles.forEach( oracle => {
      console.log(`>>>> index: ${oracle.indices}`);
      if (oracle.indices.includes(index)) {
        flightSuretyApp.methods
          .submitOracleResponse(index, airline, flight, timestamp, getRandomStatusCode())
          .send({from: oracle.address, "gas": 4712388}, (error, result) => {    
            if (error) {
              console.log(`Error::submitOracleResponse - ${error}`);
            } else {
              console.log(`Result::submitOracleResponse - ${result}`);
            }
        });
      }
    });
});

// flightSuretyApp.events.allEvents({fromBlock: 'latest'}, 
//   function (error, event) {
//     if (error) console.log(`Error: ${error}`);
//     else console.log(event);
//   });

// flightSuretyData.events.allEvents({fromBlock: 'latest'}, 
//   function (error, event) {
//     if (error) console.log(`Error: ${error}`);
//     else console.log(event);
//   });

const app = express();
app.get('/api', (req, res) => {
    res.send({
      message: 'An API for use with your Dapp!'
    })
});

export default app;


