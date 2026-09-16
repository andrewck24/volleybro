import {
  Schema,
  model,
  models,
  type Document,
  type Model,
  type Types,
} from "mongoose";

/**
 * Mongoose Player Schema
 * Unified schema for team members, invited users, and pure players
 *
 * Status Model (explicit field):
 * - NONE: Pure player, no system account linked (userId ✗, email ✗)
 * - INVITED + userId: Registered user invited (userId ✓, email ✗)
 * - INVITED + email: Unregistered user invited (userId ✗, email ✓)
 * - JOINED: User has accepted invitation (userId ✓, email ✗)
 */

export interface PlayerDocument extends Document {
  name: string;
  number?: number;
  position?: string;
  status: "NONE" | "INVITED" | "JOINED";
  teamId?: Types.ObjectId;
  userId?: Types.ObjectId;
  email?: string;
  role?: "MEMBER" | "ADMIN" | "OWNER";
  createdAt: Date;
  updatedAt: Date;
}

const PlayerSchema = new Schema<PlayerDocument>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
    },
    number: {
      type: Number,
      min: 0,
      max: 99,
    },
    position: {
      type: String,
      enum: ["", "OH", "MB", "OP", "S", "L"],
      default: "",
    },
    status: {
      type: String,
      enum: ["NONE", "INVITED", "JOINED"],
      required: true,
      default: "NONE",
    },
    teamId: {
      type: Schema.Types.ObjectId,
      ref: "Team",
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    email: {
      type: String,
      lowercase: true,
      trim: true,
    },
    role: {
      type: String,
      enum: ["MEMBER", "ADMIN", "OWNER"],
    },
  },
  {
    timestamps: true,
    collection: "players",
  },
);

// Single field indices for common queries
PlayerSchema.index({ teamId: 1 });
PlayerSchema.index({ userId: 1 });
PlayerSchema.index({ email: 1 });

// Partial unique indexes: MongoDB rejects `sparse` together with a
// partialFilterExpression, and does not support `$nin` inside one, so the
// previous declarations never created an index. Filtering on the stored type
// covers exactly the documents the uniqueness applies to.
PlayerSchema.index(
  { teamId: 1, email: 1 },
  { unique: true, partialFilterExpression: { email: { $type: "string" } } },
);

PlayerSchema.index(
  { teamId: 1, userId: 1 },
  { unique: true, partialFilterExpression: { userId: { $type: "objectId" } } },
);

// T060: Composite index for querying members by role within a team
PlayerSchema.index({ teamId: 1, role: 1 });

// Prevent model overwrite error in development (hot reload)
export const PlayerModel =
  (models.Player as Model<PlayerDocument>) ||
  model<PlayerDocument>("Player", PlayerSchema, "players");

export default PlayerSchema;
