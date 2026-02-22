const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
    console.log("Seeding database with mockup data...");

    // Clean up existing data first
    await prisma.transaction.deleteMany({});
    await prisma.villaOwner.deleteMany({});

    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth();

    // 1. Create Villa Owners modeled from the spreadsheet photo
    const ownersData = [
        { name: "Fandi Iskandar Johan", unitNumber: "2-5", monthlyDues: 5000000 },
        { name: "Earl Heighton", unitNumber: "4", monthlyDues: 1300000 },
        { name: "Dr. Fredy", unitNumber: "6", monthlyDues: 3600000 },
        { name: "Denis Van Mourik", unitNumber: "7", monthlyDues: 1300000 },
        { name: "Wendy", unitNumber: "9", monthlyDues: 1300000 },
        { name: "Bert Stam", unitNumber: "10", monthlyDues: 1300000 },
        { name: "Roberts", unitNumber: "12", monthlyDues: 650000 },
        { name: "Shelly", unitNumber: "13", monthlyDues: 1300000 },
        { name: "Cecilian", unitNumber: "14", monthlyDues: 1000000 },
        { name: "Rudy", unitNumber: "18", monthlyDues: 800000 },
        { name: "Magda", unitNumber: "19", monthlyDues: 1300000 }, // Extrapolated from the photo sample
        { name: "Ian Drysale", unitNumber: "21", monthlyDues: 1300000 },
        { name: "Diana", unitNumber: "22", monthlyDues: 1300000 },
    ];

    const owners = [];
    for (const data of ownersData) {
        const owner = await prisma.villaOwner.create({ data });
        owners.push(owner);
    }
    console.log(`Created ${owners.length} owners.`);

    // 2. Add randomized mockup transactions for each owner (Income)
    // Only adding up to the current month to make unpaid dues realistic
    const transactions = [];
    for (const owner of owners) {
        for (let month = 0; month <= currentMonth; month++) {
            // Give them a 70% chance of having paid for this month
            if (Math.random() > 0.3) {
                // Determine a date somewhere in the middle of the month
                const day = Math.floor(Math.random() * 20) + 1;
                const d = new Date(currentYear, month, day);
                transactions.push({
                    type: "INCOME",
                    amount: owner.monthlyDues, // Paid exactly their dues
                    date: d,
                    description: `Monthly dues - ${owner.name}`,
                    category: "Income",
                    ownerId: owner.id,
                });
            }
        }
    }

    // 3. Add random Expense transactions
    const expenseCategories = [
        "Wages",
        "Village Expenses",
        "Bank Charges",
        "Computer Office",
        "Electric Water",
        "Repairs Maintain",
        "Garden Expenses",
        "Misc Expenses"
    ];

    for (let month = 0; month <= currentMonth; month++) {
        // Staff salary (monthly)
        transactions.push({
            type: "EXPENSE",
            amount: 27935000,
            date: new Date(currentYear, month, 28), // End of month
            description: "Salary Staff",
            category: "Wages",
            ownerId: null,
        });

        // Electricity
        transactions.push({
            type: "EXPENSE",
            amount: 1013000 + Math.floor(Math.random() * 200000),
            date: new Date(currentYear, month, 17),
            description: "Electricity",
            category: "Electric Water",
            ownerId: null,
        });

        // Water
        transactions.push({
            type: "EXPENSE",
            amount: 422000 + Math.floor(Math.random() * 50000),
            date: new Date(currentYear, month, 17),
            description: "Water",
            category: "Electric Water",
            ownerId: null,
        });

        // Misc/Rubbish
        transactions.push({
            type: "EXPENSE",
            amount: 440000,
            date: new Date(currentYear, month, 28),
            description: "Rubbish",
            category: "Misc Expenses",
            ownerId: null,
        });

        // Occasional repairs
        if (Math.random() > 0.5) {
            transactions.push({
                type: "EXPENSE",
                amount: 200000 + Math.floor(Math.random() * 500000),
                date: new Date(currentYear, month, 8),
                description: "Repair street light",
                category: "Repairs Maintain",
                ownerId: null,
            });
        }
    }

    for (const tData of transactions) {
        await prisma.transaction.create({ data: tData });
    }
    console.log(`Created ${transactions.length} transactions.`);

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
