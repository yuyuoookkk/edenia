const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
    console.log("Syncing villa owners (units 2 to 42)...");

    // 1. Change "2-5" to "2"
    const existing25 = await prisma.villaOwner.findFirst({
        where: { unitNumber: "2-5" }
    });

    if (existing25) {
        console.log("Updating unit '2-5' to '2'...");
        await prisma.villaOwner.update({
            where: { id: existing25.id },
            data: { unitNumber: "2" }
        });
    }

    // Fetch all owners
    const allOwners = await prisma.villaOwner.findMany();
    const existingUnitNumbers = new Set(allOwners.map(o => o.unitNumber));

    // 2. Insert missing units from 2 to 42
    let addedCount = 0;
    for (let i = 2; i <= 42; i++) {
        const unitStr = i.toString();
        if (!existingUnitNumbers.has(unitStr)) {
            await prisma.villaOwner.create({
                data: {
                    name: `Unit ${unitStr}`,
                    unitNumber: unitStr,
                    monthlyDues: 0
                }
            });
            addedCount++;
        }
    }

    console.log(`Added ${addedCount} missing villa units to the database.`);
    console.log("Sync complete!");
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
