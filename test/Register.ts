import { time, loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
import { expect } from "chai";
import { ethers } from "hardhat";


describe("Register", function() {

  async function deployRegisterFixture () {

    const METADATA = "METADATA_URL" //set the METADATA for test

    const [admin, organisation, recordCreator, recordInvalidator, ...otherAccounts] = await ethers.getSigners();
    //get signers/accounts

    const Register = await ethers.getContractFactory("Register");
    const register = await Register.deploy(organisation.address, METADATA);

    return {register, organisation, METADATA, admin, recordCreator, recordInvalidator, otherAccounts};

  }

  describe("Deployment", function () {
      
      it("Should set the organisation", async function () {

        const { register, organisation } = await loadFixture(deployRegisterFixture);
  
        expect(await register.organisation()).to.equal(organisation.address);

      });

      it("Should set the metadata", async function () {

        const { register, METADATA } = await loadFixture(deployRegisterFixture);
  
        expect(await register.metadata()).to.equal(METADATA);

      });

      it("Should grant DEFAULT_ADMIN_ROLE, CAN_CREATE_RECORD_ROLE and CAN_INVALIDATE_RECORD_ROLE to the admin", async function () {

        const { register, admin } = await loadFixture(deployRegisterFixture);
        const DEFAULT_ADMIN_ROLE = await register.DEFAULT_ADMIN_ROLE(); //get DEFAULT_ADMIN_ROLE from register
        const CAN_CREATE_RECORD_ROLE = await register.CAN_CREATE_RECORD_ROLE(); //get CAN_CREATE_RECORD_ROLE from register
        const CAN_INVALIDATE_RECORD_ROLE = await register.CAN_INVALIDATE_RECORD_ROLE(); //get CAN_INVALIDATE_RECORD_ROLE from register

        expect(await register.hasRole(DEFAULT_ADMIN_ROLE, admin.address)).to.be.true;
        expect(await register.hasRole(CAN_CREATE_RECORD_ROLE, admin.address)).to.be.true;
        expect(await register.hasRole(CAN_INVALIDATE_RECORD_ROLE, admin.address)).to.be.true;
        //check if the admin was granted all roles

      });

  });

  describe("Roles", function () {

    it("Should grant CAN_CREATE_RECORD_ROLE to the account by the admin", async function () {

      const { register, recordCreator } = await loadFixture(deployRegisterFixture);
      const ACCOUNT_ADDRESS = recordCreator.address; //assign ACCOUNT_ADDRESS to the recordCreator address
      const CAN_CREATE_RECORD_ROLE = await register.CAN_CREATE_RECORD_ROLE(); //get CAN_CREATE_RECORD_ROLE from register

      await register.grantRole(CAN_CREATE_RECORD_ROLE, ACCOUNT_ADDRESS); //grant CAN_CREATE_RECORD_ROLE to recordCreator

      expect(await register.hasRole(CAN_CREATE_RECORD_ROLE, ACCOUNT_ADDRESS)).to.be.true; //check if the role was assigned

    });

    it("Should grant CAN_INVALIDATE_RECORD_ROLE to the account by the admin", async function () {

      const { register, recordInvalidator } = await loadFixture(deployRegisterFixture);
      const ACCOUNT_ADDRESS = recordInvalidator.address;
      const CAN_INVALIDATE_RECORD_ROLE = await register.CAN_INVALIDATE_RECORD_ROLE();

      await register.grantRole(CAN_INVALIDATE_RECORD_ROLE, ACCOUNT_ADDRESS);

      expect(await register.hasRole(CAN_INVALIDATE_RECORD_ROLE, ACCOUNT_ADDRESS)).to.be.true;

    });

    it("Not the admin should not be able to grant any role", async function () {

      const { register, otherAccounts } = await loadFixture(deployRegisterFixture);
      const ACCOUNT_ADDRESS = otherAccounts[1].address; //assignes ACCOUNT_ADDRESS to some test user account
      const CAN_CREATE_RECORD_ROLE = await register.CAN_CREATE_RECORD_ROLE(); //get CAN_CREATE_RECORD_ROLE from register
      const CAN_INVALIDATE_RECORD_ROLE = await register.CAN_INVALIDATE_RECORD_ROLE(); //get CAN_INVALIDATE_RECORD_ROLE from register

      await expect(register.connect(otherAccounts[0]).grantRole(CAN_CREATE_RECORD_ROLE, ACCOUNT_ADDRESS)).to.be.reverted;
      //check whether the transaction is reverted in case if the caller is not admin
      //verify that random user cannot grant any role

      await expect(register.connect(otherAccounts[0]).grantRole(CAN_INVALIDATE_RECORD_ROLE, ACCOUNT_ADDRESS)).to.be.reverted;

    });

  });


  describe("Records", function () {
    
    const DOCUMENT_HASH = "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";
    const SOURCE_DOCUMENT = "SOURCE_DOCUMENT_URL";
    const REFERENCE_DOCUMENT = "REFERENCE_DOCUMENT_URL";
    const STARTS_AT = 0;
    const EXPIRES_AT = 0;
    const PAST_DOCUMENT_HASH = "0x0000000000000000000000000000000000000000000000000000000000000000";
    const NULL_HASH = '0x0000000000000000000000000000000000000000000000000000000000000000';
    const NULL_ADDRESS = '0x0000000000000000000000000000000000000000';
    const SECOND_DOCUMENT_HASH = '0x7894567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
    const THIRD_DOCUMENT_HASH = '0x5464567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
    //set record data for the test

    describe("Events", function () {

      it("Should emit an event on record creation", async function () {
  
        const { register } = await loadFixture(deployRegisterFixture);
  
        await expect(register.createRecord(
  
          DOCUMENT_HASH,
          SOURCE_DOCUMENT,
          REFERENCE_DOCUMENT,
          STARTS_AT,
          EXPIRES_AT,
          PAST_DOCUMENT_HASH
  
        ))
  
        .to.emit(register, "RecordCreated")
        .withArgs(DOCUMENT_HASH);
  
      });

      it("Should emit an event on record update (for either previous record or just record)", async function () {
    
        const { register, recordCreator, recordInvalidator } = await loadFixture(deployRegisterFixture);
        const CAN_CREATE_RECORD_ROLE = await register.CAN_CREATE_RECORD_ROLE()
        const CAN_INVALIDATE_RECORD_ROLE = await register.CAN_INVALIDATE_RECORD_ROLE();

        await register.grantRole(CAN_INVALIDATE_RECORD_ROLE, recordInvalidator.address);
        await register.grantRole(CAN_CREATE_RECORD_ROLE, recordCreator.address);

        await register.connect(recordCreator).createRecord(

          DOCUMENT_HASH,
          SOURCE_DOCUMENT,
          REFERENCE_DOCUMENT,
          STARTS_AT,
          EXPIRES_AT,
          PAST_DOCUMENT_HASH

        )

        await expect(register.connect(recordCreator).createRecord(

          SECOND_DOCUMENT_HASH,
          SOURCE_DOCUMENT,
          REFERENCE_DOCUMENT,
          STARTS_AT,
          EXPIRES_AT,
          DOCUMENT_HASH

        ))
        .to.emit(register, "RecordUpdated")
        .withArgs(DOCUMENT_HASH);

        await expect(register.connect(recordInvalidator).invalidateRecord(SECOND_DOCUMENT_HASH))
        .to.emit(register, "RecordUpdated")
        .withArgs(SECOND_DOCUMENT_HASH);

      });

      it("Should emit an event on record invalidation", async function () {
    
        const { register, recordInvalidator, recordCreator } = await loadFixture(deployRegisterFixture);
        const CAN_INVALIDATE_RECORD_ROLE = await register.CAN_INVALIDATE_RECORD_ROLE();
        const CAN_CREATE_RECORD_ROLE = await register.CAN_CREATE_RECORD_ROLE() //get CAN_CREATE_RECORD_ROLE from register
  
        await register.grantRole(CAN_CREATE_RECORD_ROLE, recordCreator.address);
        await register.grantRole(CAN_INVALIDATE_RECORD_ROLE, recordInvalidator.address);

        await register.connect(recordCreator).createRecord(
  
          DOCUMENT_HASH,
          SOURCE_DOCUMENT,
          REFERENCE_DOCUMENT,
          STARTS_AT,
          EXPIRES_AT,
          PAST_DOCUMENT_HASH
  
        )

        await expect(register.connect(recordInvalidator).invalidateRecord(DOCUMENT_HASH))
        .to.emit(register, "RecordInvalidated")
        .withArgs(DOCUMENT_HASH);

      });

    });

    describe("New record creation", function () {

      it("Should create a new record by the responsible record creator", async function () {

        const { register, recordCreator } = await loadFixture(deployRegisterFixture);
        const CAN_CREATE_RECORD_ROLE = await register.CAN_CREATE_RECORD_ROLE() //get CAN_CREATE_RECORD_ROLE from register
  
        await register.grantRole(CAN_CREATE_RECORD_ROLE, recordCreator.address);
        //grant CAN_CREATE_RECORD_ROLE to recordCreator account by admin
        await register.connect(recordCreator).createRecord(
  
          DOCUMENT_HASH,
          SOURCE_DOCUMENT,
          REFERENCE_DOCUMENT,
          STARTS_AT,
          EXPIRES_AT,
          PAST_DOCUMENT_HASH
  
        )
        const record = await register.records(DOCUMENT_HASH);
        //create a record with provided metadata but from recordCreator account
                
        expect(record).not.to.be.null;
        expect(record.creator).to.equal(recordCreator.address);   
        expect(record.sourceDocument).to.equal(SOURCE_DOCUMENT);
        expect(record.referenceDocument).to.equal(REFERENCE_DOCUMENT);
        expect(record.startsAt).to.equal(STARTS_AT);
        expect(record.expiresAt).to.equal(EXPIRES_AT);
        expect(record.pastDocumentHash).to.equal(PAST_DOCUMENT_HASH);
        //check if the data in record is the same as was provided
  
      });

      it("Should not create a record given the document hash that already exists", async function () {

        const { register, recordCreator } = await loadFixture(deployRegisterFixture);
        const CAN_CREATE_RECORD_ROLE = await register.CAN_CREATE_RECORD_ROLE() //get CAN_CREATE_RECORD_ROLE from register
  
        await register.grantRole(CAN_CREATE_RECORD_ROLE, recordCreator.address);
        //grant CAN_CREATE_RECORD_ROLE to recordCreator account by admin
        await register.connect(recordCreator).createRecord(
  
          DOCUMENT_HASH,
          SOURCE_DOCUMENT,
          REFERENCE_DOCUMENT,
          STARTS_AT,
          EXPIRES_AT,
          PAST_DOCUMENT_HASH
  
        )
        
        await expect(register.connect(recordCreator).createRecord(
  
          DOCUMENT_HASH,
          SOURCE_DOCUMENT,
          REFERENCE_DOCUMENT,
          STARTS_AT,
          EXPIRES_AT,
          PAST_DOCUMENT_HASH
  
        ))
        .to.be.reverted
  
      });

      it("Should not create a new record if called not by the responsible record creator", async function () {

        const { register, otherAccounts } = await loadFixture(deployRegisterFixture);
  
        await expect(register.connect(otherAccounts[0]).createRecord(
  
          DOCUMENT_HASH,
          SOURCE_DOCUMENT,
          REFERENCE_DOCUMENT,
          STARTS_AT,
          EXPIRES_AT,
          PAST_DOCUMENT_HASH
  
        )).to.be.reverted;
        //check whether the transaction is reverted in case if the caller has no CAN_CREATE_RECORD_ROLE
        //verify that random user cannot create a new record
  
      });

    });

    describe("Record invalidation", function () {

      it("Should invalidate a record by the responsible record invalidator", async function () {

        const { register, recordInvalidator, recordCreator } = await loadFixture(deployRegisterFixture);
        const CAN_INVALIDATE_RECORD_ROLE = await register.CAN_INVALIDATE_RECORD_ROLE();
        const CAN_CREATE_RECORD_ROLE = await register.CAN_CREATE_RECORD_ROLE() //get CAN_CREATE_RECORD_ROLE from register
  
        await register.grantRole(CAN_CREATE_RECORD_ROLE, recordCreator.address);
        await register.grantRole(CAN_INVALIDATE_RECORD_ROLE, recordInvalidator.address);

        await register.connect(recordCreator).createRecord(
  
          DOCUMENT_HASH,
          SOURCE_DOCUMENT,
          REFERENCE_DOCUMENT,
          STARTS_AT,
          EXPIRES_AT,
          PAST_DOCUMENT_HASH
  
        )

        await register.connect(recordInvalidator).invalidateRecord(DOCUMENT_HASH);
        //call the invalidateRecord function by the recordInvalidator
        const record = await register.records(DOCUMENT_HASH);
        //get the record
  
        expect(record.expiresAt).to.not.equal(0);
        expect(record.updatedAt).to.not.equal(0);
        expect(record.expiresAt).to.equal(record.updatedAt);
  
      });

      it("Should not invalidate already invalidated/expired record", async function () {

        const { register, recordInvalidator, recordCreator } = await loadFixture(deployRegisterFixture);
        const CAN_INVALIDATE_RECORD_ROLE = await register.CAN_INVALIDATE_RECORD_ROLE();
        const CAN_CREATE_RECORD_ROLE = await register.CAN_CREATE_RECORD_ROLE() //get CAN_CREATE_RECORD_ROLE from register
  
        await register.grantRole(CAN_CREATE_RECORD_ROLE, recordCreator.address);
        await register.grantRole(CAN_INVALIDATE_RECORD_ROLE, recordInvalidator.address);

        await register.connect(recordCreator).createRecord(
  
          DOCUMENT_HASH,
          SOURCE_DOCUMENT,
          REFERENCE_DOCUMENT,
          STARTS_AT,
          EXPIRES_AT,
          PAST_DOCUMENT_HASH
  
        )

        await register.connect(recordInvalidator).invalidateRecord(DOCUMENT_HASH);
        //call the invalidateRecord function by the recordInvalidator
        
        await expect(register.connect(recordInvalidator).invalidateRecord(DOCUMENT_HASH)).to.be.reverted;
  
      });

      it("Should not invalidate a record if called not by the responsible record invalidator", async function () {

        const { register, recordCreator, otherAccounts } = await loadFixture(deployRegisterFixture);
        const CAN_CREATE_RECORD_ROLE = await register.CAN_CREATE_RECORD_ROLE() //get CAN_CREATE_RECORD_ROLE from register
  
        await register.grantRole(CAN_CREATE_RECORD_ROLE, recordCreator.address);

        await register.connect(recordCreator).createRecord(
  
          DOCUMENT_HASH,
          SOURCE_DOCUMENT,
          REFERENCE_DOCUMENT,
          STARTS_AT,
          EXPIRES_AT,
          PAST_DOCUMENT_HASH
  
        )
  
        await expect(register.connect(otherAccounts[0]).invalidateRecord(DOCUMENT_HASH)).to.be.reverted;
  
      });

    });

    describe("New record attachment", function () {

      it("Should create a new record attached to another record by the responsible record creator", async function () {

        const { register, recordCreator } = await loadFixture(deployRegisterFixture);
        const CAN_CREATE_RECORD_ROLE = await register.CAN_CREATE_RECORD_ROLE() //get CAN_CREATE_RECORD_ROLE from register
  
        await register.grantRole(CAN_CREATE_RECORD_ROLE, recordCreator.address);
        //grant CAN_CREATE_RECORD_ROLE to recordCreator account by admin
  
        await register.connect(recordCreator).createRecord(
  
          DOCUMENT_HASH,
          SOURCE_DOCUMENT,
          REFERENCE_DOCUMENT,
          STARTS_AT,
          EXPIRES_AT,
          PAST_DOCUMENT_HASH
  
        )
  
        await register.connect(recordCreator).createRecord(
  
          SECOND_DOCUMENT_HASH,
          SOURCE_DOCUMENT,
          REFERENCE_DOCUMENT,
          STARTS_AT,
          EXPIRES_AT,
          DOCUMENT_HASH
  
        )
  
        const record = await register.records(DOCUMENT_HASH);
        //get the record
  
        expect(record.updater).to.equal(recordCreator.address);
        expect(record.expiresAt).to.not.equal(0);
        expect(record.updatedAt).to.not.equal(0);
        expect(record.nextDocumentHash).to.equal(SECOND_DOCUMENT_HASH);
        //check if the data in firstRecord was changed correctly
  
        const nextRecord = await register.records(SECOND_DOCUMENT_HASH);
  
        expect(nextRecord).not.to.be.null;
        expect(nextRecord.creator).to.equal(recordCreator.address);   
        expect(nextRecord.sourceDocument).to.equal(SOURCE_DOCUMENT);
        expect(nextRecord.referenceDocument).to.equal(REFERENCE_DOCUMENT);
        expect(nextRecord.startsAt).to.equal(STARTS_AT);
        expect(nextRecord.expiresAt).to.equal(EXPIRES_AT);
        expect(nextRecord.pastDocumentHash).to.equal(DOCUMENT_HASH);
        //check if the data in secondRecord is the same as was provided
  
      });
  
      it("Should not attach a record to the record which already has another record attached to it", async function () {
  
        const { register, recordCreator } = await loadFixture(deployRegisterFixture);
        const CAN_CREATE_RECORD_ROLE = await register.CAN_CREATE_RECORD_ROLE() //get CAN_CREATE_RECORD_ROLE from register
  
        await register.grantRole(CAN_CREATE_RECORD_ROLE, recordCreator.address);
        //grant CAN_CREATE_RECORD_ROLE to recordCreator account by admin
  
        await register.connect(recordCreator).createRecord(
  
          DOCUMENT_HASH,
          SOURCE_DOCUMENT,
          REFERENCE_DOCUMENT,
          STARTS_AT,
          EXPIRES_AT,
          PAST_DOCUMENT_HASH
  
        )
        
        await register.connect(recordCreator).createRecord(
  
          SECOND_DOCUMENT_HASH,
          SOURCE_DOCUMENT,
          REFERENCE_DOCUMENT,
          STARTS_AT,
          EXPIRES_AT,
          DOCUMENT_HASH
  
        )
  
        await expect(register.connect(recordCreator).createRecord(
  
          THIRD_DOCUMENT_HASH,
          SOURCE_DOCUMENT,
          REFERENCE_DOCUMENT,
          STARTS_AT,
          EXPIRES_AT,
          DOCUMENT_HASH
  
        )).to.be.reverted;
  
      });
  
      it("Should not update a 0x00 previous record when the newly created record has no previous record", async function () {
  
        const { register, recordCreator } = await loadFixture(deployRegisterFixture);
        const CAN_CREATE_RECORD_ROLE = await register.CAN_CREATE_RECORD_ROLE() //get CAN_CREATE_RECORD_ROLE from register
  
        await register.grantRole(CAN_CREATE_RECORD_ROLE, recordCreator.address);
        //grant CAN_CREATE_RECORD_ROLE to recordCreator account by admin
  
        await register.connect(recordCreator).createRecord(
  
          DOCUMENT_HASH,
          SOURCE_DOCUMENT,
          REFERENCE_DOCUMENT,
          STARTS_AT,
          EXPIRES_AT,
          PAST_DOCUMENT_HASH
  
        )
  
        const record = await register.records(PAST_DOCUMENT_HASH);
        //get the 0x00 record
  
        expect(record.updater).to.equal(NULL_ADDRESS);
        expect(record.createdAt).to.equal(0);
        expect(record.updatedAt).to.equal(0);
        expect(record.nextDocumentHash).to.equal(NULL_HASH);
        //check if the data in 0x00 record is unchanged
  
      });
  
      it("Should not create a new attached record if at the previousDocumentHash there is no record", async function () {
  
        const { register, recordCreator } = await loadFixture(deployRegisterFixture);
        const CAN_CREATE_RECORD_ROLE = await register.CAN_CREATE_RECORD_ROLE() //get CAN_CREATE_RECORD_ROLE from register
  
        await register.grantRole(CAN_CREATE_RECORD_ROLE, recordCreator.address);
        //grant CAN_CREATE_RECORD_ROLE to recordCreator account by admin
  
        await expect(register.connect(recordCreator).createRecord(
  
          DOCUMENT_HASH,
          SOURCE_DOCUMENT,
          REFERENCE_DOCUMENT,
          STARTS_AT,
          EXPIRES_AT,
          THIRD_DOCUMENT_HASH
  
        ))
        .to.be.reverted
  
      });

      it("Should not create a new record attached to another record if called not by the responsible record creator", async function () {

        const { register, otherAccounts } = await loadFixture(deployRegisterFixture);
  
        await register.createRecord(
  
          DOCUMENT_HASH,
          SOURCE_DOCUMENT,
          REFERENCE_DOCUMENT,
          STARTS_AT,
          EXPIRES_AT,
          PAST_DOCUMENT_HASH
  
        )
        
        await expect(register.connect(otherAccounts[0]).createRecord(
  
          SECOND_DOCUMENT_HASH,
          SOURCE_DOCUMENT,
          REFERENCE_DOCUMENT,
          STARTS_AT,
          EXPIRES_AT,
          DOCUMENT_HASH
  
        )).to.be.reverted;
  
      });

    });
  
  });

});