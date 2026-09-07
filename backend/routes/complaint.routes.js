const express = require("express");
const multer = require("multer");
const mongoose = require("mongoose");

const Complaint = require("../models/Complaint");
const User = require("../models/User");

const { authenticateToken } = require("../middleware/auth");

const { uploadImageToGridFS, deleteGridFSFile } = require("../utils/gridfs");

const router = express.Router();

/*
|--------------------------------------------------------------------------
| Multer Configuration
|--------------------------------------------------------------------------
*/

const storage = multer.memoryStorage();

const upload = multer({
  storage,

  limits: {
    fileSize: 5 * 1024 * 1024,
  },

  fileFilter: (req, file, cb) => {
    if (file.mimetype && file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"));
    }
  },
});

/*
|--------------------------------------------------------------------------
| Helpers
|--------------------------------------------------------------------------
*/

const getUserId = (req) => {
  return req.user?.userId || req.user?.id;
};

const getApiBaseUrl = (req) => {
  if (process.env.SERVER_URL) {
    return process.env.SERVER_URL.replace(/\/$/, "");
  }

  const protocol = req.headers["x-forwarded-proto"] || req.protocol || "http";

  const host = req.headers["x-forwarded-host"] || req.get("host");

  return `${protocol}://${host}`;
};

/*
|--------------------------------------------------------------------------
| CREATE COMPLAINT
|--------------------------------------------------------------------------
| POST /api/complaints
|--------------------------------------------------------------------------
*/

router.post(
  "/",
  authenticateToken,
  upload.single("photo"),
  async (req, res) => {
    let uploadedFile = null;

    try {
      const userId = getUserId(req);

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "Invalid authentication data",
        });
      }

      const {
        ward,
        wardNumber,
        title,
        description,
        location,
        phone,
        category,
      } = req.body;

      const requestedWard = wardNumber || ward || "";

      /*
      |--------------------------------------------------------------------------
      | Validation
      |--------------------------------------------------------------------------
      */

      if (!requestedWard) {
        return res.status(400).json({
          success: false,
          message: "Ward number is required",
        });
      }

      if (!title || !title.trim()) {
        return res.status(400).json({
          success: false,
          message: "Complaint title is required",
        });
      }

      if (!description || !description.trim()) {
        return res.status(400).json({
          success: false,
          message: "Complaint description is required",
        });
      }

      /*
      |--------------------------------------------------------------------------
      | Get Logged In User
      |--------------------------------------------------------------------------
      */

      const user = await User.findById(userId);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      /*
      |--------------------------------------------------------------------------
      | Ward Security
      |--------------------------------------------------------------------------
      */

      if (!user.ward) {
        return res.status(400).json({
          success: false,
          message: "Please select your ward before submitting a complaint",
        });
      }

      if (String(user.ward).trim() !== String(requestedWard).trim()) {
        return res.status(403).json({
          success: false,
          message: "You can submit complaints only for your assigned ward",
        });
      }

      /*
      |--------------------------------------------------------------------------
      | Phone
      |--------------------------------------------------------------------------
      */

      const complaintPhone =
        phone && String(phone).trim() ? String(phone).trim() : user.mobile;

      if (!/^\d{10}$/.test(complaintPhone)) {
        return res.status(400).json({
          success: false,
          message: "A valid 10 digit mobile number is required",
        });
      }

      /*
      |--------------------------------------------------------------------------
      | Upload Photo
      |--------------------------------------------------------------------------
      */

      if (req.file) {
        uploadedFile = await uploadImageToGridFS(req.file);
      }

      /*
      |--------------------------------------------------------------------------
      | Complaint ID
      |--------------------------------------------------------------------------
      */

      const complaintId = `TN-W${String(requestedWard).trim()}-${Date.now()
        .toString()
        .slice(-6)}`;

      /*
      |--------------------------------------------------------------------------
      | Create Complaint
      |--------------------------------------------------------------------------
      */

      const complaint = await Complaint.create({
        complaintId,

        wardNumber: String(requestedWard).trim(),

        userId: user._id,

        title: title.trim(),

        description: description.trim(),

        location:
          location && String(location).trim() ? String(location).trim() : "",

        phone: complaintPhone,

        category:
          category && String(category).trim()
            ? String(category).trim()
            : "General",

        photo: uploadedFile ? uploadedFile.id.toString() : "",

        photoFilename: uploadedFile ? uploadedFile.filename : "",

        photoContentType: uploadedFile ? uploadedFile.contentType : "",

        status: "Pending",
      });

      /*
      |--------------------------------------------------------------------------
      | Response
      |--------------------------------------------------------------------------
      */

      const apiBaseUrl = getApiBaseUrl(req);

      const responseComplaint = {
        id: complaint._id,
        _id: complaint._id,
        complaintId: complaint.complaintId,
        wardNumber: complaint.wardNumber,
        userId: complaint.userId,
        title: complaint.title,
        description: complaint.description,
        location: complaint.location,
        phone: complaint.phone,
        category: complaint.category,
        status: complaint.status,
        photo: complaint.photo || "",

        photoUrl: complaint.photo
          ? `${apiBaseUrl}/api/uploads/${complaint.photo}`
          : "",

        createdAt: complaint.createdAt,
        updatedAt: complaint.updatedAt,
      };

      return res.status(201).json({
        success: true,
        message: "Complaint submitted successfully",
        complaint: responseComplaint,
      });
    } catch (error) {
      /*
      |--------------------------------------------------------------------------
      | Cleanup Uploaded File
      |--------------------------------------------------------------------------
      */

      if (uploadedFile?.id) {
        await deleteGridFSFile(uploadedFile.id.toString());
      }

      console.error("Create complaint error:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to submit complaint",
      });
    }
  },
);

