const express = require('express');
const { connectToDatabase } = require('./config/db.js');
const websiteRoutes = require('./routes/websiteRoutes.js'); // Import the new routes file

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

connectToDatabase();

app.get('/', (req, res) => {
  res.send('Welcome to the Backend Internship Assignment!');
});


app.use('/api/analyze', websiteRoutes);

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});