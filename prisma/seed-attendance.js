const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  // Get today's date in YYYY-MM-DD format (UTC+8)
  const now = new Date();
  const utc8 = new Date(now.getTime() + 8 * 60 * 60 * 1000);
  const today = utc8.toISOString().split("T")[0]; // "2026-03-13"

  console.log(`Seeding attendance records for date: ${today}`);

  // Get all guards
  const guards = await prisma.securityGuard.findMany();
  console.log(`Found ${guards.length} guards:`);
  guards.forEach((g) => console.log(`  - ${g.name} (${g.role}, ${g.shift} shift, ID: ${g.id})`));

  if (guards.length === 0) {
    console.log("No guards found! Run seed-guards.js first.");
    return;
  }

  // Delete existing attendance records for today (clean start)
  const deleted = await prisma.attendanceRecord.deleteMany({
    where: { date: today },
  });
  console.log(`Cleared ${deleted.count} existing records for today.`);

  // Create dummy attendance records:
  // - Putu Darma (Security 1, Day shift): Checked in at 06:02 — currently on duty
  // - Kadek Arta (Security 3, Day shift): Checked in at 05:58 (early) — currently on duty
  // - Wayan Sudira (Security 2, Night shift): Checked in last night at 18:05, checked out at 06:00

  const putu = guards.find((g) => g.fingerprintId === 1);
  const wayan = guards.find((g) => g.fingerprintId === 2);
  const kadek = guards.find((g) => g.fingerprintId === 3);

  if (putu) {
    await prisma.attendanceRecord.create({
      data: {
        guardId: putu.id,
        date: today,
        checkIn: new Date(`${today}T06:02:00+08:00`),
        checkOut: null,
        hoursWorked: null,
        status: "present",
      },
    });
    console.log(`✓ Putu Darma — Checked in at 06:02, currently ON DUTY`);
  }

  if (kadek) {
    await prisma.attendanceRecord.create({
      data: {
        guardId: kadek.id,
        date: today,
        checkIn: new Date(`${today}T05:58:00+08:00`),
        checkOut: null,
        hoursWorked: null,
        status: "present",
      },
    });
    console.log(`✓ Kadek Arta — Checked in at 05:58, currently ON DUTY`);
  }

  if (wayan) {
    // Wayan did a full night shift and already checked out
    const yesterday = new Date(utc8);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split("T")[0];

    await prisma.attendanceRecord.create({
      data: {
        guardId: wayan.id,
        date: yesterdayStr,
        checkIn: new Date(`${yesterdayStr}T18:05:00+08:00`),
        checkOut: new Date(`${today}T06:00:00+08:00`),
        hoursWorked: 11.92,
        status: "present",
      },
    });
    console.log(`✓ Wayan Sudira — Night shift yesterday 18:05→06:00, checked out (11.92h)`);
  }

  console.log("\nDone! Dummy attendance data seeded.");

  // Verify
  const records = await prisma.attendanceRecord.findMany({
    include: { guard: true },
    orderBy: { checkIn: "desc" },
  });
  console.log(`\nAll attendance records (${records.length}):`);
  records.forEach((r) => {
    const status = r.checkOut ? "Checked Out" : "ON DUTY";
    console.log(`  ${r.guard.name} | ${r.date} | In: ${r.checkIn.toISOString()} | Out: ${r.checkOut?.toISOString() ?? "—"} | ${status}`);
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
