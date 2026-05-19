import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const causes = [
    {
      id: 1,
      name: "Plant Trees",
      description: "Restore forests and fight climate change one tree at a time across six continents.",
      wallet: "0x71C7656EC7ab88b098defB751B7401B5f6d8976F",
      icon: "🌳",
      tag: "Environmental",
      goalUsd: new Prisma.Decimal("50000"),
      active: true,
    },
    {
      id: 2,
      name: "Clean Water",
      description: "Bring safe drinking water to communities in need — no one should die of thirst.",
      wallet: "0x2546BcD3c84621e976D8185a91A922aE77ECEc30",
      icon: "💧",
      tag: "Humanitarian",
      goalUsd: new Prisma.Decimal("100000"),
      active: true,
    },
    {
      id: 3,
      name: "Education Fund",
      description: "Empower the next generation with access to quality education and digital literacy.",
      wallet: "0xbDA5747bFD65F08deb54cb465eB87D40e51B197E",
      icon: "📚",
      tag: "Education",
      goalUsd: new Prisma.Decimal("30000"),
      active: true,
    },
  ];

  for (const cause of causes) {
    await prisma.cause.upsert({
      where: { id: cause.id },
      update: {
        name: cause.name,
        description: cause.description,
        wallet: cause.wallet,
        icon: cause.icon,
        tag: cause.tag,
        goalUsd: cause.goalUsd,
        active: cause.active,
      },
      create: cause,
    });
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
