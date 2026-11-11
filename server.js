const dns = require('dns');
dns.setServers(['8.8.8.8', '1.1.1.1']);

require('dotenv').config();
const express = require('express');
const{ MongoClient } = require('mongodb');

const app = expree();
app.use(express.json());

let db;

app.get('/', (req, res) => res.send('Backend Api active'));


app.get('/lessons', async (req, res) => {
    try {
        const lessons = await db.collection('lessons').find({}).toArray();
        res.join(lessons);
    }   catch (err) {
        res.status(500).json({ error: 'Could not fetch lessons'});
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