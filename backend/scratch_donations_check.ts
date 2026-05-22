import { prisma } from "./src/services/prisma.js";

async function main() {
  try {
    const donations = await prisma.donation.findMany({
      include: {
        cause: true
      }
    });
    console.log("=== Donations in Database ===");
    console.log(JSON.stringify(donations, null, 2));
  } catch (error) {
    console.error("Error reading database:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
