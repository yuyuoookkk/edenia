const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Villa number → email mapping (exactly as provided by the user)
const villaEmails = {
    "2": "fandi1884@gmail.com",
    "3": "Wyn_budiungasan@yahoo.com",
    "4": "Lavie.franck40@gmail.com",
    "5": "ewik_widya@yahoo.com",
    "6": "evatanusiska@gmail.com",
    "7": "dvm365@gmail.com",
    "8": "picker166@gmail.com",
    "9": "wendyhardingham@live.com.au",
    "10": "bert4all24@gmail.com",
    "11": "conggowati@yahoo.com",
    "12": "robjon12@gmail.com",
    "13": "donaclarissa98@icloud.com",
    "14": "Yan.tanuwidjaja@gmail.com",
    "15": "lieuikiat54@gmail.com",
    "18": "ruudvan@yahoo.com",
    "19": "Arlene.tuladhar@gmail.com",
    "20": "mhdreza.reza730@gmail.com",
    "21": "lenkasim@hotmail.com",
    "22": "priandika@yahoo.com",
    "23": "canabis78@yahoo.com",
    "24": "bert4all24@gmail.com",
    "25": "chrispotts@fastmail.com",
    "26": "cmarmagne@hotmail.com",
    "27": "encim@yahoo.com",
    "28": "fireberg1@bigpond.com",
    "29": "emabdg1@gmail.com",
    "31": "h3n520@yahoo.com",
    "32": "yohan_ykh@yahoo.com",
    "37": "tianggwanhan@gmail.com",
    "38": "jon.sandhamuk@gmail.com",
    "39": "hul.kuhn@gmail.com",
    "40": "marc.jarrault@gmail.com",
    "41": "jackolas84@yahoo.com",
    "42": "encim@yahoo.com",
};

async function main() {
    console.log("Seeding villa owner emails...\n");

    const owners = await prisma.villaOwner.findMany();
    let updated = 0;
    let skipped = 0;

    for (const owner of owners) {
        if (!owner.unitNumber) {
            console.log(`  SKIP: ${owner.name} (no unit number)`);
            skipped++;
            continue;
        }

        // Try matching the unit number — handle cases like "2-5" by checking the first number
        const firstNum = owner.unitNumber.match(/^\d+/);
        const key = firstNum ? firstNum[0] : owner.unitNumber;
        const email = villaEmails[key];

        if (email) {
            await prisma.villaOwner.update({
                where: { id: owner.id },
                data: { email },
            });
            console.log(`  ✓ Villa ${owner.unitNumber} (${owner.name}) → ${email}`);
            updated++;
        } else {
            console.log(`  - Villa ${owner.unitNumber} (${owner.name}) → no email provided`);
            skipped++;
        }
    }

    console.log(`\nDone! Updated: ${updated}, Skipped: ${skipped}`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
