// Adapted from fullstackauth/backend/models/user.js.
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const schema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 80,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      maxlength: 254,
    },
    password: { type: String, required: true, select: false },
  },
  { timestamps: true, collection: "Users" },
);
schema.pre("save", async function () {
  if (this.isModified("password"))
    this.password = await bcrypt.hash(this.password, 12);
});
export const User = mongoose.model("User", schema);

export const userRepository = {
  findByEmail: (email) => User.findOne({ email }).select("+password"),
  findById: (id) => (mongoose.isValidObjectId(id) ? User.findById(id) : null),
  create: (values) => User.create(values),
};
