const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
require("dotenv").config();

const userSchema = new mongoose.Schema(
  {
    name: String,
    mobile: {
      type: String,
      unique: true,
    },
    password: String,
    ward: {
      type: String,
      default: "",
    },
    role: {
      type: String,
      enum: ["user", "admin", "ward_member"],
      default: "user",
    },
  },
  { timestamps: true },
);

const User = mongoose.model("User", userSchema);

async function createAdmin() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    const mobile = "9999999999";
    const password = "admin123";

    const existingAdmin = await User.findOne({ mobile });

    if (existingAdmin) {
      console.log("Admin already exists");
      process.exit();
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const admin = await User.create({
      name: "Administrator",
      mobile,
      password: hashedPassword,
      ward: "",
      role: "admin",
    });

    console.log("=================================");
    console.log("✅ ADMIN CREATED");
    console.log("=================================");
    console.log("Mobile:", admin.mobile);
    console.log("Password:", password);
    console.log("Role:", admin.role);
    console.log("=================================");

    process.exit();
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

createAdmin();
