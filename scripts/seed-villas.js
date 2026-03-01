const { PrismaClient } = require('@prisma/client');
const { createHmac, randomBytes } = require('crypto');

const prisma = new PrismaClient();

function hashPassword(password) {
    const salt = randomBytes(16).toString('hex');
    const hash = createHmac('sha256', salt).update(password).digest('hex');
    return `${salt}:${hash}`;
}

async function main() {
    console.log("Seeding villa owners 2-42 with pre-set passwords...\n");

    // Clear existing owners and transactions
    await prisma.transaction.deleteMany({});
    await prisma.villaOwner.deleteMany({});

    const owners = [];

    for (let i = 2; i <= 42; i++) {
        const villaNumber = String(i);
        const password = `villa${i}`;
        const passwordHash = hashPassword(password);

        const owner = await prisma.villaOwner.create({
            data: {
                name: `Villa ${villaNumber}`,
                unitNumber: villaNumber,
                passwordHash: passwordHash,
                monthlyDues: 1300000,
            }
        });

        owners.push({ villaNumber, password });
        console.log(`  Villa ${villaNumber.padEnd(3)} | Password: ${password}`);
    }

    console.log(`\nCreated ${owners.length} villa owners.`);
    console.log("\n--- Password Reference ---");
    console.log("All passwords follow the pattern: villa{number}");
    console.log("Example: Villa 2 → password is 'villa2'");
    console.log("         Villa 10 → password is 'villa10'");
    console.log("         Villa 42 → password is 'villa42'");
    console.log("--- Done ---");
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
