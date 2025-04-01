import React, { useRef, useState, useEffect } from "react";
import { X } from "lucide-react";
import { FaPaperPlane } from "react-icons/fa";

const ChatSection = ({ isChatOpen, setIsChatOpen, userName, socket }) => {
  const chatContainerRef = useRef(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [isScrolledUp, setIsScrolledUp] = useState(false);

  useEffect(() => {
    // Receive new chat messages
    socket.on("newMessage", (message) => {
      setMessages((prev) => [...prev, message]);
    });

    return () => {
      socket.off("newMessage");
    };
  }, [socket]);

  const handleScroll = () => {
    if (chatContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } =
        chatContainerRef.current;
      setIsScrolledUp(scrollTop + clientHeight < scrollHeight - 10);
    }
  };

  const scrollToBottom = () => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  };

  const sendMessage = () => {
    if (newMessage.trim()) {
      const message = { sender: userName, text: newMessage };
      setMessages((prev) => [...prev, message]);
      socket.emit("sendMessage", message);
      setNewMessage("");
    }
  };

  if (!isChatOpen) return null;

  return (
    <div className="w-full h-[100%] sm:w-[90%] lg:w-[25%] bg-white text-black shadow-lg flex flex-col lg:overflow-hidden fixed bottom-50% sm:bottom-auto sm:right-0 sm:rounded-t-lg lg:static">
      <div className="flex justify-between items-center p-4 border-b border-gray-300">
        <h2 className="text-lg font-semibold">Chat</h2>
        <button
          onClick={() => setIsChatOpen(false)}
          className="text-gray-500 hover:text-black"
        >
          <X size={20} />
        </button>
      </div>
      <div
        ref={chatContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-4 space-y-4"
      >
        {messages.length > 0 ? (
          messages.map((msg, index) => (
            <div key={index} className="flex items-start space-x-3">
              <img
                src="https://via.placeholder.com/40"
                alt="User Avatar"
                className="w-10 h-10 rounded-full"
              />
              <div>
                <p className="font-semibold text-sm">{msg.sender}</p>
                <p className="text-sm text-gray-700">{msg.text}</p>
              </div>
            </div>
          ))
        ) : (
          <p className="text-gray-500">No messages yet.</p>
        )}
      </div>
      {isScrolledUp && (
        <button
          onClick={scrollToBottom}
          className="fixed bottom-16 right-6 bg-blue-500 h-9 w-9 text-white p-2 rounded-full shadow-lg hover:bg-blue-600 sm:relative sm:bottom-auto sm:right-auto"
        >
          ↓
        </button>
      )}
      <div className="p-4 border-t border-gray-300">
        <div className="flex items-center space-x-3">
          <input
            type="text"
            placeholder="Send a message to everyone"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            className="flex-1 p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={sendMessage}
            className="bg-blue-500 text-white p-2 rounded-lg hover:bg-blue-600"
          >
            <FaPaperPlane />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatSection;
