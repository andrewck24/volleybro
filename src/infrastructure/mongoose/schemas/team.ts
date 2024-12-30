import { Schema, model, models } from "mongoose";
import { Position, Role } from "@/entities/team";

export const lineupSchema = new Schema({
  options: {
    liberoReplaceMode: { type: Number, enum: [0, 1, 2], default: 0 },
    liberoReplacePosition: {
      type: String,
      enum: Position,
      default: Position.NONE,
    },
  },
  starting: [
    {
      _id: { type: Schema.Types.ObjectId, ref: "Member" },
      position: { type: String, enum: Position },
      sub: {
        _id: { type: Schema.Types.ObjectId, ref: "Member" },
        rallyIndex: { in: { type: Number }, out: { type: Number } },
      },
    },
  ],
  liberos: [
    {
      _id: { type: Schema.Types.ObjectId, ref: "Member" },
      position: { type: String, enum: Position },
      sub: {
        _id: { type: Schema.Types.ObjectId, ref: "Member" },
        rallyIndex: { in: { type: Number }, out: { type: Number } },
      },
    },
  ],
  substitutes: [
    {
      _id: { type: Schema.Types.ObjectId, ref: "Member" },
      sub: {
        _id: { type: Schema.Types.ObjectId, ref: "Member" },
        rallyIndex: { in: { type: Number }, out: { type: Number } },
      },
    },
  ],
});

const teamSchema = new Schema(
  {
    name: { type: String, required: true },
    nickname: { type: String },
    members: [
      {
        _id: { type: Schema.Types.ObjectId, ref: "Member" },
        email: { type: String },
        role: { type: String, enum: [Role.MEMBER, Role.OWNER, Role.ADMIN] },
        user_id: { type: Schema.Types.ObjectId, ref: "User" },
      },
    ],
    lineups: [lineupSchema],
    stats: { type: Object },
  },
  {
    timestamps: true,
  }
);

export const Team = models.Team || model("Team", teamSchema, "teams");
export default Team;
