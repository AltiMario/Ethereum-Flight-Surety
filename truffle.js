var HDWalletProvider = require("truffle-hdwallet-provider");
var mnemonic = "balance happy legend valve vivid wife adapt icon toddler picnic banana kangaroo";

module.exports = {
  networks: {
    development: {
      provider: function() {
        return new HDWalletProvider(mnemonic, "http://127.0.0.1:8545/", 0, 50);
      },
      network_id: "*"
    }
  },
  compilers: {
    solc: {
      version: "^0.8.6"
    }
  }
};