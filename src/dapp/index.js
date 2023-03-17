
import DOM from './dom';
import Contract from './contract';
import './flightsurety.css';


(async() => {
    let contract = new Contract('localhost', () => {
                  
        // Read transaction
        function isOperational() {
            contract.isOperational((error, result) => {
                let displayDiv = DOM.elid("op-status");
                let button = DOM.elid("toggle-operational");

                if (error) {
                    displayDiv.textContent = "Offline";
                    button.textContent = "Try Again";
                } else if (result) {
                    displayDiv.textContent = "Up & Running";
                    button.textContent = "Pause";
    
                } else {
                    displayDiv.textContent = "Down";
                    button.textContent = "Run";
                }
            });
        }   

        DOM.elid('check-operational').addEventListener('click', () => {
            isOperational();
        });

        DOM.elid('toggle-operational').addEventListener('click', () => {
            var operational = false;
            if ("Up & Running" == DOM.elid("op-status").textContent) {
                operational = false;
            } else {
                operational = true;
            }
            contract.toggleOperatingStatus(operational, (result) => {
                console.log(result);
                isOperational();
            });
        });

        DOM.elid('register-flight-1').addEventListener('click', () => {
            contract.registerFlight('FA1111', contract.airlines[0], (error) => {
                console.log(error);
            });
        })

        DOM.elid('register-flight-2').addEventListener('click', () => {
            contract.registerFlight('LT0001', contract.airlines[1], (error) => {
                console.log(error);
            });
        })

        DOM.elid('register-airline-2').addEventListener('click', () => {
            contract.registerAirline(contract.airlines[1], (response) => {
                console.log(response);
            });
        })    

        DOM.elid('submit-fund-2').addEventListener('click', () => {
            contract.fundAirline(contract.airlines[1], (response) => {
                console.log(response);
            });
        }) 

        DOM.elid('get-status-1').addEventListener('click', () => {
            contract.getAirlineStatus(contract.airlines[0], (response) => {
                console.log(response);
                DOM.elid('airline-1-status').textContent = response;
            });
        }) 
        
        DOM.elid('get-status-2').addEventListener('click', () => {
            contract.getAirlineStatus(contract.airlines[1], (response) => {
                console.log(response);
                DOM.elid('airline-2-status').textContent = response;
            });
        }) 

        DOM.elid('buy-insurance').addEventListener('click', () => {
            let insuranceValue = Number(DOM.elid('insurance-value').value);
            let flightCode = DOM.elid('flight-select').value;

            console.log(`insuranceValue: ${insuranceValue}/flightCode: ${flightCode}/`);

            if (flightCode == "0") {
                DOM.elid('flight-error').classList.remove("invisible");
                DOM.elid('flight-error').classList.add("visible");
                return;
            } else {
                DOM.elid('flight-error').classList.add("invisible");
                DOM.elid('flight-error').classList.remove("visible");
            }

            if(isNaN(insuranceValue) || insuranceValue <= 0 || insuranceValue > 1){
                DOM.elid('value-error').classList.remove("invisible");
                DOM.elid('value-error').classList.add("visible");
                return;
            } else {
                DOM.elid('value-error').classList.add("invisible");
                DOM.elid('value-error').classList.remove("visible");
            }

            contract.buyInsurance(flightCode, contract.passenger, insuranceValue, (response) => {
                console.log(response);
            });
        }) 

        DOM.elid('submit-to-oracles-1').addEventListener('click', () => {
            contract.fetchFlightStatus("FA1111", contract.airlines[0], contract.passenger, (error, response) => {
                console.log(response);
            });
        }) 

        DOM.elid('submit-to-oracles-2').addEventListener('click', () => {
            contract.fetchFlightStatus("LT0001", contract.airlines[1], contract.passenger, (error, response) => {
                console.log(response);
            });
        }) 

        DOM.elid('check-flight-status-1').addEventListener('click', () => {
            contract.getFlightStatus("FA1111", (response) => {
                DOM.elid('flight-status-1').textContent = response;
            });
        }) 

        DOM.elid('check-flight-status-2').addEventListener('click', () => {
            contract.getFlightStatus("LT0001", (response) => {
                DOM.elid('flight-status-2').textContent = response;
            });
        }) 

        DOM.elid('check-balance').addEventListener('click', () => {
            contract.getPassengerBalance((response) => {
                DOM.elid('passenger-balance').textContent = `${response} ether`;
            });
        }) 

        DOM.elid('withdraw').addEventListener('click', () => {
            contract.withdraw((response) => {
                console.log(response);
            });
        }) 
 
        isOperational();
        DOM.elid('passenger-id').textContent = contract.passenger;
        DOM.elid('passenger-address').textContent = contract.passenger;  
        
    });
    
})();

function display(title, description, results) {
    let displayDiv = DOM.elid("display-wrapper");
    let section = DOM.section();
    section.appendChild(DOM.h2(title));
    section.appendChild(DOM.h5(description));
    results.map((result) => {
        let row = section.appendChild(DOM.div({className:'row'}));
        row.appendChild(DOM.div({className: 'col-sm-4 field'}, result.label));
        row.appendChild(DOM.div({className: 'col-sm-8 field-value'}, result.error ? String(result.error) : String(result.value)));
        section.appendChild(row);
    })
    displayDiv.append(section);

}







