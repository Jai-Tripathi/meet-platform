import React, { useEffect, useRef } from "react";
import { PiMicrophoneSlashLight } from "react-icons/pi";
import { FaMicrophone } from "react-icons/fa";
import { useMeetingStore } from "../store/useMeetingStore";

const ParticipantView = ({ selected, participants, toggleParticipantMic }) => {
  const videoRefs = useRef({});
  // Access streams directly from store if needed
  const streams = useMeetingStore((state) => state.streams);

  // Assign streams to video elements when streams change
  useEffect(() => {
    Object.entries(participants).forEach(([id, participant]) => {
      let stream = streams[id]?.screen || streams[id]?.video;
      const videoElement = videoRefs.current[id];

      if (stream && videoElement && videoElement.srcObject !== stream) {
        console.log(`Assigning stream for ${id}:`, stream);
        videoElement.srcObject = stream;
        videoElement.play().catch((err) => {
          console.error(`Error playing video for ${id}:`, err);
        });
      } else if (!stream && videoElement && videoElement.srcObject) {
        // Clear srcObject if stream is removed
        videoElement.srcObject = null;
        console.log(`Clearing stream for ${id}`);
      }
    });
  }, [streams, participants, selected]);

  useEffect(() => {
    if (Object.keys(participants).length > 0) {
      console.log("ParticipantView, participants:", participants);
    }
    Object.entries(participants).forEach(([id, participant]) => {
      // Access the stream from the store
      const stream = streams?.[id]?.video || participant.stream;
      console.log("ParticipantView, stream:", stream);
      console.log("ParticipantView, streams:", streams);
    });
  }, [participants, streams]);

  return (
    <>
      {/* Sidebar for Mobile */}
      {selected === "Sidebar" && (
        <div className="absolute bottom-4 right-4 w-[34%] h-[30%] bg-gray-800 rounded-lg overflow-hidden lg:hidden">
          {Object.entries(participants).map(([id, participant]) => (
            <div key={id} className="relative w-full h-full">
              {participant?.video ? (
                <video
                  ref={(video) => {
                    if (video) {
                      videoRefs.current[id] = video;
                    }
                  }}
                  autoPlay
                  muted
                  className="w-full h-full object-cover"
                ></video>
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gray-800 text-white text-4xl font-semibold rounded-md">
                  {participant.name[0].toUpperCase()}
                </div>
              )}
              <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 p-2 flex justify-between items-center">
                <span className="text-sm font-semibold text-white">
                  {participant.name}
                </span>
                <button
                  className="text-xs bg-gray-700 text-white px-2 py-1 rounded"
                  onClick={() => toggleParticipantMic(id)}
                >
                  {participant.mic ? <FaMicrophone /> : "🔇"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Sidebar for Desktop */}
      {selected === "Sidebar" && (
        <div className="absolute hidden left-[80%] lg:flex flex-col w-[20%] text-white p-4 overflow-y-auto gap-4">
          {Object.entries(participants).map(([id, participant]) => (
            <div
              key={id}
              className="relative bg-gray-800 rounded-lg overflow-hidden"
            >
              {participant?.video ? (
                <video
                  ref={(video) => {
                    if (video) {
                      videoRefs.current[id] = video;
                    }
                  }}
                  autoPlay
                  muted
                  className="w-full object-cover"
                ></video>
              ) : (
                <div className="w-full h-32 flex items-center justify-center bg-gray-800 text-white text-4xl font-semibold rounded-md">
                  {participant.name[0].toUpperCase()}
                </div>
              )}
              <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 p-2 flex justify-between items-center">
                <span className="text-sm font-semibold">
                  {participant.name}
                </span>
                <button
                  className="text-xs bg-gray-700 text-white px-2 py-1 rounded"
                  onClick={() => toggleParticipantMic(id)}
                >
                  {participant.mic ? (
                    <FaMicrophone />
                  ) : (
                    <PiMicrophoneSlashLight />
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tiled Layout Section */}
      {selected === "Tiled" && (
        <div className="grid grid-cols-2 gap-2 p-2 sm:grid-cols-3 lg:grid-cols-5">
          {Object.entries(participants).map(([id, participant]) => (
            <div
              key={id}
              className="relative bg-gray-800 rounded-lg overflow-hidden flex items-center justify-center"
            >
              {participant?.video ? (
                <video
                  ref={(video) => {
                    if (video) {
                      videoRefs.current[id] = video;
                    }
                  }}
                  autoPlay
                  muted
                  className="w-full h-full object-cover"
                ></video>
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gray-800 text-white text-7xl font-semibold rounded-md">
                  {participant.name[0].toUpperCase()}
                </div>
              )}
              <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 p-2 flex justify-between items-center">
                <span className="text-sm font-semibold text-white">
                  {participant.name}
                </span>
                <button
                  className="text-xs bg-gray-700 text-white px-2 py-1 rounded"
                  onClick={() => toggleParticipantMic(id)}
                >
                  {participant.mic ? (
                    <FaMicrophone />
                  ) : (
                    <PiMicrophoneSlashLight />
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
};

export default ParticipantView;
