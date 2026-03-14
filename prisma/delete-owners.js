const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const UNITS_TO_DELETE = ['16', '17', '30', '33', '34', '35', '36'];

async function main() {
  const owners = await prisma.villaOwner.findMany({
    where: { unitNumber: { in: UNITS_TO_DELETE } },
    select: { id: true, unitNumber: true, name: true }
  });

  console.log(`Found ${owners.length} owners to delete:`);
  owners.forEach(o => console.log(`  Villa ${o.unitNumber} - ${o.name}`));

  for (const owner of owners) {
    // Delete related records first
    const delTxn = await prisma.transaction.deleteMany({ where: { ownerId: owner.id } });
    const delLog = await prisma.visitorLog.deleteMany({ where: { ownerId: owner.id } });
    await prisma.villaOwner.delete({ where: { id: owner.id } });
    console.log(`Deleted Villa ${owner.unitNumber} (${delTxn.count} transactions, ${delLog.count} visitor logs)`);
  }

  console.log('Done!');
}

main().catch(console.error).finally(() => prisma.$disconnect());
