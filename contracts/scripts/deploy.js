async function main() {
  const DonationVault = await ethers.getContractFactory("DonationVault");

  const vault = await DonationVault.deploy();

  await vault.deployed();

  console.log("DonationVault deployed to:", vault.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
