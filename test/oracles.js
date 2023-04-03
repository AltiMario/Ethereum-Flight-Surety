var Test = require("../config/testConfig.js");

contract("Oracles", async (accounts) => {
    const TEST_ORACLES_COUNT = 25;
    var config;
    const STATUS_CODE_ON_TIME = 10;

    before("setup contract", async () => {
        config = await Test.Config(accounts);
    });

    it("can register oracles", async () => {
        // ARRANGE
        let fee = await config.flightSuretyApp.REGISTRATION_FEE.call();

        // ACT
        for (let a = 0; a < TEST_ORACLES_COUNT; a++) {
            await config.flightSuretyApp.registerOracle({
                from: accounts[a],
                value: fee,
            });
            let result = await config.flightSuretyApp.getMyIndexes.call({
                from: accounts[a],
            });
            console.log(`Oracle #${a} : ${result[0]}, ${result[1]}, ${result[2]} | \n `);
        }
    });

    it("can request flight status", async () => {
        // ARRANGE
        let flight = "ND1309"; // Course number
        let timestamp = Math.floor(Date.now() / 1000);

        await config.flightSuretyData.fund({ value: 10 ** 19 });

        // Register flight
        await config.flightSuretyApp.registerFlight(accounts[0], flight, timestamp);

        // Submit a request for oracles to get status information for a flight
        await config.flightSuretyApp.fetchFlightStatus(accounts[0], flight, timestamp);

        // Since the Index assigned to each test account is opaque by design
        // loop through all the accounts and for each account, all its Indexes (indices?)
        // and submit a response. The contract will reject a submission if it was
        // not requested so while sub-optimal, it's a good test of that feature
        for (let a = 0; a < TEST_ORACLES_COUNT; a++) {
            // Get oracle information
            let oracleIndexes = await config.flightSuretyApp.getMyIndexes.call({
                from: accounts[a],
            });
            for (let idx = 0; idx < 3; idx++) {
                // Submit a response...it will only be accepted if there is an Index match
                try {                
                    await config.flightSuretyApp
                        .submitOracleResponse(
                            oracleIndexes[idx], 
                            config.firstAirline, 
                            flight, 
                            timestamp, 
                            STATUS_CODE_ON_TIME, 
                            { from: accounts[a] });
                     }
                        catch(e) {
                            // Enable this when debugging
                            //console.log(` \n `);
                            //console.log(`Cycle #${a} : ${accounts[a]}, ${idx}`);
                            console.log(res["reason"]);
                            console.log('\nError', idx, oracleIndexes[idx].toNumber(), flight, timestamp);
                    }
            
            }
        }
    });
});
