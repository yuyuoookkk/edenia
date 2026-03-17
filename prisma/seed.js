const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
    console.log("Seeding database with production data...");

    // Clean up existing data first
    await prisma.transaction.deleteMany({});
    await prisma.villaOwner.deleteMany({});
    await prisma.monthlyBalance.deleteMany({});

    // 1. Create Villa Owners (all villas from production, excluding 16,17,30,33,34,35,36)
    // All villas have monthlyDues of 1,300,000
    const villaNumbers = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 31, 32, 37, 38, 39, 40, 41, 42];

    const owners = [];
    for (const num of villaNumbers) {
        const owner = await prisma.villaOwner.create({
            data: {
                name: `Villa ${num} Owner`,
                unitNumber: String(num),
                monthlyDues: 1300000,
            },
        });
        owners.push(owner);
    }
    console.log(`Created ${owners.length} villa owners.`);

    // Helper to find owner by unit number
    function findOwner(unitNum) {
        return owners.find(o => o.unitNumber === String(unitNum));
    }

    // 2. Add Income transactions matching production data exactly
    // Format: { villa, month (0-indexed), amount }
    const incomeData = [
        // Villa 2: FEB 1,300,000 | MAR 1,300,000
        { villa: 2, month: 1, amount: 1300000 },
        { villa: 2, month: 2, amount: 1300000 },
        // Villa 8: FEB 1,300,000 | MAR 1,300,000 | APR 1,300,000 | MAY 1,300,000
        { villa: 8, month: 1, amount: 1300000 },
        { villa: 8, month: 2, amount: 1300000 },
        { villa: 8, month: 3, amount: 1300000 },
        { villa: 8, month: 4, amount: 1300000 },
        // Villa 10: FEB 1,300,000
        { villa: 10, month: 1, amount: 1300000 },
        // Villa 11: FEB 1,300,000 | MAR 1,300,000
        { villa: 11, month: 1, amount: 1300000 },
        { villa: 11, month: 2, amount: 1300000 },
        // Villa 12: FEB 1,300,000 | MAR 1,300,000
        { villa: 12, month: 1, amount: 1300000 },
        { villa: 12, month: 2, amount: 1300000 },
        // Villa 13: FEB 1,300,000 | MAR 1,300,000
        { villa: 13, month: 1, amount: 1300000 },
        { villa: 13, month: 2, amount: 1300000 },
        // Villa 18: FEB 1,300,000 | MAR 1,300,000
        { villa: 18, month: 1, amount: 1300000 },
        { villa: 18, month: 2, amount: 1300000 },
        // Villa 23: FEB 1,300,000 | MAR 1,300,000
        { villa: 23, month: 1, amount: 1300000 },
        { villa: 23, month: 2, amount: 1300000 },
        // Villa 24: FEB 1,300,000
        { villa: 24, month: 1, amount: 1300000 },
        // Villa 25: FEB 1,300,000 | MAR 1,300,000
        { villa: 25, month: 1, amount: 1300000 },
        { villa: 25, month: 2, amount: 1300000 },
        // Villa 26: FEB 1,300,000 | MAR 1,300,000
        { villa: 26, month: 1, amount: 1300000 },
        { villa: 26, month: 2, amount: 1300000 },
        // Villa 29: FEB 1,300,000 | MAR 1,300,000
        { villa: 29, month: 1, amount: 1300000 },
        { villa: 29, month: 2, amount: 1300000 },
        // Villa 32: FEB 1,300,000 | MAR 1,300,000
        { villa: 32, month: 1, amount: 1300000 },
        { villa: 32, month: 2, amount: 1300000 },
        // Villa 38: FEB 1,300,000 | MAR 1,300,000
        { villa: 38, month: 1, amount: 1300000 },
        { villa: 38, month: 2, amount: 1300000 },
        // Villa 39: FEB 1,300,000 | MAR 1,300,000
        { villa: 39, month: 1, amount: 1300000 },
        { villa: 39, month: 2, amount: 1300000 },
        // Villa 40: FEB 1,300,000 | MAR 1,300,000
        { villa: 40, month: 1, amount: 1300000 },
        { villa: 40, month: 2, amount: 1300000 },
        // Villa 41: FEB 1,300,000 | MAR 1,300,000
        { villa: 41, month: 1, amount: 1300000 },
        { villa: 41, month: 2, amount: 1300000 },
    ];

    const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

    const transactions = [];

    for (const entry of incomeData) {
        const owner = findOwner(entry.villa);
        if (!owner) {
            console.warn(`Owner for villa ${entry.villa} not found, skipping.`);
            continue;
        }
        transactions.push({
            type: "INCOME",
            amount: entry.amount,
            date: new Date(2026, entry.month, 15), // Mid-month
            description: `Monthly dues - Villa ${entry.villa} (${MONTH_NAMES[entry.month]} 2026)`,
            category: "Income",
            ownerId: owner.id,
        });
    }

    // 3. Add Expense transactions matching production data exactly
    // From the Expenses Tracker screenshot:
    // JAN: Village Expenses 1,500,000
    // FEB: Wages 25,600,000, Village Expenses 1,500,000
    // MAR: Wages 54,700,000, Village Expenses 3,000,000

    // January expenses
    transactions.push({
        type: "EXPENSE",
        amount: 1500000,
        date: new Date(2026, 0, 15),
        description: "Village expenses - January",
        category: "Village Expenses",
        ownerId: null,
    });

    // February expenses
    transactions.push({
        type: "EXPENSE",
        amount: 25600000,
        date: new Date(2026, 1, 28),
        description: "Staff wages - February",
        category: "Wages",
        ownerId: null,
    });
    transactions.push({
        type: "EXPENSE",
        amount: 1500000,
        date: new Date(2026, 1, 15),
        description: "Village expenses - February",
        category: "Village Expenses",
        ownerId: null,
    });

    // March expenses
    transactions.push({
        type: "EXPENSE",
        amount: 54700000,
        date: new Date(2026, 2, 28),
        description: "Staff wages - March",
        category: "Wages",
        ownerId: null,
    });
    transactions.push({
        type: "EXPENSE",
        amount: 3000000,
        date: new Date(2026, 2, 15),
        description: "Village expenses - March",
        category: "Village Expenses",
        ownerId: null,
    });

    for (const tData of transactions) {
        await prisma.transaction.create({ data: tData });
    }
    console.log(`Created ${transactions.length} transactions (${incomeData.length} income + ${transactions.length - incomeData.length} expenses).`);

    // 4. Create Security Guards (keep existing)
    console.log("Seeding security guards...");
    const guards = [
        {
            fingerprintId: 1,
            name: "Putu Darma",
            role: "Security 1",
            shift: "Day",
            shiftStart: "06:00",
        },
        {
            fingerprintId: 2,
            name: "Wayan Sudira",
            role: "Security 2",
            shift: "Night",
            shiftStart: "18:00",
        },
        {
            fingerprintId: 3,
            name: "Kadek Arta",
            role: "Security 3",
            shift: "Day",
            shiftStart: "06:00",
        },
    ];

    for (const guard of guards) {
        const existing = await prisma.securityGuard.findUnique({
            where: { fingerprintId: guard.fingerprintId },
        });

        if (existing) {
            console.log(`  ✓ ${guard.name} already exists (FP ID: ${guard.fingerprintId})`);
        } else {
            await prisma.securityGuard.create({ data: guard });
            console.log(`  + Created ${guard.name} (FP ID: ${guard.fingerprintId})`);
        }
    }

    console.log("Seeding complete!");
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
