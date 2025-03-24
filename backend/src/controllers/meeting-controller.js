import Meeting from "../models/meeting-model.js";

export const createMeeting = async (req, res) => {
    try {
        const { title, description, meetingCode, time, date, meetingUrl } = req.body;
        const host = req.user._id;

        if (!title || !time || !date) {
            return res.status(400).json({ message: "Title, Date and Time are required." });
        }

        const newMeeting = new Meeting({
            host,
            title,
            description,
            meetingCode,
            meetingUrl,
            time,
            date,
        });

        await newMeeting.save();
        res.status(201).json(newMeeting);
    } catch (error) {
        res.status(500).json({ message: "Internal Server Error", error: error.message });
        console.log("Error in creating meeting" + error.message);
    }
};


export const getMeetings = async (req, res) => {
    try {
        const meetings = await Meeting.find({ host: req.user._id }).sort({ date: 1, time: 1 });
        res.status(200).json(meetings);
    } catch (error) {
        res.status(500).json({ message: "Failed to fetch meetings", error: error.message });
    }
};


export const deleteMeeting = async (req, res) => {
    try {
        const { id } = req.params;
        const meeting = await Meeting.findById(id);

        if (!meeting) {
            return res.status(404).json({ message: "Meeting not found" });
        }

        if (meeting.host._id.toString() !== req.user._id.toString()) {

            return res.status(403).json({ message: "Unauthorized to delete this meeting" });
        }

        await meeting.deleteOne();
        res.status(200).json({ message: "Meeting deleted successfully" });
    } catch (error) {
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};