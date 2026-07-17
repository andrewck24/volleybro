import { Schema, model, models, type Document, type Model } from "mongoose";

export interface VerificationTokenDocument extends Document {
  email: string;
  expires: Date;
  token: string;
  identifier: string;
}

/**
 * @typedef {Object} VerificationToken
 * @param {String} email - Email
 * @param {Date} expires - Expires
 * @param {String} token - Token: the actual token value that will be sent to the user
 * @param {String} identifier - Identifier: "sign-up" or "forgot-password"
 */

const verificationTokenSchema = new Schema<VerificationTokenDocument>({
  email: {
    type: String,
    trim: true,
  },
  expires: {
    type: Date,
    trim: true,
  },
  token: {
    type: String,
    trim: true,
  },
  identifier: {
    type: String,
    trim: true,
  },
});

verificationTokenSchema.index({ email: 1 }, { unique: true });

const VerificationToken =
  (models.VerificationToken as Model<VerificationTokenDocument>) ||
  model<VerificationTokenDocument>(
    "VerificationToken",
    verificationTokenSchema,
    "verificationTokens",
  );
export default VerificationToken;
