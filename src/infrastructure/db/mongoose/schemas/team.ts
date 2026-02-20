import {
  Schema,
  model,
  models,
  type Document,
  type Model,
  type Types,
} from "mongoose";
import { Position } from "@/entities/team";

export interface LineupDocument extends Document {
  options: {
    liberoReplaceMode: 0 | 1 | 2;
    liberoReplacePosition: Position;
  };
  starting: {
    _id: Types.ObjectId;
    position: Position;
    sub: {
      _id: Types.ObjectId;
      entryIndex: { in: number; out: number };
    };
  }[];
  liberos: {
    _id: Types.ObjectId;
    position: Position;
    sub: {
      _id: Types.ObjectId;
      entryIndex: { in: number; out: number };
    };
  }[];
  substitutes: {
    _id: Types.ObjectId;
    sub: {
      _id: Types.ObjectId;
      entryIndex: { in: number; out: number };
    };
  }[];
}

export const lineupSchema = new Schema<LineupDocument>({
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
      _id: { type: Schema.Types.ObjectId, ref: "Player" },
      position: { type: String, enum: Position },
      sub: {
        _id: { type: Schema.Types.ObjectId, ref: "Player" },
        entryIndex: { in: { type: Number }, out: { type: Number } },
      },
    },
  ],
  liberos: [
    {
      _id: { type: Schema.Types.ObjectId, ref: "Player" },
      position: { type: String, enum: Position },
      sub: {
        _id: { type: Schema.Types.ObjectId, ref: "Player" },
        entryIndex: { in: { type: Number }, out: { type: Number } },
      },
    },
  ],
  substitutes: [
    {
      _id: { type: Schema.Types.ObjectId, ref: "Player" },
      sub: {
        _id: { type: Schema.Types.ObjectId, ref: "Player" },
        entryIndex: { in: { type: Number }, out: { type: Number } },
      },
    },
  ],
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
  }
);

export const Team =
  (models.Team as Model<TeamDocument>) ||
  model<TeamDocument>("Team", teamSchema, "teams");
export default Team;
