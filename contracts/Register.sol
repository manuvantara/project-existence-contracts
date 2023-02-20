// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/AccessControl.sol";

struct Record {
    bytes32 documentHash;

    address creator;
    address updater;

    string sourceDocument;
    string referenceDocument;

    uint256 createdAt;
    uint256 updatedAt;
    uint256 startsAt;
    uint256 expiresAt;

    bytes32 pastDocumentHash;
    bytes32 nextDocumentHash;
}

contract Register is AccessControl {

    bytes32 public constant CAN_CREATE_RECORD_ROLE = keccak256("CAN_CREATE_RECORD_ROLE");
    bytes32 public constant CAN_INVALIDATE_RECORD_ROLE = keccak256("CAN_INVALIDATE_RECORD_ROLE");

    address public organisation;
    string public metadata;

    mapping (bytes32 => Record) public records;

    event RecordCreated (bytes32 documentHash);
    event RecordUpdated (bytes32 documentHash);
    event RecordInvalidated (bytes32 documentHash);
    event RegisterMetadataUpdated (address register, string metadata);


    constructor (address _organisation, string memory _metadata) {
        organisation = _organisation;
        metadata = _metadata;

        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _setupRole(CAN_CREATE_RECORD_ROLE, msg.sender);
        _setupRole(CAN_INVALIDATE_RECORD_ROLE, msg.sender);
    }

    function createRecord (
        bytes32 _documentHash,
        string calldata _sourceDocument,
        string calldata _referenceDocument,
        uint256 _startsAt,
        uint256 _expiresAt,
        bytes32 _pastDocumentHash
    ) 
        public 
        onlyRole(CAN_CREATE_RECORD_ROLE)
    {
        Record storage record = records[_documentHash];
        Record storage pastRecord = records[_pastDocumentHash];

        require(record.createdAt == 0, "Record already exists");
        require(pastRecord.nextDocumentHash == 0, "Previous record already attached");

        Record memory newRecord = Record (
            _documentHash,

            msg.sender, //creator
            address(0), //updater

            _sourceDocument,
            _referenceDocument,

            block.timestamp, //createdAt
            0, //updatedAt
            _startsAt,
            _expiresAt,

            _pastDocumentHash,
            0 //nextDocumentHash
        );
                
        records[_documentHash] = newRecord;


        if (newRecord.pastDocumentHash != 0x00) {
            require(pastRecord.createdAt != 0, "Past record not found");
            
            if (pastRecord.expiresAt == 0 || pastRecord.expiresAt > block.timestamp) {
                _updateRecord(pastRecord.documentHash, block.timestamp, newRecord.documentHash);
            } else {
                _updateRecord(pastRecord.documentHash, pastRecord.expiresAt, newRecord.documentHash);
            }
        }

        emit RecordCreated(newRecord.documentHash);
    }

    function invalidateRecord (
        bytes32 _documentHash
    ) 
        public
        onlyRole(CAN_INVALIDATE_RECORD_ROLE) 
    {
        Record storage record = records[_documentHash];
        require(record.expiresAt == 0 || record.expiresAt > block.timestamp, "Record already invalidated");
        
        _updateRecord(record.documentHash, block.timestamp, 0x00); //0x00 means that we can invalidate only the last record in the chain

        emit RecordInvalidated(record.documentHash);
    }

    function _updateRecord (
        bytes32 _documentHash,
        uint256 _expiresAt,
        bytes32 _nextDocumentHash
    ) 
        internal 
    {
        Record storage record = records[_documentHash];

        record.expiresAt = _expiresAt;
        record.nextDocumentHash = _nextDocumentHash;

        record.updater = msg.sender;
        record.updatedAt = block.timestamp;
        
        emit RecordUpdated(_documentHash);
    }

    function updateRegisterMetadata (
        string memory _metadata
    ) 
        public 
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        metadata = _metadata;
        
        emit RegisterMetadataUpdated(address(this)/*address of register*/, _metadata);
    }

}