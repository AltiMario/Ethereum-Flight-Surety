module.exports = {
    networks: {
        test: {
            network_id: 7545,
            accounts: 50,
        },
    },
    compilers: {
        solc: {
            version: "^0.8.16",
            settings: {
                viaIR: true,
                optimizer: {
                    enabled: true,
                    runs: 200,
                },
            },
        },
    },
};

