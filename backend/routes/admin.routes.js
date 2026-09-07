const express = require("express");
const mongoose = require("mongoose");

const User = require("../models/User");
const Ward = require("../models/Ward");
const WardMember = require("../models/WardMember");
const WardUpdate = require("../models/WardUpdate");
const Complaint = require("../models/Complaint");

const { authenticateAdmin } = require("../middleware/auth");

const router = express.Router();

/* =====================================================
   API BASE URL
===================================================== */

const getApiBaseUrl = (req) => {
  const configuredUrl = process.env.SERVER_URL;

  if (configuredUrl) {
    return configuredUrl.replace(/\/+$/, "");
  }

  const forwardedProto = req.headers["x-forwarded-proto"];

  const protocol = forwardedProto || req.protocol || "http";

  return `${protocol}://${req.get("host")}`;
};

/* =====================================================
   ADMIN ME
===================================================== */

router.get("/me", authenticateAdmin, async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId;

    const admin = await User.findById(userId).select("-password");

    if (!admin) {
      return res.status(404).json({
        success: false,
        message: "Admin account not found",
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

router.get("/dashboard", authenticateAdmin, async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId;

    const admin = await User.findById(userId).select("-password");

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
   ADMIN - GET COMPLAINTS
===================================================== */

router.get("/complaints", authenticateAdmin, async (req, res) => {
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

router.put("/complaints/:id/status", authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const { status } = req.body;

    const allowedStatuses = ["Pending", "In Progress", "Resolved", "Rejected"];

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
});

/* =====================================================
   ADMIN - GET ALL WARDS
===================================================== */

router.get("/wards", authenticateAdmin, async (req, res) => {
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

router.post("/wards", authenticateAdmin, async (req, res) => {
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

router.put("/wards/:id", authenticateAdmin, async (req, res) => {
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

    /*
     * If ward number changes,
     * update all related records.
     */

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
      message: "Server error",
    });
  }
});

/* =====================================================
   ADMIN - DELETE WARD
===================================================== */

router.delete("/wards/:id", authenticateAdmin, async (req, res) => {
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
   ADMIN - GET ALL WARD MEMBERS
===================================================== */

router.get("/ward-members", authenticateAdmin, async (req, res) => {
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

router.post("/ward-members", authenticateAdmin, async (req, res) => {
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

router.put("/ward-members/:id", authenticateAdmin, async (req, res) => {
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

router.delete("/ward-members/:id", authenticateAdmin, async (req, res) => {
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
});

/* =====================================================
   ADMIN - GET ALL USERS
===================================================== */

router.get("/users", authenticateAdmin, async (req, res) => {
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

router.get("/users/:id", authenticateAdmin, async (req, res) => {
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

router.put("/users/:id", authenticateAdmin, async (req, res) => {
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

router.delete("/users/:id", authenticateAdmin, async (req, res) => {
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

module.exports = router;
