import FlightSuretyAppArtifact from "../../build/contracts/FlightSuretyApp.json" assert { type: "json" };
import FlightSuretyDataArtifact from "../../build/contracts/FlightSuretyData.json" assert { type: "json" };
import config from "./config.json" assert { type: "json" };

const App = {
    web3: null,
    airlineReg: null,
    airlineBuyer: null,
    flight: null,
    timestamp: null,

    init: async function () {
        App.readForm();
        App.bindEvents();
    },

    readForm: function () {
        App.airlineReg = $("#airline-reg").val();
        App.airlineBuyer = $("#airline-buyer").val();
        App.flight = $("#flight-number").val();
        App.timestamp = $("#flight-time").val();
        App.insuranceValue = $("#insurance-val").val() * 10 ** 18;
    },

    bindEvents: function () {
        $("#connect-web3").click(this.initWeb3);
        $("#register-airline").click(this.registerAirline);
        $("#fund").click(this.fundAirline);
        $("#register-flight").click(this.registerFlight);
        $("#buy-insurance").click(this.buyInsurance);
        $("#submit-oracle").click(this.fetchFlightStatus);
        $("#withdraw-funds").click(this.withdrawFunds);
    },

    refreshData: async function () {
        await App.getCurrentAccountID();
        App.readForm();
    },

    initWeb3: async function () {
        if (window.ethereum) {
            App.web3 = new Web3(window.ethereum);
            let accounts = await App.web3.eth.requestAccounts();
            console.log(
                "Using Metamask as Web3 provider. Accounts: \n",
                accounts
            );
        } else {
            console.warn(
                "No web3 detected. Falling back to HTTP. Remove this fallback when deploying live"
            );
            App.web3 = new Web3(new Web3.providers.HttpProvider(config["url"]));
            console.log(App.web3);
        }

        await App.getCurrentAccountID();
        await App.initContract();
        await App.subscribeToEvents();
    },

    getCurrentAccountID: async function () {
        try {
            const accounts = await App.web3.eth.getAccounts();
            App.currentAccount = accounts[0];
            console.log(`Current account is ${App.currentAccount}`);
        } catch (error) {
            console.error("Could not getMetamaskAccountID");
        }
    },

    initContract: async function () {
        const { web3 } = this;

        try {
            const networkId = await web3.eth.net.getId();

            const deployedNetworkData =
                FlightSuretyDataArtifact.networks[networkId];

            App.FlightSuretyData = await new web3.eth.Contract(
                FlightSuretyDataArtifact.abi,
                deployedNetworkData.address
            );

            const deployedNetworkApp =
                FlightSuretyAppArtifact.networks[networkId];

            App.FlightSuretyApp = await new web3.eth.Contract(
                FlightSuretyAppArtifact.abi,
                deployedNetworkApp.address
            );

            await App.authoriseAppContract();

            App.FlightSuretyApp.methods
                .isOperational()
                .call((error, result) => {
                    console.log(error, result);
                    display("Operational Status", error, result);
                });
        } catch (error) {
            console.error("Could not initialize contracts");
            console.log("Error: ", error);
        }
    },

    authoriseAppContract: async function () {
        let { isAuthorised, authoriseContract } = App.FlightSuretyData.methods;
        let isAppAuth = await isAuthorised(
            App.FlightSuretyApp.options.address
        ).call();

        if (!isAppAuth) {
            await authoriseContract(App.FlightSuretyApp.options.address).send({
                from: App.currentAccount,
            });
            console.log("is auth app", App.FlightSuretyApp.options.address);
        }
    },

    fundAirline: async function () {
        await App.refreshData();
        let airlineDeposit = 10 ** 19; // 10ETH
        let { fund } = App.FlightSuretyData.methods;
        fund().send(
            { from: App.currentAccount, value: airlineDeposit },
            (error, result) => {
                console.log(error, result);
                display(`Airline ${App.currentAccount} is funded`, error, true);
            }
        );
    },

    registerAirline: async function () {
        await App.refreshData();
        let { registerAirline } = App.FlightSuretyApp.methods;
        registerAirline(App.airlineReg).send(
            { from: App.currentAccount },
            (error, result) => {
                console.log(error, result);
                display(`Airline ${App.airlineReg} registered`, error, true);
            }
        );
    },

    registerFlight: async function () {
        await App.refreshData();
        let { registerFlight } = App.FlightSuretyApp.methods;
        registerFlight(App.airlineBuyer, App.flight, App.timestamp).send(
            { from: App.currentAccount },
            (error, result) => {
                console.log(error, result);
                display(
                    `Flight ${App.flight} of Airline ${App.airlineBuyer} at ${App.timestamp} has been registered: `,
                    error,
                    true
                );
            }
        );
    },

    buyInsurance: async function () {
        await App.refreshData();
        let { buy } = App.FlightSuretyData.methods;
        buy(App.airlineBuyer, App.flight, App.timestamp).send(
            { from: App.currentAccount, value: App.insuranceValue },
            (error, result) => {
                console.log(error, result);
                display(
                    `${App.currentAccount} bought ${App.insuranceValue} insurance for flight ${App.flight} of Airline ${App.airlineBuyer} at ${App.timestamp}`,
                    error,
                    true
                );
            }
        );
    },

    fetchFlightStatus: async function () {
        await App.refreshData();
        let { fetchFlightStatus } = App.FlightSuretyApp.methods;
        fetchFlightStatus(App.airlineBuyer, App.flight, App.timestamp).send(
            { from: App.currentAccount },
            (error, result) => {
                console.log(error, result);
                display(
                    `Flight status for flight ${App.flight} of Airline ${App.airlineBuyer} at ${App.timestamp} is being fetched`,
                    error,
                    true
                );
            }
        );
    },

    withdrawFunds: async function () {
        await App.refreshData();
        let { pay } = App.FlightSuretyData.methods;
        pay().send({ from: App.currentAccount }, (error, result) => {
            console.log(error, result);
            display(
                `Withdrawal for ${App.currentAccount} is being processed`,
                error,
                true
            );
        });
    },

    subscribeToEvents: function () {
        App.FlightSuretyApp.events.allEvents().on("data", function (event) {
            console.log("APP EVENT: ", event.event, event);
        });

        App.FlightSuretyData.events.allEvents().on("data", function (event) {
            console.log("DATA EVENT: ", event.event, event);
        });
    },
};

App.init();
window.App = App;

function display(label, error, result) {
    if (error) {
        $("#display-wrapper").html(
            `${label}: <b><FONT COLOR='$#e0490d'> ${error} </FONT></b>`
        );
    } else {
        $("#display-wrapper").html(
            `${label}: <b><FONT COLOR='$FFFF99'> ${String(result)} </FONT></b>`
        );
    }
}
