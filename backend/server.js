const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const multer = require("multer");

dotenv.config();

const app = express();

/* =====================================================
   CONFIG
===================================================== */

const PORT = process.env.PORT || 5000;

// IMPORTANT:
// Render deployment-ல் SERVER_IP வேண்டாம்.
// Render PORT + request host பயன்படுத்தப்படும்.
const SERVER_URL = process.env.SERVER_URL || "";

let gridFSBucket;

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
app.use(express.urlencoded({ extended: true }));

/* =====================================================
   MULTER - MEMORY STORAGE
   Image local disk-ல் save ஆகாது.
   MongoDB GridFS-க்கு direct upload.
===================================================== */

const upload = multer({
  storage: multer.memoryStorage(),

  limits: {
    fileSize: 5 * 1024 * 1024,
  },

  fileFilter: function (req, file, cb) {
    if (file.mimetype && file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"));
    }
  },
});

/* =====================================================
   DATABASE
===================================================== */

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log("====================================");
    console.log("✅ MongoDB Connected Successfully");
    console.log("====================================");

    /*
     * GridFS Bucket
     *
     * MongoDB automatically creates:
     *
     * fs.files
     * fs.chunks
     */

    gridFSBucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
      bucketName: "uploads",
    });

    console.log("✅ MongoDB GridFS Ready");
  })
  .catch((error) => {
    console.error("❌ MongoDB Connection Failed");
    console.error(error.message);
  });

/* =====================================================
   HELPER - API BASE URL
===================================================== */

const getApiBaseUrl = (req) => {
  if (SERVER_URL) {
    return SERVER_URL.replace(/\/$/, "");
  }

  const protocol = req.headers["x-forwarded-proto"] || req.protocol || "http";

  const host = req.get("host");

  return `${protocol}://${host}`;
};

/* =====================================================
   HELPER - UPLOAD IMAGE TO GRIDFS
===================================================== */

const uploadImageToGridFS = (file) => {
  return new Promise((resolve, reject) => {
    if (!file) {
      return resolve(null);
    }

    if (!gridFSBucket) {
      return reject(new Error("MongoDB GridFS is not ready"));
    }

    const filename = `complaint-${Date.now()}-${Math.round(
      Math.random() * 100000,
    )}-${file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_")}`;

    const uploadStream = gridFSBucket.openUploadStream(filename, {
      contentType: file.mimetype,

      metadata: {
        originalName: file.originalname,
        uploadedAt: new Date(),
      },
    });

    uploadStream.on("error", (error) => {
      reject(error);
    });

    uploadStream.on("finish", () => {
      resolve({
        id: uploadStream.id,
        filename,
        contentType: file.mimetype,
      });
    });

    uploadStream.end(file.buffer);
  });
};

/* =====================================================
   HELPER - DELETE GRIDFS IMAGE
===================================================== */

const deleteGridFSFile = async (fileId) => {
  try {
    if (!fileId || !gridFSBucket) {
      return;
    }

    let objectId;

    try {
      objectId = new mongoose.Types.ObjectId(fileId);
    } catch {
      return;
    }

    await gridFSBucket.delete(objectId);

    console.log("🗑️ GridFS image deleted:", fileId);
  } catch (error) {
    console.error("GridFS Delete Error:", error.message);
  }
};

/* =====================================================
   USER MODEL
===================================================== */

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    mobile: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    password: {
      type: String,
      required: true,
    },

    ward: {
      type: String,
      default: "",
      trim: true,
    },

    role: {
      type: String,
      enum: ["user", "admin", "ward_member"],
      default: "user",
    },
  },
  {
    timestamps: true,
  },
);

const User = mongoose.model("User", userSchema);

/* =====================================================
   WARD MODEL
===================================================== */

const wardSchema = new mongoose.Schema(
  {
    wardNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      default: "",
    },

    totalPeople: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  },
);

const Ward = mongoose.model("Ward", wardSchema);

/* =====================================================
   WARD MEMBER MODEL
===================================================== */

