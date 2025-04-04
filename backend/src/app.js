const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const jsonRoutes = require('./routes/jsonRoutes');

const app = express();

// CORS configuration
const corsOptions = {
  origin: ['http://localhost:3000', 'http://localhost:5173', 'http://127.0.0.1:5173'],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

// Middleware
app.use(cors(corsOptions));
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

// Create json folder if it doesn't exist
const jsonFolder = path.join(__dirname, 'json');
const fs = require('fs');
if (!fs.existsSync(jsonFolder)) {
  fs.mkdirSync(jsonFolder, { recursive: true });
}

// Set up routes
jsonRoutes(app);

// Simple test route
app.get('/', (req, res) => {
  res.json({ message: 'Backend API is running' });
});

module.exports = app;