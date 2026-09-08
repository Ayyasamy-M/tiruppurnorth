const express = require("express");
const multer = require("multer");
const bcrypt = require("bcryptjs");

const User = require("../models/User");
const Ward = require("../models/Ward");
const Complaint = require("../models/Complaint");
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
| Helper - Get Logged In User ID
|--------------------------------------------------------------------------
*/

const getUserId = (req) => {
  return req.user?.userId || req.user?.id;
};

/*
|--------------------------------------------------------------------------
| Helper - Get API Base URL
|--------------------------------------------------------------------------
*/

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
| UPDATE USER WARD
|--------------------------------------------------------------------------
| PUT /api/user/ward
|--------------------------------------------------------------------------
|
| Body:
|
| {
|   "ward": "10"
| }
|
| This route is used after user registration/login
| when the user selects their ward.
|
|--------------------------------------------------------------------------
*/

router.put("/ward", authenticateToken, async (req, res) => {
  try {
    const userId = getUserId(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Invalid authentication data",
      });
    }

    const requestedWard =
      req.body?.ward !== undefined && req.body?.ward !== null
        ? String(req.body.ward).trim()
        : "";

    /*
    |--------------------------------------------------------------------------
    | Validate Ward
    |--------------------------------------------------------------------------
    */

    if (!requestedWard) {
      return res.status(400).json({
        success: false,
        message: "Ward is required",
      });
    }

    if (!/^\d+$/.test(requestedWard)) {
      return res.status(400).json({
        success: false,
        message: "Invalid ward number",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Find Logged In User
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
    | Find Ward
    |--------------------------------------------------------------------------
    */

    const ward = await Ward.findOne({
      wardNumber: requestedWard,
    });

    if (!ward) {
      return res.status(404).json({
        success: false,
        message: `Ward ${requestedWard} not found`,
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Save Ward
    |--------------------------------------------------------------------------
    */

    user.ward = requestedWard;

    await user.save();

    /*
    |--------------------------------------------------------------------------
    | Build Response User
    |--------------------------------------------------------------------------
    */

    const photoUrl = user.photo
      ? `${getApiBaseUrl(req)}/api/uploads/${user.photo}`
      : "";

    const responseUser = {
      id: user._id,
      name: user.name,
      mobile: user.mobile,
      email: user.email || "",
      address: user.address || "",
      ward: user.ward || "",
      role: user.role,
      photo: user.photo || "",
      photoUrl,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

    console.log("");
    console.log("====================================");
    console.log("🏘️ USER WARD UPDATED");
    console.log("====================================");
    console.log("User ID:", user._id.toString());
    console.log("User:", user.name);
    console.log("Ward:", requestedWard);
    console.log("====================================");
    console.log("");

    return res.status(200).json({
      success: true,
      message: "Ward updated successfully",
      user: responseUser,
    });
  } catch (error) {
    console.error("Update ward error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update ward",
    });
  }
});

/*
|--------------------------------------------------------------------------
| GET PROFILE
|--------------------------------------------------------------------------
| GET /api/user/profile
|--------------------------------------------------------------------------
*/

router.get("/profile", authenticateToken, async (req, res) => {
  try {
    const userId = getUserId(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Invalid authentication data",
      });
    }

    const user = await User.findById(userId).select("-password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const photoUrl = user.photo
      ? `${getApiBaseUrl(req)}/api/uploads/${user.photo}`
      : "";

    return res.json({
      success: true,

      user: {
        id: user._id,
        name: user.name,
        mobile: user.mobile,
        email: user.email || "",
        address: user.address || "",
        ward: user.ward || "",
        role: user.role,
        photo: user.photo || "",
        photoUrl,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    });
  } catch (error) {
    console.error("Get profile error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to load profile",
    });
  }
});

/*
|--------------------------------------------------------------------------
| UPDATE PROFILE
|--------------------------------------------------------------------------
| PUT /api/user/profile
|--------------------------------------------------------------------------
|
| User can update:
| - name
| - mobile
| - email
| - address
|
| User CANNOT update:
| - ward
| - role
| - password
| - photo
|
|--------------------------------------------------------------------------
*/

router.put("/profile", authenticateToken, async (req, res) => {
  try {
    const userId = getUserId(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Invalid authentication data",
      });
    }

    const { name, mobile, email, address } = req.body;

    /*
    |--------------------------------------------------------------------------
    | Validation
    |--------------------------------------------------------------------------
    */

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: "Name is required",
      });
    }

    const cleanName = name.trim();

    if (cleanName.length < 2) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid name",
      });
    }

    let cleanMobile = "";

    if (mobile !== undefined) {
      cleanMobile = String(mobile).trim();

      if (!/^\d{10}$/.test(cleanMobile)) {
        return res.status(400).json({
          success: false,
          message: "Mobile number must be exactly 10 digits",
        });
      }
    }

    let cleanEmail = "";

    if (email !== undefined && email !== null) {
      cleanEmail = String(email).trim().toLowerCase();

      if (cleanEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
        return res.status(400).json({
          success: false,
          message: "Please enter a valid email address",
        });
      }
    }

    const cleanAddress =
      address !== undefined && address !== null ? String(address).trim() : "";

    /*
    |--------------------------------------------------------------------------
    | Find Current User
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
    | Mobile Duplicate Check
    |--------------------------------------------------------------------------
    */

    if (cleanMobile && cleanMobile !== user.mobile) {
      const existingUser = await User.findOne({
        mobile: cleanMobile,
        _id: { $ne: user._id },
      });

      if (existingUser) {
        return res.status(409).json({
          success: false,
          message: "This mobile number is already registered",
        });
      }

      user.mobile = cleanMobile;
    }

    /*
    |--------------------------------------------------------------------------
    | Update Allowed Fields Only
    |--------------------------------------------------------------------------
    */

    user.name = cleanName;

    if (email !== undefined) {
      user.email = cleanEmail;
    }

    if (address !== undefined) {
      user.address = cleanAddress;
    }

    /*
    |--------------------------------------------------------------------------
    | IMPORTANT
    |--------------------------------------------------------------------------
    | Do NOT update:
    |
    | user.ward
    | user.role
    | user.password
    |
    |--------------------------------------------------------------------------
    */

    await user.save();

    const responseUser = {
      id: user._id,
      name: user.name,
      mobile: user.mobile,
      email: user.email || "",
      address: user.address || "",
      ward: user.ward || "",
      role: user.role,
      photo: user.photo || "",
      photoUrl: user.photo
        ? `${getApiBaseUrl(req)}/api/uploads/${user.photo}`
        : "",
    };

    return res.json({
      success: true,
      message: "Profile updated successfully",
      user: responseUser,
    });
  } catch (error) {
    console.error("Update profile error:", error);

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Mobile number already registered",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to update profile",
    });
  }
});

