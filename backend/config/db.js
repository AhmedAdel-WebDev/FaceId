const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        // Add mongoose.set to address the deprecation warning
        mongoose.set('strictQuery', true); // Or false depending on your preference, true suppresses the warning
        await mongoose.connect(process.env.MONGO_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            // Mongoose 6 deprecated the following options, but keep them if using older versions
            // useCreateIndex: true,
            // useFindAndModify: false
        });
        console.log('MongoDB Connected...');
    } catch (err) {
        console.error(err.message);
        // Exit process with failure
        process.exit(1);
    }
};

module.exports = connectDB;