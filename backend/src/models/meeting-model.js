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
    },
    { timestamps: true }

);

const Meeting = mongoose.model("Meeting", meetingSchema);

export default Meeting;