/*
|--------------------------------------------------------------------------
| CHANGE PASSWORD
|--------------------------------------------------------------------------
| PUT /api/user/change-password
|--------------------------------------------------------------------------
*/

router.put("/change-password", authenticateToken, async (req, res) => {
  try {
    const userId = getUserId(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Invalid authentication data",
      });
    }

    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Current password and new password are required",
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: "New password must be at least 6 characters",
      });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const passwordMatch = await bcrypt.compare(currentPassword, user.password);

    if (!passwordMatch) {
      return res.status(401).json({
        success: false,
        message: "Current password is incorrect",
      });
    }

    const samePassword = await bcrypt.compare(newPassword, user.password);

    if (samePassword) {
      return res.status(400).json({
        success: false,
        message: "New password must be different from current password",
      });
    }

    user.password = await bcrypt.hash(newPassword, 10);

    await user.save();

    return res.json({
      success: true,
      message: "Password changed successfully",
    });
  } catch (error) {
    console.error("Change password error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to change password",
    });
  }
});

/*
|--------------------------------------------------------------------------
| UPLOAD PROFILE PHOTO
|--------------------------------------------------------------------------
| POST /api/user/profile/photo
|--------------------------------------------------------------------------
|
| FormData field:
| photo
|
|--------------------------------------------------------------------------
*/

router.post(
  "/profile/photo",
  authenticateToken,
  upload.single("photo"),
  async (req, res) => {
    try {
      const userId = getUserId(req);

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "Invalid authentication data",
        });
      }

      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: "Profile photo is required",
        });
      }

      const user = await User.findById(userId);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      /*
      |--------------------------------------------------------------------------
      | Upload New Photo
      |--------------------------------------------------------------------------
      */

      const uploadedFile = await uploadImageToGridFS(req.file);

      /*
      |--------------------------------------------------------------------------
      | Delete Old Photo
      |--------------------------------------------------------------------------
      */

      if (user.photo) {
        await deleteGridFSFile(user.photo);
      }

      /*
      |--------------------------------------------------------------------------
      | Save New Photo ID
      |--------------------------------------------------------------------------
      */

      user.photo = uploadedFile.id.toString();

      await user.save();

      const photoUrl = `${getApiBaseUrl(req)}/api/uploads/${user.photo}`;

      return res.json({
        success: true,
        message: "Profile photo updated successfully",

        photo: user.photo,
        photoUrl,

        user: {
          id: user._id,
          name: user.name,
          mobile: user.mobile,
          email: user.email || "",
          address: user.address || "",
          ward: user.ward || "",
          role: user.role,
          photo: user.photo,
          photoUrl,
        },
      });
    } catch (error) {
      console.error("Profile photo upload error:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to update profile photo",
      });
    }
  },
);

/*
|--------------------------------------------------------------------------
| GET MY COMPLAINTS
|--------------------------------------------------------------------------
| GET /api/user/complaints
|--------------------------------------------------------------------------
*/

router.get("/complaints", authenticateToken, async (req, res) => {
  try {
    const userId = getUserId(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Invalid authentication data",
      });
    }

    const complaints = await Complaint.find({
      userId,
    })
      .sort({ createdAt: -1 })
      .lean();

    const apiBaseUrl = getApiBaseUrl(req);

    const formattedComplaints = complaints.map((complaint) => ({
      ...complaint,

      id: complaint._id,

      photoUrl: complaint.photo
        ? `${apiBaseUrl}/api/uploads/${complaint.photo}`
        : "",
    }));

    return res.json({
      success: true,
      complaints: formattedComplaints,
    });
  } catch (error) {
    console.error("Get my complaints error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to load your complaints",
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
