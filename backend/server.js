const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');

// Load env vars
dotenv.config();

const app = express();

// Enable CORS
app.use(cors());

// Body parser
app.use(express.json());

// Define routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/notifications', require('./routes/notifications'));

const PORT = process.env.PORT || 5001;

app.listen(PORT, () => console.log(`Server started on port ${PORT}`)); // Trigger fresh deploy Tue Jun 17 17:28:10 EDT 2025
