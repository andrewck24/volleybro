import {
  Schema,
  model,
  models,
  type Document,
  type Model,
  type Types,
} from "mongoose";

export interface PlayerDocument extends Document {
  name: string;
  number?: number;
  position?: string;
  status: "NONE" | "INVITED" | "JOINED";
  teamId?: Types.ObjectId;
  userId?: Types.ObjectId;
  email?: string;
  inviteeEmail?: string;
  role?: "MEMBER" | "ADMIN";
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
      trim: true,
    },
    inviteeEmail: {
      type: String,
    },
    role: {
      type: String,
      enum: ["MEMBER", "ADMIN"],
    },
  },
  {
    timestamps: true,
    collection: "players",
  },
);

PlayerSchema.index({ teamId: 1 });
PlayerSchema.index({ userId: 1 });
PlayerSchema.index({ email: 1 });

PlayerSchema.index(
  { teamId: 1, email: 1 },
  { unique: true, partialFilterExpression: { email: { $type: "string" } } },
);

PlayerSchema.index(
  { teamId: 1, inviteeEmail: 1 },
  {
    unique: true,
    partialFilterExpression: {
      inviteeEmail: { $type: "string" },
      status: "INVITED",
    },
  },
);

PlayerSchema.index(
  { teamId: 1, userId: 1 },
  { unique: true, partialFilterExpression: { userId: { $type: "objectId" } } },
);

PlayerSchema.index({ teamId: 1, role: 1 });

export const PlayerModel =
  (models.Player as Model<PlayerDocument>) ||
  model<PlayerDocument>("Player", PlayerSchema, "players");

export default PlayerSchema;
