// SPDX-License-Identifier: MIT
pragma solidity ^0.8.6;

import "../node_modules/@openzeppelin/contracts/utils/math/SafeMath.sol";

contract FlightSuretyData {
    using SafeMath for uint256;

    /********************************************************************************************/
    /*                                       DATA VARIABLES                                     */
    /********************************************************************************************/

    uint256 private constant AIRLINE_DEPOSIT = 10 ether;
    uint256 private constant MAX_INSURANCE = 1 ether;

    // Flight status codees
    uint8 private constant STATUS_CODE_UNKNOWN = 0;
    uint8 private constant STATUS_CODE_ON_TIME = 10;
    uint8 private constant STATUS_CODE_LATE_AIRLINE = 20;
    uint8 private constant STATUS_CODE_LATE_WEATHER = 30;
    uint8 private constant STATUS_CODE_LATE_TECHNICAL = 40;
    uint8 private constant STATUS_CODE_LATE_OTHER = 50;

    // Admin
    address private contractOwner; // Account used to deploy contract
    bool private operational = true; // Blocks all state changes throughout the contract if false
    mapping(address => bool) authorisedContracts;

    // Airlines
    struct Airline {
        bool isFunded;
        bool isRegistered;
        address[] approvals;
    }
    mapping(address => Airline) public airlines;
    uint256 public nRegisteredAirlines = 0;

    // Flights
    struct Flight {
        bool isRegistered;
        bool insuranceAvailable;
        uint8 statusCode;
        uint256 flightTimestamp;
        address airline;
        string flight;
        mapping(address => uint) insurances;
        address[] insurees;
    }
    mapping(bytes32 => Flight) public flights;
    bytes32[] flightsRegistered;

    // Insurees
    mapping(address => mapping(bytes32 => uint)) insurees; // insureeAddress => flightKey => insuranceValue
    mapping(address => uint) insureesBalance;

    /**
     * @dev Constructor
     *      The deploying account becomes contractOwner
     */
    constructor(address firstAirline) public {
        contractOwner = msg.sender;
        airlines[firstAirline].isRegistered = true;
        nRegisteredAirlines++;
    }

    /********************************************************************************************/
    /*                                       EVENT DEFINITIONS                                  */
    /********************************************************************************************/

    event AirlineRegistered(address airline);
    event FlightRegistered(
        address airline,
        string flight,
        uint256 flightTimestamp
    );
    event InsuranceBought(
        address insuree,
        uint256 value,
        address airline,
        string flight,
        uint256 flightTimestamp,
        bytes32 flightKey
    );
    event FlightStatusProcessed(
        uint8 statusCode,
        address airline,
        string flight,
        uint256 flightTimestamp
    );
    event InsureesCredited(
        bytes32 flightKey,
        uint256 nInsurees,
        uint256 totalValueCredited
    );
    event FundsWithdrawn(address insuree, uint256 amount);

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
    modifier requireIsOperational() {
        require(operational, "Contract is currently not operational");
        _; // All modifiers require an "_" which indicates where the function body will be added
    }

    /**
     * @dev Modifier that requires the "ContractOwner" account to be the function caller
     */
    modifier requireContractOwner() {
        require(msg.sender == contractOwner, "Caller is not contract owner");
        _;
    }

    // modifier isCallerAuthorized()
    // {
    //     require(authoriedContracts[msg.sender] == 1, "Caller is not authorized");
    //     _;
    // }

    /********************************************************************************************/
    /*                                       UTILITY FUNCTIONS                                  */
    /********************************************************************************************/

    /**
     * @dev Get operating status of contract
     *
     * @return A bool that is the current operating status
     */
    function isOperational() public view returns (bool) {
        return operational;
    }

    /**
     * @dev Sets contract operations on/off
     *
     * When operational mode is disabled, all write transactions except for this one will fail
     */
    function setOperatingStatus(bool mode) external requireContractOwner {
        operational = mode;
    }

    modifier onlyWhenOperational() {
        require(isOperational(), "Contract is not operational");
        _;
    }

    function authoriseContract(
        address contractAddress
    ) external requireContractOwner {
        authorisedContracts[contractAddress] = true;
    }

    function deathoriseContract(
        address contractAddress
    ) external requireContractOwner {
        authorisedContracts[contractAddress] = false;
    }

    modifier isCallerAuthorised() {
        require(authorisedContracts[msg.sender], "Caller is not authorised");
        _;
    }

    function isAuthorised(address contractAddress) public view returns (bool) {
        return authorisedContracts[contractAddress];
    }

    modifier onlyRegisteredAirline() {
        require(airlines[tx.origin].isRegistered, "Airline is not registered");
        _;
    }

    function isParticipantAirline(address airline) public view returns (bool) {
        return airlines[airline].isFunded;
    }

    modifier onlyParticipantAirlines() {
        require(
            isParticipantAirline(tx.origin),
            "Airline is not funded and thus can't participate in insurance and registration of other airlines"
        );
        _;
    }

    function getContractBalance() public view returns (uint256) {
        return address(this).balance;
    }

    function isFlightRegistered(bytes32 flightKey) public view returns (bool) {
        return flights[flightKey].isRegistered;
    }

    // function getFlightStatus(string memory flightCode) external view
    // isCallerAuthorized
    // returns(uint8 statusCode){
    //     return flights[flightCode].statusCode;
    // }

    // function getAirlineStatus(address airline) public payable
    // requireIsOperational
    // returns(string memory status) {

    //     if (airlines[airline].isParticipant) {
    //         return "Participant";
    //     } else if (airlines[airline].isRegistered) {
    //         return "Registered";
    //     }

    //     return "Candidate";
    // }

    // function getInsurance(string memory flightCode) external view
    // returns(uint num, bytes32 _key, bool settled, bool exist, uint256 amount) {

    //     bytes32 key = keccak256(abi.encodePacked(msg.sender, flightCode));

    //     return (flights[flightCode].insurees.length, key, insurances[key].settled, insurances[key].exist, insurances[key].amount);
    // }

    /********************************************************************************************/
    /*                                     SMART CONTRACT FUNCTIONS                             */
    /********************************************************************************************/

    /**
     * @dev Add an airline to the registration queue
     *      Can only be called from FlightSuretyApp contract
     *
     */
    function registerAirline(
        address airline
    ) external onlyParticipantAirlines isCallerAuthorised onlyWhenOperational {
        if (nRegisteredAirlines < 5) {
            airlines[airline].isRegistered = true;
            nRegisteredAirlines++;
            emit AirlineRegistered(airline);
        } else {
            for (uint i = 0; i < airlines[airline].approvals.length; i++) {
                require(
                    airlines[airline].approvals[i] != msg.sender,
                    "Caller already approved"
                );
            }
            airlines[airline].approvals.push(msg.sender);
            if (
                airlines[airline].approvals.length >= nRegisteredAirlines.div(2)
            ) {
                airlines[airline].isRegistered = true;
                emit AirlineRegistered(airline);
            }
        }
    }

    function registerFlight(
        address airline,
        string memory flight,
        uint256 flightTimestamp
    ) external isCallerAuthorised onlyWhenOperational {
        bytes32 flightKey = getFlightKey(airline, flight, flightTimestamp);
        require(
            !flights[flightKey].isRegistered,
            "Flight is already registered"
        );
        require(
            isParticipantAirline(airline),
            "Can't register flights for an unfunded Airline"
        );
        flights[flightKey].isRegistered = true;
        flights[flightKey].insuranceAvailable = true;
        flights[flightKey].airline = airline;
        flights[flightKey].flight = flight;
        flights[flightKey].flightTimestamp = flightTimestamp;
        flights[flightKey].statusCode = STATUS_CODE_UNKNOWN;
        flightsRegistered.push(flightKey);
        emit FlightRegistered(airline, flight, flightTimestamp);
    }

    /**
     * @dev Buy insurance for a flight
     *
     */
    function buy(
        address airline,
        string memory flight,
        uint256 flightTimestamp
    ) external payable onlyWhenOperational {
        require(
            msg.value <= MAX_INSURANCE,
            "Trying to purchase insurance above 1ETH"
        );
        bytes32 flightKey = getFlightKey(airline, flight, flightTimestamp);
        require(
            isFlightRegistered(flightKey),
            "Trying to buy insurance for unregistered flight"
        );
        require(
            flights[flightKey].insuranceAvailable,
            "Insurance is not available after the flight"
        );
        flights[flightKey].insurances[msg.sender] = msg.value;
        flights[flightKey].insurees.push(msg.sender);
        emit InsuranceBought(
            msg.sender,
            msg.value,
            airline,
            flight,
            flightTimestamp,
            flightKey
        );
    }

    /**
     * @dev Called after oracle has updated flight status
     *
     */
    function processFlightStatus(
        address airline,
        string memory flight,
        uint256 flightTimestamp,
        uint8 statusCode
    ) external isCallerAuthorised onlyWhenOperational {
        bytes32 flightKey = getFlightKey(airline, flight, flightTimestamp);
        require(
            isFlightRegistered(flightKey),
            "Trying to process flight status for an unregistered flight"
        );
        require(isParticipantAirline(airline), "Airline is not funded");
        if (statusCode == STATUS_CODE_LATE_AIRLINE) {
            creditInsurees(flightKey);
        }
        flights[flightKey].insuranceAvailable = false;
        flights[flightKey].statusCode = statusCode;
        emit FlightStatusProcessed(
            statusCode,
            airline,
            flight,
            flightTimestamp
        );
    }

    function getInsuranceValue(
        address insuree,
        bytes32 flightKey
    ) public view returns (uint) {
        return insurees[insuree][flightKey];
    }

    event DebugMePlease(address currentInsuree, uint insuranceValue);

    /**
     *  @dev Credits payouts to insurees
     */
    function creditInsurees(bytes32 flightKey) internal onlyWhenOperational {
        uint totalValueCredited = 0;
        uint nInsurances = flights[flightKey].insurees.length;
        if (nInsurances > 0) {
            for (uint i = 0; i < nInsurances; i++) {
                address currentInsuree = flights[flightKey].insurees[i];
                uint insuranceValue = flights[flightKey].insurances[
                    currentInsuree
                ];
                flights[flightKey].insurances[currentInsuree] = 0;
                insureesBalance[currentInsuree] += insuranceValue.mul(2);
                totalValueCredited += insuranceValue;
            }
        }
        emit InsureesCredited(flightKey, nInsurances, totalValueCredited);
    }

    /**
     *  @dev Transfers eligible payout funds to insuree
     *
     */
    function pay() external onlyWhenOperational {
        // Check
        require(
            insureesBalance[msg.sender] > 0,
            "Insuree has balance of 0. Nothing to withdraw"
        );
        // Effects
        uint256 withdrawValue = insureesBalance[msg.sender];
        insureesBalance[msg.sender] = 0;
        // Interactions
        payable(msg.sender).transfer(withdrawValue);
        emit FundsWithdrawn(msg.sender, withdrawValue);
    }

    /**
     * @dev Initial funding for the insurance. Unless there are too many delayed flights
     *      resulting in insurance payouts, the contract should be self-sustaining
     *
     */
    function fund() public payable onlyRegisteredAirline onlyWhenOperational {
        require(!isParticipantAirline(msg.sender), "Airline already deposited");
        require(msg.value >= AIRLINE_DEPOSIT, "Deposit is less than 10ETH");
        airlines[msg.sender].isFunded = true;
        payable(msg.sender).transfer(msg.value.sub(AIRLINE_DEPOSIT));
    }

    function getFlightKey(
        address airline,
        string memory flight,
        uint256 flightTimestamp
    ) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(airline, flight, flightTimestamp));
    }

    /**
     * @dev Fallback function for funding smart contract.
     *
     */
    fallback() external payable {
        fund();
    }
}
