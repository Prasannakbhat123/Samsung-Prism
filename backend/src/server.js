const express = require('express');
const cors = require('cors');
const setRoutes = require('./routes/jsonRoutes');
const maskWatcher = require('./utils/maskWatcher');

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

// Set up routes
setRoutes(app);

// Start the mask watcher
maskWatcher.start();

// Handle server shutdown
process.on('SIGINT', () => {
    console.log('\nShutting down server...');
    maskWatcher.stop();
    process.exit();
});

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});