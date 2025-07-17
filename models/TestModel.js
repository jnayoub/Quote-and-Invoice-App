const mongoose = require('mongoose');

// Simple test model for key-value storage
const testSchema = new mongoose.Schema({
    key: {
        type: String,
        required: true
    },
    value: {
        type: mongoose.Schema.Types.Mixed, // Allows storing any object
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Test', testSchema);