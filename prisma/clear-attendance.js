const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  console.log("Clearing all attendance records...");
  const deleted = await prisma.attendanceRecord.deleteMany({});
  console.log(`Successfully deleted ${deleted.count} attendance records.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
