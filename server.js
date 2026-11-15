const dns = require('dns');
dns.setServers(['8.8.8.8', '1.1.1.1']);

require('dotenv').config();
const express = require('express');
const{ MongoClient, ObjectId } = require('mongodb');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(express.json());

// CORS
app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.sendStatus(200);
    next();
});

// Logs: prints every request to the console
app.use((req, res, next) => {
    const time = new Date().toISOString();
    console.log(`[${time}] ${req.method} ${req.url}`);
    if (req.method === 'POST' || req.method === 'PUT') {
        console.log(' Body:', JSON.stringify(req.body));
    }
    next();
});

// Static file middleware: returns lesson images, or an error if missing
app.use('/images', (req, res) => {
    const filePath = path.join(__dirname, 'images', path.basename(req.path));
    fs.access(filePath, fs.constants.F_OK, (err) => {
        if (err) {
            return res.status(404).json({ error: 'image not found' });
        }
        res.sendFile(filePath);
    });
});

let db;

app.get('/', (req, res) => res.send('Backend Api active'));


app.get('/lessons', async (req, res) => {
    try {
        const lessons = await db.collection('lessons').find({}).toArray();
        res.json(lessons);

    }   catch (err) {
        res.status(500).json({ error: 'Could not fetch lessons'});
    }
});


// Route: save a new order
app.post('/orders', async (req, res) => {
    try {
        const { name, phone, lessons } = req.body;
        if (!name || !phone || !Array.isArray(lessons) || lessons.length === 0) {
            return res.status(400).json({ error: 'name, phone and lessons are required' });
        }
        const order = {
            name,
            phone,
            lessons: lessons.map(l => ({ lessonId: new ObjectId(l.lessonId), spaces: Number(l.spaces) }))
        };
        const result = await db.collection('orders').insertOne(order);
        res.status(201).json({ message: 'Orders saved', orderId: result.insertedId });
    } catch (err) {
        res.status(500).json({ error: 'Could notsave order' });
    }
});

//Route: update ANY attribute of a lesson
app.put('/lessons/:id', async (req, res) => {
    try {
        const result = await db.collection('lessons').updateOne(
            { _id: new ObjectId(req.params.id) },
            { $set: req.body }
        );
        if (result.matchedCount === 0) {
            return res.status(404).json({ error : 'Lesson not found' });
        }
        res.json({ message: 'Lesson updated' });
    }   catch (err) {
        res.status(500).json({ error: 'Could not update lesson' });
    }
});


MongoClient.connect(process.env.MONGODB_URI)
.then(client => {
    db = client.db('afterschool');
    console.log('Connected to MongoDB');
    app.listen(process.env.PORT || 3000, () => {
        console.log('Server running on port 3000');
    });
})
.catch(err => console.error('MongoDB connection failed:', err));