const wardMemberSchema = new mongoose.Schema(
  {
    wardNumber: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    role: {
      type: String,
      required: true,
      trim: true,
    },

    mobile: {
      type: String,
      default: "",
      trim: true,
    },

    photo: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  },
);

const WardMember = mongoose.model("WardMember", wardMemberSchema);

/* =====================================================
   WARD UPDATE MODEL
===================================================== */

const wardUpdateSchema = new mongoose.Schema(
  {
    wardNumber: {
      type: String,
      required: true,
      index: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      required: true,
    },

    category: {
      type: String,
      default: "General",
    },

    date: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  },
);

const WardUpdate = mongoose.model("WardUpdate", wardUpdateSchema);

/* =====================================================
   COMPLAINT MODEL
===================================================== */

const complaintSchema = new mongoose.Schema(
  {
    complaintId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    wardNumber: {
      type: String,
      required: true,
      index: true,
    },

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      required: true,
    },

    location: {
      type: String,
      default: "",
    },

    phone: {
      type: String,
      default: "",
    },

    category: {
      type: String,
      default: "General",
    },

    /*
     * GridFS file ID
     *
     * Example:
     * "67xxxxxxxxxxxxxxxxxxxxxx"
     */

    photo: {
      type: String,
      default: "",
    },

    photoFilename: {
      type: String,
      default: "",
    },

    photoContentType: {
      type: String,
      default: "",
    },

    status: {
      type: String,
      enum: ["Pending", "In Progress", "Resolved", "Rejected"],
      default: "Pending",
    },
  },
  {
    timestamps: true,
  },
);

const Complaint = mongoose.model("Complaint", complaintSchema);

/* =====================================================
   ROOT
===================================================== */

app.get("/", (req, res) => {
  return res.json({
    success: true,
    message: "Tiruppur North Backend API is running",
    server: getApiBaseUrl(req),
  });
});

/* =====================================================
   GRIDFS IMAGE
   GET /api/uploads/:id
===================================================== */

app.get("/api/uploads/:id", async (req, res) => {
  try {
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

    return res.status(500).json({
      success: false,
      message: "Server error while loading image",
    });
  }
});

/* =====================================================
   TEST UPLOAD
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

    return res.json({
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
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/* =====================================================
   AUTHENTICATION
===================================================== */

const authenticateToken = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: "Authorization token required",
      });
    }

    if (!authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Invalid authorization format",
      });
    }

    const token = authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Token missing",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.user = decoded;

    next();
  } catch (error) {
    console.error("Authentication Error:", error.message);

    return res.status(401).json({
      success: false,
      message: "Invalid or expired token",
    });
  }
};

/* =====================================================
   ADMIN AUTHENTICATION
===================================================== */

const authenticateAdmin = (req, res, next) => {
  authenticateToken(req, res, () => {
    if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Admin access required",
      });
    }

    next();
  });
};

/* =====================================================
   ADMIN ME
===================================================== */

