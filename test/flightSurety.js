
var Test = require('../config/testConfig.js');
var BigNumber = require('bignumber.js');
const truffleAssert = require('truffle-assertions');

contract('Flight Surety Tests', async (accounts) => {

  var config;
  before('setup contract', async () => {
    config = await Test.Config(accounts);
    await config.flightSuretyData.authorizeContract(config.flightSuretyApp.address);
  });

  /****************************************************************************************/
  /* Operations and Settings                                                              */
  /****************************************************************************************/

  it(`has correct initial isOperational() value`, async function () {

    // Get operating status
    let status = await config.flightSuretyData.isOperational.call();
    assert.equal(status, true, "Incorrect initial operating status value");

  });

  it(`if app contract is authorized`, async function () {

    let status = await config.flightSuretyData.isContractAuthorized.call(config.flightSuretyApp.address);
    assert.equal(status, true, "AppContract not authorized");

  });

  it(`if random address is not authorized`, async function () {

    let status = await config.flightSuretyData.isContractAuthorized.call(config.testAddresses[7]);
    assert.equal(status, false, "Incorrect initial operating status value");

  });


  it(`set operation false has correct isOperational() value`, async function () {

    await config.flightSuretyData.setOperatingStatus(false, { from: config.owner });
    let status = await config.flightSuretyData.isOperational.call();
    assert.equal(status, false, "Incorrect operating status value");

  });

  it(`block access to setOperatingStatus() for non-Contract Owner account`, async function () {

      // Ensure that access is denied for non-Contract Owner account
      let accessDenied = false;
      try 
      {
          await config.flightSuretyData.setOperatingStatus(false, { from: config.testAddresses[2] });
      }
      catch(e) {
          accessDenied = true;
      }
      assert.equal(accessDenied, true, "Access not restricted to Contract Owner");
            
  });

  it(`allow access to setOperatingStatus() for Contract Owner account`, async function () {

      // Ensure that access is allowed for Contract Owner account
      let accessDenied = false;
      try 
      {
          await config.flightSuretyData.setOperatingStatus(false);
      }
      catch(e) {
          accessDenied = true;
      }
      assert.equal(accessDenied, false, "Access not restricted to Contract Owner");
      
  });

  it(`can block access to functions using requireIsOperational when operating status is false`, async function () {

      await config.flightSuretyData.setOperatingStatus(false);

      let reverted = false;
      try 
      {
          await config.flightSurety.setTestingMode(true);
      }
      catch(e) {
          reverted = true;
      }
      assert.equal(reverted, true, "Access not blocked for requireIsOperational");      

      // Set it back for other tests to work
      await config.flightSuretyData.setOperatingStatus(true);

  });

  it(`can register a Flight`, async function () {
 
    let result = await config.flightSuretyApp.registerFlight("GOL123", { from: config.firstAirline });
    truffleAssert.eventEmitted(result, 'FlightRegistered', { flightCode: "GOL123"});

  });

  it(`can register an Airline`, async function () {
 
    let result = await config.flightSuretyApp.registerAirline(config.secondAirline, { from: config.firstAirline });
    truffleAssert.eventEmitted(result, 'AirlineRegistered', { account: config.secondAirline});

  });

  it(`test Multiparty Consensus for 5th Airline`, async function () {
    await config.flightSuretyApp.registerAirline(config.thirdAirline, { from: config.firstAirline });
    await config.flightSuretyApp.registerAirline(config.fourthAirline, { from: config.firstAirline });
    await config.flightSuretyApp.registerAirline(config.fifthAirline, { from: config.firstAirline });

    let status = await config.flightSuretyApp.getAirlineStatus.call(config.secondAirline);
    assert.equal("Registered", status, "Wrong status");

    status = await config.flightSuretyApp.getAirlineStatus.call(config.thirdAirline);
    assert.equal("Registered", status, "Wrong status");

    status = await config.flightSuretyApp.getAirlineStatus.call(config.fourthAirline);
    assert.equal("Registered", status, "Wrong status");

    // after 4th airline the following airline is candidate only
    status = await config.flightSuretyApp.getAirlineStatus.call(config.fifthAirline);
    assert.equal("Candidate", status, "Status should be Candidate");


    // getting votes from 50% of airlines the airline is registered
    await config.flightSuretyApp.voteToAirline(config.fifthAirline, { from: config.firstAirline });
    await config.flightSuretyApp.voteToAirline(config.fifthAirline, { from: config.secondAirline });

    status = await config.flightSuretyApp.getAirlineStatus.call(config.fifthAirline);
    assert.equal("Registered", status, "Status should be Registered");

    // this demonstrates the multiparty consensus item 
  });

  it(`test only after submitting fund an Airline is Participant in the contract`, async function () {

    let status = await config.flightSuretyApp.getAirlineStatus.call(config.secondAirline);
    assert.equal("Registered", status, "Wrong status");

    let revert = false;
    let errorMessage = "";

    try {
      await config.flightSuretyApp.registerFlight("JJ5066", { from: config.secondAirline });
    } catch(e) {
      revert = true
      errorMessage = e.message;
    }

      assert.equal(true, revert, "Should have reverted");
      assert.equal(errorMessage.includes("Airline is not participant"), true, "Wrong message");

      let fee = await config.flightSuretyApp.AIRLINE_REGISTRATION_FEE.call();

      await config.flightSuretyApp.fund({ from: config.secondAirline, value: fee });
      
      status = await config.flightSuretyApp.getAirlineStatus.call(config.secondAirline);
      assert.equal("Participant", status, "Wrong status");

      let result = await config.flightSuretyApp.registerFlight("JJ5066", { from: config.secondAirline });
      truffleAssert.eventEmitted(result, 'FlightRegistered', { flightCode: "JJ5066"});

      // this demonstrates Airline Ante item

  });

});
