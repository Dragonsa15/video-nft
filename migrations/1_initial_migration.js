const Migrations = artifacts.require("Collectible");

module.exports = function(deployer) {
    deployer.deploy(Migrations);
};