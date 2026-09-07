const mongoose = require("mongoose");

let gridFSBucket = null;

const connectDatabase = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    console.log("====================================");
    console.log("✅ MongoDB Connected Successfully");
    console.log("====================================");

    gridFSBucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
      bucketName: "uploads",
    });

    console.log("✅ MongoDB GridFS Ready");
  } catch (error) {
    console.error("❌ MongoDB Connection Failed");
    console.error(error.message);
  }
};

const getGridFSBucket = () => {
  return gridFSBucket;
};

module.exports = {
  connectDatabase,
  getGridFSBucket,
};
