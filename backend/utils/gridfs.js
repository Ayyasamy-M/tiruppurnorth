const mongoose = require("mongoose");
const { getGridFSBucket } = require("../config/database");

const uploadImageToGridFS = (file) => {
  return new Promise((resolve, reject) => {
    const gridFSBucket = getGridFSBucket();

    if (!gridFSBucket) {
      return reject(new Error("GridFS is not initialized"));
    }

    const filename = `${Date.now()}-${file.originalname}`;

    const uploadStream = gridFSBucket.openUploadStream(filename, {
      contentType: file.mimetype,
    });

    uploadStream.end(file.buffer);

    uploadStream.on("finish", () => {
      resolve({
        id: uploadStream.id,
        filename,
        contentType: file.mimetype,
      });
    });

    uploadStream.on("error", (error) => {
      reject(error);
    });
  });
};

const deleteGridFSFile = async (fileId) => {
  try {
    const gridFSBucket = getGridFSBucket();

    if (!gridFSBucket || !fileId) {
      return;
    }

    await gridFSBucket.delete(new mongoose.Types.ObjectId(fileId));
  } catch (error) {
    console.error("GridFS delete error:", error.message);
  }
};

const getGridFSDownloadStream = (fileId) => {
  const gridFSBucket = getGridFSBucket();

  if (!gridFSBucket || !fileId) {
    return null;
  }

  return gridFSBucket.openDownloadStream(new mongoose.Types.ObjectId(fileId));
};

module.exports = {
  uploadImageToGridFS,
  deleteGridFSFile,
  getGridFSDownloadStream,
};
