import express from "express";
import { getMeetings, createMeeting, deleteMeeting } from "../controllers/meeting-controller.js";
import { protectRoute } from "../middleware/auth-middleware.js";

const router = express.Router();

router.get("/", protectRoute, getMeetings);
router.post("/", protectRoute, createMeeting);
router.delete("/:id", protectRoute, deleteMeeting);

export default router;