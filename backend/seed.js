const mongoose = require("mongoose");
const dotenv = require("dotenv");

dotenv.config();

const wardSchema = new mongoose.Schema({
  wardNumber: String,
  name: String,
  description: String,
  totalPeople: Number,
});

const wardMemberSchema = new mongoose.Schema({
  wardNumber: String,
  name: String,
  role: String,
  mobile: String,
  photo: String,
});

const wardUpdateSchema = new mongoose.Schema({
  wardNumber: String,
  title: String,
  description: String,
  category: String,
  date: Date,
});

const Ward = mongoose.model("Ward", wardSchema);

const WardMember = mongoose.model("WardMember", wardMemberSchema);

const WardUpdate = mongoose.model("WardUpdate", wardUpdateSchema);

async function seedDatabase() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    console.log("✅ MongoDB Connected");

    await Ward.deleteMany({});
    await WardMember.deleteMany({});
    await WardUpdate.deleteMany({});

    /* =========================
       WARDS
    ========================= */

    const wards = [];

    for (let i = 1; i <= 10; i++) {
      wards.push({
        wardNumber: i.toString(),
        name: `Ward ${i}`,
        description: `Tiruppur North Ward ${i} information`,
        totalPeople: 0,
      });
    }

    await Ward.insertMany(wards);

    /* =========================
       MEMBERS
    ========================= */

    const members = [];

    for (let i = 1; i <= 10; i++) {
      members.push(
        {
          wardNumber: i.toString(),
          name: "Ward Member Name",
          role: "Ward Member",
          mobile: "",
          photo: "",
        },
        {
          wardNumber: i.toString(),
          name: "Ward Secretary Name",
          role: "Ward Secretary",
          mobile: "",
          photo: "",
        },
      );
    }

    await WardMember.insertMany(members);

    /* =========================
       UPDATES
    ========================= */

    const updates = [];

    for (let i = 1; i <= 10; i++) {
      updates.push(
        {
          wardNumber: i.toString(),
          title: "Road Work Update",
          description: "Ward road improvement work information.",
          category: "Road",
          date: new Date(),
        },
        {
          wardNumber: i.toString(),
          title: "Water Supply Update",
          description: "Water supply related information for residents.",
          category: "Water",
          date: new Date(Date.now() - 86400000),
        },
      );
    }

    await WardUpdate.insertMany(updates);

    console.log("✅ Ward data inserted");

    console.log("✅ Member data inserted");

    console.log("✅ Update data inserted");

    console.log("🎉 Database seeding completed");

    process.exit(0);
  } catch (error) {
    console.error("❌ Seed Error:", error);

    process.exit(1);
  }
}

seedDatabase();
