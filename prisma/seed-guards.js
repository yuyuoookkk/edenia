const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const guards = [
  {
    fingerprintId: 1,
    name: "Putu Darma",
    role: "Security 1",
    shift: "Day",
    shiftStart: "06:00",
  },
  {
    fingerprintId: 2,
    name: "Wayan Sudira",
    role: "Security 2",
    shift: "Night",
    shiftStart: "18:00",
  },
  {
    fingerprintId: 3,
    name: "Kadek Arta",
    role: "Security 3",
    shift: "Day",
    shiftStart: "06:00",
  },
];

async function main() {
  console.log("Seeding security guards...");

  for (const guard of guards) {
    const existing = await prisma.securityGuard.findUnique({
      where: { fingerprintId: guard.fingerprintId },
    });

    if (existing) {
      console.log(`  ✓ ${guard.name} already exists (FP ID: ${guard.fingerprintId})`);
    } else {
      await prisma.securityGuard.create({ data: guard });
      console.log(`  + Created ${guard.name} (FP ID: ${guard.fingerprintId})`);
    }
  }

  console.log("Done!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
