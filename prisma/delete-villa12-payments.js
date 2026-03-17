const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    // Find Villa 12 owner
    const owner = await prisma.villaOwner.findFirst({
        where: { unitNumber: '12' },
    });

    if (!owner) {
        console.log('Villa 12 owner not found');
        return;
    }

    console.log(`Found owner: ${owner.name} (Villa ${owner.unitNumber})`);

    // Delete all INCOME transactions for this owner
    const result = await prisma.transaction.deleteMany({
        where: {
            ownerId: owner.id,
            type: 'INCOME',
        },
    });

    console.log(`Deleted ${result.count} income transactions for Villa 12`);
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
