import { prisma } from "./src/services/prisma.js";

async function main() {
  try {
    const donors = await prisma.donor.findMany();
    console.log("=== Donors in Database ===");
    console.log(donors);

    const causes = await prisma.cause.findMany();
    console.log("=== Causes in Database ===");
    console.log(causes);

    const donations = await prisma.donation.findMany();
    console.log("=== Donations in Database ===");
    console.log(donations);
  } catch (error) {
    console.error("Error reading database:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
