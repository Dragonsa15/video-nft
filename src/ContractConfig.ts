var CollectibleBuild = require('../build/contracts/Collectible.json');

const CONTACT_ADDRESS = '0xa719302eD4606794D8269b9F07C48E372BcffA48';

const CONTACT_ABI = CollectibleBuild["abi"];

module.exports = {
    CONTACT_ABI,
    CONTACT_ADDRESS,
};