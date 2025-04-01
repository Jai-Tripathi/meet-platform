import express from "express";
import http from "http";
import { Server } from "socket.io";
import Meeting from "../models/meeting-model.js"

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "http://localhost:5173" }, // Adjust for production
});

// Map to store socket IDs for users in meetings: { meetingCode: { userId: socketId } }
const meetingSocketMap = {};

// Utility to get socket IDs of participants in a meeting
export function getMeetingParticipantsSocketIds(meetingCode) {
    return meetingSocketMap[meetingCode] ? Object.values(meetingSocketMap[meetingCode]) : [];
}

// Utility to get a specific user's socket ID in a meeting
export function getParticipantSocketId(meetingCode, userId) {
    return meetingSocketMap[meetingCode]?.[userId] || null;
}

io.on("connection", (socket) => {
    console.log("A user connected", socket.id);

    // User joins a meeting
    socket.on("joinMeeting", async ({ meetingCode, userId }) => {
        if (!meetingCode || !userId) {
            socket.emit("error", "Meeting code and user ID are required");
            return;
        }

        // Join the meeting room
        socket.join(meetingCode);

        // Initialize meetingSocketMap for this meeting if it doesn’t exist
        if (!meetingSocketMap[meetingCode]) {
            meetingSocketMap[meetingCode] = {};
        }

        // Store the user’s socket ID
        meetingSocketMap[meetingCode][userId] = socket.id;

        // Fetch meeting from DB to validate and get participants
        const meeting = await Meeting.findOne({ meetingCode });
        if (!meeting) {
            socket.emit("error", "Meeting not found");
            return;
        }

        const participant = meeting.participants.find((p) => p.user.toString() === userId);
        if (!participant || participant.status !== "joined") {
            socket.emit("error", "Not allowed to join yet");
            return;
        }

        // Notify all in the meeting about updated participants
        io.to(meetingCode).emit("participantUpdate", meeting.participants);

        // WebRTC signaling
        socket.on("signal", (data) => {
            io.to(meetingCode).emit("signal", { userId, signal: data.signal });
        });

        // Chat
        socket.on("sendMessage", (message) => {
            io.to(meetingCode).emit("newMessage", { userId, message, timestamp: new Date() });
        });

        // Raise Hand
        socket.on("raiseHand", () => {
            io.to(meetingCode).emit("handRaised", { userId });
        });

        // Screen Share Toggle
        socket.on("toggleScreenShare", (isSharing) => {
            io.to(meetingCode).emit("screenShareToggled", { userId, isSharing });
        });

        // Handle disconnect
        socket.on("disconnect", async () => {
            console.log("A user disconnected", socket.id);

            if (meetingSocketMap[meetingCode] && meetingSocketMap[meetingCode][userId]) {
                delete meetingSocketMap[meetingCode][userId];

                // Clean up if no participants remain in the meeting
                if (Object.keys(meetingSocketMap[meetingCode]).length === 0) {
                    delete meetingSocketMap[meetingCode];
                }

                // Update DB and notify others
                constmeets = await Meeting.findOne({ meetingCode });
                if (meeting) {
                    const participantIdx = meeting.participants.findIndex(
                        (p) => p.user.toString() === userId
                    );
                    if (participantIdx !== -1) {
                        meeting.participants.splice(participantIdx, 1);
                        await meeting.save();
                        io.to(meetingCode).emit("participantUpdate", meeting.participants);
                    }
                }

                io.to(meetingCode).emit("participantUpdate", meeting.participants);
            }
        });
    });

    // Handle meeting end
    socket.on("endMeeting", ({ meetingCode }) => {
        io.to(meetingCode).emit("meetingEnded");
        if (meetingSocketMap[meetingCode]) {
            delete meetingSocketMap[meetingCode];
        }
    });
});

export { io, app, server };