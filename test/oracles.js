var Test = require("../config/testConfig.js");

contract("Oracles", async (accounts) => {
    const TEST_ORACLES_COUNT = 20;
    var config;
    const STATUS_CODE_ON_TIME = 10;

    before("setup contract", async () => {
        config = await Test.Config(accounts);
    });

    it("can register oracles", async () => {
        // ARRANGE
        let fee = await config.flightSuretyApp.REGISTRATION_FEE.call();

        // ACT
        for (let a = 1; a < TEST_ORACLES_COUNT; a++) {
            await config.flightSuretyApp.registerOracle({
                from: accounts[a],
                value: fee,
            });
            let result = await config.flightSuretyApp.getMyIndexes.call({
                from: accounts[a],
            });
            console.log(
                `Oracle : ${result[0]}, ${result[1]}, ${result[2]}`
            );
        }
    });

    it("can request flight status", async () => {
        // ARRANGE
        let flight = "ND1309"; // Course number
        let timestamp = Math.floor(Date.now() / 1000);

        await config.flightSuretyData.fund({ value: 10 ** 19 });

        // Register flight
        await config.flightSuretyApp.registerFlight(accounts[0],flight,timestamp);

        // Submit a request for oracles to get status information for a flight
        await config.flightSuretyApp.fetchFlightStatus(accounts[0],flight,timestamp);

        // Since the Index assigned to each test account is opaque by design
        // loop through all the accounts and for each account, all its Indexes (indices?)
        // and submit a response. The contract will reject a submission if it was
        // not requested so while sub-optimal, it's a good test of that feature
        for(let a=1; a<TEST_ORACLES_COUNT; a++) {
            // Get oracle information
            let oracleIndexes = await config.flightSuretyApp.getMyIndexes.call({
                from: accounts[a],
            });
            for(let idx=0;idx<3;idx++) {
                // Submit a response...it will only be accepted if there is an Index match
                config.flightSuretyApp
                    .submitOracleResponse(
                        config.firstAirline,
                        flight,
                        timestamp,
                        STATUS_CODE_ON_TIME,
                        { from: accounts[a] }
                    )
                    .catch((res) => {
                        console.log(res["reason"]);
                    });
            }
        }
    });
});