app.get("/api/admin/me", authenticateAdmin, async (req, res) => {
  try {
    const admin = await User.findById(req.user.userId).select("-password");

    if (!admin) {
      return res.status(404).json({
        success: false,
        message: "Admin not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Admin authenticated successfully",
      admin,
    });
  } catch (error) {
    console.error("Admin Me Error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});

/* =====================================================
   ADMIN DASHBOARD
===================================================== */

app.get("/api/admin/dashboard", authenticateAdmin, async (req, res) => {
  try {
    const admin = await User.findById(req.user.userId).select("-password");

    if (!admin) {
      return res.status(404).json({
        success: false,
        message: "Admin account not found",
      });
    }

    const totalUsers = await User.countDocuments({
      role: "user",
    });

    const totalWards = await Ward.countDocuments();

    const totalWardMembers = await WardMember.countDocuments();

    const totalComplaints = await Complaint.countDocuments();

    const pendingComplaints = await Complaint.countDocuments({
      status: "Pending",
    });

    const inProgressComplaints = await Complaint.countDocuments({
      status: "In Progress",
    });

    const resolvedComplaints = await Complaint.countDocuments({
      status: "Resolved",
    });

    const rejectedComplaints = await Complaint.countDocuments({
      status: "Rejected",
    });

    return res.status(200).json({
      success: true,
      message: "Admin dashboard loaded successfully",

      admin: {
        id: admin._id,
        name: admin.name,
        mobile: admin.mobile,
        ward: admin.ward,
        role: admin.role,
      },

      stats: {
        totalUsers,
        totalWards,
        totalWardMembers,
        totalComplaints,
        pendingComplaints,
        inProgressComplaints,
        resolvedComplaints,
        rejectedComplaints,
      },
    });
  } catch (error) {
    console.error("Admin Dashboard Error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error while loading admin dashboard",
    });
  }
});

/* =====================================================
   REGISTER
===================================================== */

app.post("/api/auth/register", async (req, res) => {
  try {
    const { name, mobile, password, ward } = req.body;

    if (!name || !mobile || !password) {
      return res.status(400).json({
        success: false,
        message: "Name, mobile and password are required",
      });
    }

    if (!/^[0-9]{10}$/.test(mobile)) {
      return res.status(400).json({
        success: false,
        message: "Enter a valid 10 digit mobile number",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must contain at least 6 characters",
      });
    }

    const existingUser = await User.findOne({
      mobile,
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "Mobile number already registered",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name: name.trim(),
      mobile,
      password: hashedPassword,
      ward: ward || "",
      role: "user",
    });

    const token = jwt.sign(
      {
        userId: user._id,
        role: user.role,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: process.env.JWT_EXPIRES_IN || "7d",
      },
    );

    return res.status(201).json({
      success: true,
      message: "Account created successfully",
      token,

      user: {
        id: user._id,
        name: user.name,
        mobile: user.mobile,
        ward: user.ward,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Register Error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error during registration",
    });
  }
});

/* =====================================================
   LOGIN
===================================================== */

app.post("/api/auth/login", async (req, res) => {
  try {
    const { mobile, password } = req.body;

    if (!mobile || !password) {
      return res.status(400).json({
        success: false,
        message: "Mobile and password are required",
      });
    }

    const user = await User.findOne({
      mobile: mobile.trim(),
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid mobile number or password",
      });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid mobile number or password",
      });
    }

    const token = jwt.sign(
      {
        userId: user._id,
        role: user.role,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: process.env.JWT_EXPIRES_IN || "7d",
      },
    );

    return res.status(200).json({
      success: true,
      message: "Login successful",
      token,

      user: {
        id: user._id,
        _id: user._id,
        name: user.name,
        mobile: user.mobile,
        ward: user.ward,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Login Error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error during login",
    });
  }
});

/* =====================================================
   CURRENT USER
===================================================== */

app.get("/api/auth/me", authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select("-password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    console.error("Get User Error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});

/* =====================================================
   UPDATE USER WARD
===================================================== */

app.put("/api/auth/ward", authenticateToken, async (req, res) => {
  try {
    const { ward } = req.body;

    if (!ward) {
      return res.status(400).json({
        success: false,
        message: "Ward is required",
      });
    }

    const user = await User.findByIdAndUpdate(
      req.user.userId,
      {
        ward: ward.toString(),
      },
      {
        new: true,
      },
    ).select("-password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Ward updated successfully",
      user,
    });
  } catch (error) {
    console.error("Ward Update Error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});

/* =====================================================
   PUBLIC WARDS
===================================================== */

app.get("/api/wards", async (req, res) => {
  try {
    const wards = await Ward.find().sort({
      wardNumber: 1,
    });

    return res.status(200).json({
      success: true,
      count: wards.length,
      wards,
    });
  } catch (error) {
    console.error("Get Wards Error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});

/* =====================================================
   SINGLE WARD
===================================================== */

app.get("/api/wards/:wardNumber", authenticateToken, async (req, res) => {
  try {
    const { wardNumber } = req.params;

    const ward = await Ward.findOne({
      wardNumber,
    });

    if (!ward) {
      return res.status(404).json({
        success: false,
        message: "Ward not found",
      });
    }

    const members = await WardMember.find({
      wardNumber,
    }).sort({
      createdAt: 1,
    });

    const updates = await WardUpdate.find({
      wardNumber,
    })
      .sort({
        date: -1,
      })
      .limit(10);

    const complaints = await Complaint.find({
      wardNumber,
    })
      .populate("userId", "name mobile")
      .sort({
        createdAt: -1,
      })
      .limit(20);

    const baseUrl = getApiBaseUrl(req);

    const formattedComplaints = complaints.map((complaint) => {
      const complaintObject = complaint.toObject();

      let photo = "";

      if (complaintObject.photo) {
        photo = `${baseUrl}/api/uploads/${complaintObject.photo}`;
      }

      return {
        ...complaintObject,
        id: complaintObject._id,
        photo,
      };
    });

    const registeredUsers = await User.countDocuments({
      ward: wardNumber,
    });

    return res.status(200).json({
      success: true,

      ward: {
        id: ward._id,
        wardNumber: ward.wardNumber,
        name: ward.name,
        description: ward.description,
        totalPeople: ward.totalPeople,
      },

      members,
      updates,
      complaints: formattedComplaints,

      stats: {
        totalPeople: ward.totalPeople,
        wardMembers: members.length,
        registeredUsers,
        complaints: formattedComplaints.length,
      },
    });
  } catch (error) {
    console.error("Get Ward Details Error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});

/* =====================================================
   CREATE COMPLAINT
   IMAGE → MONGODB ATLAS GRIDFS
===================================================== */

app.post(
  "/api/complaints",
  authenticateToken,
  upload.single("photo"),
  async (req, res) => {
    try {
      const { wardNumber, title, description, location, category, phone } =
        req.body;

      if (!wardNumber || !title || !description) {
        return res.status(400).json({
          success: false,
          message: "Ward, title and description are required",
        });
      }

      if (phone && !/^[0-9]{10}$/.test(phone)) {
        return res.status(400).json({
          success: false,
          message: "Enter a valid 10 digit mobile number",
        });
      }

      let uploadedImage = null;

      /*
       * Upload image to GridFS
       */

      if (req.file) {
        uploadedImage = await uploadImageToGridFS(req.file);
      }

      const complaintId = `TN-W${wardNumber}-${Date.now()
        .toString()
        .slice(-6)}`;

      const complaint = await Complaint.create({
        complaintId,

        wardNumber: wardNumber.toString(),

        userId: req.user.userId,

        title: title.trim(),

        description: description.trim(),

        location: location ? location.trim() : "",

        phone: phone || "",

        category: category || "General",

        photo: uploadedImage ? uploadedImage.id.toString() : "",

        photoFilename: uploadedImage ? uploadedImage.filename : "",

        photoContentType: uploadedImage ? uploadedImage.contentType : "",

        status: "Pending",
      });

      const baseUrl = getApiBaseUrl(req);

      return res.status(201).json({
        success: true,
        message: "Complaint submitted successfully",

        complaint: {
          id: complaint._id,
          _id: complaint._id,

          complaintId: complaint.complaintId,

          wardNumber: complaint.wardNumber,

          title: complaint.title,

          description: complaint.description,

          location: complaint.location,

          phone: complaint.phone,

          category: complaint.category,

          photo: complaint.photo
            ? `${baseUrl}/api/uploads/${complaint.photo}`
            : "",

          photoId: complaint.photo || "",

          photoFilename: complaint.photoFilename || "",

          status: complaint.status,

          createdAt: complaint.createdAt,

          updatedAt: complaint.updatedAt,
        },
      });
    } catch (error) {
      console.error("Create Complaint Error:", error);

      return res.status(500).json({
        success: false,
        message: "Server error while submitting complaint",
      });
    }
  },
);

/* =====================================================
   ADMIN - GET COMPLAINTS
===================================================== */

app.get("/api/admin/complaints", authenticateAdmin, async (req, res) => {
  try {
    const complaints = await Complaint.find()
      .populate("userId", "name mobile ward")
      .sort({
        createdAt: -1,
      });

    const baseUrl = getApiBaseUrl(req);

    const formattedComplaints = complaints.map((complaint) => {
      const object = complaint.toObject();

      return {
        ...object,

        id: object._id,

        photo: object.photo ? `${baseUrl}/api/uploads/${object.photo}` : "",
      };
    });

    return res.status(200).json({
      success: true,
      message: "Admin complaints loaded successfully",

      complaints: formattedComplaints,
    });
  } catch (error) {
    console.error("Admin Get Complaints Error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});

/* =====================================================
   ADMIN - UPDATE COMPLAINT STATUS
===================================================== */

app.put(
  "/api/admin/complaints/:id/status",
  authenticateAdmin,
  async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      const allowedStatuses = [
        "Pending",
        "In Progress",
        "Resolved",
        "Rejected",
      ];

      if (!allowedStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Invalid complaint status",
        });
      }

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid complaint ID",
        });
      }

      const complaint = await Complaint.findByIdAndUpdate(
        id,
        {
          status,
        },
        {
          new: true,
        },
      ).populate("userId", "name mobile ward");

      if (!complaint) {
        return res.status(404).json({
          success: false,
          message: "Complaint not found",
        });
      }

      const baseUrl = getApiBaseUrl(req);

      const complaintObject = complaint.toObject();

      return res.status(200).json({
        success: true,
        message: "Complaint status updated successfully",

        complaint: {
          ...complaintObject,

          id: complaintObject._id,

          photo: complaintObject.photo
            ? `${baseUrl}/api/uploads/${complaintObject.photo}`
            : "",
        },
      });
    } catch (error) {
      console.error("Admin Update Complaint Status Error:", error);

      return res.status(500).json({
        success: false,
        message: "Server error",
      });
    }
  },
);

/* =====================================================
   ADMIN - WARDS
   GET ALL
===================================================== */

app.get("/api/admin/wards", authenticateAdmin, async (req, res) => {
  try {
    const wards = await Ward.find().sort({
      wardNumber: 1,
    });

    const formattedWards = await Promise.all(
      wards.map(async (ward) => {
        const registeredUsers = await User.countDocuments({
          ward: ward.wardNumber,
        });

        const wardMembers = await WardMember.countDocuments({
          wardNumber: ward.wardNumber,
        });

        const complaints = await Complaint.countDocuments({
          wardNumber: ward.wardNumber,
        });

        return {
          id: ward._id,
          _id: ward._id,
          wardNumber: ward.wardNumber,
          name: ward.name,
          description: ward.description,
          totalPeople: ward.totalPeople,
          registeredUsers,
          wardMembers,
          complaints,
          createdAt: ward.createdAt,
          updatedAt: ward.updatedAt,
        };
      }),
    );

    return res.status(200).json({
      success: true,
      message: "Admin wards loaded successfully",
      wards: formattedWards,
    });
  } catch (error) {
    console.error("Admin Get Wards Error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error while loading wards",
    });
  }
});

/* =====================================================
   ADMIN - CREATE WARD
===================================================== */

app.post("/api/admin/wards", authenticateAdmin, async (req, res) => {
  try {
    const { wardNumber, name, description = "", totalPeople = 0 } = req.body;

    if (!wardNumber || !name) {
      return res.status(400).json({
        success: false,
        message: "Ward number and ward name are required",
      });
    }

    const existingWard = await Ward.findOne({
      wardNumber: wardNumber.toString().trim(),
    });

    if (existingWard) {
      return res.status(409).json({
        success: false,
        message: "Ward number already exists",
      });
    }

    const ward = await Ward.create({
      wardNumber: wardNumber.toString().trim(),

      name: name.trim(),

      description: description || "",

      totalPeople: Number(totalPeople) || 0,
    });

    return res.status(201).json({
      success: true,
      message: "Ward created successfully",
      ward,
    });
  } catch (error) {
    console.error("Admin Create Ward Error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error while creating ward",
    });
  }
});

/* =====================================================
   ADMIN - UPDATE WARD
===================================================== */

app.put("/api/admin/wards/:id", authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const { wardNumber, name, description = "", totalPeople = 0 } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid ward ID",
      });
    }

    if (!wardNumber || !name) {
      return res.status(400).json({
        success: false,
        message: "Ward number and ward name are required",
      });
    }

    const duplicateWard = await Ward.findOne({
      wardNumber: wardNumber.toString().trim(),

      _id: {
        $ne: id,
      },
    });

    if (duplicateWard) {
      return res.status(409).json({
        success: false,
        message: "Another ward already uses this ward number",
      });
    }

    const oldWard = await Ward.findById(id);

    if (!oldWard) {
      return res.status(404).json({
        success: false,
        message: "Ward not found",
      });
    }

    const oldWardNumber = oldWard.wardNumber;

    const newWardNumber = wardNumber.toString().trim();

    const ward = await Ward.findByIdAndUpdate(
      id,
      {
        wardNumber: newWardNumber,

        name: name.trim(),

        description: description || "",

        totalPeople: Number(totalPeople) || 0,
      },
      {
        new: true,
        runValidators: true,
      },
    );

    if (oldWardNumber !== newWardNumber) {
      await WardMember.updateMany(
        {
          wardNumber: oldWardNumber,
        },
        {
          $set: {
            wardNumber: newWardNumber,
          },
        },
      );

      await WardUpdate.updateMany(
        {
          wardNumber: oldWardNumber,
        },
        {
          $set: {
            wardNumber: newWardNumber,
          },
        },
      );

      await Complaint.updateMany(
        {
          wardNumber: oldWardNumber,
        },
        {
          $set: {
            wardNumber: newWardNumber,
          },
        },
      );

      await User.updateMany(
        {
          ward: oldWardNumber,
        },
        {
          $set: {
            ward: newWardNumber,
          },
        },
      );
    }

    return res.status(200).json({
      success: true,
      message: "Ward updated successfully",
      ward,
    });
  } catch (error) {
    console.error("Admin Update Ward Error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error while updating ward",
    });
  }
});

/* =====================================================
   ADMIN - DELETE WARD
===================================================== */

app.delete("/api/admin/wards/:id", authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid ward ID",
      });
    }

    const ward = await Ward.findById(id);

    if (!ward) {
      return res.status(404).json({
        success: false,
        message: "Ward not found",
      });
    }

    const wardNumber = ward.wardNumber;

    const usersCount = await User.countDocuments({
      ward: wardNumber,
    });

    const membersCount = await WardMember.countDocuments({
      wardNumber,
    });

    const complaintsCount = await Complaint.countDocuments({
      wardNumber,
    });

    const updatesCount = await WardUpdate.countDocuments({
      wardNumber,
    });

    if (
      usersCount > 0 ||
      membersCount > 0 ||
      complaintsCount > 0 ||
      updatesCount > 0
    ) {
      return res.status(409).json({
        success: false,
        message:
          "Cannot delete this ward because related users, ward members, complaints or updates exist.",

        relatedData: {
          users: usersCount,

          wardMembers: membersCount,

          complaints: complaintsCount,

          updates: updatesCount,
        },
      });
    }

    await Ward.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message: "Ward deleted successfully",
    });
  } catch (error) {
    console.error("Admin Delete Ward Error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});

/* =====================================================
   ADMIN - WARD MEMBERS
   GET ALL
===================================================== */

app.get("/api/admin/ward-members", authenticateAdmin, async (req, res) => {
  try {
    const members = await WardMember.find().sort({
      wardNumber: 1,
      createdAt: 1,
    });

    return res.status(200).json({
      success: true,
      message: "Admin ward members loaded successfully",
      wardMembers: members,
      members,
    });
  } catch (error) {
    console.error("Admin Get Ward Members Error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error while loading ward members",
    });
  }
});

/* =====================================================
   ADMIN - CREATE WARD MEMBER
===================================================== */

app.post("/api/admin/ward-members", authenticateAdmin, async (req, res) => {
  try {
    const { wardNumber, name, role, mobile = "", photo = "" } = req.body;

    if (!wardNumber || !name || !role) {
      return res.status(400).json({
        success: false,
        message: "Ward number, name and role are required",
      });
    }

    const ward = await Ward.findOne({
      wardNumber: wardNumber.toString().trim(),
    });

    if (!ward) {
      return res.status(404).json({
        success: false,
        message: "Ward not found",
      });
    }

    if (mobile && !/^[0-9]{10}$/.test(mobile)) {
      return res.status(400).json({
        success: false,
        message: "Enter a valid 10 digit mobile number",
      });
    }

    const member = await WardMember.create({
      wardNumber: wardNumber.toString().trim(),

      name: name.trim(),

      role: role.trim(),

      mobile: mobile || "",

      photo: photo || "",
    });

    return res.status(201).json({
      success: true,
      message: "Ward member created successfully",

      wardMember: member,
      member,
    });
  } catch (error) {
    console.error("Admin Create Ward Member Error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error while creating ward member",
    });
  }
});

