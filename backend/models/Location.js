// models/Location.js
import mongoose from "../db.js";
import slugify from "slugify";

const LocationSchema = new mongoose.Schema({
  name: { type: String, required: true },
  slug: { type: String, required: true, unique: true },
  paymentRequired: { type: Boolean, default: false },
  // fixed amount for the location (in rupees). Default 20 if not set.
  paymentAmount: { type: Number, default: 20 },
  address: { type: String, default: "" },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  createdAt: { type: Date, default: Date.now }
});

LocationSchema.statics.createWithSlug = async function (name, paymentRequired = false, createdBy = null, paymentAmount = 20) {
  const base = slugify(name, { lower: true, strict: true, trim: true });
  let slug = base;
  let i = 0;
  while (await this.findOne({ slug })) {
    i += 1;
    slug = `${base}-${i}`;
  }
  const loc = await this.create({ name, slug, paymentRequired, createdBy, paymentAmount });
  return loc;
};

export default mongoose.model("Location", LocationSchema);