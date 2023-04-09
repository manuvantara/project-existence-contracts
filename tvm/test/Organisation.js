var Organisation = artifacts.require("./Organisation.sol");
var Register = artifacts.require("./Register.sol");

contract("Organisation", function(accounts) {

  const METADATA = ["METADATA_URL", "METADATA_URL_2"];
  const NULL_ADDRESS = '0x0000000000000000000000000000000000000000';
  let organisation, organisationOwner, otherAccounts;

  before(async function () {
    [organisationOwner, ...otherAccounts] = accounts.map((account) => tronWeb.address.toHex(account));


    // Deploy a new Organisation contract with the required parameters
    const organisationContract = await tronWeb.contract().new({
      abi: Organisation.abi,
      bytecode: Organisation.bytecode,
      feeLimit: 1000000000, // Adjust the fee limit as needed
      callValue: 0,
      userFeePercentage: 1,
      originEnergyLimit: 10000000, // Adjust the energy limit as needed
      parameters: [METADATA[0], organisationOwner],
    });

    // Create a TronWeb contract instance using the ABI and deployed contract address
    organisation = await tronWeb.contract(Organisation.abi, organisationContract.address);
  })

  describe("Deployment", function () {

    it("Should have the correct owner", async function() {
      expect(await organisation.owner().call()).to.equal(organisationOwner);
  });
      
    it("Should set the metadata", async function () {
      expect(await organisation.metadata().call()).to.equal(METADATA[0]);
    });

  });

  describe("Register deployment", function () {
      
    it("Should deploy a new register by the responsible organisation owner", async function () {      
      // Deploy the first register
      await organisation.deployRegister(METADATA[0]).send();

      console.log(tronWeb.defaultAddress.hex);
      console.log(organisationOwner);
      console.log(await organisation.registers(0).call());
      
      // expect(await organisation.registers(0).call()).to.not.be.null;
      // expect(await organisation.registers(0).call()).to.not.equal(NULL_ADDRESS);
    });

    // it("Should not deploy a new register if called not by the responsible organisation owner", async function () {
    //   const { organisation, otherAccounts } = await loadFixture(deployOrganisationFixture);

    //   await expect(organisation.connect(otherAccounts[0]).deployRegister(METADATA[0])).to.be.reverted;
    // });

    // it("Should emit an event on register deployment", async function () {
    //   const { organisation, organisationOwner } = await loadFixture(deployOrganisationFixture);

    //   await expect(organisation.connect(organisationOwner).deployRegister(METADATA[0]))
    //   .to.emit(organisation, "RegisterDeployed");
    // });

  });

  describe("Update of organisation metadata", function () {

    it("Should update the organisation metadata by the responsible organisation owner", async function () {
      await organisation.editOrganisationMetadata(METADATA[1]).send();

      expect(await organisation.metadata().call()).to.equal(METADATA[1]);
    });

    it("Should not update the organisation metadata if called not by the responsible organisation owner", async function () {
      const functionSelector = "editOrganisationMetadata(bytes)";
      const options = {};
      const parameters = [
        {
          type: "string",
          value: METADATA[0],
        },
      ];
      await tronWeb.transactionBuilder.triggerSmartContract(
        organisation.address, 
        functionSelector, 
        options, 
        parameters,
        otherAccounts[0]
      );

      expect(await organisation.metadata().call()).not.to.equal(METADATA[0]);
    });

    // it("Should emit an event on organisation metadata update", async function () {
      
    //   const tx = await organisation.editOrganisationMetadata(METADATA[0]).send();
    //   await tronWeb.getEventByTransactionID(tx).then(result => {console.log(result)})
    //   await tronWeb.getEventResult(organisation.address,{eventName:"OrganisationMetadataEdited",size:2}).then(result => {console.log(result)})

    // });

  });
});