/* =====================================================
   ADMIN - UPDATE WARD MEMBER
===================================================== */

app.put("/api/admin/ward-members/:id", authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const { wardNumber, name, role, mobile = "", photo = "" } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid ward member ID",
      });
    }

    if (!wardNumber || !name || !role) {
      return res.status(400).json({
        success: false,
        message: "Ward number, name and role are required",
      });
    }

    const ward = await Ward.findOne({
      wardNumber: wardNumber.toString().trim(),
    });

    if (!ward) {
      return res.status(404).json({
        success: false,
        message: "Ward not found",
      });
    }

    if (mobile && !/^[0-9]{10}$/.test(mobile)) {
      return res.status(400).json({
        success: false,
        message: "Enter a valid 10 digit mobile number",
      });
    }

    const member = await WardMember.findByIdAndUpdate(
      id,
      {
        wardNumber: wardNumber.toString().trim(),

        name: name.trim(),

        role: role.trim(),

        mobile: mobile || "",

        photo: photo || "",
      },
      {
        new: true,
        runValidators: true,
      },
    );

    if (!member) {
      return res.status(404).json({
        success: false,
        message: "Ward member not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Ward member updated successfully",

      wardMember: member,

      member,
    });
  } catch (error) {
    console.error("Admin Update Ward Member Error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error while updating ward member",
    });
  }
});

