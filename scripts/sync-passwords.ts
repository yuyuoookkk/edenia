import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/lib/auth";

const prisma = new PrismaClient();

async function main() {
    console.log("Setting default passwords for all owners...");
    
    const owners = await prisma.villaOwner.findMany();
    
    for (const owner of owners) {
        // The password will be the unit number, or 'password' if there's no unit number
        const defaultPassword = owner.unitNumber || "password";
        const hashedPassword = hashPassword(defaultPassword);
        
        await prisma.villaOwner.update({
            where: { id: owner.id },
            data: { passwordHash: hashedPassword }
        });
        
        console.log(`Updated owner ${owner.name} (Unit: ${owner.unitNumber}) with password: ${defaultPassword}`);
    }
    
    console.log("Password sync complete.");
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
