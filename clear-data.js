const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
    console.log("Clearing all data from the database...");

    // Delete all transactions and file entries if any
    await prisma.transaction.deleteMany({});

    // Check if we also need to delete FileEntry or AdminUser, but usually users mean the main content
    // Let's delete FileEntry just in case
    await prisma.fileEntry.deleteMany({});

    // Delete all owners
    await prisma.villaOwner.deleteMany({});

    console.log("All data cleared successfully.");
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
