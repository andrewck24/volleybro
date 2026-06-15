import { Position } from "@/entities/team";
import {
  Schema,
  model,
  models,
  type Document,
  type Model,
  type Types,
} from "mongoose";

export interface LineupDocument extends Document {
  options: {
    liberoReplaceMode: 0 | 1 | 2;
    liberoReplacePosition: Position;
  };
  starting: {
    playerId: Types.ObjectId | null;
    position: Position;
    sub: {
      playerId: Types.ObjectId | null;
      entryIndex: { in: number; out: number };
    };
  }[];
  liberos: {
    playerId: Types.ObjectId | null;
    position: Position;
    sub: {
      playerId: Types.ObjectId | null;
      entryIndex: { in: number; out: number };
    };
  }[];
  substitutes: {
    playerId: Types.ObjectId | null;
    sub: {
      playerId: Types.ObjectId | null;
      entryIndex: { in: number; out: number };
    };
  }[];
}

const entryIndexSchema = new Schema(
  {
    in: { type: Number },
    out: { type: Number },
  },
  { _id: false },
);

const subSchema = new Schema(
  {
    playerId: { type: Schema.Types.ObjectId, ref: "Player", default: null },
    entryIndex: { type: entryIndexSchema },
  },
  { _id: false },
);

const lineupOptionsSchema = new Schema(
  {
    liberoReplaceMode: { type: Number, enum: [0, 1, 2], default: 0 },
    liberoReplacePosition: {
      type: String,
      enum: Position,
      default: Position.NONE,
    },
  },
  { _id: false },
);

const startingPlayerSchema = new Schema(
  {
    playerId: { type: Schema.Types.ObjectId, ref: "Player", default: null },
    position: { type: String, enum: Position },
    sub: { type: subSchema },
  },
  { _id: false },
);

const liberoPlayerSchema = new Schema(
  {
    playerId: { type: Schema.Types.ObjectId, ref: "Player", default: null },
    position: { type: String, enum: Position },
    sub: { type: subSchema },
  },
  { _id: false },
);

const substitutePlayerSchema = new Schema(
  {
    playerId: { type: Schema.Types.ObjectId, ref: "Player", default: null },
    sub: { type: subSchema },
  },
  { _id: false },
);

export const lineupSchema = new Schema<LineupDocument>({
  options: { type: lineupOptionsSchema },
  starting: [{ type: startingPlayerSchema }],
  liberos: [{ type: liberoPlayerSchema }],
  substitutes: [{ type: substitutePlayerSchema }],
});

export interface TeamDocument extends Document {
  name: string;
  nickname?: string;
  lineups: LineupDocument[];
  stats?: object;
}

const teamSchema = new Schema<TeamDocument>(
  {
    name: { type: String, required: true },
    nickname: { type: String },
    lineups: [lineupSchema],
    stats: { type: Object },
  },
  {
    timestamps: true,
  },
);

export const Team =
  (models.Team as Model<TeamDocument>) ||
  model<TeamDocument>("Team", teamSchema, "teams");
export default Team;
