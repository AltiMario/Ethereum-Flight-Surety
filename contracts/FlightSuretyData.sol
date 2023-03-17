// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.6;

import "../node_modules/@openzeppelin/contracts/utils/math/SafeMath.sol";

contract FlightSuretyData {
    using SafeMath for uint256;

    event Log(string);

    event AirlineParticipant(address account);
    event InsureeCredited(address passenger, string flightCode, uint256 amount);
    event InsuranceBought(string flightCode, address passenger, uint256 amount);

    /********************************************************************************************/
    /*                                       DATA VARIABLES                                     */
    /********************************************************************************************/

    uint8 private constant STATUS_CODE_UNKNOWN = 0;
    uint8 private constant STATUS_CODE_ON_TIME = 10;
    uint8 private constant STATUS_CODE_LATE_AIRLINE = 20;
    uint8 private constant STATUS_CODE_LATE_WEATHER = 30;
    uint8 private constant STATUS_CODE_LATE_TECHNICAL = 40;
    uint8 private constant STATUS_CODE_LATE_OTHER = 50;

    address private contractOwner;                                      // Account used to deploy contract
    bool private operational = true;                                    // Blocks all state changes throughout the contract if false
    mapping(address => uint256) private authorizedContracts;

    struct Insurance {
        uint256 amount;
        bool settled;
        bool exist;
    }

    struct Airline {
        address accountAddress;
        mapping(address => bool) votes; // votes received from other airlines
        uint256 amountVotes;
        bool isRegistered;
        bool isParticipant; // means it has paid the 10-ether fee
    }

    struct Flight {
        bool isRegistered;
        uint8 statusCode;
        uint256 updatedTimestamp;        
        address airline;
        
        address[] insurees;                         // array of insurees
    }

    uint256 private amountRegisteredAirlines = 0;

    mapping(string => Flight) private flights;
    mapping(address => Airline) airlines; 
    mapping(address => uint256) private passengerBalance;
    mapping(bytes32 => Insurance) private insurances;               // Maps the tuple (flight, passenger) to Insurance
    
    /********************************************************************************************/
    /*                                       EVENT DEFINITIONS                                  */
    /********************************************************************************************/


    /**
    * @dev Constructor
    *      The deploying account becomes contractOwner
    */
    constructor(address firstAirline) {
        contractOwner = msg.sender;
        registerFirstAirline(firstAirline);
    }

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
        require(operational, "Contract is currently not operational");
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

    modifier isCallerAuthorized()
    {
        require(authorizedContracts[msg.sender] == 1, "Caller is not authorized");
        _;
    }

    /********************************************************************************************/
    /*                                       UTILITY FUNCTIONS                                  */
    /********************************************************************************************/

    /**
    * @dev Get operating status of contract
    *
    * @return A bool that is the current operating status
    */      
    function isOperational() public view returns(bool) {
        return operational;
    }

    /**
    * @dev Sets contract operations on/off
    *
    * When operational mode is disabled, all write transactions except for this one will fail
    */    
    function setOperatingStatus(bool mode) external
    requireContractOwner {
        operational = mode;
    }

    function authorizeContract(address contractAddress) external 
    requireIsOperational 
    requireContractOwner {
        authorizedContracts[contractAddress] = 1;
    }

    function deauthorizeContract(address contractAddress) external 
    requireIsOperational
    requireContractOwner {
        delete authorizedContracts[contractAddress];
    }

    function isContractAuthorized(address contractAddress) external view
    returns(bool success){
        if (authorizedContracts[contractAddress] == 1) {
            return true;
        } else {
            return false;
        }
    }

    function hasAirlineRecord(address airline) external view
    isCallerAuthorized
    returns(bool success){
        return airlines[airline].accountAddress != address(0);
    }

    function isRegisteredAirline(address airline) external view
    isCallerAuthorized 
    returns(bool success){
        return airlines[airline].isRegistered;
    }

    function isParticipantAirline(address airline) external view
    isCallerAuthorized 
    returns(bool success){
        return airlines[airline].isParticipant;
    }

    function isInsurancePurchased(string memory flightCode, address passenger) external view
    isCallerAuthorized 
    returns(bool success){
        bytes32 key = keccak256(abi.encodePacked(passenger, flightCode));
        return insurances[key].exist;
    }

    function getAmountRegisteredAirlines() external view
    isCallerAuthorized 
    returns(uint256 amount){
        return amountRegisteredAirlines;
    }

    
    function getCandidateNumVotes(address candidateAirline) external view
    isCallerAuthorized 
    returns(uint256 amount){
        return airlines[candidateAirline].amountVotes;
    }

    function callerVotedToAirline(address caller, address candidateAirline) external view
    isCallerAuthorized 
    returns(bool success){
        return airlines[candidateAirline].votes[caller];
    }

    function isFlightRegistered(string memory flightCode) external view
    isCallerAuthorized 
    returns(bool success){
        return flights[flightCode].isRegistered;
    }

    function getFlightStatus(string memory flightCode) external view
    isCallerAuthorized 
    returns(uint8 statusCode){
        return flights[flightCode].statusCode;
    }

    function getAirlineStatus(address airline) public payable 
    requireIsOperational 
    returns(string memory status) {

        if (airlines[airline].isParticipant) {
            return "Participant";
        } else if (airlines[airline].isRegistered) {
            return "Registered";
        }
        
        return "Candidate";
    }

    function getInsurance(string memory flightCode) external view 
    returns(uint num, bytes32 _key, bool settled, bool exist, uint256 amount) {

        bytes32 key = keccak256(abi.encodePacked(msg.sender, flightCode));

        return (flights[flightCode].insurees.length, key, insurances[key].settled, insurances[key].exist, insurances[key].amount);
    }
    
    /********************************************************************************************/
    /*                                     SMART CONTRACT FUNCTIONS                             */
    /********************************************************************************************/

    /**
    * @dev Add first airline
    *
    */  
    function registerFirstAirline(address firstAirline) internal
    requireIsOperational 
    returns(bool success) {
        require(amountRegisteredAirlines == 0, "First Airline already exists");

        Airline storage fAirline = airlines[firstAirline];
        fAirline.accountAddress = firstAirline;
        fAirline.amountVotes = 1;
        fAirline.isRegistered = true;
        fAirline.isParticipant = true;

        amountRegisteredAirlines++;

        emit AirlineParticipant(firstAirline);

        return true;
    }

    /**
    * @dev Add an airline to the registration queue
    *
    */  
    function registerAirline(address newAirline, bool registered, bool isParticipant) external 
    requireIsOperational
    isCallerAuthorized
    returns(bool success) {

        Airline storage auxAirline = airlines[newAirline];
        auxAirline.accountAddress = newAirline;
        auxAirline.amountVotes = 0;
        auxAirline.isRegistered = registered;
        auxAirline.isParticipant = isParticipant;

        if (registered) {
            amountRegisteredAirlines++;
        }

        return true;
    }
    
    /**
    * @dev Update an airline data
    *
    */  
    function addVote(address airlineAddress, address voteFrom) 
    external 
    requireIsOperational
    isCallerAuthorized
    returns(bool success) {

        airlines[airlineAddress].votes[voteFrom] = true;
        airlines[airlineAddress].amountVotes++;
        
        return true;
    }

    /**
    * @dev Update an airline data
    *
    */  
    function updateAirlineStatus(address airlineAddress, bool registered, bool isParticipant) 
    external 
    requireIsOperational
    isCallerAuthorized
    returns(bool success) {

        if (!airlines[airlineAddress].isRegistered && registered) {
            amountRegisteredAirlines++;
        }

        airlines[airlineAddress].isRegistered = registered;
        airlines[airlineAddress].isParticipant = isParticipant;

        return true;
    }

    /**
    * @dev Register a future flight for insuring
    *
    */ 
    function registerFlight(string memory flightCode, address airlineAddress) external
    requireIsOperational 
    isCallerAuthorized 
    returns(bool success) {
        if (!flights[flightCode].isRegistered) {

            Flight storage auxFlight = flights[flightCode];
            auxFlight.isRegistered = true;
            auxFlight.statusCode = STATUS_CODE_UNKNOWN;
            auxFlight.updatedTimestamp = block.timestamp;
            auxFlight.airline = airlineAddress;

            return true;
        }
        return false;       
    }

    /**
    * @dev Update flight status
    *
    */ 
    function updateFlightStatus(string memory flightCode, uint8 statusCode) external
    requireIsOperational 
    isCallerAuthorized 
    returns(bool success) {

        if (flights[flightCode].isRegistered && flights[flightCode].statusCode == STATUS_CODE_UNKNOWN) {
            flights[flightCode].statusCode = statusCode;

            if (statusCode == STATUS_CODE_LATE_AIRLINE) {
                uint256 numInsurees = flights[flightCode].insurees.length;

                for (uint8 i = 0; i < numInsurees; i++){
                    creditInsuree(flights[flightCode].insurees[i], flightCode);
                }
            }
            return true;
        }

        return false;       
    }

   /**
    * @dev Buy insurance for a flight
    *
    */   
    function buy(address passenger, string memory flightCode, uint256 amount) external
    requireIsOperational 
    isCallerAuthorized 
    returns(bool success, bytes32 _key) {
        bytes32 key = keccak256(abi.encodePacked(passenger, flightCode));     
        
        if (flights[flightCode].isRegistered && !insurances[key].exist) {

            flights[flightCode].insurees.push(passenger);

            insurances[key] = Insurance({
                amount: amount, 
                settled: false,
                exist: true
            });
            
            emit InsuranceBought(flightCode, passenger, insurances[key].amount);

            return (false, key);
        }

        return (false, key);
    } 
    
    /**
     *  @dev Credits payouts to insurees
    */
    function creditInsuree(address passenger, string memory flightCode) internal 
    requireIsOperational {

        bytes32 key = keccak256(abi.encodePacked(passenger, flightCode));

        require(insurances[key].exist, "There is no insurance for this flight and passenger");
        require(!insurances[key].settled, "Credit has already been given to the passenger");

        uint256 amount = insurances[key].amount.mul(3).div(2);

        passengerBalance[passenger] += amount;
        insurances[key].settled = true;

        emit InsureeCredited(passenger, flightCode, amount);
    } 

    /**
    * @dev Get flight status
    *
    */   
    function getPassengerBalance(address passenger) external view 
    isCallerAuthorized
    returns(uint256 balance){
        return passengerBalance[passenger];
    }    

    /**
     *  @dev Transfers eligible payout funds to insuree
     *
    */
    function pay(address passenger) external 
    requireIsOperational 
    isCallerAuthorized 
    returns(uint256 amount) {
        require(passengerBalance[passenger] > 0, "No balance to withdraw");

        uint256 balance = passengerBalance[passenger];
        passengerBalance[passenger] = 0;

        return balance;
    }

}

