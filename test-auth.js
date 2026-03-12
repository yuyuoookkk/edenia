const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const adminUser = await prisma.adminUser.findFirst();
    console.log("AdminUser:", adminUser);
    
    const owner = await prisma.villaOwner.findFirst({ where: { unitNumber: "2-5" }});
    console.log("VillaOwner (2-5):", owner);
}

main().finally(() => prisma.$disconnect());
