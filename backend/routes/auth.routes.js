const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const User = require("../models/User");
const Ward = require("../models/Ward");
const { authenticateToken } = require("../middleware/auth");

const router = express.Router();

/*
|--------------------------------------------------------------------------
| USER RESPONSE FORMAT
|--------------------------------------------------------------------------
*/

const formatUser = (user) => {
  return {
    id: user._id,
    name: user.name,
    mobile: user.mobile,
    email: user.email || "",
    address: user.address || "",
    ward: user.ward || "",
    role: user.role,
    photo: user.photo || "",
  };
};

/*
|--------------------------------------------------------------------------
| CREATE JWT
|--------------------------------------------------------------------------
*/

const createToken = (user) => {
  return jwt.sign(
    {
      userId: user._id.toString(),
      role: user.role,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: "7d",
    },
  );
};

/*
|--------------------------------------------------------------------------
| REGISTER
|--------------------------------------------------------------------------
| POST /api/auth/register
|--------------------------------------------------------------------------
*/

router.post("/register", async (req, res) => {
  try {
    const {
      name,
      mobile,
      password,
      ward = "",
      email = "",
      address = "",
    } = req.body;

    if (!name || !mobile || !password) {
      return res.status(400).json({
        success: false,
        message: "Name, mobile and password are required",
      });
    }

    const cleanName = String(name).trim();
    const cleanMobile = String(mobile).trim();
    const cleanEmail = email ? String(email).trim().toLowerCase() : "";
    const cleanAddress = address ? String(address).trim() : "";
    const cleanWard = ward ? String(ward).trim() : "";

    if (cleanName.length < 2) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid name",
      });
    }

    if (!/^\d{10}$/.test(cleanMobile)) {
      return res.status(400).json({
        success: false,
        message: "Mobile number must be 10 digits",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters",
      });
    }

    if (cleanEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid email address",
      });
    }

    /*
     * Check duplicate mobile
     */
    const existingUser = await User.findOne({
      mobile: cleanMobile,
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "Mobile number already registered",
      });
    }

    /*
     * If ward is supplied during registration,
     * verify that the ward actually exists.
     *
     * Normally frontend sends ward = "" and the user
     * selects ward after login.
     */
    if (cleanWard) {
      const wardExists = await Ward.exists({
        wardNumber: cleanWard,
      });

      if (!wardExists) {
        return res.status(400).json({
          success: false,
          message: "Invalid ward selected",
        });
      }
    }

    /*
     * Hash password
     */
    const hashedPassword = await bcrypt.hash(password, 10);

    /*
     * Create user
     */
    const user = await User.create({
      name: cleanName,
      mobile: cleanMobile,
      password: hashedPassword,
      email: cleanEmail,
      address: cleanAddress,
      ward: cleanWard,
      role: "user",
    });

    /*
     * Create login token immediately after registration
     */
    const token = createToken(user);

    return res.status(201).json({
      success: true,
      message: "Registration successful",
      token,
      user: formatUser(user),
    });
  } catch (error) {
    console.error("Register error:", error);

    return res.status(500).json({
      success: false,
      message: "Registration failed",
    });
  }
});

/*
|--------------------------------------------------------------------------
| LOGIN
|--------------------------------------------------------------------------
| POST /api/auth/login
|--------------------------------------------------------------------------
*/

router.post("/login", async (req, res) => {
  try {
    const { mobile, password } = req.body;

    if (!mobile || !password) {
      return res.status(400).json({
        success: false,
        message: "Mobile and password are required",
      });
    }

    const cleanMobile = String(mobile).trim();

    const user = await User.findOne({
      mobile: cleanMobile,
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

    const token = createToken(user);

    return res.json({
      success: true,
      message: "Login successful",
      token,
      user: formatUser(user),
    });
  } catch (error) {
    console.error("Login error:", error);

    return res.status(500).json({
      success: false,
      message: "Login failed",
    });
  }
});

/*
|--------------------------------------------------------------------------
| GET CURRENT USER
|--------------------------------------------------------------------------
| GET /api/auth/me
|--------------------------------------------------------------------------
*/

router.get("/me", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;

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

    return res.json({
      success: true,
      user: formatUser(user),
    });
  } catch (error) {
    console.error("Get current user error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to get user details",
    });
  }
});

/*
|--------------------------------------------------------------------------
| UPDATE USER WARD
|--------------------------------------------------------------------------
| PUT /api/auth/ward
|
| SECURITY RULE:
|
| User with NO ward
|       ↓
| Can select ONE valid ward
|
| User with existing ward
|       ↓
| Cannot change ward
|
| Only admin should be able to change an already
| assigned ward through admin functionality.
|--------------------------------------------------------------------------
*/

const updateWard = async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Invalid authentication data",
      });
    }

    const requestedWard = String(
      req.body.ward || req.body.wardNumber || "",
    ).trim();

    if (!requestedWard) {
      return res.status(400).json({
        success: false,
        message: "Ward is required",
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
     * This endpoint is ONLY for normal users.
     */
    if (user.role !== "user") {
      return res.status(403).json({
        success: false,
        message: "Only normal users can select a ward",
      });
    }

    /*
     * IMPORTANT SECURITY CHECK
     *
     * If the user already has a ward,
     * they cannot change it themselves.
     */
    if (user.ward && String(user.ward).trim() !== "") {
      return res.status(403).json({
        success: false,
        message: "Ward is already assigned. You cannot change your ward.",
        ward: user.ward,
      });
    }

    /*
     * Verify ward exists in database.
     */
    const ward = await Ward.findOne({
      wardNumber: requestedWard,
    });

    if (!ward) {
      return res.status(404).json({
        success: false,
        message: "Selected ward does not exist",
      });
    }

    /*
     * Assign ward for the first time.
     */
    user.ward = requestedWard;

    await user.save();

    return res.json({
      success: true,
      message: "Ward assigned successfully",
      ward: user.ward,
      user: formatUser(user),
    });
  } catch (error) {
    console.error("Update ward error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update ward",
    });
  }
};

/*
 * Support PUT.
 * This should match the existing frontend API flow.
 */
router.put("/ward", authenticateToken, updateWard);

/*
 * Also support POST for compatibility if older frontend
 * code is using POST.
 */
router.post("/ward", authenticateToken, updateWard);

/*
|--------------------------------------------------------------------------
| LOGOUT
|--------------------------------------------------------------------------
| POST /api/auth/logout
|--------------------------------------------------------------------------
*/

router.post("/logout", authenticateToken, async (req, res) => {
  return res.json({
    success: true,
    message: "Logout successful",
  });
});

module.exports = router;
