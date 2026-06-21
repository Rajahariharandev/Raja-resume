# Spotify-like Music Player (Django + React + React Native + YouTube API)

A full-stack, Spotify-inspired music streaming application. Songs are streamed directly from YouTube via the official IFrame Player API. 

## Features
- **Spotify-like UI**: High-fidelity dark/light mode dashboard, side navigation, playlist detail views, and a premium media player bar.
- **Autoplay & Playlists**: Create, edit, and favorite playlists, and automatically transition to the next song in the playlist.
- **YouTube Integration**: Search YouTube keylessly or import specific tracks/playlists using standard YouTube URLs.
- **Recently Played**: Track and review your listening history.
- **Lyrics Database**: Automatic lyrics lookups via the `lyrics.ovh` API, cached locally in the database, with a built-in lyrics editor.
- **PostgreSQL Database**: Configured for PostgreSQL (via Docker), with a zero-config fallback to SQLite for instant local development.
- **Mobile Client**: React Native (Expo) mobile player styled in dark-mode Spotify theme.

---

## Project Structure
- `/backend`: Django REST Framework API server.
- `/frontend`: React client scaffolded with Vite and styled with Vanilla CSS.
- `/mobile`: React Native (Expo) app for mobile.
- `docker-compose.yml`: For running PostgreSQL.

---

## Quick Start (Zero Config - SQLite default)

### 1. Run Django Backend
Navigate to the `backend/` folder:
```bash
cd backend
# Activate virtual environment
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

# Create database and migrations (SQLite will be created automatically)
python manage.py makemigrations
python manage.py migrate

# Start the Django server
python manage.py runserver
```
*Note: A default admin account is already created: Username `admin`, Password `adminpass`.*

### 2. Run React Web Client
Navigate to the `frontend/` folder:
```bash
cd frontend
# Install dependencies
npm install

# Start local server
npm run dev
```
Open `http://localhost:5173` in your browser.

### 3. Run React Native Mobile App
Navigate to the `mobile/` folder:
```bash
cd mobile
# Install dependencies
npm install

# Start Expo CLI
npx expo start
```
Scan the QR code with your phone (using the Expo Go app) to open it.

---

## Advanced: Enable PostgreSQL (Recommended)

1. Ensure Docker Desktop is running.
2. Spin up the PostgreSQL container from the root directory:
   ```bash
   docker-compose up -d
   ```
3. Copy `.env.example` to `.env` in the root:
   ```bash
   copy .env.example .env
   ```
4. Set `DB_HOST=localhost` in your `.env`.
5. Restart your Django server. It will automatically detect the database variables and connect to the PostgreSQL instance instead of SQLite.
