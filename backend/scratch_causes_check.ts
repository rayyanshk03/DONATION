import { prisma } from "./src/services/prisma.js";

async function main() {
  try {
    const causes = await prisma.cause.findMany();
    console.log("=== Causes in Database ===");
    console.log(JSON.stringify(causes, null, 2));
  } catch (error) {
    console.error("Error reading database:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
