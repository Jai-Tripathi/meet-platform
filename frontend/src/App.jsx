import React, { Suspense, useEffect } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { Loader } from "lucide-react";

import Navbar from "./components/Navbar";
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";

import PreMeetingScreen from "./pages/PreMeetingScreen";
import AskForJoin from "./pages/AskForJoin";
import MeetingLive from "./pages/MeetingLive";

import { useAuthStore } from "./store/useAuthStore";

const App = () => {
  const { authUser, checkAuth, isCheckingAuth } = useAuthStore();
  const location = useLocation();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  if (isCheckingAuth && !authUser) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader className="size-10 animate-spin" />
      </div>
    );
  }

  const hideNavbar = location.pathname.startsWith("/Meeting-live");

  return (
    <div className="bg-[#282525] bg-opacity-35 min-h-screen w-full overflow-x-hidden">
      {!hideNavbar && <Navbar />}
      <Routes>
        <Route
          path="/"
          element={authUser ? <HomePage /> : <Navigate to="/login" />}
        />
        <Route
          path="/signup"
          element={!authUser ? <SignupPage /> : <Navigate to="/" />}
        ></Route>
        <Route
          path="/login"
          element={!authUser ? <LoginPage /> : <Navigate to="/" />}
        />
        <Route
          path="/pre-meeting-screen"
          element={authUser ? <PreMeetingScreen /> : <Navigate to="/login" />}
        />
        <Route
          path="/Ask-for-join"
          element={authUser ? <AskForJoin /> : <Navigate to="/login" />}
        />
        <Route
          path="/Meeting-live/:meetingCode?"
          element={authUser ? <MeetingLive /> : <Navigate to="/login" />}
        />
      </Routes>
      <Toaster />
    </div>
  );
};

export default App;
