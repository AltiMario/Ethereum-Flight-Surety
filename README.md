# Ethereum Flight Surety

FlightSurety is a flight insurance simulation on Ethereum blockchain. It is a decentralized application (dApp) that allows passengers to purchase flight insurance and get compensated in case of flight delay or cancellation.

## Install

This repository contains Smart Contract code in Solidity (using Truffle), tests (also using Truffle), dApp scaffolding (using HTML, CSS and JS) and server app scaffolding.

To install, download or clone the repo, then:

`npm install`

`truffle compile`

## Develop Client

To run truffle tests:

`truffle test ./test/flightSurety.js`

`truffle test ./test/oracles.js`

To use the dapp:

`truffle migrate`

`npm run dapp`

To view dapp:

`http://localhost:3000`

Always connect to MetaMask before taking any actions via button in top-right corner

## Oracle Server

`npm run server`

`truffle test ./test/oracles.js`

## Deploy

To build dapp for prod:

`npm run dapp:prod`

## Dependencies

- Truffle v5.8.0 (core: 5.8.0)
- Ganache v7.7.6
- Solidity - ^0.8.16 (solc-js)
- Node v18.14.2
- Web3.js v1.8.2

## Interacting with the DAPP

The Dapp consists of 3 sections

- Flight
- Insurance
- Airlines

### Flight Section Functions

- Register a flight
- Fetch flight status

### Insurance Section Functions

- Purchase flight insurance
- Withdrawal insurance amount

### Airline Section Functions

- Register an airline
