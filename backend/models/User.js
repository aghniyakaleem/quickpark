import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ["SUPER_ADMIN", "VALET"], default: "VALET" },
  locationId: { type: mongoose.Schema.Types.ObjectId, ref: "Location" }, // only for valet
  createdAt: { type: Date, default: Date.now }
});

UserSchema.methods.setPassword = async function (plain) {
  this.passwordHash = await bcrypt.hash(plain, 10);
};

UserSchema.methods.validatePassword = async function (plain) {
  return await bcrypt.compare(plain, this.passwordHash);
};

export default mongoose.model("User", UserSchema);