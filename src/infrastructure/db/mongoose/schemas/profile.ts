import {
  Schema,
  model,
  models,
  type Document,
  type Model,
  type Types,
} from "mongoose";

export interface ProfileDocument extends Document {
  userId: Types.ObjectId;
  teams: {
    joined: Types.ObjectId[];
    inviting: Types.ObjectId[];
  };
  info?: Record<string, unknown>;
  preferences?: Record<string, unknown>;
}

const profileSchema = new Schema<ProfileDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    teams: {
      joined: [
        {
          type: Schema.Types.ObjectId,
          ref: "Team",
          required: false,
        },
      ],
      inviting: [
        {
          type: Schema.Types.ObjectId,
          ref: "Team",
          required: false,
        },
      ],
    },
    info: {
      type: Object,
      required: false,
    },
    preferences: {
      type: Object,
      required: false,
    },
  },
  {
    timestamps: true,
  },
);

profileSchema.index({ userId: 1 });

export const Profile =
  (models.Profile as Model<ProfileDocument>) ||
  model<ProfileDocument>("Profile", profileSchema, "profiles");

export default Profile;
