import { create } from "zustand";
import { axiosInstance } from "../lib/axios.js";
import toast from "react-hot-toast";

export const useMeetingStore = create((set) => ({
    meetings: [],
    loading: false,

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

}));