import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
    console.log("Checking for owners...");
    const owners = await prisma.villaOwner.findMany();
    console.log(`Found ${owners.length} owners.`);
    for (const owner of owners) {
        console.log(`- Unit: "${owner.unitNumber}", Name: "${owner.name}"`);
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