/*
|--------------------------------------------------------------------------
| GET SINGLE COMPLAINT
|--------------------------------------------------------------------------
| GET /api/complaints/:id
|--------------------------------------------------------------------------
|
| Supports BOTH:
|
| 1. MongoDB ObjectId
|    /api/complaints/6a9d511a277e176e4d2243fa
|
| 2. Human readable Complaint ID
|    /api/complaints/TN-W1-810783
|
|--------------------------------------------------------------------------
|
| SECURITY:
| - Admin can view any complaint.
| - Normal user can view only their own complaint.
|--------------------------------------------------------------------------
*/

router.get("/:id", authenticateToken, async (req, res) => {
  try {
    const userId = getUserId(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Invalid authentication data",
      });
    }

    const requestedId = String(req.params.id).trim();

    if (!requestedId) {
      return res.status(400).json({
        success: false,
        message: "Complaint ID is required",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Build Complaint Query
    |--------------------------------------------------------------------------
    |
    | If the ID is a valid MongoDB ObjectId:
    |     search by _id
    |
    | Otherwise:
    |     search by complaintId
    |
    |--------------------------------------------------------------------------
    */

    let complaintQuery;

    if (mongoose.Types.ObjectId.isValid(requestedId)) {
      complaintQuery = {
        _id: requestedId,
      };
    } else {
      complaintQuery = {
        complaintId: requestedId,
      };
    }

    /*
    |--------------------------------------------------------------------------
    | User Ownership Security
    |--------------------------------------------------------------------------
    */

    if (req.user.role !== "admin") {
      complaintQuery.userId = userId;
    }

    /*
    |--------------------------------------------------------------------------
    | Find Complaint
    |--------------------------------------------------------------------------
    */

    const complaint = await Complaint.findOne(complaintQuery).populate(
      "userId",
      "name mobile ward email address",
    );

    /*
    |--------------------------------------------------------------------------
    | Not Found
    |--------------------------------------------------------------------------
    */

    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: "Complaint not found",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Photo URL
    |--------------------------------------------------------------------------
    */

    const apiBaseUrl = getApiBaseUrl(req);

    const responseComplaint = {
      id: complaint._id,
      _id: complaint._id,

      complaintId: complaint.complaintId,

      wardNumber: complaint.wardNumber,

      userId: complaint.userId,

      title: complaint.title,

      description: complaint.description,

      location: complaint.location,

      phone: complaint.phone,

      category: complaint.category,

      status: complaint.status,

      photo: complaint.photo || "",

      photoUrl: complaint.photo
        ? `${apiBaseUrl}/api/uploads/${complaint.photo}`
        : "",

      photoFilename: complaint.photoFilename || "",

      photoContentType: complaint.photoContentType || "",

      createdAt: complaint.createdAt,

      updatedAt: complaint.updatedAt,
    };

    return res.json({
      success: true,
      complaint: responseComplaint,
    });
  } catch (error) {
    console.error("Get complaint error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to load complaint",
    });
  }
});

/*
|--------------------------------------------------------------------------
| Multer Error Handler
|--------------------------------------------------------------------------
*/

router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        success: false,
        message: "Image size must be 5 MB or less",
      });
    }

    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }

  if (error && error.message === "Only image files are allowed") {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }

  next(error);
});

module.exports = router;
