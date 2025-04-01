import React from "react";
import { PiMicrophoneSlashLight } from "react-icons/pi";
import { FaMicrophone } from "react-icons/fa";

const ParticipantView = ({ selected, participants, toggleParticipantMic }) => {
  return (
    <>
      {/* Sidebar for Mobile */}
      {selected === "Sidebar" && (
        <div className="absolute bottom-4 right-4 w-[34%] h-[30%] bg-gray-800 rounded-lg overflow-hidden lg:hidden">
          {Object.values(participants)
            .slice(0, 1)
            .map((participant, index) => (
              <div key={index} className="relative w-full h-full">
                {participant.video ? (
                  <video
                    autoPlay
                    muted
                    className="w-full h-full object-cover"
                  ></video>
                ) : (
                  <img
                    src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSlSJ7DEurXpFM8ZHmm1rjDaUBW9uiZjrPwWQ&s"
                    alt={participant.name}
                    className="w-full h-full object-cover"
                  />
                )}
                <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 p-2 flex justify-between items-center">
                  <span className="text-sm font-semibold text-white">
                    {participant.name}
                  </span>
                  <span className="text-xs bg-gray-700 text-white px-2 py-1 rounded">
                    {participant.mic ? (
                      <PiMicrophoneSlashLight size={18} />
                    ) : (
                      "🔇"
                    )}
                  </span>
                </div>
              </div>
            ))}
        </div>
      )}

      {/* Sidebar for Desktop */}
      {selected === "Sidebar" && (
        <div className="absolute hidden left-[80%] lg:flex flex-col w-[20%] text-white p-4 overflow-y-auto gap-4">
          {Object.values(participants).map((participant, index) => (
            <div
              key={index}
              className="relative bg-gray-800 rounded-lg overflow-hidden"
            >
              {participant.video ? (
                <video autoPlay muted className="w-full object-cover"></video>
              ) : (
                <img
                  src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSlSJ7DEurXpFM8ZHmm1rjDaUBW9uiZjrPwWQ&s"
                  alt={participant.name}
                  className="w-full h-32 object-cover"
                />
              )}
              <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 p-2 flex justify-between items-center">
                <span className="text-sm font-semibold">
                  {participant.name}
                </span>
                <span className="text-xs bg-gray-700 text-white px-2 py-1 rounded">
                  {participant.mic ? (
                    <PiMicrophoneSlashLight size={18} />
                  ) : (
                    "🔇"
                  )}
                </span>
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
              {participant.video ? (
                <video
                  autoPlay
                  muted
                  className="w-full h-full object-cover"
                ></video>
              ) : (
                <img
                  src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSlSJ7DEurXpFM8ZHmm1rjDaUBW9uiZjrPwWQ&s"
                  alt={participant.name}
                  className="w-full h-full object-cover"
                />
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
                    <PiMicrophoneSlashLight />
                  ) : (
                    <FaMicrophone />
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
