import "dotenv/config";
import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  // Cloud Run injects PORT; fall back to 3000 for local dev.
  const PORT = parseInt(process.env.PORT || "3000", 10);
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

  if (!ADMIN_PASSWORD) {
    console.error("[fatal] ADMIN_PASSWORD env var is required. Refusing to start.");
    process.exit(1);
  }

  app.use(express.json());

  // Initial Room State
  let rooms: { id: number; roomName: string; status: string; course?: string; trainer?: string; intake?: string; topic?: string }[] = [
    { id: 1, roomName: 'Room 1', status: 'available' },
    { id: 2, roomName: 'Room 2', status: 'available' },
    { id: 3, roomName: 'Room 3', status: 'available' },
    { id: 4, roomName: 'Room 4', status: 'available' },
    { id: 5, roomName: 'Room 5', status: 'available' },
    { id: 6, roomName: 'Room 6', status: 'available' },
  ];

  let events = [
    { 
      id: 1, 
      title: 'Term 2 Starts', 
      date: '2026-04-20', 
      description: 'Welcome back — new term, new opportunities ahead.' 
    },
    { 
      id: 2, 
      title: 'Campus Tour', 
      date: '2026-04-01', 
      description: 'Join us for a guided tour of our state-of-the-art facilities.' 
    },
    { 
      id: 3, 
      title: 'Student Workshop', 
      date: '2026-04-10', 
      description: 'A deep dive into professional development and networking.' 
    }
  ];

  let staffOnCampus: any[] = [];
  let timesheetLog: any[] = [];
  let announcements: any[] = [];

  // Daily reset at midnight
  setInterval(() => {
    const now = new Date();
    if (now.getHours() === 0 && now.getMinutes() === 0) {
      rooms = rooms.map(r => ({ ...r, status: 'available', course: undefined, topic: undefined, trainer: undefined, intake: undefined }));
      staffOnCampus = []; // Reset staff sign-ons
      io.emit("rooms_updated", rooms);
      io.emit("staff_updated", staffOnCampus);
      console.log("Rooms and staff reset at midnight");
    }

    // Check for expired announcements
    const initialAnnouncementsCount = announcements.length;
    announcements = announcements.filter(a => new Date(a.expiresAt) > now);
    if (announcements.length !== initialAnnouncementsCount) {
      io.emit("announcements_updated", announcements);
    }
  }, 60000); // Check every minute

  // API endpoint for Google Form / Apps Script / Admin Hub
  app.post("/api/update-rooms", (req, res) => {
    const { action, data } = req.body;

    if (action === "update_single") {
      const roomIndex = rooms.findIndex(r => r.id === data.id);
      if (roomIndex !== -1) {
        rooms[roomIndex] = { ...rooms[roomIndex], ...data };
      } else {
        rooms.push(data);
      }
      io.emit("rooms_updated", rooms);
    } else if (action === "update_all") {
      rooms = data;
      io.emit("rooms_updated", rooms);
    } else if (action === "delete") {
      rooms = rooms.filter(r => r.id !== data.id);
      io.emit("rooms_updated", rooms);
    }

    res.json({ success: true, currentRooms: rooms });
  });

  app.post("/api/update-events", (req, res) => {
    const { action, data } = req.body;

    if (action === "update_single") {
      const eventIndex = events.findIndex(e => e.id === data.id);
      if (eventIndex !== -1) {
        events[eventIndex] = { ...events[eventIndex], ...data };
      } else {
        events.push({ ...data, id: Date.now() });
      }
    } else if (action === "delete") {
      events = events.filter(e => e.id !== data.id);
    } else if (action === "update_all") {
      events = data;
    }

    // Sort events by date
    events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    io.emit("events_updated", events);
    res.json({ success: true, currentEvents: events });
  });

  app.post("/api/staff-signon", (req, res) => {
    const staffMember = { ...req.body, id: Date.now(), timestamp: new Date().toISOString() };
    staffOnCampus.push(staffMember);
    timesheetLog.push(staffMember); // Add to non-editable log
    io.emit("staff_updated", staffOnCampus);
    io.emit("timesheet_updated", timesheetLog);
    res.json({ success: true, staffOnCampus });
  });

  app.post("/api/staff-signoff", (req, res) => {
    const { id } = req.body;
    const staffMember = staffOnCampus.find(s => s.id === id);
    if (staffMember) {
      const signoffEntry = { ...staffMember, action: 'signoff', timestamp: new Date().toISOString() };
      timesheetLog.push(signoffEntry);
    }
    staffOnCampus = staffOnCampus.filter(s => s.id !== id);
    io.emit("staff_updated", staffOnCampus);
    io.emit("timesheet_updated", timesheetLog);
    res.json({ success: true, staffOnCampus });
  });

  app.post("/api/admin-login", (req, res) => {
    const { password } = req.body || {};
    if (typeof password === "string" && password === ADMIN_PASSWORD) {
      res.json({ ok: true });
    } else {
      res.status(401).json({ ok: false });
    }
  });

  // Webhook for Google Forms (Apps Script) to update room allocations
  app.post("/api/form-webhook", (req, res) => {
    const { name, room, course, intake, topics } = req.body;
    if (!name || !room || !course) {
      res.status(400).json({ error: "Missing required fields: name, room, course" });
      return;
    }

    const staffMember = { name, room, course, intake: intake || "", topics: topics || "Class in session", id: Date.now(), timestamp: new Date().toISOString() };
    staffOnCampus.push(staffMember);
    timesheetLog.push(staffMember);
    io.emit("staff_updated", staffOnCampus);
    io.emit("timesheet_updated", timesheetLog);

    const roomNum = parseInt(room.replace('Room ', ''));
    if (!isNaN(roomNum) && roomNum >= 1 && roomNum <= 6) {
      const roomIndex = rooms.findIndex(r => r.id === roomNum);
      if (roomIndex !== -1) {
        rooms[roomIndex] = { ...rooms[roomIndex], status: 'live', course, trainer: name, intake: intake || "", topic: topics || "Class in session" };
      }
    } else {
      rooms.push({ id: Date.now(), roomName: room, status: 'live', course, trainer: name, intake: intake || "", topic: topics || "Class in session" });
    }
    io.emit("rooms_updated", rooms);
    res.json({ success: true });
  });

  app.post("/api/update-announcements", (req, res) => {
    const { action, data } = req.body;
    if (action === "add") {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + (data.duration || 1));
      const newAnnouncement = { 
        ...data, 
        id: Date.now(), 
        createdAt: new Date().toISOString(),
        expiresAt: expiresAt.toISOString()
      };
      announcements.push(newAnnouncement);
    } else if (action === "delete") {
      announcements = announcements.filter(a => a.id !== data.id);
    }
    io.emit("announcements_updated", announcements);
    res.json({ success: true, announcements });
  });

  // WebSocket logic
  io.on("connection", (socket) => {
    console.log("A client connected");
    socket.emit("rooms_updated", rooms);
    socket.emit("events_updated", events);
    socket.emit("staff_updated", staffOnCampus);
    socket.emit("announcements_updated", announcements);
    socket.emit("timesheet_updated", timesheetLog);

    socket.on("disconnect", () => {
      console.log("A client disconnected");
    });
  });

  // Vite middleware for development; in production we serve the static build.
  // Dynamic import keeps Vite out of the production hot path.
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
