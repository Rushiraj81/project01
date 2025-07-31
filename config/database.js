const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      maxPoolSize: 10, // Maintain up to 10 socket connections
      serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
      socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
      bufferMaxEntries: 0 // Disable mongoose buffering
    });

    console.log(`MongoDB Connected: ${conn.connection.host}`.cyan.underline);

    // Handle connection events
    mongoose.connection.on('error', (err) => {
      console.error(`Database connection error: ${err}`.red);
    });

    mongoose.connection.on('disconnected', () => {
      console.log('Database disconnected'.yellow);
    });

    mongoose.connection.on('reconnected', () => {
      console.log('Database reconnected'.green);
    });

    // Graceful shutdown
    process.on('SIGINT', async () => {
      try {
        await mongoose.connection.close();
        console.log('Database connection closed through app termination'.cyan);
        process.exit(0);
      } catch (err) {
        console.error('Error closing database connection:', err);
        process.exit(1);
      }
    });

  } catch (error) {
    console.error(`Database connection failed: ${error.message}`.red.underline.bold);
    process.exit(1);
  }
};

module.exports = connectDB;