const express = require("express");

const Ward = require("../models/Ward");
const WardMember = require("../models/WardMember");
const WardUpdate = require("../models/WardUpdate");
const Complaint = require("../models/Complaint");
const User = require("../models/User");

const { authenticateToken } = require("../middleware/auth");

const router = express.Router();

/*
|--------------------------------------------------------------------------
| GET ALL WARDS
|--------------------------------------------------------------------------
| GET /api/wards
|--------------------------------------------------------------------------
| Public endpoint
|--------------------------------------------------------------------------
*/

router.get("/", async (req, res) => {
  try {
    const wards = await Ward.find({}).sort({ wardNumber: 1 }).lean();

    const wardsWithStats = await Promise.all(
      wards.map(async (ward) => {
        const wardNumber = String(ward.wardNumber).trim();

        const [userCount, memberCount, complaintCount] = await Promise.all([
          User.countDocuments({
            ward: wardNumber,
          }),

          WardMember.countDocuments({
            wardNumber,
          }),

          Complaint.countDocuments({
            wardNumber,
          }),
        ]);

        return {
          ...ward,

          userCount,
          memberCount,
          complaintCount,
        };
      }),
    );

    return res.json({
      success: true,
      wards: wardsWithStats,
    });
  } catch (error) {
    console.error("Get wards error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to load wards",
    });
  }
});

/*
|--------------------------------------------------------------------------
| GET SINGLE WARD
|--------------------------------------------------------------------------
| GET /api/wards/:wardNumber
|--------------------------------------------------------------------------
*/

router.get("/:wardNumber", authenticateToken, async (req, res) => {
  try {
    const wardNumber = String(req.params.wardNumber).trim();

    if (!wardNumber) {
      return res.status(400).json({
        success: false,
        message: "Ward number is required",
      });
    }

    /*
      |--------------------------------------------------------------------------
      | Find Ward
      |--------------------------------------------------------------------------
      */

    const ward = await Ward.findOne({
      wardNumber,
    }).lean();

    if (!ward) {
      return res.status(404).json({
        success: false,
        message: "Ward not found",
      });
    }

    /*
      |--------------------------------------------------------------------------
      | Fetch Ward Data
      |--------------------------------------------------------------------------
      */

    const [
      members,
      updates,
      complaints,
      userCount,
      memberCount,
      complaintCount,
    ] = await Promise.all([
      WardMember.find({
        wardNumber,
      })
        .sort({ createdAt: -1 })
        .lean(),

      WardUpdate.find({
        wardNumber,
      })
        .sort({
          date: -1,
          createdAt: -1,
        })
        .limit(20)
        .lean(),

      Complaint.find({
        wardNumber,
      })
        .sort({ createdAt: -1 })
        .limit(20)
        .populate("userId", "name mobile ward")
        .lean(),

      User.countDocuments({
        ward: wardNumber,
      }),

      WardMember.countDocuments({
        wardNumber,
      }),

      Complaint.countDocuments({
        wardNumber,
      }),
    ]);

    /*
      |--------------------------------------------------------------------------
      | Complaint Response Formatting
      |--------------------------------------------------------------------------
      */

    const apiBaseUrl = process.env.SERVER_URL
      ? process.env.SERVER_URL.replace(/\/$/, "")
      : `${req.headers["x-forwarded-proto"] || req.protocol || "http"}://${req.headers["x-forwarded-host"] || req.get("host")}`;

    const formattedComplaints = complaints.map((complaint) => ({
      ...complaint,

      id: complaint._id,

      photoUrl: complaint.photo
        ? `${apiBaseUrl}/api/uploads/${complaint.photo}`
        : "",
    }));

    /*
      |--------------------------------------------------------------------------
      | Final Response
      |--------------------------------------------------------------------------
      */

    return res.json({
      success: true,

      ward: {
        ...ward,

        userCount,
        memberCount,
        complaintCount,

        stats: {
          totalPeople: ward.totalPeople || 0,

          registeredUsers: userCount,

          wardMembers: memberCount,

          totalComplaints: complaintCount,
        },

        members,

        updates,

        complaints: formattedComplaints,
      },
    });
  } catch (error) {
    console.error("Get single ward error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to load ward details",
    });
  }
});

module.exports = router;
