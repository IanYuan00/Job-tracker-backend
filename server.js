const { PrismaClient } = require('@prisma/client');
const express = require('express');
const cors = require('cors');

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
})

app.use(express.json());
app.use(cors());

app.post('/applications', async (req, res) => {
    const { company, position, status, date, notes } = req.body;
    if (!company || !position) {
        return res.status(400).json({ error: 'Company and position are required.' })
    }
    const newApplication = await prisma.application.create({
        data: { company, position, status, date, notes }
    });

    res.json(newApplication);
})

app.get('/applications', async (req, res) => {
    const applications = await prisma.application.findMany();
    res.json(applications);
})

app.delete('/applications/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await prisma.application.delete({ where: { id } });
        res.json({ message: 'Deleted successfully' });
    } catch (error) {
        res.status(404).json({ error: 'Application not found.' });
    }

})

app.patch('/applications/:id', async (req, res) => {
    const { id } = req.params;
    if ('company' in req.body && req.body.company === '') {
        return res.status(400).json({ error: 'Company cannot be empty.' });
    }
    if ('position' in req.body && req.body.position === '') {
        return res.status(400).json({ error: 'Position cannot be empty.' })
    }
    try {
        const existingApplication = await prisma.application.findUnique({ where: { id } });
        const updatedApplication = await prisma.application.update({
            where: { id },
            data: req.body
        });
        if ('status' in req.body && req.body.status !== existingApplication.status) {
            await prisma.statusHistory.create({
                data: {
                    applicationId: id,
                    fromStatus: existingApplication.status,
                    toStatus: req.body.status
                }
            });
        }
        res.json(updatedApplication);
    } catch (error) {
        res.status(404).json({ error: 'Application no longer exist.' })
    }

})

app.get('/applications/:id/history', async (req, res) => {
    const { id } = req.params;
    const history = await prisma.statusHistory.findMany({
        where: { applicationId: id },
        orderBy: { changedAt: 'asc' }
    })
    res.json(history);
})