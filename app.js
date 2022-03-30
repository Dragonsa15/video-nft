var http = require('http');
var formidable = require('formidable');
var fs = require('fs');
var LivePeerUploader = require("./lib/index.js")
const Web3 = require('web3');
const contract = require('@truffle/contract');
const artifacts = require('./build/contracts/Collectible.json');
const CONTACT_ABI = require('./lib/ContractConfig.js').CONTACT_ABI;
const CONTACT_ADDRESS = require('./lib/ContractConfig.js').CONTACT_ADDRESS;
const Moralis = require('moralis/node')
require('dotenv').config()
const serverUrl = process.env.serverUrl;
const appId = process.env.appID;
const masterKey = process.env.masterKey;




const web3API = async() => {
    await Moralis.start({ serverUrl, appId, masterKey });
    await Moralis.enableWeb3()
    const options = { chain: "ropsten", block_number_or_hash: "2" };

    // get block content on BSC
    const transactions = await Moralis.Web3API.native.getBlock(options);
    console.log(transactions)

    // const sendOptions = {
    //     contractAddress: "0xa719302eD4606794D8269b9F07C48E372BcffA48",
    //     functionName: "totalSupply",
    //     abi: CONTACT_ABI,
    // };

    // const transaction = await Moralis.executeFunction(sendOptions);
    // console.log(transaction);
}

web3API();

if (typeof web3 !== 'undefined') {
    var web3 = new Web3(web3.currentProvider);
} else {
    var web3 = new Web3(new Web3.providers.HttpProvider('https://eth-ropsten.alchemyapi.io/v2/o7VdM1uuPIyf3f7DGROx9CTx8BbDP52K'));
}


const CollectibleList = new web3.eth.Contract(CONTACT_ABI, CONTACT_ADDRESS);
// console.log(CollectibleList);


http.createServer(function(req, res) {
    if (req.url == '/fileupload') {
        var form = new formidable.IncomingForm();
        form.parse(req, async function(err, fields, files) {
            var oldpath = files.filetoupload.filepath;
            var newpath = './static/Videos/' + files.filetoupload.originalFilename;
            fs.rename(oldpath, newpath, function(err) {
                if (err) throw err;
                res.write('File uploaded and moved!');
                res.end();
            });
            let result = await LivePeerUploader.videoNft("testing1234", newpath, `{}`).catch(err => {
                console.error(err);
                process.exit(1);
            });
            console.log(result);
            let MintedTokenNumber = await CollectibleList.methods.claimItem(result['nftMetadataUrl']).send({ from: "0x0052967B43Ea364Cf900049B6C695B824787Ff63" })
            console.log("Minting has complleted. Minted Token Number is " + MintedTokenNumber);
        });
    } else {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.write('<form action="fileupload" method="post" enctype="multipart/form-data">');
        res.write('<input type="file" name="filetoupload"><br>');
        res.write('<input type="submit">');
        res.write('</form>');
        return res.end();
    }
}).listen(8080);