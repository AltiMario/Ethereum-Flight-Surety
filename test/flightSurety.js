var Test = require("../config/testConfig.js");
var BigNumber = require("bignumber.js");

contract("Flight Surety Tests", async (accounts) => {
    var config;
    before("setup contract", async () => {
        config = await Test.Config(accounts);
        await config.flightSuretyData.authoriseContract(config.flightSuretyApp.address);
    });

    /****************************************************************************************/
    /* Operations and Settings                                                              */
    /****************************************************************************************/

    it(`has correct initial isOperational() value`, async function () {
        // Get operating status
        let status = await config.flightSuretyData.isOperational.call();
        assert.equal(status, true, "Incorrect initial operating status value");
    });

    it("if app contract is authorized", async function () {
      let newAirline = accounts[1];
      let status = await config.flightSuretyData.isAuthorised.call(newAirline);
      assert.equal(status, false, "AppContract not authorized");
    });
 
    it(`set operation false has correct isOperational() value`, async function () {
      await config.flightSuretyData.setOperatingStatus(false, { from: config.owner });
      let status = await config.flightSuretyData.isOperational.call();
      assert.equal(status, false, "Incorrect operating status value");
    });

    it(`can block access to setOperatingStatus() for non-Contract Owner account`, async function () {
        // Ensure that access is denied for non-Contract Owner account
        let accessDenied = false;
        try {
            await config.flightSuretyData.setOperatingStatus(false, {
                from: config.testAddresses[2],
            });
        } catch (e) {
            accessDenied = true;
        }
        assert.equal(
            accessDenied,
            true,
            "Access not restricted to Contract Owner"
        );
    });

    it(`allow access to setOperatingStatus() for Contract Owner account`, async function () {
        // Ensure that access is allowed for Contract Owner account
        let accessDenied = false;
        try {
            await config.flightSuretyData.setOperatingStatus(false);
        } catch (e) {
            accessDenied = true;
        }
        assert.equal(accessDenied,false,"Access not restricted to Contract Owner");
    });

    it(`can block access to functions using requireIsOperational when operating status is false`, async function () {
        await config.flightSuretyData.setOperatingStatus(false);

        let reverted = false;
        try {
            await config.flightSuretyData.pay();
        } catch (e) {
            reverted = true;
        }
        assert.equal(reverted,true,"Access not blocked for requireIsOperational");

        // Set it back for other tests to work
        await config.flightSuretyData.setOperatingStatus(true);
    });

    it("(airline) cannot register an Airline using registerAirline() if it is not funded", async () => {
        let newAirline = accounts[1];

        try {
            await config.flightSuretyApp.registerAirline(newAirline, {
                from: config.firstAirline,
            });
        } catch (e) {}
        let result = await config.flightSuretyData.isParticipantAirline.call(
            newAirline
        );

        assert.equal(result,false,"Airline should not be able to register another airline if it hasn't provided funding");
    });
});
