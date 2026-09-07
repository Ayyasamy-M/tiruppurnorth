const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const multer = require("multer");

const { connectDatabase, getGridFSBucket } = require("./config/database");

const authRoutes = require("./routes/auth.routes");
const userRoutes = require("./routes/user.routes");
const wardRoutes = require("./routes/ward.routes");
const complaintRoutes = require("./routes/complaint.routes");
const adminRoutes = require("./routes/admin.routes");

dotenv.config();

const app = express();

/* =====================================================
   CONFIG
===================================================== */

const PORT = process.env.PORT || 5000;

const SERVER_URL = process.env.SERVER_URL || "";

/* =====================================================
   MIDDLEWARE
===================================================== */

app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

app.use(express.json());

app.use(
  express.urlencoded({
    extended: true,
  }),
);

/* =====================================================
   HELPER - API BASE URL
===================================================== */

const getApiBaseUrl = (req) => {
  if (SERVER_URL) {
    return SERVER_URL.replace(/\/+$/, "");
  }

  const forwardedProto = req.headers["x-forwarded-proto"];

  const protocol = forwardedProto || req.protocol || "http";

  const host = req.get("host");

  return `${protocol}://${host}`;
};

/* =====================================================
   DATABASE
===================================================== */

connectDatabase();

/* =====================================================
   ROOT
===================================================== */

app.get("/", (req, res) => {
  return res.status(200).json({
    success: true,
    message: "Tiruppur Smart City Backend API is running",
    server: getApiBaseUrl(req),
  });
});

/* =====================================================
   HEALTH CHECK
===================================================== */

app.get("/health", (req, res) => {
  return res.status(200).json({
    success: true,
    message: "Backend is healthy",
    database:
      mongoose.connection.readyState === 1 ? "connected" : "disconnected",
  });
});

/* =====================================================
   GRIDFS IMAGE
   GET /api/uploads/:id
===================================================== */

app.get("/api/uploads/:id", async (req, res) => {
  try {
    const gridFSBucket = getGridFSBucket();

    if (!gridFSBucket) {
      return res.status(503).json({
        success: false,
        message: "Image storage is not ready",
      });
    }

    const fileId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(fileId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid image ID",
      });
    }

    const objectId = new mongoose.Types.ObjectId(fileId);

    const files = await mongoose.connection.db
      .collection("uploads.files")
      .find({
        _id: objectId,
      })
      .toArray();

    if (!files || files.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Image not found",
      });
    }

    const file = files[0];

    res.set("Content-Type", file.contentType || "image/jpeg");

    res.set("Cache-Control", "public, max-age=31536000");

    const downloadStream = gridFSBucket.openDownloadStream(objectId);

    downloadStream.on("error", (error) => {
      console.error("GridFS Download Error:", error.message);

      if (!res.headersSent) {
        res.status(404).json({
          success: false,
          message: "Image not found",
        });
      }
    });

    downloadStream.pipe(res);
  } catch (error) {
    console.error("Get GridFS Image Error:", error);

    if (!res.headersSent) {
      return res.status(500).json({
        success: false,
        message: "Server error while loading image",
      });
    }
  }
});

/* =====================================================
   TEST UPLOAD
   GET /api/test-upload
===================================================== */

app.get("/api/test-upload", async (req, res) => {
  try {
    if (!mongoose.connection.db) {
      return res.status(503).json({
        success: false,
        message: "MongoDB is not connected",
      });
    }

    const files = await mongoose.connection.db
      .collection("uploads.files")
      .find({})
      .sort({
        uploadDate: -1,
      })
      .limit(50)
      .toArray();

    return res.status(200).json({
      success: true,
      storage: "MongoDB Atlas GridFS",
      count: files.length,

      files: files.map((file) => ({
        id: file._id,
        filename: file.filename,
        contentType: file.contentType,
        length: file.length,
        uploadDate: file.uploadDate,
      })),
    });
  } catch (error) {
    console.error("Test Upload Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/* =====================================================
   ROUTES
===================================================== */

/*
 * AUTH
 *
 * /api/auth/register
 * /api/auth/login
 * /api/auth/me
 * /api/auth/ward
 * /api/auth/logout
 */

app.use("/api/auth", authRoutes);

/*
 * USER
 *
 * /api/user/profile
 * /api/user/profile/photo
 * /api/user/change-password
 * /api/user/complaints
 */

app.use("/api/user", userRoutes);

/*
 * WARDS
 *
 * GET  /api/wards
 * GET  /api/wards/:wardNumber
 */

app.use("/api/wards", wardRoutes);

/*
 * COMPLAINTS
 *
 * POST /api/complaints
 * GET  /api/complaints/:id
 */

app.use("/api/complaints", complaintRoutes);

/*
 * ADMIN
 *
 * /api/admin/me
 * /api/admin/dashboard
 * /api/admin/complaints
 * /api/admin/wards
 * /api/admin/ward-members
 * /api/admin/users
 */

app.use("/api/admin", adminRoutes);

/* =====================================================
   UNKNOWN API ROUTE
===================================================== */

app.use("/api", (req, res) => {
  return res.status(404).json({
    success: false,
    message: `API route not found: ${req.method} ${req.originalUrl}`,
  });
});

/* =====================================================
   GLOBAL ERROR HANDLER
===================================================== */

app.use((error, req, res, next) => {
  console.error("");
  console.error("❌ Global Error:");
  console.error(error);
  console.error("");

  if (error && error.message === "Only image files are allowed") {
    return res.status(400).json({
      success: false,
      message: "Only image files are allowed",
    });
  }

  if (error instanceof multer.MulterError) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }

  return res.status(500).json({
    success: false,
    message: "Server error",
  });
});

/* =====================================================
   SERVER
===================================================== */

app.listen(PORT, "0.0.0.0", () => {
  console.log("");

  console.log("====================================");

  console.log("🚀 Tiruppur Smart City Backend Started");

  console.log("====================================");

  console.log(`📡 Local: http://localhost:${PORT}`);

  console.log("☁️ Image Storage: MongoDB Atlas GridFS");

  console.log("🔐 Auth: /api/auth");

  console.log("👤 User: /api/user");

  console.log("🏘️ Wards: /api/wards");

  console.log("📝 Complaints: /api/complaints");

  console.log("📊 Admin Dashboard: /api/admin/dashboard");

  console.log("🏘️ Admin Wards: /api/admin/wards");

  console.log("🧑‍💼 Admin Ward Members: /api/admin/ward-members");

  console.log("👥 Admin Users: /api/admin/users");

  console.log("📢 Admin Complaints: /api/admin/complaints");

  console.log("🖼️ Images: /api/uploads/:id");

  console.log("====================================");

  console.log("");
});
