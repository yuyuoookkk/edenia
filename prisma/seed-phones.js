const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

// Phone number mapping from guard names
const phoneMap = {
  "I Wayan Deniya": "087717307903",
  "I Wayan Sukawan": "085737400900",
  "I Made Mudiana": "081338203764",
  "I Made Suada": "081239906171",
  "I Ketut Sukerti": "081547233920",
  "I Wayan Liyang": "081338541402",
  "I Wayan Swadarma": "085829299002",
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
