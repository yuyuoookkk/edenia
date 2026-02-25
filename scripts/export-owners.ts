import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
    console.log("-----------------------------------------");
    console.log("Villa Owner Default Passwords");
    console.log("-----------------------------------------");
    const owners = await prisma.villaOwner.findMany();
    
    for (const owner of owners) {
        const defaultPassword = owner.unitNumber || "password";
        console.log(`Name: ${owner.name.padEnd(25)} | Unit: ${(owner.unitNumber || "N/A").padEnd(4)} | Password: ${defaultPassword}`);
    }
    console.log("-----------------------------------------");
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
