const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const User = require("../models/User");
const { authenticateToken } = require("../middleware/auth");

const router = express.Router();

/*
|--------------------------------------------------------------------------
| REGISTER
|--------------------------------------------------------------------------
| POST /api/auth/register
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

    const cleanName = name.trim();
    const cleanMobile = mobile.trim();
    const cleanEmail = email ? email.trim().toLowerCase() : "";
    const cleanAddress = address ? address.trim() : "";
    const cleanWard = ward ? ward.trim() : "";

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

    const existingUser = await User.findOne({
      mobile: cleanMobile,
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "Mobile number already registered",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name: cleanName,
      mobile: cleanMobile,
      password: hashedPassword,
      email: cleanEmail,
      address: cleanAddress,
      ward: cleanWard,
      role: "user",
    });

    return res.status(201).json({
      success: true,
      message: "Registration successful",
      user: {
        id: user._id,
        name: user.name,
        mobile: user.mobile,
        email: user.email,
        address: user.address,
        ward: user.ward,
        role: user.role,
        photo: user.photo || "",
      },
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
| IMPORTANT:
| JWT payload keeps `userId` for compatibility with the
| existing application.
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

    const cleanMobile = mobile.trim();

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

    const token = jwt.sign(
      {
        userId: user._id.toString(),
        role: user.role,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "7d",
      },
    );

    return res.json({
      success: true,
      message: "Login successful",

      token,

      user: {
        id: user._id,
        name: user.name,
        mobile: user.mobile,
        email: user.email || "",
        address: user.address || "",
        ward: user.ward || "",
        role: user.role,
        photo: user.photo || "",
      },
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
      user: {
        id: user._id,
        name: user.name,
        mobile: user.mobile,
        email: user.email || "",
        address: user.address || "",
        ward: user.ward || "",
        role: user.role,
        photo: user.photo || "",
      },
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
| LOGOUT
|--------------------------------------------------------------------------
| POST /api/auth/logout
|--------------------------------------------------------------------------
| JWT is stateless, so logout is handled on the client by
| removing the stored token.
*/
router.post("/logout", authenticateToken, async (req, res) => {
  return res.json({
    success: true,
    message: "Logout successful",
  });
});

module.exports = router;
