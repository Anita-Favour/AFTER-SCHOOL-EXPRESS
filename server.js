const dns = require('dns');
dns.setServers(['8.8.8.8', '1.1.1.1']);

require('dotenv').config();
const express = require('express');
const { MongoClient, ObjectId } = require('mongodb');
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
    console.log('  Body:', JSON.stringify(req.body));
  }
  next();
});




// endpoint to return lesson images, or an error if missing
app.use('/images', (req, res) => {
    const filePath = path.join(__dirname, 'images', path.basename(req.path));
    fs.access(filePath, fs.constants.F_OK, (err) => {
        if (err) {
            return res.status(404).json({ error: 'image not found' });
        }
        res.sendFile(filePath);
    });
});

var db;

app.get('/', (req, res) => res.send('Backend Api active'));


app.get('/lessons', async (req, res) => {
    try {
        const lessons = await db.collection('lessons').find({}).toArray();
        res.json(lessons);

    }   catch (err) {
        res.status(500).json({ error: 'Could not fetch lessons'});
    }
});


// endpoint: save a new order
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
        res.status(201).json({ message: 'Order saved', orderId: result.insertedId });
    } catch (err) {
        res.status(500).json({ error: 'Could not save order' });
    }
});


//endpoint: update  attribute of a lesson
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


// Challenge: Enrollment:GET /enrollment by lessonid
app.get('/enrolment/:lessonid', async (req, res) => {
    try {
        const lessonId = new ObjectId(req.params.lessonid);
        const orders = await db.collection('orders').find({ 'lessons.lessonId': lessonId }).toArray();
        let enrolment = 0;
        orders.forEach(order => {
            order.lessons.forEach(item => {
                if (item.lessonId.equals(lessonId)) enrolment += item.spaces;
            });
        });
        res.json({ lessonId: req.params.lessonid, enrolment });
    } catch (err) {
        res.status(400).json({ error: 'Invalid lesson id' });
    }
});


// Challenge: Search: GET /search?q=word
// Looks for the word in topic, location, price AND space
app.get('/search', async (req, res) => {
    try {
        const q = (req.query.q || '').trim();

        //empty search -> return every lesson
        if (q === '') {
            const all = await db.collection('lessons').find({}).toArray();
            return res.json(all);
        }

        // escape special characters (like + or ?) so they are searched as normal text
        const safe = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

        const lessons = await db.collection('lessons').find({
            $or: [
                { topic: { $regex: safe, $options: 'i' } },  // 'i' = ignore upper/lower case
                { location: { $regex: safe, $options: 'i' } },
                // price and space are numbers, so they will be turned to text first, then match
                { $expr: { $regexMatch: { input: { $toString: '$price' }, regex: safe } } },
                { $expr: { $regexMatch: { input: { $toString: '$space' }, regex: safe } } }
            ]
        }).toArray();

        res.json(lessons);
    } catch (err) {
        res.status(500).json({ error: 'Search failed' });
    }
});


// Challenge: Teachers: GET /teachers -> list of all teachers
app.get('/teachers', async (req, res) => {
    try {
        const teachers = await db.collection('teachers').find({}).toArray();
        res.json(teachers);
    } catch (err) {
        res.status(500).json({ error: 'Could not fetch teachers' });
    }
});


// Challenge: Teachers: GET /teachers/:id/lessons -> all lessons taught by one teacher
app.get('/teachers/:id/lessons', async (req, res) => {
    try {
        const teacher = await db.collection('teachers').findOne({ _id: new ObjectId(req.params.id) });
        if (!teacher) {
            return res.status(404).json({ error: 'Teacher not found' });
        }
        // $in = find every lesson whose _id is inside the teacher's lessonsIds list
        const lessons = await db.collection('lessons').find({ _id: { $in: teacher.lessonIds } }).toArray();
        res.json(lessons);
    } catch (err) {
        res.status(400).json({ error: 'Invalid teacher id' });
    }
});




// 404
app.use((req, res) => {
    res.status(404).json({ erro: 'Route not found' });
});


MongoClient.connect(process.env.MONGODB_URI)
.then(client => {
    db = client.db('Afterschool');
    console.log('Connected to MongoDB');
    app.listen(process.env.PORT || 3000, () => {
        console.log('Server running on port 3000');
    });
})
.catch(err => console.error('MongoDB connection failed:', err));