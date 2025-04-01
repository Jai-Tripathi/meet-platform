import Meeting from "../models/meeting-model.js";
import { io, getMeetingParticipantsSocketIds } from "../lib/socket.js";

const generateMeetingCode = () => uuidv4().slice(0, 8);

// ICE Servers (STUN only for free)
const iceServers = [{ urls: "stun:stun.l.google.com:19302" }];

export const createMeeting = async (req, res) => {
    try {
        const { title, description, meetingCode, time, date, meetingUrl } = req.body;
        const host = req.user._id;

        if (!title || !time || !date) {
            return res.status(400).json({ message: "Title, Date and Time are required." });
        }

        const newMeeting = new Meeting({
            host,
            title,
            description,
            meetingCode,
            meetingUrl,
            time,
            date,
            status: "scheduled"
        });

        await newMeeting.save();
        res.status(201).json(newMeeting);
    } catch (error) {
        res.status(500).json({ message: "Internal Server Error", error: error.message });
        console.log("Error in creating meeting" + error.message);
    }
};


export const getMeetings = async (req, res) => {
    try {
        const meetings = await Meeting.find({ host: req.user._id }).sort({ date: 1, time: 1 });
        res.status(200).json(meetings);
    } catch (error) {
        res.status(500).json({ message: "Failed to fetch meetings", error: error.message });
    }
};


