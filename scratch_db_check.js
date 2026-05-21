import { PrismaClient } from "@prisma/client";

async function main() {
  const prisma = new PrismaClient();
  try {
    const donors = await prisma.donor.findMany();
    const donations = await prisma.donation.findMany();
    
    console.log("=== Donors in Database ===");
    console.log(donors);
    
    console.log("\n=== Donations in Database ===");
    console.log(donations);
  } catch (error) {
    console.error("Error reading database:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
