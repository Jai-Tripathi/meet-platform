import mongoose from "mongoose";

const meetingSchema = new mongoose.Schema(
    {
        host: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        title: { type: String, required: true },
        description: { type: String },
        meetingCode: { type: String, unique: true, required: true },
        meetingUrl: { type: String, unique: true, required: true },
        time: { type: String, required: true },
        date: { type: String, required: true },
        isInstant: { type: Boolean, default: false },
        participants: [
            {
                user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
                name: { type: String },
                status: { type: String, enum: ["waiting", "joined", "denied"], default: "waiting" },
                joinedAt: { type: Date },
            },
        ],
        status: { type: String, enum: ["scheduled", "ongoing", "ended"], default: "scheduled" },
        settings: {
            allowScreenShare: { type: Boolean, default: true },
            allowUnmute: { type: Boolean, default: true },
            allowVideo: { type: Boolean, default: true },
            allowChat: { type: Boolean, default: true },
            allowRaiseHand: { type: Boolean, default: true },
        },
    },
    { timestamps: true }

);

const Meeting = mongoose.model("Meeting", meetingSchema);

export default Meeting;