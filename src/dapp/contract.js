import FlightSuretyApp from "../../build/contracts/FlightSuretyApp.json" assert { type: "json" };
import Config from "./config.json" assert { type: "json" };

export default class Contract {
    constructor(network, callback) {
        let config = Config[network];
        console.log("hi 1");
        this.web3 = new Web3(new Web3.providers.HttpProvider(config.url));
        console.log("hi 2");
        this.flightSuretyApp = new this.web3.eth.Contract(
            FlightSuretyApp.abi,
            config.appAddress
        );
        this.owner = null;
        this.airlines = [];
        this.passengers = [];
        callback();
    }

    isOperational(callback) {
        let self = this;
        self.flightSuretyApp.methods
            .isOperational()
            .call({ from: self.owner }, callback);
    }

    fetchFlightStatus(flight, callback) {
        let self = this;
        let payload = {
            airline: self.airlines[0],
            flight: flight,
            timestamp: Math.floor(Date.now() / 1000),
        };
        self.flightSuretyApp.methods
            .fetchFlightStatus(
                payload.airline,
                payload.flight,
                payload.timestamp
            )
            .send({ from: self.owner }, (error, result) => {
                callback(error, payload);
            });
    }
}
