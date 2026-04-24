const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

// Phone number mapping from guard names
const phoneMap = {
  "I Wayan Deniya": "+6287717307903",
  "I Wayan Sukawan": "+6285737400900",
  "I Made Mudiana": "+6281338203764",
  "I Made Suada": "+6281239906171",
  "I Ketut Sukerti": "+6281547233920",
  "I Wayan Liyang": "+6281338541402",
  "I Wayan Swadarma": "+6285829299002",
};

async function main() {
  const guards = await prisma.securityGuard.findMany();

  for (const guard of guards) {
    // Try exact match first, then case-insensitive partial match
    let phone = phoneMap[guard.name];

    if (!phone) {
      const lowerName = guard.name.toLowerCase();
      for (const [key, value] of Object.entries(phoneMap)) {
        if (lowerName.includes(key.toLowerCase()) || key.toLowerCase().includes(lowerName)) {
          phone = value;
          break;
        }
      }
    }

    if (phone) {
      await prisma.securityGuard.update({
        where: { id: guard.id },
        data: { phone },
      });
      console.log(`✅ Updated ${guard.name} → ${phone}`);
    } else {
      console.log(`⚠️  No phone number found for ${guard.name}`);
    }
  }

  console.log("\nDone!");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
