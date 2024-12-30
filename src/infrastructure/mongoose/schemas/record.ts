import { Schema, model, models } from "mongoose";
import {
  MatchCategory,
  MatchDivision,
  MatchPhase,
  MoveType,
  Side,
  EntryType,
} from "@/entities/record";
import { lineupSchema } from "@/infrastructure/mongoose/schemas/team";

const matchSchema = new Schema({
  _id: { type: Schema.Types.ObjectId },
  name: { type: String },
  number: { type: Number },
  phase: {
    type: Number,
    enum: MatchPhase,
    default: MatchPhase.NONE,
  },
  division: {
    type: Number,
    enum: MatchDivision,
    default: MatchDivision.NONE,
  },
  category: {
    type: Number,
    enum: MatchCategory,
    default: MatchCategory.NONE,
  },
  scoring: {
    setCount: { type: Number, default: 3 },
    decidingSetPoints: { type: Number, default: 15 },
  },
  location: {
    city: { type: String },
    hall: { type: String },
  },
  time: {
    date: { type: String },
    start: { type: String },
    end: { type: String },
  },
  weather: {
    temperature: { type: Number },
  },
});

const playerStatsSchema = new Schema({
  [MoveType.SERVING]: {
    success: { type: Number },
    error: { type: Number },
  },
  [MoveType.ATTACK]: {
    success: { type: Number },
    error: { type: Number },
  },
  [MoveType.BLOCKING]: {
    success: { type: Number },
    error: { type: Number },
  },
  [MoveType.RECEPTION]: {
    success: { type: Number },
    error: { type: Number },
  },
  [MoveType.DEFENSE]: {
    success: { type: Number },
    error: { type: Number },
  },
  [MoveType.SETTING]: {
    success: { type: Number },
    error: { type: Number },
  },
});

const playerSchema = new Schema({
  _id: {
    type: Schema.Types.ObjectId,
    ref: "Member",
  },
  name: { type: String },
  number: { type: Number },
  stats: [{ type: playerStatsSchema }],
});

const staffSchema = new Schema({
  _id: {
    type: Schema.Types.ObjectId,
    ref: "Member",
  },
  name: { type: String },
  number: { type: Number },
  position: { type: String, enum: ["", "C", "AC", "T", "M"], default: "" },
});

const teamStatsSchema = new Schema({
  [MoveType.SERVING]: { success: { type: Number }, error: { type: Number } },
  [MoveType.ATTACK]: { success: { type: Number }, error: { type: Number } },
  [MoveType.BLOCKING]: { success: { type: Number }, error: { type: Number } },
  [MoveType.RECEPTION]: { success: { type: Number }, error: { type: Number } },
  [MoveType.DEFENSE]: { success: { type: Number }, error: { type: Number } },
  [MoveType.SETTING]: { success: { type: Number }, error: { type: Number } },
  [MoveType.UNFORCED]: { success: { type: Number }, error: { type: Number } },
  rotation: { type: Number },
  timeout: { type: Number },
  substitution: { type: Number },
  challenge: { type: Number },
});

const teamSchema = new Schema({
  _id: {
    type: Schema.Types.ObjectId,
    ref: "Team",
  },
  name: { type: String },
  players: [{ type: playerSchema }],
  staffs: [{ type: staffSchema }],
  stats: [{ type: teamStatsSchema }],
  lineup: { type: lineupSchema },
});

const rallyDetailSchema = new Schema({
  score: { type: Number },
  type: { type: Number, enum: MoveType },
  num: { type: Number },
  player: {
    _id: { type: Schema.Types.ObjectId, ref: "Member" },
    zone: { type: Number },
  },
});

const rallySchema = new Schema({
  win: { type: Boolean },
  home: { type: rallyDetailSchema },
  away: { type: rallyDetailSchema },
  entries: [{ type: { type: Number, enum: EntryType }, _id: { type: String } }],
});

const substitutionSchema = new Schema({
  team: { type: Number, enum: Side },
  players: {
    in: { type: Schema.Types.ObjectId, ref: "Member" },
    out: { type: Schema.Types.ObjectId, ref: "Member" },
  },
  rallyIndex: { type: Number },
});

const timeoutSchema = new Schema({
  team: { type: Number, enum: Side },
  rallyIndex: { type: Number },
});

const challengeSchema = new Schema({
  team: { type: Number, enum: Side },
  type: { type: String },
  success: { type: Boolean },
  rallyIndex: { type: Number },
});

const entrySchema = new Schema({
  type: { type: Number, enum: EntryType },
  data: { type: Schema.Types.Mixed },
});

const setSchema = new Schema({
  win: { type: Boolean },
  lineups: {
    home: { type: lineupSchema },
    away: { type: lineupSchema },
  },
  options: {
    serve: { type: String, enum: ["home", "away"] },
    time: {
      start: { type: String },
      end: { type: String },
    },
  },
  rallies: [{ type: rallySchema }],
  substitutions: [{ type: substitutionSchema }],
  timeouts: [{ type: timeoutSchema }],
  challenges: [{ type: challengeSchema }],
});

const recordSchema = new Schema(
  {
    win: { type: Boolean },
    team_id: {
      type: Schema.Types.ObjectId,
      ref: "Team",
    },
    info: { type: matchSchema },
    teams: {
      home: { type: teamSchema },
      away: { type: teamSchema },
    },
    sets: [{ type: setSchema }],
  },
  {
    timestamps: true,
  }
);

recordSchema.index({ team_id: 1 });

export const Record = models.Record || model("Record", recordSchema, "records");
export default Record;
