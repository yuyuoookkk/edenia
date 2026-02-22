const { PrismaClient } = require('@prisma/client');
const { createHmac, randomBytes } = require('crypto');

const prisma = new PrismaClient();
const ADMIN_SECRET = process.env.ADMIN_SECRET || "edenia-default-secret-change-me";

function hashPassword(password) {
    const salt = randomBytes(16).toString("hex");
    const hash = createHmac("sha256", salt).update(password).digest("hex");
    return `${salt}:${hash}`;
}

async function main() {
    console.log("Creating admin user...");
    const existingAdmin = await prisma.adminUser.findUnique({ where: { username: "admin" } });
    if (existingAdmin) {
        console.log("Admin user already exists.");
        return;
    }

    await prisma.adminUser.create({
        data: {
            username: "admin",
            passwordHash: hashPassword("admin123"), // Default password
        },
    });
    console.log("Admin user created (username: admin, password: admin123)");
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
