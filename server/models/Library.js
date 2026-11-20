// Foundation for the next phase. User-selected names are data, never collection names.
import mongoose from "mongoose";
const { Schema } = mongoose;
const owner = {
  type: Schema.Types.ObjectId,
  ref: "User",
  required: true,
  index: true,
};
const name = {
  type: String,
  required: true,
  trim: true,
  maxlength: 100,
};

const bookSchema = new Schema(
  {
    owner,
    name,
    color: {
      type: String,
      default: "sage",
    },
  },
  {
    timestamps: true,
    collection: "Books",
  },
);
bookSchema.index({
  owner: 1,
  createdAt: -1,
});
export const Book = mongoose.model("Book", bookSchema);

const categorySchema = new Schema(
  {
    owner,
    name,
    book: {
      type: Schema.Types.ObjectId,
      ref: "Book",
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
    collection: "Categories",
  },
);
categorySchema.index({
  owner: 1,
  book: 1,
});
export const Category = mongoose.model("Category", categorySchema);

const tabSchema = new Schema(
  {
    owner,
    category: {
      type: Schema.Types.ObjectId,
      ref: "Category",
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 300,
    },
    url: {
      type: String,
      required: true,
      maxlength: 4096,
      validate: {
        validator(value) {
          try {
            return ["http:", "https:"].includes(new URL(value).protocol);
          } catch {
            return false;
          }
        },
        message: "Use an http or https URL.",
      },
    },
    type: {
      type: String,
      enum: ["article", "video", "documentation", "other"],
      default: "other",
    },
    notes: {
      type: String,
      default: "",
      maxlength: 10000,
    },
    reviewed: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    collection: "Tabs",
  },
);
tabSchema.index({
  owner: 1,
  category: 1,
  createdAt: -1,
});
tabSchema.index({
  title: "text",
  notes: "text",
});
export const Tab = mongoose.model("Tab", tabSchema);
