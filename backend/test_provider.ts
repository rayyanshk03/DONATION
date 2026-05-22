import { ethers } from "ethers";
import { env } from "./src/config/env.js";

async function main() {
  try {
    const provider = new ethers.JsonRpcProvider(env.rpcUrl, 84532, { staticNetwork: ethers.Network.from(84532) });
    const block = await provider.getBlockNumber();
    console.log("Static provider works! Current block:", block);
  } catch (error) {
    console.error("Static provider failed:", error);
  }
}

main();
