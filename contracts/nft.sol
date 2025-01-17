// SPDX-License-Identifier: MIT
pragma solidity >=0.4.22 <0.9.0;
//imported openzeppelin packages.
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
//Contract name is ArtCollectible and it inherit from both the packages Ownable and ERC721.
//Erc721 implements the standard functionality.
//Ownable is used for access control functionality.
contract Collectible is Ownable, ERC721 {

    using Counters for Counters.Counter;
    Counters.Counter private _tokenIds;
    using Strings for uint256;
    
    // Optional mapping for token URIs
    mapping(uint256 => string) private _tokenURIs;
    // Base URI
    string private _baseURIextended;
    
    constructor() public ERC721("TikTokCollectible", "TTC") {}
    // https://forum.openzeppelin.com/t/function-settokenuri-in-erc721-is-gone-with-pragma-0-8-0/5978/3
    //This function is only called by the owner.
    function setBaseURI(string memory baseURI_) external onlyOwner {
        _baseURIextended = baseURI_;
    }
    
    function _setTokenURI(uint256 tokenId, string memory _tokenURI)
    internal
    virtual
    {
    require(
    _exists(tokenId),
    "ERC721Metadata: URI set of nonexistent token"
    );
    _tokenURIs[tokenId] = _tokenURI;
    }

    function _baseURI() internal view virtual override returns (string memory) {
        return _baseURIextended;
    }

    function tokenURI(uint256 tokenId)
    public
    view
    virtual
    override
    returns (string memory)
    {
    require(
    _exists(tokenId),
    "ERC721Metadata: URI query for nonexistent token"
    );
        string memory _tokenURI = _tokenURIs[tokenId];
        string memory base = _baseURI();
        // If there is no base URI, return the token URI.
        if (bytes(base).length == 0) {
        return _tokenURI;
    }
    
    // If both are set, concatenate the baseURI and tokenURI (via abi.encodePacked).
    if (bytes(_tokenURI).length > 0) {
        return string(abi.encodePacked(base, _tokenURI));
    }
    
    // If there is a baseURI but no tokenURI, concatenate the tokenID to the baseURI.
        return string(abi.encodePacked(base, tokenId.toString()));
    }

    // This function is used to Mint the token
    function claimItem(string memory tokenURI) public returns (uint256) {
        //Incremented tokenId for starting the tokenId from 1.
        _tokenIds.increment();
        uint256 newItemId = _tokenIds.current();
        // _safeMint to transfer the tokenId to To address.
        //whichever address is calling the function will recieve the new tokenId.
        _safeMint(msg.sender, newItemId);
        _setTokenURI(newItemId, tokenURI);
        return newItemId;
    }

    function totalSupply() public view returns (uint256) {
        return _tokenIds.current();
    }
    
}