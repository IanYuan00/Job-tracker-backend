const { PrismaClient } = require('@prisma/client');
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3000;

function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'No token provided.' });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) {
            return res.status(403).json({ error: 'Invalid token.' });
        }
        req.userId = decoded.userId;
        next();
    })
}

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
})

app.use(express.json());
app.use(cors());

app.post('/applications', authenticateToken, async (req, res) => {
    const { company, position, status, date, notes } = req.body;
    if (!company || !position) {
        return res.status(400).json({ error: 'Company and position are required.' })
    }
    const newApplication = await prisma.application.create({
        data: { userId: req.userId, company, position, status, date, notes }
    });
    const statusHistory = await prisma.statusHistory.create({
        data: {
            applicationId: newApplication.id,
            fromStatus: null,
            toStatus: status
        }
    })

    res.json(newApplication);
})

app.get('/applications', authenticateToken, async (req, res) => {
    const applications = await prisma.application.findMany({
        where: { userId: req.userId }
    });
    res.json(applications);
})

app.delete('/applications/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    try {
        const application = await prisma.application.findFirst({
            where: { id, userId: req.userId }
        })

        if (!application) {
            return res.status(404).json({ error: 'Application not found.' })
        }

        await prisma.application.delete({ where: { id } });
        res.json({ message: 'Deleted successfully' });
    } catch (error) {
        res.status(404).json({ error: 'Application not found.' });
    }

})

app.patch('/applications/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    if ('company' in req.body && req.body.company === '') {
        return res.status(400).json({ error: 'Company cannot be empty.' });
    }
    if ('position' in req.body && req.body.position === '') {
        return res.status(400).json({ error: 'Position cannot be empty.' })
    }
    try {
        const application = await prisma.application.findFirst({
            where: { id, userId: req.userId }
        })
        if (!application) {
            return res.status(404).json({ error: 'Application not found.' })
        }

        const updatedApplication = await prisma.application.update({
            where: { id },
            data: req.body
        });
        if ('status' in req.body && req.body.status !== application.status) {
            await prisma.statusHistory.create({
                data: {
                    applicationId: id,
                    fromStatus: application.status,
                    toStatus: req.body.status
                }
            });
        }
        res.json(updatedApplication);
    } catch (error) {
        res.status(404).json({ error: 'Application no longer exist.' })
    }

})

app.get('/applications/:id/history', authenticateToken, async (req, res) => {
    const { id } = req.params;
    const application = await prisma.application.findFirst({
        where: { id, userId: req.userId }
    })
    if (!application) {
        return res.status(404).json({ error: 'Application not found.' })
    }
    const history = await prisma.statusHistory.findMany({
        where: { applicationId: id },
        orderBy: { changedAt: 'asc' }
    })
    res.json(history);
})

app.post('/register', async (req, res) => {
    const { username, email, password } = req.body;
    if (!username) {
        return res.status(400).json({ error: 'Username is required!' });
    }
    if (!email) {
        return res.status(400).json({ error: 'Email is required!' });
    }
    if (!password) {
        return res.status(400).json({ error: 'Password is required!' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    try {
        const newUser = await prisma.user.create({
            data: { username, email, password: hashedPassword }
        })
        res.json({ username: newUser.username, email: newUser.email })
    } catch (error) {
        res.status(400).json({ error: 'Email already existed. ' })
    }
})

app.post('/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email) {
        return res.status(400).json({ error: 'Email is required!' });
    }
    if (!password) {
        return res.status(400).json({ error: 'Password is required!' });
    }
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
        return res.status(401).json({ error: 'Invalid email or password.' })
    }
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
        return res.status(401).json({ error: 'Invalid email or password.' })
    }
    const token = jwt.sign(
        { userId: user.id },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
    )

    res.json({ token, username: user.username });
})