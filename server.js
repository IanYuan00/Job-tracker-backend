const { PrismaClient } = require('@prisma/client');
const express = require('express');
const cors = require('cors');

const app = express();
const prisma = new PrismaClient();
const PORT = 3000;

app.use(express.json());
app.use(cors());

app.post('/applications', async (req, res) => {
    const { company, position, status, date, notes } = req.body;
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
    await prisma.application.delete({ where: { id } });
    res.json({ message: 'Deleted successfully' });
})

app.patch('/applications/:id', async (req, res) => {
    const { id } = req.params;
    const updatedApplication = await prisma.application.update({
        where: { id },
        data: req.body
    });
    res.json(updatedApplication);
})

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
})