/* =====================================================
   ADMIN - DELETE WARD MEMBER
===================================================== */

app.delete(
  "/api/admin/ward-members/:id",
  authenticateAdmin,
  async (req, res) => {
    try {
      const { id } = req.params;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid ward member ID",
        });
      }

      const member = await WardMember.findByIdAndDelete(id);

      if (!member) {
        return res.status(404).json({
          success: false,
          message: "Ward member not found",
        });
      }

      return res.status(200).json({
        success: true,
        message: "Ward member deleted successfully",
      });
    } catch (error) {
      console.error("Admin Delete Ward Member Error:", error);

      return res.status(500).json({
        success: false,
        message: "Server error",
      });
    }
  },
);

/* =====================================================
   ADMIN - USERS
   GET ALL
===================================================== */

app.get("/api/admin/users", authenticateAdmin, async (req, res) => {
  try {
    const users = await User.find({
      role: {
        $ne: "admin",
      },
    })
      .select("-password")
      .sort({
        createdAt: -1,
      });

    const formattedUsers = await Promise.all(
      users.map(async (user) => {
        const complaints = await Complaint.countDocuments({
          userId: user._id,
        });

        return {
          id: user._id,
          _id: user._id,
          name: user.name,
          mobile: user.mobile,
          ward: user.ward,
          role: user.role,
          complaints,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        };
      }),
    );

    return res.status(200).json({
      success: true,
      message: "Admin users loaded successfully",
      users: formattedUsers,
    });
  } catch (error) {
    console.error("Admin Get Users Error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error while loading users",
    });
  }
});

