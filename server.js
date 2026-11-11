const dns = require('dns');
dns.setServers(['8.8.8.8', '1.1.1.1']);

require('dotenv').config();
const express = require('express');
const{ MongoClient } = require('mongodb');

const app = expree();
app.use(express.json());

let db;

app.get('/', (req, res) => res.send('Backend Api active'));
