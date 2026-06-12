# AstroChronicle - Consultation Recording Manager (MERN Stack)

AstroChronicle is a MERN stack application designed for clients and astrologers to conduct live consultations (featuring real-time socket-based chat messaging and client-side mic audio recording), log session metadata, and review completed session logs. It contains role-based interfaces (Admin, Client, and Astrologer dashboards) with a modern glassmorphic dark-theme UI.

## Tech Stack & Architecture

- **Frontend:** React + Vite, React Router (v6), Socket.io-Client, Axios, Lucide Icons, Custom CSS (Glassmorphism & animations)
- **Backend:** Node.js + Express, Socket.io (real-time chat messaging and call signaling)
- **Database:** MongoDB + Mongoose (Consultations, Clients, Astrologers, ChatMessages, Users, Wallets, Transactions)
- **Call Recording:** Client-side WebRTC mic stream capture via `MediaRecorder` API, uploaded as WebM to backend via multipart/form-data
- **File Upload:** Multer (local disk storage under `/server/uploads/recordings/` limited to 50MB)
- **Authentication:** JWT (JSON Web Tokens) with Role-Based Access Control (RBAC)

### Folder Structure
```text
/server
  /models       # Mongoose Schemas (Client, Astrologer, Consultation, ChatMessage, User, Wallet, Transaction)
  /routes       # API Routers (auth, clients, consultations, astrologers, dashboard, sessions, wallet, reviews)
  /middleware   # Authentication JWT Verification
  /uploads      # Audio file storage directory (Git-ignored)
  server.js     # Entry point, DB connection & Socket.io handlers
/client
  /src
    /components # Custom Audio Player, Navbar
    /pages      # Login, Register, ClientDashboard, AstrologerDashboard, AdminDashboard
    /context    # AppContext for global states, socket event listeners, and MediaRecorder triggers
    api.js      # Axios configured instance
    index.css   # Dynamic UI CSS System
    App.jsx     # Navigation Routing
```

---

## Core Entities & Schema

### 1. Astrologer
Stores astrologer profile details.
- `name` (String, Required)
- `specialization` (String, Required)
- `ratePerMin` (Number, Required)
- `isOnline` (Boolean)

### 2. Client
Stores client profile metadata.
- `name` (String, Required)
- `gender` (String, Required - 'Male' | 'Female' | 'Other')
- `phone` (String, Optional)
- `dob` (Date, Optional)
- `birthTime` (String, Optional)
- `birthPlace` (String, Optional)

### 3. Consultation
Logs details of a single consultation meeting, linking a client and an astrologer.
- `client` (ObjectId -> Ref Client, Required)
- `astrologer` (ObjectId -> Ref Astrologer, Required)
- `date` (Date, Required)
- `duration` (Number, Duration in seconds)
- `amount` (Number, Billing cost)
- `status` (Enum: `Scheduled` | `Live` | `Completed` | `Cancelled`)
- `recordingUrl` (String, Optional relative path to audio file)
- `chatTranscriptAvailable` (Boolean, defaults to false)
- `notes` (String)

### 4. ChatMessage
Stores conversational transcripts for consultation sessions.
- `sessionId` (ObjectId -> Ref Consultation, Required)
- `senderId` (ObjectId -> Ref User, Required)
- `senderRole` (Enum: `client` | `astrologer`, Required)
- `message` (String, Required)
- `timestamp` (Date, defaults to now)

---

## Setup & Running Locally

### Prerequisites
- [Node.js](https://nodejs.org/) (v16+)
- [MongoDB Community Server](https://www.mongodb.com/try/download/community) running locally on port `27017`

### 1. Backend Setup
1. Open a terminal and navigate to `/server`:
   ```bash
   cd server
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the nodemon dev server (runs on port `5000` by default):
   ```bash
   npm run dev
   ```

### 2. Frontend Setup
1. Open a new terminal and navigate to `/client`:
   ```bash
   cd client
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the Vite development server:
   ```bash
   npm run dev
   ```
4. Navigate to `http://localhost:5173`.

---

## Key Features

### 1. Client Sign-Up with Gender Only
- When a client registers, they are only asked for their **Name, Username, Password, and Gender** (Male/Female/Other). Other birth chart fields are optional during registration and can be updated later in the user profile editor.

### 2. Live Consultation Screen with Chat Messaging
- When a call connects between a client and an astrologer, their calling overlay expands into a split-pane layout:
  - **Left side:** Session timer, rate, billing status, and End Session controls.
  - **Right side:** Real-time scrollable live chat panel. Conversation messages are stored in MongoDB in real time and synchronized via Socket.io.

### 3. Client-Side Call Recording (WebRTC & MediaRecorder)
- Upon call connection, the client's local microphone stream is captured.
- When the call terminates, the stream is gathered, aggregated into a WebM audio blob, and uploaded to the server filesystem via multipart `POST /api/sessions/:sessionId/recording` (capped at 50MB).

### 4. Role-Authorized Session Playback
- Past completed consultations display a **Playback** option on all three panels:
  - **Client Dashboard:** Can playback recordings and read conversation transcripts for their own consultations.
  - **Astrologer Dashboard:** Can playback recordings and read conversation transcripts for their own consultations.
  - **Admin Dashboard:** Has moderate access to playback audio and read transcripts of any session for security audit purposes.
- Media streams and transcripts are protected behind authorization middleware; the frontend uses custom blob streaming (`responseType: 'blob'`) to play authenticated static resources.
