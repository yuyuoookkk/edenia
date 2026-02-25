import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
    console.log("Resetting all owner passwords to null...");
    
    await prisma.villaOwner.updateMany({
        data: { passwordHash: null }
    });
    
    console.log("Passwords have been reset. Owners must now create a password on first login.");
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