/* =====================================================
   ADMIN - GET SINGLE USER
===================================================== */

app.get("/api/admin/users/:id", authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID",
      });
    }

    const user = await User.findById(id).select("-password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const complaints = await Complaint.find({
      userId: user._id,
    }).sort({
      createdAt: -1,
    });

    const baseUrl = getApiBaseUrl(req);

    const formattedComplaints = complaints.map((complaint) => {
      const object = complaint.toObject();

      return {
        ...object,

        id: object._id,

        photo: object.photo ? `${baseUrl}/api/uploads/${object.photo}` : "",
      };
    });

    return res.status(200).json({
      success: true,
      message: "User loaded successfully",
      user,
      complaints: formattedComplaints,
    });
  } catch (error) {
    console.error("Admin Get User Error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});

/* =====================================================
   ADMIN - UPDATE USER
===================================================== */

app.put("/api/admin/users/:id", authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const { name, mobile, ward = "" } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID",
      });
    }

    if (!name || !mobile) {
      return res.status(400).json({
        success: false,
        message: "Name and mobile are required",
      });
    }

    if (!/^[0-9]{10}$/.test(mobile)) {
      return res.status(400).json({
        success: false,
        message: "Enter a valid 10 digit mobile number",
      });
    }

    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (user.role === "admin") {
      return res.status(403).json({
        success: false,
        message: "Admin account cannot be edited here",
      });
    }

    const duplicateMobile = await User.findOne({
      mobile: mobile.trim(),

      _id: {
        $ne: id,
      },
    });

    if (duplicateMobile) {
      return res.status(409).json({
        success: false,
        message: "Mobile number already belongs to another user",
      });
    }

    user.name = name.trim();

    user.mobile = mobile.trim();

    user.ward = ward ? ward.toString().trim() : "";

    await user.save();

    const updatedUser = await User.findById(id).select("-password");

    return res.status(200).json({
      success: true,
      message: "User updated successfully",
      user: updatedUser,
    });
  } catch (error) {
    console.error("Admin Update User Error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});

/* =====================================================
   ADMIN - DELETE USER
===================================================== */

app.delete("/api/admin/users/:id", authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID",
      });
    }

    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (user.role === "admin") {
      return res.status(403).json({
        success: false,
        message: "Admin account cannot be deleted",
      });
    }

    const complaintCount = await Complaint.countDocuments({
      userId: user._id,
    });

    if (complaintCount > 0) {
      return res.status(409).json({
        success: false,
        message:
          "Cannot delete this user because complaints submitted by this user exist.",
        complaintCount,
      });
    }

    await User.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message: "User deleted successfully",
    });
  } catch (error) {
    console.error("Admin Delete User Error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});

/* =====================================================
   GET SINGLE COMPLAINT
===================================================== */

app.get("/api/complaints/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid complaint ID",
      });
    }

    const complaint = await Complaint.findById(id).populate(
      "userId",
      "name mobile ward",
    );

    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: "Complaint not found",
      });
    }

    const complaintObject = complaint.toObject();

    const baseUrl = getApiBaseUrl(req);

    const photo = complaintObject.photo
      ? `${baseUrl}/api/uploads/${complaintObject.photo}`
      : "";

    return res.status(200).json({
      success: true,

      complaint: {
        ...complaintObject,

        id: complaintObject._id,

        photo,
      },
    });
  } catch (error) {
    console.error("Get Complaint Details Error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});

/* =====================================================
   LOGOUT
===================================================== */

app.post("/api/auth/logout", authenticateToken, (req, res) => {
  return res.status(200).json({
    success: true,
    message: "Logout successful",
  });
});

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

  if (error.message === "Only image files are allowed") {
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

  console.log("🚀 Tiruppur North Backend Started");

  console.log("====================================");

  console.log(`📡 Local: http://localhost:${PORT}`);

  console.log("☁️ Image Storage: MongoDB Atlas GridFS");

  console.log(`📊 Admin Dashboard: /api/admin/dashboard`);

  console.log(`🏘️ Admin Wards: /api/admin/wards`);

  console.log(`🧑‍💼 Admin Ward Members: /api/admin/ward-members`);

  console.log(`👥 Admin Users: /api/admin/users`);

  console.log(`📢 Admin Complaints: /api/admin/complaints`);

  console.log(`🖼️ Images: /api/uploads/:id`);

  console.log("====================================");

  console.log("");
});
