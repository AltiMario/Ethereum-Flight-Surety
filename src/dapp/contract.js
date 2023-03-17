import FlightSuretyApp from '../../build/contracts/FlightSuretyApp.json';
import FlightSuretyData from '../../build/contracts/FlightSuretyData.json';
import Config from './config.json';
import Web3 from 'web3';
import Web3Util from "web3-utils";

export default class Contract {
    constructor(network, callback) {

        let config = Config[network];
        this.web3 = new Web3(new Web3.providers.HttpProvider(config.url));

        this.flightSuretyApp = new this.web3.eth.Contract(FlightSuretyApp.abi, config.appAddress);
        this.flightSuretyData = new this.web3.eth.Contract(FlightSuretyData.abi, config.dataAddress);

        this.flightSuretyAppAddress = config.appAddress;
        this.flightSuretyDataAddress = config.dataAddress;

        this.initialize(callback);
        this.owner = null;
        this.airlines = [];
        this.passenger = null;
        this.firstAirline = null;
    }

    async initialize(callback) {
        await this.web3.eth.getAccounts((error, accts) => {
            this.owner = accts[0];
            
            this.firstAirline = accts[1]; 
            this.airlines.push(this.firstAirline);
            this.airlines.push(accts[2]);

            this.passenger = accts[3];

            callback();
        });
        
        let self = this;

        let result = await self.flightSuretyData.methods
                    .isContractAuthorized(self.flightSuretyAppAddress)
                    .call({ from: self.owner });
        
        console.log(`AppContract authorized: ${result}`);

        if (!result) {
            self.flightSuretyData.methods
                .authorizeContract(self.flightSuretyAppAddress)
                .send({ from: self.owner, "gas": 4712388 });
        }
                       
    }

    isOperational(callback) {
       let self = this;
       self.flightSuretyApp.methods
            .isOperational()
            .call({ from: self.owner}, callback);
    }

    async toggleOperatingStatus(operational, callback) {
        let self = this;

        await self.flightSuretyApp.methods
            .setOperatingStatus(operational)
            .send({ from: self.owner}, (error, result) => {
                if (error) {
                    callback(error);
                } else {
                    callback(result);
                }
            });
    }

    fetchFlightStatus(flight, airline, passenger, callback) {
        let self = this;
        let payload = {
            airline: airline,
            flight: flight,
            passenger: passenger,
            timestamp: Math.floor(Date.now() / 1000)
        } 
        self.flightSuretyApp.methods
            .fetchFlightStatus(payload.airline, payload.flight, payload.timestamp)
            .send({ from: passenger, "gas": 4712388, "gasPrice": 100000000000}, (error, result) => {
                callback(error, payload);
            });
    }

    registerFlight(flightCode, airline, callback) {
        let self = this;
        self.flightSuretyApp.methods
            .registerFlight(flightCode)
            .send({ from: airline, "gas": 4712388, "gasPrice": 100000000000 }, 
                (error, result) => {
                    callback(error);
                });
    }

    registerAirline(airline, callback) {
        let self = this;
        self.flightSuretyApp.methods
            .registerAirline(airline)
            .send({ from: self.firstAirline, "gas": 4712388, "gasPrice": 100000000000 }, 
                (error, result) => {
                    if (error)
                        callback(error);
                    else 
                        callback(result);
                });
    }

    fundAirline(airline, callback) {
        let self = this;
        let fee = Web3Util.toWei("10", "ether");

        self.flightSuretyApp.methods
            .fund()
            .send({ from: airline, value: fee }, 
                (error, result) => {
                    if (error)
                        callback(error);
                    else 
                        callback(result);
                });
    }

    async getAirlineStatus(airline, callback) {
        let self = this;

        var status = await self.flightSuretyApp.methods
            .getAirlineStatus(airline)
            .call();
        
        if (status) {
            callback(status);
        }
    }

    async getFlightStatus(flightCode, callback) {
        let self = this;

        var status = await self.flightSuretyApp.methods
            .getFlightStatus(flightCode)
            .call();
        
        if (status) {
            callback(status);
        }
    }

    async buyInsurance(flightCode, passengerAddress, amount, callback) {
        let self = this;
        let ether = Web3Util.toWei(amount.toString(), "ether");

        let result = await self.flightSuretyApp.methods
            .buy(flightCode)
            .send({ from: passengerAddress, value: ether, "gas": 4712388, "gasPrice": 100000000000});

            console.log(result);

    }
    
    async getPassengerBalance(callback) {
        let self = this;

        var result = await self.flightSuretyApp.methods
            .getPassengerBalance()
            .call({ from: self.passenger, "gas": 4712388, "gasPrice": 100000000000});
        
        if (result) {
            let premium = Web3Util.fromWei(result.toString(), "ether");
            console.log(`balance: ${premium} ether`);
            callback(`${premium}`);
        }
    }

    async getInsurance(callback) {
        let self = this;

        var result = await self.flightSuretyData.methods
            .getInsurance("FA1111")
            .call({ from: self.passenger, "gas": 4712388, "gasPrice": 100000000000});
        
        if (result) {
            console.log(result);
            callback(result);
        }
    }

    async withdraw(callback) {
        let self = this;

        self.flightSuretyApp.methods
            .withdraw()
            .send({ from: self.passenger, "gas": 4712388, "gasPrice": 100000000000 }, 
                (error, result) => {
                    if (error)
                        callback(error);
                    else 
                        callback(result);
                });
    }
   
}