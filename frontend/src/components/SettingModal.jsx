import React, { useState } from "react";
import { Bell, Settings, X } from "lucide-react";
import { IoVideocamOutline, IoMicOutline } from "react-icons/io5";
import { HiOutlineSpeakerWave } from "react-icons/hi2";

const SettingModal = ({
  isModalOpen,
  closeSidebar,
  activeItem,
  setActiveItem,
  layouts,
  selected,
  changeLayout,
  tools,
  toggleStates,
  handleToggle,
}) => {
  const [isSidebarVisible, setIsSidebarVisible] = useState(true); // State to toggle sidebar visibility on mobile

  if (!isModalOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-opacity-1">
      <div className="flex flex-col md:flex-row items-center justify-center mt-8 w-full">
        {/* Sidebar: Always visible on desktop, toggled on mobile */}
        <div
          className={`w-full md:w-64 bg-gray-900 text-white p-4 rounded-tl-lg md:rounded-bl-lg ${
            isSidebarVisible || "hidden md:block"
          }`}
        >
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Settings</h2>
            <button
              onClick={closeSidebar} // Close the modal
              className="text-gray-400 hover:text-white md:hidden" // Hide button on desktop
            >
              <X size={20} />
            </button>
          </div>
          <ul className="space-y-2 h-89">
            <li
              className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-gray-800 rounded-lg"
              onClick={() => {
                setActiveItem("Change Layout");
                setIsSidebarVisible(false); // Hide sidebar on mobile
              }}
            >
              <Bell size={18} />
              <span>Change Layout</span>
            </li>
            <li
              className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-gray-800 rounded-lg"
              onClick={() => {
                setActiveItem("Device Settings");
                setIsSidebarVisible(false); // Hide sidebar on mobile
              }}
            >
              <Settings size={18} />
              <span>Device Settings</span>
            </li>
            <li
              className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-gray-800 rounded-lg"
              onClick={() => {
                setActiveItem("Host Tools");
                setIsSidebarVisible(false); // Hide sidebar on mobile
              }}
            >
              <Bell size={18} />
              <span>Host Tools</span>
            </li>
          </ul>
        </div>

        {/* Content: Always visible on desktop, toggled on mobile */}
        <div
          className={`w-full md:w-96 h-auto bg-gray-900 text-white p-6 rounded-b-lg md:rounded-tr-lg md:rounded-br-lg ${
            isSidebarVisible && "hidden md:block"
          }`}
        >
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">{activeItem}</h2>
            <button
              onClick={() => {
                if (isSidebarVisible) {
                  closeSidebar(); // Close the modal
                } else {
                  setIsSidebarVisible(true); // Show sidebar on mobile
                }
              }}
              className="text-gray-400 hover:text-white " // Hide button on desktop
            >
              <X size={20} />
            </button>
          </div>

          {activeItem === "Change Layout" && (
            <div className="space-y-3 h-85">
              {layouts.map((layout) => (
                <label
                  key={layout.name}
                  className="flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer hover:bg-gray-800"
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="layout"
                      value={layout.name}
                      checked={selected === layout.name}
                      onChange={() => changeLayout(layout.name)}
                      className="w-4 h-4 text-blue-500 bg-gray-700 border-gray-600 focus:ring-blue-500"
                    />
                    <span>{layout.name}</span>
                  </div>
                  <img src={layout.img} alt="" className="w-12 h-8" />
                </label>
              ))}
            </div>
          )}

          {activeItem === "Device Settings" && (
            <div className="space-y-6 h-85">
              <div>
                <h3 className="text-sm font-medium mb-2">Video</h3>
                <div className="flex items-center gap-2 bg-gray-800 text-white p-2 rounded-lg">
                  <IoVideocamOutline size={20} />
                  <select className="flex-1 bg-gray-800 text-white p-2 rounded-lg">
                    <option>Facetime HD Camera</option>
                  </select>
                </div>
              </div>
              <div>
                <h3 className="text-sm font-medium mb-2">Microphone</h3>
                <div className="flex items-center gap-2 bg-gray-800 text-white p-2 rounded-lg mb-2">
                  <IoMicOutline size={20} />
                  <select className="flex-1 bg-gray-800 text-white p-2 rounded-lg">
                    <option>Default – Macbook Pro Mic (Built-in)</option>
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <IoMicOutline size={20} />
                  <input
                    type="range"
                    className="flex-1"
                    min="0"
                    max="100"
                    defaultValue="50"
                  />
                </div>
              </div>
              <div>
                <h3 className="text-sm font-medium mb-2">Speakers</h3>
                <div className="flex items-center gap-2 bg-gray-800 text-white p-2 rounded-lg">
                  <HiOutlineSpeakerWave size={20} />
                  <select className="w-2/3 bg-gray-800 text-white p-2 rounded-lg">
                    <option>Default - Macbook Pro Speakers</option>
                  </select>
                  <button className="bg-gray-700 text-white px-4 py-2 rounded-lg hover:bg-gray-600 flex items-center gap-2">
                    <HiOutlineSpeakerWave size={20} />
                    Test
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeItem === "Host Tools" && (
            <div className="space-y-6 h-85">
              <p className="text-sm text-gray-400">
                Allow all participants to:
              </p>
              <ul className="space-y-4">
                {tools.map((tool) => (
                  <li key={tool} className="flex items-center justify-between">
                    <span>{tool}</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={toggleStates[tool]}
                        onChange={() => handleToggle(tool)}
                      />
                      <div
                        className={`w-13 h-6 rounded-full transition-all duration-300 ${
                          toggleStates[tool] ? "bg-blue-600" : "bg-gray-400"
                        }`}
                      >
                        <div
                          className={`absolute w-6 h-6 bg-white rounded-full shadow-md transform transition-all duration-300 ${
                            toggleStates[tool]
                              ? "translate-x-8"
                              : "translate-x-1"
                          }`}
                        ></div>
                      </div>
                    </label>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SettingModal;
