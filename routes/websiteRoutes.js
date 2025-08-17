const express = require('express');
const router = express.Router();
const websiteController = require('../controllers/websiteController.js'); // Adjust path

// Define the route for website analysis


// Route to get all website records
router.get('/', websiteController.getAllWebsites);

// Route for website analysis
router.post('/', websiteController.analyzeWebsite);

// Route to update a specific record by ID
router.put('/:id', websiteController.updateWebsite);

// Route to delete a specific record by ID
router.delete('/:id', websiteController.deleteWebsite);

module.exports = router;