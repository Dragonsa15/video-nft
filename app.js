var http = require('http');
var formidable = require('formidable');
var fs = require('fs');
var LivePeerUploader = require("./lib/index.js")
const Web3 = require('web3');
const contract = require('@truffle/contract');
const artifacts = require('./build/contracts/Collectible.json');
const CONTACT_ABI = require('./lib/ContractConfig.js').CONTACT_ABI;
const CONTACT_ADDRESS = require('./lib/ContractConfig.js').CONTACT_ADDRESS;


if (typeof web3 !== 'undefined') {
    var web3 = new Web3(web3.currentProvider);
} else {
    var web3 = new Web3(new Web3.providers.HttpProvider('http://localhost:7545'));
}


const CollectibleList = new web3.eth.Contract(CONTACT_ABI, CONTACT_ADDRESS);
// console.log(contactList);

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
            const MintedTokenNumber = await CollectibleList.methods.claimItem(result['nftMetadataUrl']).call()
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