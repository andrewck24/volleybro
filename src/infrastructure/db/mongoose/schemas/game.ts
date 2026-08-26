import {
  EntryType,
  MatchCategory,
  MatchDivision,
  MatchPhase,
  MoveType,
  Side,
} from "@/entities/game";
import {
  lineupSchema,
  type LineupDocument,
} from "@/infrastructure/db/mongoose/schemas/team";
import {
  Schema,
  model,
  models,
  type Document,
  type Model,
  type Types,
} from "mongoose";

interface MatchDocument extends Document {
  _id: Types.ObjectId;
  name?: string;
  number?: number;
  phase?: MatchPhase;
  division?: MatchDivision;
  category?: MatchCategory;
  scoring: {
    setCount: number;
    decidingSetPoints: number;
  };
  location?: {
    city?: string;
    hall?: string;
  };
  time?: {
    date?: string;
    start?: string;
    end?: string;
  };
  weather?: {
    temperature: number;
  };
}

const matchSchema = new Schema<MatchDocument>({
  _id: { type: Schema.Types.ObjectId },
  name: { type: String },
  number: { type: Number },
  phase: {
    type: Number,
    enum: Object.values(MatchPhase).filter((v) => typeof v === "number"),
    default: MatchPhase.NONE,
  },
  division: {
    type: Number,
    enum: Object.values(MatchDivision).filter((v) => typeof v === "number"),
    default: MatchDivision.NONE,
  },
  category: {
    type: Number,
    enum: Object.values(MatchCategory).filter((v) => typeof v === "number"),
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

interface PlayerStatsDocument extends Document {
  [MoveType.SERVING]: {
    success: number;
    error: number;
  };
  [MoveType.ATTACK]: {
    success: number;
    error: number;
  };
  [MoveType.BLOCKING]: {
    success: number;
    error: number;
  };
  [MoveType.RECEPTION]: {
    success: number;
    error: number;
  };
  [MoveType.DEFENSE]: {
    success: number;
    error: number;
  };
  [MoveType.SETTING]: {
    success: number;
    error: number;
  };
}

const playerStatsSchema = new Schema<PlayerStatsDocument>(
  {
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
  },
  { _id: false },
);

interface PlayerDocument extends Document {
  playerId: Types.ObjectId | null;
  name: string;
  number: number;
  // Statistics are derived from a set's entries (see deriveSetStats in
  // src/entities/game.ts), not read from this field. It has no writer; the
  // column is kept for a future materialization decision rather than dropped.
  stats: PlayerStatsDocument[];
}

const playerSchema = new Schema<PlayerDocument>(
  {
    playerId: {
      type: Schema.Types.ObjectId,
      ref: "Player",
      default: null,
    },
    name: { type: String },
    number: { type: Number },
    stats: [{ type: playerStatsSchema }],
  },
  { _id: false },
);

interface StaffDocument extends Document {
  playerId: Types.ObjectId | null;
  name: string;
  number: number;
  position: string;
}

const staffSchema = new Schema<StaffDocument>(
  {
    playerId: {
      type: Schema.Types.ObjectId,
      ref: "Player",
      default: null,
    },
    name: { type: String },
    number: { type: Number },
    position: { type: String, enum: ["", "C", "AC", "T", "M"], default: "" },
  },
  { _id: false },
);

interface TeamStatsDocument extends Document {
  [MoveType.SERVING]: { success: number; error: number };
  [MoveType.ATTACK]: { success: number; error: number };
  [MoveType.BLOCKING]: { success: number; error: number };
  [MoveType.RECEPTION]: { success: number; error: number };
  [MoveType.DEFENSE]: { success: number; error: number };
  [MoveType.SETTING]: { success: number; error: number };
  [MoveType.UNFORCED]: { success: number; error: number };
  rotation: number;
  timeout: number;
  substitution: number;
  challenge: number;
}

const teamStatsSchema = new Schema<TeamStatsDocument>(
  {
    [MoveType.SERVING]: { success: { type: Number }, error: { type: Number } },
    [MoveType.ATTACK]: { success: { type: Number }, error: { type: Number } },
    [MoveType.BLOCKING]: { success: { type: Number }, error: { type: Number } },
    [MoveType.RECEPTION]: {
      success: { type: Number },
      error: { type: Number },
    },
    [MoveType.DEFENSE]: { success: { type: Number }, error: { type: Number } },
    [MoveType.SETTING]: { success: { type: Number }, error: { type: Number } },
    [MoveType.UNFORCED]: {
      success: { type: Number },
      error: { type: Number },
    },
    rotation: { type: Number },
    timeout: { type: Number },
    substitution: { type: Number },
    challenge: { type: Number },
  },
  { _id: false },
);

interface TeamDocument extends Document {
  _id: Types.ObjectId;
  name: string;
  players: PlayerDocument[];
  staffs: StaffDocument[];
  // Same as PlayerDocument.stats: no writer, kept for a future materialization
  // decision. Team totals are derived from entries on read.
  stats: TeamStatsDocument[];
  lineup: { [key: number]: Types.ObjectId };
}

const teamSchema = new Schema<TeamDocument>({
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

interface RallyDetailDocument extends Document {
  score: number;
  type: MoveType;
  num: number;
  player: {
    playerId: Types.ObjectId | null;
    zone: number;
  };
}

const rallyDetailSchema = new Schema<RallyDetailDocument>(
  {
    score: { type: Number },
    type: {
      type: Number,
      enum: Object.values(MoveType).filter((v) => typeof v === "number"),
    },
    num: { type: Number },
    player: {
      playerId: { type: Schema.Types.ObjectId, ref: "Player", default: null },
      zone: { type: Number },
    },
  },
  { _id: false },
);

interface RallyDocument extends Document {
  win: boolean;
  home: RallyDetailDocument;
  away: RallyDetailDocument;
}

const rallySchema = new Schema<RallyDocument>({
  win: { type: Boolean },
  home: { type: rallyDetailSchema },
  away: { type: rallyDetailSchema },
});

const substitutionSchema = new Schema(
  {
    team: {
      type: Number,
      enum: Object.values(Side).filter((v) => typeof v === "number"),
    },
    players: {
      in: { type: Schema.Types.ObjectId, ref: "Player" },
      out: { type: Schema.Types.ObjectId, ref: "Player" },
    },
  },
  { _id: false },
);

const timeoutSchema = new Schema(
  {
    team: {
      type: Number,
      enum: Object.values(Side).filter((v) => typeof v === "number"),
    },
  },
  { _id: false },
);

const challengeSchema = new Schema(
  {
    team: {
      type: Number,
      enum: Object.values(Side).filter((v) => typeof v === "number"),
    },
    challengeType: { type: String },
    success: { type: Boolean },
  },
  { _id: false },
);

interface EntryDocument extends Document {
  id: string;
  seq: number;
  type: EntryType;
}

const entrySchema = new Schema<EntryDocument>(
  {
    id: { type: String, required: true },
    seq: { type: Number, required: true },
    type: { type: String, required: true, enum: Object.values(EntryType) },
  },
  { discriminatorKey: "type", _id: false },
);

interface SetDocument extends Document {
  win: boolean;
  lineups: {
    home: LineupDocument;
    away: LineupDocument;
  };
  options: {
    serve: Side;
    time: {
      start: string;
      end: string;
    };
  };
  entries: EntryDocument[];
}

const setSchema = new Schema<SetDocument>({
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
  entries: [entrySchema],
});

const entriesPath = setSchema.path("entries") as Schema.Types.DocumentArray;
entriesPath.discriminator(EntryType.RALLY, rallySchema);
entriesPath.discriminator(EntryType.SUBSTITUTION, substitutionSchema);
entriesPath.discriminator(EntryType.TIMEOUT, timeoutSchema);
entriesPath.discriminator(EntryType.CHALLENGE, challengeSchema);

export interface GameDocument extends Document {
  win: boolean;
  teamId: Types.ObjectId;
  info: MatchDocument;
  teams: {
    home: LineupDocument;
    away: LineupDocument;
  };
  sets: SetDocument[];
}

const gameSchema = new Schema<GameDocument>(
  {
    win: { type: Boolean },
    teamId: {
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
  },
);

gameSchema.index({ teamId: 1 });

export const Game =
  (models.Game as Model<GameDocument>) ||
  model<GameDocument>("Game", gameSchema, "games");
export default Game;
