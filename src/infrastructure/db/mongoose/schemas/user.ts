import { Schema, model, models, type Document, type Model } from "mongoose";

export interface UserDocument extends Document {
  name: string;
  email: string;
  emailVerified?: boolean;
  image?: string;
}

const userSchema = new Schema<UserDocument>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      trim: true,
    },
    emailVerified: {
      type: Boolean,
      required: false,
    },
    image: {
      type: String,
      required: false,
      trim: true,
    },
  },
  {
    timestamps: true,
  },
);

userSchema.index({ email: 1 });

export const User =
  (models.User as Model<UserDocument>) ||
  model<UserDocument>("User", userSchema, "users");
export default User;
