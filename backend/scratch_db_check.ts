import { prisma } from "./src/services/prisma.js";

async function main() {
  try {
    const donors = await prisma.donor.findMany();
    console.log("=== Donors in Database ===");
    console.log(donors);
  } catch (error) {
    console.error("Error reading database:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
