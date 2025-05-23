import React, { useState } from "react";
import {
  FaMicrophone,
  FaVideo,
  FaDesktop,
  FaSmile,
  FaUser,
  FaCommentDots,
  FaEllipsisH,
  FaSignOutAlt,
} from "react-icons/fa";
import { MdOutlineScreenShare } from "react-icons/md";
import { PiMicrophoneSlashLight } from "react-icons/pi";
import { CiVideoOff } from "react-icons/ci";
import Picker from "emoji-picker-react";

const LowerSection = ({
  participants,
  socket,
  toggleMic,
  toggleCamera,
  startScreenShare,
  togglePeople,
  toggleChat,
  setIsModalOpen,
  openLeaveModal,
}) => {
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);

  const toggleEmojiPicker = () => {
    setIsEmojiPickerOpen((prev) => !prev);
  };

  const onEmojiClick = (event, emojiObject) => {
    console.log("Selected Emoji:", emojiObject.emoji);
    setIsEmojiPickerOpen(false);
  };

  return (
    <div className="bg-black p-3 flex items-center justify-between w-full relative">
      <div className="flex gap-2">
        <button
          className={`p-2 rounded-lg text-white ${
            participants[socket.id]?.mic ? "bg-green-500" : "bg-gray-600"
          }`}
          onClick={toggleMic}
        >
          {participants[socket.id]?.mic ? (
            <FaMicrophone />
          ) : (
            <PiMicrophoneSlashLight size={18} />
          )}
        </button>
        <button
          className={`p-2 rounded-lg text-white ${
            participants[socket.id]?.video ? "bg-green-500" : "bg-gray-600"
          }`}
          onClick={toggleCamera}
        >
          {participants[socket.id]?.video ? (
            <FaVideo />
          ) : (
            <CiVideoOff size={18} />
          )}
        </button>
        <button className="bg-gray-600 p-2 rounded-lg text-white">
          <FaDesktop />
        </button>
        <button
          className={`p-2 rounded-lg text-white ${
            participants[socket.id]?.screenSharing
              ? "bg-green-500"
              : "bg-gray-600"
          }`}
          onClick={startScreenShare}
        >
          <MdOutlineScreenShare />
        </button>
      </div>

      <div className="flex gap-2">
        <div className="relative">
          <button
            className="bg-gray-600 p-2 rounded-lg text-white"
            onClick={toggleEmojiPicker}
          >
            <FaSmile />
          </button>
          {isEmojiPickerOpen && (
            <div className="absolute bottom-12">
              <Picker onEmojiClick={onEmojiClick} />
            </div>
          )}
        </div>
        <button
          className="bg-gray-600 p-2 rounded-lg text-white"
          onClick={togglePeople}
        >
          <FaUser />
        </button>
        <button
          className="bg-gray-600 p-2 rounded-lg text-white"
          onClick={toggleChat}
        >
          <FaCommentDots />
        </button>
        <button
          className="bg-gray-600 p-2 rounded-lg text-white"
          onClick={() => setIsModalOpen(true)}
        >
          <FaEllipsisH />
        </button>
      </div>

      <button
        className="bg-red-500 p-2 rounded-lg text-white leave-button fixed bottom-122 right-3 md:static md:bottom-auto md:right-auto"
        onClick={openLeaveModal}
      >
        <FaSignOutAlt />
      </button>
    </div>
  );
};

export default LowerSection;
