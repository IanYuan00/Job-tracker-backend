const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function backfill() {
    const allApplications = await prisma.application.findMany();

    for (const app of allApplications) {
        const historyData = await prisma.statusHistory.findMany({
            where: { applicationId: app.id }
        })
        if (historyData.length === 0) {
            await prisma.statusHistory.create({
                data: {
                    applicationId: app.id,
                    fromStatus: null,
                    toStatus: app.status,
                    changedAt: new Date(app.date)
                }
            })
            console.log(`Backfilled history for ${app.company}`);
        }
    }
}

console.log('Backfill complete.')
backfill();