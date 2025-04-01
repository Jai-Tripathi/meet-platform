import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import logo from "../assests/logo.svg";
import Frame1 from "../assests/Frame 1424.png";
import Frame2 from "../assests/Frame 1414.png";
import Frame3 from "../assests/Frame 1415.png";
import Frame4 from "../assests/Frame 1413.png";
import ChatSection from "../components/ChatSection";
import PeopleSection from "../components/PeopleSection";
import SettingModal from "../components/SettingModal";
import LeaveModal from "../components/LeaveModal";
import LowerSection from "../components/LowerSection";
import ParticipantView from "../components/ParticipantView";

import { useAuthStore } from "../store/useAuthStore";
import { useMeetingStore } from "../store/useMeetingStore";
import { axiosInstance } from "../lib/axios";

const MeetingLive = () => {
  const { socket } = useAuthStore();
  const navigate = useNavigate();
  const { selectedMeeting } = useMeetingStore();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selected, setSelected] = useState("Spotlight");
  const [activeItem, setActiveItem] = useState("Change Layout");
  const [participants, setParticipants] = useState({
    1: { name: "John Doe", mic: true, video: false },
    2: { name: "Jane Smith", mic: false, video: false },
    3: { name: "Alice Johnson", mic: true, video: false },
    4: { name: "Alice ", mic: true, video: false },
  });

  const [userName, setUserName] = useState("");
  const tools = [
    "Share Screen",
    "Unmute",
    "Video",
    "Chat",
    "Rename",
    "Hand Raise",
  ];
  const [toggleStates, setToggleStates] = useState(
    tools.reduce((acc, tool) => ({ ...acc, [tool]: false }), {})
  );

  const [localStream, setLocalStream] = useState(null);
  const videoRef = React.useRef(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [timer, setTimer] = useState(0);
  const [isPeopleOpen, setIsPeopleOpen] = useState(false);
  const [waitingToJoin, setWaitingToJoin] = useState([
    { id: "4", name: "Jenny Wilson" },
    { id: "5", name: "Jenny Wilson" },
    { id: "6", name: "Jenny Wilson" },
  ]);
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false); // Add state for LeaveModal
  const [isScreenSharing, setIsScreenSharing] = useState(false); // Add state for screen sharing

  const layouts = [
    { name: "Auto", img: Frame1 },
    { name: "Sidebar", img: Frame2 },
    { name: "Spotlight", img: Frame3 },
    { name: "Tiled", img: Frame4 },
  ];

  useEffect(() => {
    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then((stream) => {
        setLocalStream(stream);
      })
      .catch((err) => {
        console.error("Error accessing media devices:", err);
        alert("Please allow access to camera and microphone.");
      });
  }, []);

  useEffect(() => {
    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then((stream) => {
        setLocalStream(stream);
        socket.emit("join", { name: userName });
      })
      .catch((err) => {
        console.error("Error accessing media devices:", err);
        alert(
          "Please allow access to your camera and microphone to join the meeting."
        );
      });

    socket.on("init", (state) => {
      setParticipants(state.participants);
      setSelected(state.layout);
      setToggleStates(state.hostTools);
    });

    socket.on("updateParticipants", (participants) => {
      setParticipants(participants);
    });

    socket.on("updateLayout", (layout) => {
      setSelected(layout);
    });

    socket.on("updateHostTools", (tools) => {
      setToggleStates(tools);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  useEffect(() => {
    if (localStream && videoRef.current) {
      videoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    let interval = setInterval(() => {
      setTimer((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    socket.on("usernameTaken", () => {
      alert("The username is already taken. Please choose a different one.");
    });

    return () => {
      socket.off("usernameTaken");
    };
  }, []);

  useEffect(() => {
    socket.on("updateParticipants", (updatedParticipants) => {
      setParticipants(updatedParticipants); // Ensure participants are updated correctly
    });

    return () => {
      socket.off("updateParticipants"); // Cleanup listener
    };
  }, []);

  useEffect(() => {
    socket.on("startScreenShare", ({ userId }) => {
      setParticipants((prev) => ({
        ...prev,
        [userId]: { ...prev[userId], isScreenSharing: true },
      }));
      alert(
        `${
          participants[userId]?.name || "A participant"
        } started screen sharing.`
      );
    });

    socket.on("stopScreenShare", ({ userId }) => {
      setParticipants((prev) => ({
        ...prev,
        [userId]: { ...prev[userId], isScreenSharing: false },
      }));
      alert(
        `${
          participants[userId]?.name || "A participant"
        } stopped screen sharing.`
      );
    });

    return () => {
      socket.off("startScreenShare");
      socket.off("stopScreenShare");
    };
  }, [participants]);

  const stopParticipantScreenShare = (userId) => {
    if (participants[userId]?.isScreenSharing) {
      socket.emit("stopScreenShare", { userId }); // Notify others to stop screen sharing
      setParticipants((prev) => ({
        ...prev,
        [userId]: { ...prev[userId], isScreenSharing: false }, // Update local state
      }));
      alert(
        `${
          participants[userId]?.name || "A participant"
        }'s screen sharing has been stopped.`
      );
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  const handleToggle = (tool) => {
    const newState = !toggleStates[tool];
    setToggleStates((prev) => ({ ...prev, [tool]: newState }));
    socket.emit("updateHostTools", { ...toggleStates, [tool]: newState });
  };

  const toggleMic = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      audioTrack.enabled = !audioTrack.enabled;
      setParticipants((prev) => ({
        ...prev,
        [socket.id]: { ...prev[socket.id], mic: audioTrack.enabled },
      }));
      socket.emit("toggle", { tool: "mic", state: audioTrack.enabled });
    }
  };

  const toggleCamera = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      videoTrack.enabled = !videoTrack.enabled;
      setParticipants((prev) => ({
        ...prev,
        [socket.id]: { ...prev[socket.id], video: videoTrack.enabled },
      }));
      socket.emit("toggle", { tool: "video", state: videoTrack.enabled });
    }
  };

  const startScreenShare = async () => {
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true,
      });
      setIsScreenSharing(true); // Set screen sharing state to true
      socket.emit("startScreenShare", { userId: socket.id }); // Notify others about screen sharing

      // Assign the screen stream to the video element
      if (videoRef.current) {
        videoRef.current.srcObject = screenStream; // Assign the screen stream
        videoRef.current.onloadedmetadata = () => {
          videoRef.current.play().catch((err) => {
            console.error("Error playing shared screen video:", err);
          }); // Ensure the video starts playing
        };
      }

      // Handle when the user stops sharing
      const screenTrack = screenStream.getVideoTracks()[0];
      screenTrack.onended = () => stopScreenShare(); // Stop screen sharing when the user stops it

      // Show the user's camera feed in a smaller thumbnail
      navigator.mediaDevices
        .getUserMedia({ video: true, audio: true })
        .then((cameraStream) => {
          const cameraVideoRef = document.getElementById("camera-thumbnail");
          if (cameraVideoRef) {
            cameraVideoRef.srcObject = cameraStream; // Assign the camera stream to the thumbnail
            cameraVideoRef.onloadedmetadata = () => {
              cameraVideoRef.play().catch((err) => {
                console.error("Error playing camera video:", err);
              }); // Ensure the video starts playing
            };
          }
        })
        .catch((err) => {
          console.error("Error accessing camera for thumbnail:", err);
        });
    } catch (err) {
      console.error("Error starting screen share:", err);
    }
  };

  const stopScreenShare = () => {
    setIsScreenSharing(false); // Reset screen sharing state
    socket.emit("stopScreenShare", { userId: socket.id }); // Notify others that screen sharing has stopped

    // Revert to the camera feed
    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then((stream) => {
        setLocalStream(stream);
        if (videoRef.current) {
          videoRef.current.srcObject = stream; // Assign the camera stream back to the main video area
          videoRef.current.play(); // Ensure the video starts playing
        }
      })
      .catch((err) => {
        console.error("Error reverting to camera feed:", err);
      });
  };

  const changeLayout = (layout) => {
    setSelected(layout);
    socket.emit("changeLayout", layout);

    if (layout === "Sidebar") {
      setIsSidebarOpen(true);
    } else if (layout === "Tiled") {
      setIsSidebarOpen(false); // Close sidebar for Tiled layout
    }
  };

  const closeSidebar = () => {
    setIsSidebarOpen(false);
    setIsModalOpen(false);
  };

  const openModal = (item) => {
    setIsModalOpen(true);
    setIsSidebarOpen(true);
    setActiveItem(
      item === "Notifications" ? "Host Tools" : item || "Change Layout"
    );
  };

  const handleSignOut = async () => {
    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop());
    }
    console.log("Handle Sign Out:", selectedMeeting.meetingCode);
    await axiosInstance.post("/meetings/leave", {
      meetingCode: selectedMeeting.meetingCode,
    });
    socket.emit("leaveMeeting");
    setLocalStream(null);
    setParticipants({});
    setUserName("");
    setTimer(0);
    navigate("/");
  };

  const toggleChat = () => {
    setIsChatOpen((prev) => {
      if (!prev) setIsPeopleOpen(false);
      return !prev;
    });
  };

  const togglePeople = () => {
    setIsPeopleOpen((prev) => {
      if (!prev) setIsChatOpen(false);
      return !prev;
    });
  };

  const handleAllow = (id) => {
    const user = waitingToJoin.find((user) => user.id === id);
    if (user) {
      setParticipants((prev) => ({
        ...prev,
        [id]: { name: user.name, mic: false, video: false },
      }));
      setWaitingToJoin((prev) => prev.filter((user) => user.id !== id));
    }
  };

  const handleDeny = (id) => {
    setWaitingToJoin((prev) => prev.filter((user) => user.id !== id));
  };

  const toggleParticipantMic = (participantId) => {
    setParticipants((prev) => ({
      ...prev,
      [participantId]: {
        ...prev[participantId],
        mic: !prev[participantId].mic, // Toggle the mic state
      },
    }));

    socket.emit("toggleMic", {
      participantId,
      mic: !participants[participantId].mic,
    }); // Notify the server
  };

  return (
    <>
      <div className={`relative ${isModalOpen ? "blur-sm" : ""}`}>
        <div className="bg-black text-white flex flex-wrap items-center justify-between px-4 py-2 w-full h-14">
          <nav className="flex items-center p-2 sm:p-4">
            <img src={logo} alt="Company Logo" className="h-6 w-auto" />
          </nav>
          <div className="flex items-center gap-2 text-sm justify-center flex-1">
            <span className="text-gray-400 truncate max-w-[100px] sm:max-w-none">
              {selectedMeeting.meetingCode}
            </span>{" "}
            {/* Meeting link */}
          </div>
          <div className="flex items-center gap-2 text-sm">
            <div className="w-4 h-4 animate-spin border-2 border-blue-500 border-t-white rounded-full"></div>
            <span className="text-gray-400">Live</span>
            <span className="ml-2 text-gray-400">{formatTime(timer)}</span>{" "}
            {/* Timer */}
            {isScreenSharing && (
              <span className="ml-2 text-green-500">Screen Sharing</span>
            )}{" "}
            {/* Indicate screen sharing */}
          </div>
        </div>

        <div className="flex flex-col lg:flex-row w-full h-[83vh]">
          {" "}
          {/* Adjusted for responsiveness */}
          {/* Video Section */}
          <div
            className={`flex-1 transition-all duration-300 ${
              selected === "Sidebar" ? "lg:w-[80%]" : "w-full"
            } flex justify-center items-center relative`}
          >
            {isScreenSharing ? (
              <div className="flex w-full h-full">
                {/* Shared Screen on the Left */}
                <video
                  ref={videoRef}
                  autoPlay
                  muted
                  className="flex-1 h-[75vh] object-cover rounded-lg lg:h-[90%]"
                ></video>

                {/* Camera Feed on the Right */}
                <video
                  id="camera-thumbnail"
                  autoPlay
                  muted
                  className="w-1/3 h-[75vh] object-cover border-2 border-white rounded-lg lg:h-[90%] ml-4"
                ></video>
              </div>
            ) : localStream ? (
              <video
                ref={videoRef}
                autoPlay
                muted
                className="w-full h-[75vh] object-cover rounded-lg lg:w-[90%] lg:h-[90%]"
              ></video>
            ) : (
              <img
                src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSlSJ7DEurXpFM8ZHmm1rjDaUBW9uiZjrPwWQ&s"
                alt="Live Meeting"
                className="w-full h-[75vh] object-cover rounded-lg lg:w-[90%] lg:h-[90%]"
              />
            )}
          </div>
          {/* Participant View */}
          <ParticipantView
            selected={selected}
            participants={participants}
            toggleParticipantMic={toggleParticipantMic}
          />
          {/* Chat Section */}
          <ChatSection
            isChatOpen={isChatOpen}
            setIsChatOpen={setIsChatOpen}
            userName={userName}
            socket={socket}
          />
          {/* People Section */}
          <PeopleSection
            isPeopleOpen={isPeopleOpen}
            setIsPeopleOpen={setIsPeopleOpen}
            participants={participants}
            waitingToJoin={waitingToJoin}
            handleAllow={handleAllow}
            handleDeny={handleDeny}
          />
        </div>
        {/* Lower Section */}
        <LowerSection
          participants={participants}
          socket={socket}
          toggleMic={toggleMic}
          toggleCamera={toggleCamera}
          startScreenShare={startScreenShare}
          stopScreenShare={stopScreenShare} // Add stopScreenShare to LowerSection
          togglePeople={togglePeople}
          toggleChat={toggleChat}
          setIsModalOpen={setIsModalOpen}
          openLeaveModal={() => setIsLeaveModalOpen(true)} // Correctly pass function to open LeaveModal
        />
      </div>

      {/* Setting Modal */}
      <SettingModal
        isModalOpen={isModalOpen}
        closeSidebar={closeSidebar}
        activeItem={activeItem}
        setActiveItem={setActiveItem}
        layouts={layouts}
        selected={selected}
        changeLayout={changeLayout}
        tools={tools}
        toggleStates={toggleStates}
        handleToggle={handleToggle}
      />

      <LeaveModal
        isLeaveModalOpen={isLeaveModalOpen} // Pass state to LeaveModal
        handleSignOut={handleSignOut}
        closeLeaveModal={() => setIsLeaveModalOpen(false)} // Pass function to close LeaveModal
      />
    </>
  );
};

export default MeetingLive;
