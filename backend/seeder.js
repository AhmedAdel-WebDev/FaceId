const fs = require('fs');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');
const path = require('path');

// Load env vars
dotenv.config({ path: './.env' });

// Load models
const User = require('./models/User');
const Election = require('./models/Election');
const Vote = require('./models/Vote');

// Connect to DB
mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
});

// Read JSON files
const users = JSON.parse(
    fs.readFileSync(`${__dirname}/_data/users.json`, 'utf-8')
);

const elections = JSON.parse(
    fs.readFileSync(`${__dirname}/_data/elections.json`, 'utf-8')
);

// Import into DB
const importData = async () => {
    try {
        console.log('Starting data import...');
        
        // Create users first (we need their IDs for elections)
        console.log('Importing users...');
        const createdUsers = await User.create(users);
        console.log(`${createdUsers.length} users imported`);
        
        // Map user emails to their IDs for reference
        const userMap = {};
        createdUsers.forEach(user => {
            userMap[user.email] = user._id;
        });
        
        // Process elections data to include proper user references
        console.log('Processing elections data...');
        const processedElections = elections.map(election => {
            // Set the createdBy field to the admin user's ID
            election.createdBy = userMap['admin@example.com'];
            
            // Process candidates if they exist
            if (election.candidates && election.candidates.length > 0) {
                election.candidates = election.candidates.map(candidate => {
                    // If candidate email is specified, use the corresponding user ID
                    if (candidate.email) {
                        const candidateId = userMap[candidate.email];
                        if (candidateId) {
                            return {
                                ...candidate,
                                candidateId: candidateId,
                                email: undefined // Remove email as it's not in the schema
                            };
                        }
                    }
                    return candidate;
                });
            }
            
            return election;
        });
        
        // Create elections
        console.log('Importing elections...');
        const createdElections = await Election.create(processedElections);
        console.log(`${createdElections.length} elections imported`);
        
        console.log('All data imported successfully!');
        process.exit();
    } catch (err) {
        console.error('Error importing data:', err);
        process.exit(1);
    }
};

// Delete data
const deleteData = async () => {
    try {
        console.log('Deleting all data...');
        await Vote.deleteMany();
        await Election.deleteMany();
        await User.deleteMany();
        console.log('Data Destroyed...');
        process.exit();
    } catch (err) {
        console.error('Error deleting data:', err);
        process.exit(1);
    }
};

// Delete only elections
const deleteElections = async () => {
    try {
        console.log('Deleting elections and votes...');
        await Vote.deleteMany();
        await Election.deleteMany();
        console.log('Elections and votes destroyed. Users retained.');
        process.exit();
    } catch (err) {
        console.error('Error deleting elections:', err);
        process.exit(1);
    }
};

// Check command line arguments
if (process.argv[2] === '-i') {
    importData();
} else if (process.argv[2] === '-d') {
    deleteData();
} else if (process.argv[2] === '-de') {
    deleteElections();
} else {
    console.log('Please use: \n -i to import data \n -d to delete all data \n -de to delete only elections');
    process.exit();
}