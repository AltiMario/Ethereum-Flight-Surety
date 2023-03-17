// SPDX-License-Identifier: MIT
pragma solidity ^0.8.6; 

// It's important to avoid vulnerabilities due to numeric overflow bugs
// OpenZeppelin's SafeMath library, when used correctly, protects agains such bugs
// More info: https://www.nccgroup.trust/us/about-us/newsroom-and-events/blog/2018/november/smart-contract-insecurity-bad-arithmetic/

import "../node_modules/@openzeppelin/contracts/utils/math/SafeMath.sol";

/************************************************** */
/* FlightSurety Smart Contract                      */
/************************************************** */
contract FlightSuretyApp {
    using SafeMath for uint256; // Allow SafeMath functions to be called for all uint256 types (similar to "prototype" in Javascript)

    /********************************************************************************************/
    /*                                       DATA VARIABLES                                     */
    /********************************************************************************************/

    address private contractOwner;          // Account used to deploy contract
    IDataContract dataContract;

 
    /********************************************************************************************/
    /*                                       FUNCTION MODIFIERS                                 */
    /********************************************************************************************/

    // Modifiers help avoid duplication of code. They are typically used to validate something
    // before a function is allowed to be executed.

    /**
    * @dev Modifier that requires the "operational" boolean variable to be "true"
    *      This is used on all state changing functions to pause the contract in 
    *      the event there is an issue that needs to be fixed
    */
    modifier requireIsOperational() 
    {
         // Modify to call data contract's status
        require(isOperational(), "Contract is currently not operational");  
        _;  // All modifiers require an "_" which indicates where the function body will be added
    }

    /**
    * @dev Modifier that requires the "ContractOwner" account to be the function caller
    */
    modifier requireContractOwner()
    {
        require(msg.sender == contractOwner, "Caller is not contract owner");
        _;
    }

    modifier onlyRegisteredFlights(bytes32 flightKey) {
        require(dataContract.isFlightRegistered(flightKey), "Flight is not registered");
        _;
    }

    /********************************************************************************************/
    /*                                       CONSTRUCTOR                                        */
    /********************************************************************************************/

    /**
    * @dev Contract constructor
    *
    */
    constructor(address dataContractAddr) public {
        contractOwner = msg.sender;
        dataContract = IDataContract(dataContractAddr);
    }

    /********************************************************************************************/
    /*                                       UTILITY FUNCTIONS                                  */
    /********************************************************************************************/

    function isOperational() public view returns(bool) {
        return dataContract.isOperational();
    }

    /********************************************************************************************/
    /*                                     SMART CONTRACT FUNCTIONS                             */
    /********************************************************************************************/

  
   /**
    * @dev Add an airline to the registration queue
    *
    */   
    function registerAirline(address airline) external {
        dataContract.registerAirline(airline);
    }

   /**
    * @dev Register a future flight for insuring.
    *
    */  
    function registerFlight(address airline, string memory flight, uint256 flightTimestamp) external {
        dataContract.registerFlight(airline, flight, flightTimestamp); 
    }
    
   /**
    * @dev Called after oracle has updated flight status
    *
    */  
    function processFlightStatus (address airline, string memory flight, uint256 flightTimestamp, uint8 statusCode) internal {
        dataContract.processFlightStatus(airline, flight, flightTimestamp, statusCode);
    }


    // Generate a request for oracles to fetch flight information
    function fetchFlightStatus ( address airline, string memory flight, uint256 flightTimestamp ) external {
        bytes32 flightKey = getFlightKey(airline, flight, flightTimestamp);
        if (!oracleResponses[flightKey].initiated) {
            uint8 responseIndex = getRandomIndex(msg.sender);

            oracleResponses[flightKey].requester = msg.sender;
            oracleResponses[flightKey].isOpen = true;
            oracleResponses[flightKey].initiated = true;
            oracleResponses[flightKey].responseIndex = responseIndex;
        }
        emit OracleRequest(oracleResponses[flightKey].responseIndex, airline, flight, flightTimestamp);
    } 


// region ORACLE MANAGEMENT

    // Incremented to add pseudo-randomness at various points
    uint8 private nonce = 0;    

    // Fee to be paid when registering oracle
    uint256 public constant REGISTRATION_FEE = 1 ether;

    // Number of oracles that must respond for valid status
    uint256 private constant MIN_RESPONSES = 3;


    struct Oracle {
        bool isRegistered;
        uint8[3] indexes;        
    }

    // Track all registered oracles
    mapping(address => Oracle) private oracles;

    // Model for responses from oracles
    struct ResponseInfo {
        bool initiated;
        uint8 responseIndex;
        address requester;                              // Account that requested status
        bool isOpen;                                    // If open, oracle responses are accepted
        mapping(uint8 => address[]) responses;          // Mapping flightKey is the status code reported
                                                        // This lets us group responses and identify
                                                        // the response that majority of the oracles
    }

    // Track all oracle responses
    // Key = hash(index, flight, flightTimestamp)
    mapping(bytes32 => ResponseInfo) private oracleResponses;

    // Event fired each time an oracle submits a response
    event FlightStatusInfo(address airline, string flight, uint256 flightTimestamp, uint8 status);

    event OracleReport(address airline, string flight, uint256 flightTimestamp, uint8 status);

    // Event fired when flight status request is submitted
    // Oracles track this and if they have a matching index
    // they fetch data and submit a response
    event OracleRequest(uint8 index, address airline, string flight, uint256 flightTimestamp);

    event ResponseClosed(address airline, string flight, uint256 flightTimestamp);
    event OracleRegistered(address oracleAdress); 


    // Register an oracle with the contract
    function registerOracle ( ) external payable {
        // Require registration fee
        if (!oracles[msg.sender].isRegistered) {
            require(msg.value >= REGISTRATION_FEE, "Registration fee is required");

            uint8[3] memory indexes = generateIndexes(msg.sender);

            oracles[msg.sender] = Oracle({
                                            isRegistered: true,
                                            indexes: indexes
                                        });
        } else {
            emit OracleRegistered(msg.sender);
        }
    }

    function getMyIndexes ( ) view external returns(uint8[3] memory) {
        require(oracles[msg.sender].isRegistered, "Not registered as an oracle");
        return oracles[msg.sender].indexes;
    }

    // Called by oracle when a response is available to an outstanding request
    // For the response to be accepted, there must be a pending request that is open
    // and matches one of the three Indexes randomly assigned to the oracle at the
    // time of registration (i.e. uninvited oracles are not welcome)
    function submitOracleResponse ( address airline, string memory flight, uint256 flightTimestamp, uint8 statusCode ) external {
        bytes32 flightKey = getFlightKey(airline, flight, flightTimestamp);
        uint8 responseIndex = oracleResponses[flightKey].responseIndex;
        require(
            (oracles[msg.sender].indexes[0] == responseIndex) || (oracles[msg.sender].indexes[1] == responseIndex) || (oracles[msg.sender].indexes[2] == responseIndex), 
            "Index does not match oracle request"
        );

        if (oracleResponses[flightKey].isOpen) {

            oracleResponses[flightKey].responses[statusCode].push(msg.sender);

            // Information isn't considered verified until at least MIN_RESPONSES
            // oracles respond with the *** same *** information
            emit OracleReport(airline, flight, flightTimestamp, statusCode);
            if (oracleResponses[flightKey].responses[statusCode].length >= MIN_RESPONSES) {

                emit FlightStatusInfo(airline, flight, flightTimestamp, statusCode);

                oracleResponses[flightKey].isOpen = false;

                // Handle flight status as appropriate
                processFlightStatus(airline, flight, flightTimestamp, statusCode);
            }
        } else {
            emit ResponseClosed(airline, flight, flightTimestamp);
        }
    }


    function getFlightKey ( address airline, string memory flight, uint256 flightTimestamp ) pure internal returns(bytes32) {
        return keccak256(abi.encodePacked(airline, flight, flightTimestamp));
    }

    // Returns array of three non-duplicating integers from 0-9
    function generateIndexes (address account) internal returns(uint8[3] memory) {
        uint8[3] memory indexes;
        indexes[0] = getRandomIndex(account);
        
        indexes[1] = indexes[0];
        while(indexes[1] == indexes[0]) {
            indexes[1] = getRandomIndex(account);
        }

        indexes[2] = indexes[1];
        while((indexes[2] == indexes[0]) || (indexes[2] == indexes[1])) {
            indexes[2] = getRandomIndex(account);
        }

        return indexes;
    }

    // Returns array of three non-duplicating integers from 0-9
    function getRandomIndex ( address account ) internal returns (uint8) {
        uint8 maxValue = 5;

        // Pseudo random number...the incrementing nonce adds variation
        uint8 random = uint8(uint256(keccak256(abi.encodePacked(nonce++, account))) % maxValue);

        return random;
    }

// endregion

}   

interface IDataContract {
    function registerAirline(address airline) external;
    function registerFlight(address airline, string memory flight, uint256 flightTimestamp) external;
    function processFlightStatus (address airline, string memory flight, uint256 flightTimestamp, uint8 statusCode) external;
    function isOperational() external view returns(bool);
    function isFlightRegistered(bytes32 flightKey) external view returns(bool);
}