export const deleteMeeting = async (req, res) => {
    try {
        const { id } = req.params;
        const meeting = await Meeting.findById(id);

        if (!meeting) {
            return res.status(404).json({ message: "Meeting not found" });
        }

        if (meeting.host._id.toString() !== req.user._id.toString()) {

            return res.status(403).json({ message: "Unauthorized to delete this meeting" });
        }

        await meeting.deleteOne();
        res.status(200).json({ message: "Meeting deleted successfully" });
    } catch (error) {
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};

export const createInstantMeeting = async (req, res) => {
    try {
        const hostId = req.user._id; // From auth middleware

        const meeting = new Meeting({
            host: hostId,
            title: "Instant Meeting",
            description: "Started instantly",
            meetingCode: generateMeetingCode(),
            meetingUrl: `/Meeting-live/${generateMeetingCode()}`,
            time: new Date().toLocaleTimeString(),
            date: new Date().toISOString().split("T")[0],
            isInstant: true,
            status: "ongoing",
        });

        await meeting.save();
        res.status(201).json({
            meetingCode: meeting.meetingCode,
            meetingUrl: meeting.meetingUrl,
        });
    } catch (err) {
        console.log("Error in createInstantMeeting controller", err.message);
        res.status(500).json({ message: "Internal Server Error" });
    }
};

export const joinMeeting = async (req, res) => {
    try {
        const { meetingCode } = req.body;
        const userId = req.user._id;

        const meeting = await Meeting.findOne({ meetingCode });
        if (!meeting) {
            return res.status(404).json({ message: "Meeting not found" });
        }

        const isHost = meeting.host.toString() === userId.toString();
        let participant = meeting.participants.find((p) => p.user.toString() === userId);

        if (!participant) {
            // Add user to participants
            participant = { user: userId, status: isHost ? "joined" : "waiting" };
            meeting.participants.push(participant);
            if (isHost && meeting.status === "scheduled") {
                meeting.status = "ongoing"; // Host starts the meeting
            }
            await meeting.save();
            io.to(meetingCode).emit("participantUpdate", meeting.participants);
        } else if (isHost && participant.status !== "joined") {
            // Ensure host is always "joined"
            participant.status = "joined";
            if (meeting.status === "scheduled") {
                meeting.status = "ongoing";
            }
            await meeting.save();
            io.to(meetingCode).emit("participantUpdate", meeting.participants);
        }

        res.status(200).json({
            meetingId: meeting._id,
            status: participant.status,
            iceServers,
        });
    } catch (err) {
        console.log("Error in joinMeeting controller", err.message);
        res.status(500).json({ message: "Internal Server Error" });
    }
};

export const manageParticipants = async (req, res) => {
    try {
        const { meetingCode, participantId, action } = req.body; // action: "allow", "deny", "allowAll"
        const hostId = req.user._id;

        const meeting = await Meeting.findOne({ meetingCode, host: hostId });
        if (!meeting) {
            return res.status(403).json({ message: "Not authorized or meeting not found" });
        }

        if (action === "allowAll") {
            meeting.participants.forEach((p) => {
                if (p.status === "waiting") p.status = "joined";
            });
        } else {
            const participant = meeting.participants.find((p) => p.user.toString() === participantId);
            if (participant) {
                participant.status = action === "allow" ? "joined" : "denied";
                if (action === "allow") participant.joinedAt = new Date();
            }
        }

        await meeting.save();
        io.to(meetingCode).emit("participantUpdate", meeting.participants); // Notify all
        res.status(200).json({ message: "Participants updated successfully" });
    } catch (err) {
        console.log("Error in manageParticipants controller", err.message);
        res.status(500).json({ message: "Internal Server Error" });
    }
};

export const endMeeting = async (req, res) => {
    try {
        const { meetingCode } = req.body;
        const hostId = req.user._id;

        const meeting = await Meeting.findOne({ meetingCode, host: hostId });
        if (!meeting) {
            return res.status(403).json({ message: "Not authorized or meeting not found" });
        }

        meeting.status = "ended";
        meeting.participants = []; // Clear participants
        await meeting.save();

        // Notify all participants via Socket.IO
        io.to(meetingCode).emit("meetingEnded");
        res.status(200).json({ message: "Meeting ended successfully" });
    } catch (err) {
        console.log("Error in endMeeting controller", err.message);
        res.status(500).json({ message: "Internal Server Error" });
    }
};

export const getMeetingDetails = async (req, res) => {
    try {
        const { meetingCode } = req.params;

        const meeting = await Meeting.findOne({ meetingCode })
            .populate("host", "name")
            .populate("participants.user", "name");
        if (!meeting) {
            return res.status(404).json({ message: "Meeting not found" });
        }

        res.status(200).json({ ...meeting.toJSON(), iceServers });
    } catch (err) {
        console.log("Error in getMeetingDetails controller", err.message);
        res.status(500).json({ message: "Internal Server Error" });
    }
};

export const getParticipantsForSidebar = async (req, res) => {
    try {
        const { meetingCode } = req.params;

        const meeting = await Meeting.findOne({ meetingCode })
            .populate("participants.user", "name")
            .select("participants");
        if (!meeting) {
            return res.status(404).json({ message: "Meeting not found" });
        }

        const participantSocketIds = getMeetingParticipantsSocketIds(meetingCode); // From socket.js
        const participantsWithStatus = meeting.participants.map((p) => ({
            userId: p.user._id,
            name: p.user.name,
            status: p.status,
            isOnline: participantSocketIds.includes(p.user._id), // Check if they're connected
        }));

        res.status(200).json(participantsWithStatus);
    } catch (err) {
        console.log("Error in getParticipantsForSidebar controller", err.message);
        res.status(500).json({ message: "Internal Server Error" });
    }
};

export const leaveMeeting = async (req, res) => {
    try {
        const { meetingCode } = req.body;
        const userId = req.user._id;

        const meeting = await Meeting.findOne({ meetingCode });
        if (!meeting) {
            return res.status(404).json({ message: "Meeting not found" });
        }

        const isHost = meeting.host.toString() === userId.toString();
        if (isHost) {
            // If host tries to "leave", redirect to endMeeting logic
            return endMeeting(req, res);
        }

        const participantIdx = meeting.participants.findIndex(
            (p) => p.user.toString() === userId.toString()
        );
        if (participantIdx === -1) {
            return res.status(400).json({ message: "You are not in this meeting" });
        }

        meeting.participants.splice(participantIdx, 1);
        await meeting.save();

        io.to(meetingCode).emit("participantUpdate", meeting.participants);
        res.status(200).json({ message: "Left the meeting successfully" });
    } catch (err) {
        console.log("Error in leaveMeeting controller", err.message);
        res.status(500).json({ message: "Internal Server Error" });
    }
};