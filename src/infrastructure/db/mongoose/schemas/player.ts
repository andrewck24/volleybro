import mongoose from 'mongoose';

/**
 * Mongoose Player Schema
 * Unified schema for team members, invited users, and pure players
 *
 * State Machine:
 * - INVITED: email ✓ && userId ✗
 * - JOINED: userId ✓
 * - PURE_PLAYER: email ✗ && userId ✗
 *
 * Virtual fields:
 * - status: Computed from email and userId fields
 */

const PlayerSchema = new mongoose.Schema(
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
      enum: ['', 'OH', 'MB', 'OP', 'S', 'L'],
      default: '',
    },
    teamId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Team',
    },
    userId: {
      type: String, // Better Auth user.id
    },
    email: {
      type: String,
      lowercase: true,
      trim: true,
    },
    role: {
      type: String,
      enum: ['MEMBER', 'ADMIN', 'OWNER'],
    },
  },
  {
    timestamps: true,
    collection: 'players',
  }
);

// Single field indices for common queries
PlayerSchema.index({ teamId: 1 });
PlayerSchema.index({ userId: 1 });
PlayerSchema.index({ email: 1 });

// Composite unique index to prevent duplicate invitations to same email in same team
// Sparse: only applies to documents where email field exists
// PartialFilterExpression: only applies to non-null, non-empty email values
PlayerSchema.index(
  { teamId: 1, email: 1 },
  {
    unique: true,
    sparse: true,
    partialFilterExpression: {
      email: { $exists: true, $ne: null, $ne: '' },
    },
  }
);

// Composite index for querying members who have joined a team
PlayerSchema.index({ teamId: 1, userId: 1 });

// Virtual field for status inference
PlayerSchema.virtual('status').get(function (this: any) {
  if (this.userId) return 'JOINED';
  if (this.email) return 'INVITED';
  return 'PURE_PLAYER';
});

export const PlayerModel = mongoose.model('Player', PlayerSchema);

export default PlayerSchema;
