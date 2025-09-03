const hre = require("hardhat");
const { ethers } = hre;
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("Deploying USA 2028 Voting Contract...");

  const USA2028Voting = await ethers.getContractFactory("USA2028Voting");
  const votingContract = await USA2028Voting.deploy();

  await votingContract.waitForDeployment();
  const address = await votingContract.getAddress();

  console.log("USA 2028 Voting Contract deployed to:", address);
  console.log("Contract owner:", await votingContract.owner());

  // Persist contract address for frontend usage
  try {
    const outDir = path.join(process.cwd(), "frontend", "src", "contracts");
    const addrFile = path.join(outDir, "contract-address.json");
    const data = {
      address,
      network: (hre.network && hre.network.name) || "localhost",
      deployedAt: new Date().toISOString()
    };
    fs.writeFileSync(addrFile, JSON.stringify(data, null, 2));
    console.log(`Wrote ${addrFile}`);

    // Also write CRA env for convenience
    const envPath = path.join(process.cwd(), "frontend", ".env.local");
    const envContent = `REACT_APP_CONTRACT_ADDRESS=${address}\n`;
    fs.writeFileSync(envPath, envContent);
    console.log(`Wrote ${envPath}`);
  } catch (e) {
    console.warn("Warning: failed to write frontend address files:", e.message);
  }

  // Get initial party count
  const partyCount = await votingContract.getPartyCount();
  console.log("Initial party count:", partyCount.toString());

  // Display initial parties
  for (let i = 0; i < partyCount; i++) {
    const party = await votingContract.getParty(i);
    console.log(`Party ${i}: ${party.name} - ${party.candidateName}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
