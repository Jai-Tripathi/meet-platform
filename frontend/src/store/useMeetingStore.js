import { create } from "zustand";
import { axiosInstance } from "../lib/axios.js";
import toast from "react-hot-toast";
import { useAuthStore } from "./useAuthStore.js";

export const useMeetingStore = create((set, get) => ({
    meetings: [],
    selectedMeeting: null,
    loading: false,
    participants: {},
    waitingToJoin: [],
    hostId: null,
    myStatus: null,
    meetingCode: null,
    isLeaving: false,

    // Local streams for each user
    streams: {},
    peerConnections: {},
    iceServers: null,
    setIceServers: (servers) => set({ iceServers: servers }),
    setLocalStream: (userId, stream) => set((state) => ({
        streams: { ...state.streams, [userId]: { ...state.streams[userId], video: stream } },
    })),
    setScreenStream: (userId, stream) => {
        set((state) => ({
            streams: { ...state.streams, [userId]: { ...state.streams[userId], screen: stream } },
        }));
        // Trigger re-negotiation for all peer connections
        const { peerConnections } = get();
        const authUserId = useAuthStore.getState().authUser?._id;
        console.log("SET SCREEN STREAM BEFORE RENEGOTIATE: ", get().streams, "peerConnections: ", peerConnections);
        Object.keys(peerConnections).forEach((participantId) => {
            console.log("SET SCREEN STREAM FOR PARTICIPANT: ", participantId, "authUserId: ", authUserId);
            get().renegotiatePeerConnection(participantId);
        });
    },

    // Add a remote stream to the streams object
    addRemoteStream: (userId, stream, streamType = 'video') => set((state) => ({
        streams: {
            ...state.streams,
            [userId]: {
                ...state.streams[userId],
                [streamType]: stream
            }
        },
    })),

    // Initialize a peer connection for a specific participant
    initPeerConnection: (participantId) => {
        const { iceServers, peerConnections } = get();
        const authUserId = useAuthStore.getState().authUser?._id;
        const socket = useAuthStore.getState().socket;

        if (!iceServers || !authUserId || !socket?.connected) {
            console.error("Cannot initialize peer connection: missing data", {
                iceServers,
                authUserId,
                socketConnected: socket?.connected,
            });
            return null;
        }

        // Skip if connection already exists
        if (peerConnections[participantId]) {
            console.log(`Peer connection for ${participantId} already exists`);
            return peerConnections[participantId];
        }

        console.log(`Initializing peer connection for ${participantId}`);

        // Create a new RTCPeerConnection
        const peerConnection = new RTCPeerConnection({
            iceServers: iceServers
        });

        // Store the connection in state
        set((state) => ({
            peerConnections: {
                ...state.peerConnections,
                [participantId]: peerConnection
            }
        }));

        console.log("INIT PEER CONNECTION: ", get().peerConnections);

        // Handle ICE candidate events
        peerConnection.onicecandidate = (event) => {
            console.log("INIT PEER CONNECTION, ICE CANDIDATE: ", event.candidate);
            if (event.candidate) {
                console.log(`Sending ICE candidate to ${participantId}`);
                socket.emit("ice-candidate", {
                    to: participantId,
                    from: authUserId,
                    candidate: event.candidate,
                    meetingCode: get().meetingCode
                });
            }
        };

        // Handle connection state changes
        peerConnection.onconnectionstatechange = () => {
            console.log(`Connection state for ${participantId}: ${peerConnection.connectionState}`);
            if (peerConnection.connectionState === 'failed' ||
                peerConnection.connectionState === 'disconnected' ||
                peerConnection.connectionState === 'closed') {
                // Clean up and try to reconnect
                get().cleanupPeerConnection(participantId);

                // If the meeting is still active, try to reconnect after a short delay
                if (get().myStatus === 'joined') {
                    setTimeout(() => {
                        console.log(`Attempting to reconnect with ${participantId}`);
                        get().createPeerConnection(participantId);
                    }, 2000);
                }
            }
        };

        // Handle track events - when remote peer adds tracks
        peerConnection.ontrack = (event) => {
            console.log(`[ON TRACK] Received track from ${participantId}:`, event.track.kind);

            // Determine if this is video or audio track
            const streamType = event.track.kind === 'video' ? 'video' : 'audio';

            // Create a new MediaStream if one doesn't exist
            const stream = event.streams[0] || new MediaStream([event.track]);

            // Add the remote stream to our state
            get().addRemoteStream(participantId, stream, streamType);
            console.log("Remote stream added after add Remote stream:", get().streams);
        };

        return peerConnection;
    },

    // Create a peer connection and send an offer
    createPeerConnection: async (participantId) => {
        const peerConnection = get().initPeerConnection(participantId);
        console.log("Create peer connection for participantId: ", participantId, "peerConnection: ", peerConnection)
        const socket = useAuthStore.getState().socket;
        const authUserId = useAuthStore.getState().authUser?._id;
        const { streams } = get();

        if (!peerConnection || !socket?.connected) return;

        // Add local streams to the peer connection
        if (streams[authUserId]?.video) {
            const videoStream = streams[authUserId].video;
            videoStream.getTracks().forEach(track => {
                console.log(`Adding ${track.kind} track to peer connection for ${participantId}`);
                peerConnection.addTrack(track, videoStream);
            });
        }

        // If screen sharing, add that stream too
        if (streams[authUserId]?.screen) {
            const screenStream = streams[authUserId].screen;
            screenStream.getTracks().forEach(track => {
                console.log(`Adding screen ${track.kind} track to peer connection for ${participantId}`);
                peerConnection.addTrack(track, screenStream);
            });
        }

        try {
            console.log("CREATING AN OFFER!!")
            // Create an offer
            const offer = await peerConnection.createOffer({
                offerToReceiveAudio: true,
                offerToReceiveVideo: true
            });

            // Set local description
            await peerConnection.setLocalDescription(offer);

            // Send the offer to the peer
            console.log(`Sending offer to ${participantId}`);
            socket.emit("webrtc-offer", {
                to: participantId,
                from: authUserId,
                offer: offer,
                meetingCode: get().meetingCode
            });
        } catch (error) {
            console.error(`Error creating offer for ${participantId}:`, error);
            console.log("Error in createPeerConnection:", error);
            toast.error("Failed to establish connection with a participant(createPeerConnection)");
        }
    },

    renegotiatePeerConnection: async (participantId) => {
        const peerConnection = get().peerConnections[participantId];
        const socket = useAuthStore.getState().socket;
        const authUserId = useAuthStore.getState().authUser?._id;
        const { streams } = get();

        if (!peerConnection || !socket?.connected) {
            console.error(`Cannot renegotiate: No peer connection for ${participantId}`);
            return;
        }

        if (streams[authUserId]?.video) {
            const videoStream = streams[authUserId].video;
            videoStream.getTracks().forEach(track => {
                if (!peerConnection.getSenders().find(sender => sender.track === track)) {
                    console.log(`Adding ${track.kind} track for renegotiation to ${participantId}`);
                    peerConnection.addTrack(track, videoStream);
                }
            });
        }

        // Add any new tracks 
        if (streams[authUserId]?.screen) {
            const screenStream = streams[authUserId].screen;
            screenStream.getTracks().forEach(track => {
                if (!peerConnection.getSenders().find(sender => sender.track === track)) {
                    console.log(`Adding screen ${track.kind} track for renegotiation to ${participantId}`);
                    peerConnection.addTrack(track, screenStream);
                }
            });
        }

        try {
            console.log(`Renegotiating with ${participantId}`);
            const offer = await peerConnection.createOffer({
                offerToReceiveAudio: true,
                offerToReceiveVideo: true
            });
            await peerConnection.setLocalDescription(offer);
            console.log(`Sending renegotiation offer to ${participantId}`);
            socket.emit("webrtc-offer", {
                to: participantId,
                from: authUserId,
                offer: offer,
                meetingCode: get().meetingCode
            });
        } catch (error) {
            console.error(`Error renegotiating with ${participantId}:`, error);
            toast.error("Failed to renegotiate connection");
        }
    },

    // Handle an incoming offer and send an answer
    handleOffer: async (data) => {
        const { from, offer } = data;
        const socket = useAuthStore.getState().socket;
        const authUserId = useAuthStore.getState().authUser?._id;
        const { streams } = get();

        console.log(`Received offer from ${from}`);

        // Initialize peer connection if it doesn't exist
        const peerConnection = get().initPeerConnection(from);



        if (!peerConnection || !socket?.connected) return;

        try {
            // Set remote description
            await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));

            // Add local tracks, but only if no sender exists for the track
            if (streams[authUserId]?.video) {
                const videoStream = streams[authUserId].video;
                videoStream.getTracks().forEach(track => {
                    if (!peerConnection.getSenders().find(sender => sender.track === track)) {
                        console.log(`Adding ${track.kind} track to peer connection for ${from} (useMeetingStore)`);
                        peerConnection.addTrack(track, videoStream);
                    }
                });
            }

            if (streams[authUserId]?.screen) {
                const screenStream = streams[authUserId].screen;
                screenStream.getTracks().forEach(track => {
                    if (!peerConnection.getSenders().find(sender => sender.track === track)) {
                        console.log(`Adding screen ${track.kind} track to peer connection for ${from}`);
                        peerConnection.addTrack(track, screenStream);
                    }
                });
            }


            // Create an answer
            const answer = await peerConnection.createAnswer();

            // Set local description
            await peerConnection.setLocalDescription(answer);

            // Send the answer to the peer
            console.log(`Sending answer to ${from}`);
            socket.emit("webrtc-answer", {
                to: from,
                from: authUserId,
                answer: answer,
                meetingCode: get().meetingCode
            });
        } catch (error) {
            console.error(`Error handling offer from ${from}:`, error);
            toast.error("Failed to establish connection with a participant(OFFER)");
        }
    },

    // Handle an incoming answer
    handleAnswer: async (data) => {
        const { from, answer } = data;
        const { peerConnections } = get();

        console.log(`Received answer from ${from}`);

        const peerConnection = peerConnections[from];
        if (!peerConnection) {
            console.error(`No peer connection found for ${from}`);
            return;
        }

        try {
            // Set remote description
            await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
            console.log(`Successfully set remote description for ${from}`);
        } catch (error) {
            console.error(`Error handling answer from ${from}:`, error);
        }
    },

    // Handle ICE candidate
    handleIceCandidate: async (data) => {
        const { from, candidate } = data;
        const { peerConnections } = get();

        console.log(`Received ICE candidate from ${from}`);

        const peerConnection = peerConnections[from];
        if (!peerConnection) {
            console.error(`No peer connection found for ${from}`);
            return;
        }

        try {
            // Add ICE candidate
            await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
            console.log(`Successfully added ICE candidate for ${from}`);
        } catch (error) {
            console.error(`Error handling ICE candidate from ${from}:`, error);
        }
    },

    // Initialize connections with all participants
    initializeConnections: () => {
        console.log("Initializing connections with all participants");
        const { participants, peerConnections } = get();
        const authUserId = useAuthStore.getState().authUser?._id;

        // For each participant, create a peer connection
        // For each participant, create a peer connection only if no connection exists
        Object.keys(participants).forEach(participantId => {
            if (participantId !== authUserId && !peerConnections[participantId]) {
                // Only initiate connection if authUserId is lexicographically smaller
                if (authUserId < participantId) {
                    console.log(`Initializing new connection with ${participantId} (authUserId ${authUserId} is smaller)`);
                    get().createPeerConnection(participantId);
                } else {
                    console.log(`Waiting for ${participantId} to initiate connection (authUserId ${authUserId} is larger)`);
                }
            } else if (peerConnections[participantId]) {
                console.log(`Skipping ${participantId}: peer connection already exists`);
            }
        });
    },

    // Clean up a specific peer connection
    cleanupPeerConnection: (participantId) => {
        const { peerConnections } = get();

        const peerConnection = peerConnections[participantId];
        if (peerConnection) {
            console.log(`Cleaning up peer connection for ${participantId}`);
            peerConnection.close();

            // Remove from state
            set((state) => {
                const newPeerConnections = { ...state.peerConnections };
                delete newPeerConnections[participantId];
                return { peerConnections: newPeerConnections };
            });
        }
    },

    // Clean up all peer connections
    cleanupAllConnections: () => {
        const { peerConnections } = get();

        Object.keys(peerConnections).forEach(participantId => {
            get().cleanupPeerConnection(participantId);
        });

        // Clean up streams too
        set({ streams: {}, peerConnections: {} });
    },

    // Setters for state variables
    setParticipants: (participants) => set({ participants }),

    setSelectedMeeting: (meeting) => set({ selectedMeeting: meeting }),

    setMyStatus: (participants) => {
        const authUserId = useAuthStore.getState().authUser?._id;
        if (!authUserId) {
            console.error("No authUser found to set myStatus");
            return;
        }
        console.log("participants: ", participants);
        console.log("authUserId: ", authUserId);
        const myParticipant = participants.find(
            (p) => {
                console.log("participant user id: ", p.user)
                return p.user.toString() === authUserId.toString()
            }
        );
        console.log("myParticipant: ", myParticipant)
        const newStatus = myParticipant ? myParticipant.status : null;
        console.log("Setting myStatus for user", authUserId, "to", newStatus);
        set({ myStatus: newStatus });
    },


    fetchMeetings: async () => {
        set({ loading: true });
        try {
            const res = await axiosInstance.get("/meetings");
            set({ meetings: res.data });
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to fetch meetings");
        } finally {
            set({ loading: false });
        }
    },

    addMeeting: async (newMeeting) => {
        set({ loading: true });
        try {
            const response = await axiosInstance.post("/meetings", newMeeting);
            set((state) => ({ meetings: [...state.meetings, response.data] }));
        } catch (error) {
            console.log("error in add meeting:" + error)
            toast.error(error.response?.data?.message || "Failed to add meeting");
        } finally {
            set({ loading: false });
        }
    },

    removeMeeting: async (meetingId) => {
        set({ loading: true });
        try {
            await axiosInstance.delete(`/meetings/${meetingId}`);
            set((state) => ({
                meetings: state.meetings.filter((meeting) => meeting._id !== meetingId)
            }));
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to delete meeting");
        } finally {
            set({ loading: false });
        }
    },

    joinMeeting: async (meetingCode) => {
        set({ loading: true });
        try {
            const res = await axiosInstance.post("/meetings/join", { meetingCode });
            console.log("response in join", res);
            const meeting = res.data;
            // Only set iceServers if not already set
            if (!get().iceServers) {
                get().setIceServers(res.data.iceServers);
                console.log("ice servers in join meeting:", res.data.iceServers);
            }
            set({
                selectedMeeting: meeting,
                meetingCode: meeting.meetingCode,
                hostId: meeting.host,
                participants: meeting.participants
                    .filter((p) => p.status === "joined")
                    .reduce((acc, p) => {
                        console.log("join meeting store: ", p);
                        acc[p.user._id || p.user] = {
                            name: p.name || "Unknown",
                            status: p.status,
                            mic: true,
                            video: true,
                            screenSharing: false,
                        };
                        return acc;
                    }, {}),
                waitingToJoin: meeting.participants
                    .filter((p) => p.status === "waiting")
                    .map((p) => ({ id: p.user._id || p.user, name: p.name || "Unknown" })),
                myStatus: meeting.status,
            });
            console.log("join meeting store MY-STATUS: ", get().myStatus);

            get().subscribeToMeetingEvents();
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to join meeting");
        } finally {
            set({ loading: false });
        }
    },



    leaveMeeting: async (options = {}) => {
        const { meetingCode, isLeaving, streams } = get();
        const socket = useAuthStore.getState().socket;
        const userId = useAuthStore.getState().authUser?._id;

        if (isLeaving) {
            console.log("Already leaving, skipping duplicate call");
            return;
        }
        console.log("leaveMeeting called for user:", userId, "meetingCode:", meetingCode, "stack:", new Error().stack);
        if (!meetingCode || !userId || !socket?.connected) {
            console.error("Cannot leave meeting: missing data or socket not connected", {
                meetingCode,
                userId,
                socketConnected: socket?.connected,
            });
            toast.error("Failed to leave meeting: Invalid state");
            return;
        }

        set({ isLeaving: true });

        try {
            get().cleanupAllConnections();
            if (streams[userId]?.video) {
                streams[userId].video.getTracks().forEach((track) => track.stop());
            }
            if (streams[userId]?.screen) {
                streams[userId].screen.getTracks().forEach((track) => track.stop());
            }
            // Skip API call if triggered by meeting end
            if (!options.meetingEnded) {
                console.log("Sending leave request to API:", { meetingCode });
                await axiosInstance.post("/meetings/leave", { meetingCode }).catch((err) => {
                    console.warn("Leave API failed (possibly already left):", err.response?.data);
                });
            } else {
                console.log("Meeting ended by host, skipping API call");
            }
            console.log("Emitting leaveMeeting event:", { meetingCode, userId });
            socket.emit("leaveMeeting", { meetingCode, userId });
            // Clean up socket listeners
            socket.off("participantUpdate");
            socket.off("meetingEnded");
            socket.off("toggleMic");
            socket.off("toggleVideo");
            socket.off("screenShareToggled");
            socket.off("streamUpdate");
            socket.off("updateParticipantState");
            socket.off("webrtc-offer");
            socket.off("webrtc-answer");
            socket.off("ice-candidate");
            set({
                selectedMeeting: null,
                meetingCode: null,
                participants: {},
                waitingToJoin: [],
                hostId: null,
                myStatus: null,
                streams: {},
                peerConnections: {},
            });

            console.log("Leaving meeting, redirecting to /");
            window.location.href = "/";
        } catch (err) {
            console.error("Error leaving meeting:", err);
            toast.error(err.response?.data?.message || "Failed to leave meeting");
            set({ isLeaving: false });
        } finally {
            set({ isLeaving: false });
        }
    },

    allowParticipant: async (userId) => {
        const { meetingCode, participants, waitingToJoin } = get();
        const user = waitingToJoin.find((u) => u.id === userId);
        if (!user) return;

        try {
            await axiosInstance.post("/meetings/allow", { meetingCode, userId });
            set({
                participants: {
                    ...participants,
                    [userId]: { name: user.name, mic: false, video: false, screenSharing: false },
                },
                waitingToJoin: waitingToJoin.filter((u) => u.id !== userId),
            });
            const socket = useAuthStore.getState().socket;
            socket.emit("participantUpdate", {
                meetingCode,
                userId,
                status: "joined",
            });
            toast.success(`${user.name} has been allowed to join`);
        } catch (err) {
            console.error("Error allowing participant:", err);
            toast.error("Failed to allow participant");
        }
    },

    denyParticipant: async (userId) => {
        const { meetingCode, waitingToJoin } = get();
        const user = waitingToJoin.find((u) => u.id === userId);
        if (!user) return;

        try {
            await axiosInstance.post("/meetings/deny", { meetingCode, userId });
            set({
                waitingToJoin: waitingToJoin.filter((u) => u.id !== userId),
            });
            const socket = useAuthStore.getState().socket;
            socket.emit("participantUpdate", {
                meetingCode,
                userId,
                status: "denied",
            });
            toast.success(`${user.name} has been denied`);
        } catch (err) {
            console.error("Error denying participant:", err);
            toast.error("Failed to deny participant");
        }
    },

    subscribeToMeetingEvents: () => {
        const socket = useAuthStore.getState().socket;
        if (!socket) return;
        if (!socket?.connected) {
            console.error("Socket not connected, cannot join meeting");
            throw new Error("Socket not connected");
        }

        const { meetingCode } = get().selectedMeeting;
        const userId = useAuthStore.getState().authUser._id;

        console.log("subscribeToMeetingEvents with userId: " + userId + ", meetingCode: " + meetingCode)
        socket.emit("joinMeeting", { meetingCode, userId });

        socket.on("participantUpdate", (participants) => {
            console.log("participantUpdate event received: ", participants);
            const currentPCs = get().peerConnections;
            const currentParticipants = get().participants;

            Object.keys(currentParticipants).forEach((pId) => {
                if (!participants.find((p) => (p.user._id || p.user) === pId)) {
                    if (currentPCs[pId]) {
                        get().cleanupPeerConnection(pId);
                    }
                }
            });
            set({
                participants: participants
                    .filter((p) => p.status === "joined")
                    .reduce((acc, p) => {
                        acc[p.user._id || p.user] = {
                            name: p.name || "Unknown",
                            status: p.status,
                            mic: currentParticipants[p.user._id || p.user]?.mic || false,
                            video: currentParticipants[p.user._id || p.user]?.video || false,
                            screenSharing: currentParticipants[p.user._id || p.user]?.screenSharing || false,
                        };
                        return acc;
                    }, {}),
                waitingToJoin: participants
                    .filter((p) => p.status === "waiting")
                    .map((p) => ({ id: p.user._id || p.user, name: p.name || "Unknown" })),
            });
            // Re-initialize connections for new participants
            get().initializeConnections();
        });

        socket.on("meetingEnded", () => {
            console.log("meetingEnded event received, calling leaveMeeting");
            get().leaveMeeting({ meetingEnded: true });
            toast.success("Meeting has ended");
        });

        socket.on("toggleMic", ({ participantId, mic }) => {
            set((state) => ({
                participants: {
                    ...state.participants,
                    [participantId]: { ...state.participants[participantId], mic },
                },
            }));
        });

        socket.on("toggleVideo", ({ participantId, video }) => {
            set((state) => ({
                participants: {
                    ...state.participants,
                    [participantId]: { ...state.participants[participantId], video },
                },
            }));
        });

        socket.on("screenShareToggled", ({ userId, isSharing }) => {
            console.log("screenShareToggled event received (useMeetingStore):", { userId, isSharing });
            set((state) => ({
                participants: {
                    ...state.participants,
                    [userId]: { ...state.participants[userId], screenSharing: isSharing },
                },
            }));
        });

        socket.on("streamUpdate", ({ userId, mic, video, screenSharing }) => {
            console.log("streamUpdate received:", { userId, mic, video, screenSharing });
            set((state) => {
                const newStreams = { ...state.streams };
                const newParticipants = { ...state.participants };

                if (mic !== undefined && newStreams[userId]?.video) {
                    const audioTrack = newStreams[userId].video.getAudioTracks()[0];
                    if (audioTrack) {
                        audioTrack.enabled = mic;
                    }
                    newParticipants[userId] = { ...newParticipants[userId], mic };
                }

                if (video !== undefined && newStreams[userId]?.video) {
                    const videoTrack = newStreams[userId].video.getVideoTracks()[0];
                    if (videoTrack) {
                        videoTrack.enabled = video;
                    }
                    newParticipants[userId] = { ...newParticipants[userId], video };
                }

                if (screenSharing !== undefined) {
                    if (!screenSharing && newStreams[userId]?.screen) {
                        newStreams[userId].screen.getTracks().forEach((track) => track.stop());
                        delete newStreams[userId].screen;
                    }
                    newParticipants[userId] = { ...newParticipants[userId], screenSharing };
                }

                return { streams: newStreams, participants: newParticipants };
            });
            // Trigger re-negotiation for the user if not self
            if (userId !== useAuthStore.getState().authUser._id) {
                get().renegotiatePeerConnection(userId);
            }
        });

        socket.on("updateParticipantState", ({ participantId, mic, video, screenSharing }) => {
            console.log("updateParticipantState received:", { participantId, mic, video, screenSharing });
            set((state) => ({
                participants: {
                    ...state.participants,
                    [participantId]: {
                        ...state.participants[participantId],
                        mic,
                        video,
                        screenSharing,
                    },
                },
            }));
        });
        return () => {
            socket.off("participantUpdate");
            socket.off("meetingEnded");
            // Remove other listeners
        };
    },

}));

