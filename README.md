# AstroChronicle - Consultation Recording Manager (MERN Stack MVP)

AstroChronicle is a MERN stack application designed for astrologers to catalog client details and log consultation sessions, including audio recordings, discussion notes, and tags. It features a modern, responsive, and glassmorphic dark-theme UI.

## Tech Stack & Architecture

- **Frontend:** React + Vite, React Router (v6), Axios, Lucide Icons, Custom CSS (Glassmorphism & animations)
- **Backend:** Node.js + Express
- **Database:** MongoDB + Mongoose
- **File Upload:** Multer (local disk storage under `/server/uploads/`)
- **Authentication:** Admin-level Bearer Token simulation

### Folder Structure
```text
/server
  /models       # Mongoose Schemas (Client, Astrologer, Consultation)
  /routes       # API Routers (auth, clients, consultations, astrologers, dashboard)
  /middleware   # Authentication Token Check
  /uploads      # Audio file storage directory (Git-ignored)
  server.js     # Entry point & DB connection
/client
  /src
    /components # Custom Audio Player, Navbar
    /pages      # Login, Dashboard, Clients, ClientDetail, Consultations
    api.js      # Axios configured instance
    index.css   # Dynamic UI CSS System
    App.jsx     # Navigation Routing
```

---

## Core Entities & Schema

### 1. Astrologer
Stores astrologer details. Automatically seeded on first server startup.
- `name` (String, Required)
- `specialization` (String, Required)

### 2. Client
Stores client metadata and birth chart information.
- `name` (String, Required)
- `phone` (String, Required)
- `dob` (Date, Required)
- `birthTime` (String, Required - e.g., "14:30")
- `birthPlace` (String, Required)

### 3. Consultation
Logs details of a single consultation meeting, linking a client and an astrologer.
- `client` (ObjectId -> Ref Client, Required)
- `astrologer` (ObjectId -> Ref Astrologer, Required)
- `date` (Date, Required)
- `audioUrl` (String, Optional path to file)
- `notes` (String, Optional)
- `duration` (Number, Duration in seconds)
- `tags` (Array of Strings)
- `status` (Enum: `Scheduled` | `Completed` | `Cancelled`)

---

## Setup & Running Locally

### Prerequisites
- [Node.js](https://nodejs.org/) (v16+)
- [MongoDB Community Server](https://www.mongodb.com/try/download/community) installed and running locally on port `27017`

### 1. Backend Setup
1. Open a terminal and navigate to the `/server` folder:
   ```bash
   cd server
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the development server (runs on port `5000` by default):
   ```bash
   npm run dev
   ```
   *Note: This will auto-create the `uploads/` folder and seed default astrologers (e.g., Pandit Sri Raman, Dr. Anjali Sharma, Karthik Iyer).*

### 2. Frontend Setup
1. Open a new terminal and navigate to the `/client` folder:
   ```bash
   cd client
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the Vite development server (runs on port `5173` or similar):
   ```bash
   npm run dev
   ```
4. Open your browser and navigate to the address shown (usually `http://localhost:5173`).

---

## Using the Application

### 1. Sandbox Login
- **Username:** `admin`
- **Password:** `admin123`
- *Note: A "Quick Sandbox Auto-fill" button is provided on the Login page for convenience during evaluation.*

### 2. Features Walkthrough
- **Dashboard:** Instantly see count statistics for clients, consultations, total audio logs runtime, recent updates, and a popular tag cloud.
- **Clients Directory:** Create, view, edit, or delete clients. Deleting a client automatically cascades and deletes all associated consultations and local audio files.
- **Client Detail (Birth Chart Profile):** Displays phone, DOB, birth time, and birth place. Includes a visual timeline of all consultations. You can log a new consultation directly inside their profile, and the client details will be prefilled.
- **Auto-measured Audio Uploads:** When logging a consultation, upload an audio recording file. The application automatically reads the metadata of the file and calculates the duration in seconds—no manual timing entry needed.
- **Custom Audio Player:** Playback audio files directly in the timeline or search results. Change speed playback rates (0.5x, 1x, 1.25x, 1.5x, 2x) or skip forwards/backwards by 10s.
- **Advanced Consultations Search:** Search consultations by client name, date range, tag list, or conducting astrologer.

---

## Assumptions & Future Improvements

### Assumptions
- A single hardcoded administrator account is sufficient for this stage of evaluation.
- Local uploads folder is utilized to avoid AWS configuration overhead.
- All consult duration calculations are performed client-side upon file load and sent directly to the database.

### Future Work
- **Role-Based Authentication (RBAC):** Separate portals for Astrologers to view their logs, and Clients to check recommendations.
- **AWS S3 / Cloudinary File Storage:** Securely host audio recordings in the cloud rather than local server disk.
- **Visual Waveform Analysis:** Display audio waveform visuals during playback for easier navigation.
- **Astrological Chart Generator:** Integrate a library to automatically render the natal birth chart (Lagna/Rasi) from DOB, time, and place inputs.
