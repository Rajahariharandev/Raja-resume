import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, Pause, SkipForward, SkipBack, Volume2, VolumeX, Music, Heart, 
  Search, Sun, Moon, Plus, LogOut, Check, ChevronRight, ListMusic, Trash2, 
  FolderHeart, Edit, FileText, X, Disc, Radio
} from 'lucide-react';

const API_BASE = 'http://localhost:8000/api';

function App() {
  // Auth state
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [username, setUsername] = useState(localStorage.getItem('username') || '');
  const [isLoginView, setIsLoginView] = useState(true);
  const [authError, setAuthError] = useState('');
  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [emailInput, setEmailInput] = useState('');

  // UI state
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [currentView, setCurrentView] = useState('home'); // home, search, playlist-detail, favorites
  const [activePlaylistId, setActivePlaylistId] = useState(null);
  const [playlists, setPlaylists] = useState([]);
  const [recentlyPlayed, setRecentlyPlayed] = useState([]);
  const [favoritePlaylists, setFavoritePlaylists] = useState([]);
  
  // Search & Import state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [importUrl, setImportUrl] = useState('');
  const [isImporting, setIsImporting] = useState(false);

  // Music Player Queue state
  const [queue, setQueue] = useState([]);
  const [currentQueueIndex, setCurrentQueueIndex] = useState(-1);
  const [currentSong, setCurrentSong] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(70);
  const [isMuted, setIsMuted] = useState(false);
  const [loop, setLoop] = useState(false);
  const [shuffle, setShuffle] = useState(false);

  // Dialogs and Overlays
  const [showCreatePlaylistDialog, setShowCreatePlaylistDialog] = useState(false);
  const [playlistName, setPlaylistName] = useState('');
  const [playlistDesc, setPlaylistDesc] = useState('');
  
  const [songToAddToPlaylist, setSongToAddToPlaylist] = useState(null);
  const [showAddSongDialog, setShowAddSongDialog] = useState(false);
  
  // Lyrics state
  const [showLyrics, setShowLyrics] = useState(false);
  const [lyrics, setLyrics] = useState('');
  const [isEditingLyrics, setIsEditingLyrics] = useState(false);
  const [lyricsInput, setLyricsInput] = useState('');
  const [isLoadingLyrics, setIsLoadingLyrics] = useState(false);

  // Refs
  const playerRef = useRef(null);
  const playerReady = useRef(false);

  // Fetch Playlists, Favorites, and Recently Played on Mount / Token Change
  useEffect(() => {
    if (token) {
      fetchPlaylists();
      fetchRecentlyPlayed();
      fetchFavoritePlaylists();
    }
  }, [token]);

  // Load YouTube Player API
  useEffect(() => {
    if (!token) return;

    // Create script tag for YT API if not already present
    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
    }

    // Set up callback
    window.onYouTubeIframeAPIReady = () => {
      initPlayer();
    };

    // If already loaded
    if (window.YT && window.YT.Player) {
      initPlayer();
    }

    return () => {
      // Clean up callback (optional)
    };
  }, [token]);

  // Initialize YT Player
  const initPlayer = () => {
    if (playerRef.current) return;
    
    playerRef.current = new window.YT.Player('youtube-player-element', {
      height: '1',
      width: '1',
      videoId: '',
      playerVars: {
        autoplay: 0,
        controls: 0,
        disablekb: 1,
        fs: 0,
        rel: 0,
        showinfo: 0,
        iv_load_policy: 3,
        origin: window.location.origin
      },
      events: {
        onReady: (event) => {
          playerReady.current = true;
          event.target.setVolume(volume);
        },
        onStateChange: (event) => {
          // YT.PlayerState:
          // -1 (unstarted), 0 (ended), 1 (playing), 2 (paused), 3 (buffering), 5 (video cued)
          if (event.data === window.YT.PlayerState.ENDED) {
            handleTrackEnded();
          } else if (event.data === window.YT.PlayerState.PLAYING) {
            setIsPlaying(true);
            if (playerRef.current.getDuration) {
              setDuration(Math.floor(playerRef.current.getDuration()));
            }
          } else if (event.data === window.YT.PlayerState.PAUSED) {
            setIsPlaying(false);
          }
        }
      }
    });
  };

  // Track Playback Progress
  useEffect(() => {
    let interval;
    if (isPlaying && playerRef.current && playerRef.current.getCurrentTime) {
      interval = setInterval(() => {
        const curr = Math.floor(playerRef.current.getCurrentTime());
        setCurrentTime(curr);
        
        // Sometimes duration isn't available immediately on start, sync it
        const dur = Math.floor(playerRef.current.getDuration() || 0);
        if (dur && dur !== duration) {
          setDuration(dur);
        }
      }, 500);
    }
    return () => clearInterval(interval);
  }, [isPlaying, duration]);

  // Set Theme
  useEffect(() => {
    const root = document.documentElement;
    if (isDarkMode) {
      root.classList.remove('light');
    } else {
      root.classList.add('light');
    }
  }, [isDarkMode]);

  // Handle Track Ended (Autoplay Next)
  const handleTrackEnded = () => {
    if (loop) {
      if (playerRef.current && playerRef.current.seekTo) {
        playerRef.current.seekTo(0);
        playerRef.current.playVideo();
      }
    } else {
      playNext();
    }
  };

  // Play Next Song in Queue
  const playNext = () => {
    if (queue.length === 0) return;
    let nextIndex = currentQueueIndex + 1;
    
    if (shuffle) {
      nextIndex = Math.floor(Math.random() * queue.length);
    } else if (nextIndex >= queue.length) {
      nextIndex = 0; // Wrap around to start of queue
    }
    
    playSongAtIndex(nextIndex);
  };

  // Play Previous Song
  const playPrev = () => {
    if (queue.length === 0) return;
    
    if (currentTime > 5) {
      // Seek back to start of song if played > 5s
      seek(0);
      return;
    }

    let prevIndex = currentQueueIndex - 1;
    if (prevIndex < 0) {
      prevIndex = queue.length - 1; // Wrap around to end
    }
    playSongAtIndex(prevIndex);
  };

  // Play Song from Queue Index
  const playSongAtIndex = (index) => {
    if (index < 0 || index >= queue.length) return;
    
    const song = queue[index].song || queue[index]; // Handles both PlaylistSong structure and plain Song
    setCurrentQueueIndex(index);
    setCurrentSong(song);
    
    if (playerRef.current && playerRef.current.loadVideoById) {
      playerRef.current.loadVideoById(song.youtube_id);
      playerRef.current.playVideo();
      setIsPlaying(true);
      setCurrentTime(0);
      
      // Log as recently played
      logRecentlyPlayed(song);
      
      // Auto fetch lyrics in background
      fetchLyrics(song.id);
    }
  };

  // Play specific song and overwrite current queue with context (e.g. playlist)
  const playSong = (song, songsContext = []) => {
    if (songsContext && songsContext.length > 0) {
      setQueue(songsContext);
      const index = songsContext.findIndex(item => {
        const itemSong = item.song || item;
        return itemSong.youtube_id === song.youtube_id;
      });
      setQueueContextAndPlay(songsContext, index >= 0 ? index : 0);
    } else {
      setQueue([song]);
      setQueueContextAndPlay([song], 0);
    }
  };

  const setQueueContextAndPlay = (songsQueue, index) => {
    setQueue(songsQueue);
    setCurrentQueueIndex(index);
    const item = songsQueue[index];
    const songObj = item.song || item;
    setCurrentSong(songObj);

    if (playerRef.current && playerRef.current.loadVideoById) {
      playerRef.current.loadVideoById(songObj.youtube_id);
      playerRef.current.playVideo();
      setIsPlaying(true);
      setCurrentTime(0);
      
      // Log as recently played
      logRecentlyPlayed(songObj);
      
      // Auto fetch lyrics
      fetchLyrics(songObj.id);
    }
  };

  // Toggle Play / Pause
  const togglePlay = () => {
    if (!currentSong && queue.length > 0) {
      playSongAtIndex(0);
      return;
    }
    if (!playerRef.current) return;
    
    if (isPlaying) {
      playerRef.current.pauseVideo();
      setIsPlaying(false);
    } else {
      playerRef.current.playVideo();
      setIsPlaying(true);
    }
  };

  // Seek Progress
  const seek = (time) => {
    if (playerRef.current && playerRef.current.seekTo) {
      playerRef.current.seekTo(time, true);
      setCurrentTime(time);
    }
  };

  // Change Volume
  const handleVolumeChange = (e) => {
    const val = parseInt(e.target.value);
    setVolume(val);
    if (playerRef.current && playerRef.current.setVolume) {
      playerRef.current.setVolume(val);
    }
    if (val > 0 && isMuted) {
      setIsMuted(false);
    }
  };

  // Toggle Mute
  const toggleMute = () => {
    if (!playerRef.current) return;
    if (isMuted) {
      playerRef.current.setVolume(volume);
      setIsMuted(false);
    } else {
      playerRef.current.setVolume(0);
      setIsMuted(true);
    }
  };

  // --- API CALLS ---

  // Auth: Register
  const handleSignup = async (e) => {
    e.preventDefault();
    setAuthError('');
    try {
      const res = await fetch(`${API_BASE}/auth/signup/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: usernameInput,
          password: passwordInput,
          email: emailInput
        })
      });
      const data = await res.json();
      if (res.ok) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('username', data.username);
        setToken(data.token);
        setUsername(data.username);
      } else {
        setAuthError(Object.values(data).flat().join(' '));
      }
    } catch (err) {
      setAuthError('Connection failed. Please verify your backend server.');
    }
  };

  // Auth: Login
  const handleLogin = async (e) => {
    e.preventDefault();
    setAuthError('');
    try {
      const res = await fetch(`${API_BASE}/auth/login/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: usernameInput,
          password: passwordInput
        })
      });
      const data = await res.json();
      if (res.ok) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('username', data.username);
        setToken(data.token);
        setUsername(data.username);
      } else {
        setAuthError(data.error || 'Invalid credentials');
      }
    } catch (err) {
      setAuthError('Connection failed. Please verify your backend server.');
    }
  };

  // Auth: Logout
  const handleLogout = async () => {
    try {
      await fetch(`${API_BASE}/auth/logout/`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Token ${token}`
        }
      });
    } catch (err) {}
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    setToken('');
    setUsername('');
    // Clear playback
    setCurrentSong(null);
    setIsPlaying(false);
    setQueue([]);
  };

  // Playlists: Fetch List
  const fetchPlaylists = async () => {
    try {
      const res = await fetch(`${API_BASE}/playlists/`, {
        headers: { 'Authorization': `Token ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setPlaylists(data);
      }
    } catch (err) {}
  };

  // Playlists: Fetch Favorites
  const fetchFavoritePlaylists = async () => {
    try {
      const res = await fetch(`${API_BASE}/playlists/favorites/`, {
        headers: { 'Authorization': `Token ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setFavoritePlaylists(data);
      }
    } catch (err) {}
  };

  // Playlists: Create New
  const handleCreatePlaylist = async (e) => {
    e.preventDefault();
    if (!playlistName) return;
    try {
      const res = await fetch(`${API_BASE}/playlists/`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Token ${token}`
        },
        body: JSON.stringify({ name: playlistName, description: playlistDesc })
      });
      if (res.ok) {
        const newPlaylist = await res.json();
        fetchPlaylists();
        setShowCreatePlaylistDialog(false);
        setPlaylistName('');
        setPlaylistDesc('');
        // View details immediately
        viewPlaylistDetails(newPlaylist.id);
      }
    } catch (err) {}
  };

  // Playlists: View Details
  const viewPlaylistDetails = (id) => {
    setActivePlaylistId(id);
    setCurrentView('playlist-detail');
  };

  // Playlists: Toggle Favorite
  const toggleFavoritePlaylist = async (playlistId) => {
    try {
      const res = await fetch(`${API_BASE}/playlists/${playlistId}/toggle_favorite/`, {
        method: 'POST',
        headers: { 'Authorization': `Token ${token}` }
      });
      if (res.ok) {
        fetchPlaylists();
        fetchFavoritePlaylists();
      }
    } catch (err) {}
  };

  // Playlists: Add Song Link
  const addSongToPlaylist = async (songId, playlistId) => {
    try {
      const res = await fetch(`${API_BASE}/playlists/${playlistId}/add_song/`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Token ${token}`
        },
        body: JSON.stringify({ song_id: songId })
      });
      if (res.ok) {
        fetchPlaylists();
        setShowAddSongDialog(false);
        if (activePlaylistId === playlistId) {
          // Re-trigger details refresh
          viewPlaylistDetails(playlistId);
        }
      }
    } catch (err) {}
  };

  // Playlists: Remove Song Link
  const removeSongFromPlaylist = async (songId, playlistId) => {
    try {
      const res = await fetch(`${API_BASE}/playlists/${playlistId}/remove_song/`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Token ${token}`
        },
        body: JSON.stringify({ song_id: songId })
      });
      if (res.ok) {
        fetchPlaylists();
        // Refresh detail view
        viewPlaylistDetails(playlistId);
      }
    } catch (err) {}
  };

  // Songs: Import Song from YouTube URL to Playlist
  const handleImportSong = async (e) => {
    e.preventDefault();
    if (!importUrl || !activePlaylistId) return;
    setIsImporting(true);
    try {
      const res = await fetch(`${API_BASE}/playlists/${activePlaylistId}/add_song/`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Token ${token}`
        },
        body: JSON.stringify({ youtube_url: importUrl })
      });
      if (res.ok) {
        setImportUrl('');
        viewPlaylistDetails(activePlaylistId);
      }
    } catch (err) {}
    setIsImporting(false);
  };

  // Search: Search YouTube
  const handleSearchSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!searchQuery) return;
    setIsSearching(true);
    setCurrentView('search');
    try {
      const res = await fetch(`${API_BASE}/youtube/search/?q=${encodeURIComponent(searchQuery)}`, {
        headers: { 'Authorization': `Token ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSearchResults(data);
      }
    } catch (err) {}
    setIsSearching(false);
  };

  // Songs: Add Search result directly to current playlist or db
  const handleAddSearchResult = async (video, targetPlaylistId) => {
    try {
      const res = await fetch(`${API_BASE}/playlists/${targetPlaylistId}/add_song/`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Token ${token}`
        },
        body: JSON.stringify({ 
          youtube_id: video.id,
          title: video.title,
          artist_name: video.artist,
          duration: video.duration
        })
      });
      if (res.ok) {
        fetchPlaylists();
        alert(`Added "${video.title}" to playlist!`);
      }
    } catch (err) {}
  };

  // Recently Played: Fetch
  const fetchRecentlyPlayed = async () => {
    try {
      const res = await fetch(`${API_BASE}/recently-played/`, {
        headers: { 'Authorization': `Token ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setRecentlyPlayed(data);
      }
    } catch (err) {}
  };

  // Recently Played: Log New Play
  const logRecentlyPlayed = async (song) => {
    try {
      await fetch(`${API_BASE}/recently-played/`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Token ${token}`
        },
        body: JSON.stringify({ song_id: song.id })
      });
      fetchRecentlyPlayed();
    } catch (err) {}
  };

  // Lyrics: Fetch from backend (caches from lyrics.ovh if not present)
  const fetchLyrics = async (songId) => {
    setIsLoadingLyrics(true);
    setLyrics('');
    try {
      const res = await fetch(`${API_BASE}/lyrics/?song_id=${songId}`, {
        headers: { 'Authorization': `Token ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setLyrics(data.lyrics);
        setLyricsInput(data.lyrics);
      }
    } catch (err) {
      setLyrics('Failed to load lyrics.');
    }
    setIsLoadingLyrics(false);
  };

  // Lyrics: Save Custom Edit
  const handleSaveLyrics = async () => {
    if (!currentSong) return;
    try {
      const res = await fetch(`${API_BASE}/lyrics/`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Token ${token}`
        },
        body: JSON.stringify({ 
          song_id: currentSong.id,
          lyrics: lyricsInput
        })
      });
      if (res.ok) {
        const data = await res.json();
        setLyrics(data.lyrics);
        setIsEditingLyrics(false);
      }
    } catch (err) {}
  };

  // Helper: Format Seconds into mm:ss
  const formatTime = (secs) => {
    if (isNaN(secs) || secs === undefined) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Get currently viewed playlist object
  const currentPlaylist = playlists.find(p => p.id === activePlaylistId);

  // Render Login/Signup view if not authenticated
  if (!token) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <div className="auth-logo">
            <Radio size={32} />
            <span>SoundGrid</span>
          </div>
          <h2 className="auth-title">
            {isLoginView ? 'Login to continue' : 'Create new account'}
          </h2>
          {authError && <div className="error-banner">{authError}</div>}
          <form className="auth-form" onSubmit={isLoginView ? handleLogin : handleSignup}>
            <div className="form-group">
              <label className="form-label">Username</label>
              <input 
                type="text" 
                className="form-input" 
                placeholder="soundmaster"
                value={usernameInput}
                onChange={(e) => setUsernameInput(e.target.value)}
                required
              />
            </div>
            {!isLoginView && (
              <div className="form-group">
                <label className="form-label">Email Address</label>
                <input 
                  type="email" 
                  className="form-input" 
                  placeholder="music@example.com"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  required
                />
              </div>
            )}
            <div className="form-group">
              <label className="form-label">Password</label>
              <input 
                type="password" 
                className="form-input" 
                placeholder="••••••••"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                required
              />
            </div>
            <button type="submit" className="auth-submit-btn">
              {isLoginView ? 'Sign In' : 'Sign Up'}
            </button>
          </form>
          <div className="auth-switch">
            {isLoginView ? "Don't have an account?" : "Already have an account?"}
            <button 
              className="auth-switch-btn" 
              onClick={() => {
                setIsLoginView(!isLoginView);
                setAuthError('');
              }}
            >
              {isLoginView ? 'Register' : 'Log In'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      {/* Hidden Div for mounting YouTube Iframe */}
      <div id="youtube-player-element" style={{ position: 'absolute', top: '-1000px', left: '-1000px' }}></div>
      
      <div className="main-layout">
        
        {/* Sidebar Nav */}
        <aside className="sidebar">
          <div className="logo">
            <Radio size={24} />
            <span>SoundGrid</span>
          </div>
          
          <div className="sidebar-menu">
            <button 
              className={`menu-item ${currentView === 'home' ? 'active' : ''}`}
              onClick={() => setCurrentView('home')}
            >
              <Disc size={18} />
              <span>Home</span>
            </button>
            <button 
              className={`menu-item ${currentView === 'search' ? 'active' : ''}`}
              onClick={() => setCurrentView('search')}
            >
              <Search size={18} />
              <span>Search / Import</span>
            </button>
            <button 
              className={`menu-item ${currentView === 'favorites' ? 'active' : ''}`}
              onClick={() => setCurrentView('favorites')}
            >
              <FolderHeart size={18} />
              <span>Favorites</span>
            </button>
          </div>

          <div className="sidebar-divider"></div>

          <div className="library-section">
            <div className="library-header">
              <span>Playlists</span>
            </div>
            <button 
              className="create-playlist-btn"
              onClick={() => setShowCreatePlaylistDialog(true)}
            >
              <Plus size={16} />
              <span>Create Playlist</span>
            </button>

            <div className="playlist-list">
              {playlists.map((playlist) => (
                <button
                  key={playlist.id}
                  className={`playlist-item ${currentView === 'playlist-detail' && activePlaylistId === playlist.id ? 'active' : ''}`}
                  onClick={() => viewPlaylistDetails(playlist.id)}
                >
                  <ListMusic size={16} />
                  <span>{playlist.name}</span>
                </button>
              ))}
              {playlists.length === 0 && (
                <div style={{ padding: '0 12px', fontSize: '13px', color: 'var(--text-muted)' }}>
                  No playlists yet
                </div>
              )}
            </div>
          </div>
        </aside>

        {/* Main Content Pane */}
        <main className="main-content">
          
          {/* Top Header */}
          <header className="top-header">
            <form onSubmit={handleSearchSubmit} className="search-container">
              <Search size={18} className="text-muted" />
              <input
                type="text"
                placeholder="Search songs or channel..."
                className="search-input"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </form>

            <div className="header-actions">
              <button className="theme-toggle-btn" onClick={() => setIsDarkMode(!isDarkMode)}>
                {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
              </button>
              <div className="user-badge">
                <span>{username}</span>
                <button className="logout-btn" onClick={handleLogout}>
                  <LogOut size={14} />
                </button>
              </div>
            </div>
          </header>

          {/* PAGE VIEW SWITCHER */}
          
          {/* 1. Home View */}
          {currentView === 'home' && (
            <div className="page-view">
              <h1 className="page-title">Welcome Back, {username}!</h1>
              
              <div className="section-title">
                <span>Recently Played</span>
              </div>
              <div className="card-grid">
                {recentlyPlayed.map((item) => (
                  <div key={item.id} className="media-card" onClick={() => playSong(item.song)}>
                    <div className="card-artwork-container">
                      <img src={item.song.thumbnail_url} className="card-artwork" alt="" />
                      <button className="card-play-btn">
                        <Play size={20} fill="#fff" />
                      </button>
                    </div>
                    <div className="card-title">{item.song.title}</div>
                    <div className="card-subtitle">{item.song.artist_name}</div>
                  </div>
                ))}
                {recentlyPlayed.length === 0 && (
                  <div className="empty-state" style={{ gridColumn: '1/-1' }}>
                    <Music size={40} className="empty-state-icon" />
                    <div>No recently played tracks. Start playing music!</div>
                  </div>
                )}
              </div>

              <div className="section-title">
                <span>Your Favorite Playlists</span>
              </div>
              <div className="card-grid">
                {favoritePlaylists.map((playlist) => (
                  <div key={playlist.id} className="media-card" onClick={() => viewPlaylistDetails(playlist.id)}>
                    <div className="card-artwork-container">
                      <div className="card-artwork" style={{ background: 'linear-gradient(135deg, #1db954 0%, #191414 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <ListMusic size={48} color="white" />
                      </div>
                      <button className="card-play-btn" onClick={(e) => {
                        e.stopPropagation();
                        if (playlist.songs && playlist.songs.length > 0) {
                          playSong(playlist.songs[0].song || playlist.songs[0], playlist.songs);
                        }
                      }}>
                        <Play size={20} fill="#fff" />
                      </button>
                    </div>
                    <div className="card-title">{playlist.name}</div>
                    <div className="card-subtitle">{playlist.songs?.length || 0} tracks</div>
                  </div>
                ))}
                {favoritePlaylists.length === 0 && (
                  <div className="empty-state" style={{ gridColumn: '1/-1' }}>
                    <Heart size={40} className="empty-state-icon" />
                    <div>No favorited playlists. Toggle heart icon in a playlist detail to add.</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 2. Favorites View */}
          {currentView === 'favorites' && (
            <div className="page-view">
              <h1 className="page-title">Favorite Playlists</h1>
              <div className="card-grid">
                {favoritePlaylists.map((playlist) => (
                  <div key={playlist.id} className="media-card" onClick={() => viewPlaylistDetails(playlist.id)}>
                    <div className="card-artwork-container">
                      <div className="card-artwork" style={{ background: 'linear-gradient(135deg, #1db954 0%, #191414 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <ListMusic size={48} color="white" />
                      </div>
                    </div>
                    <div className="card-title">{playlist.name}</div>
                    <div className="card-subtitle">{playlist.songs?.length || 0} tracks</div>
                  </div>
                ))}
                {favoritePlaylists.length === 0 && (
                  <div className="empty-state" style={{ gridColumn: '1/-1' }}>
                    <FolderHeart size={48} className="empty-state-icon" />
                    <div>No favorited playlists yet.</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 3. Search View */}
          {currentView === 'search' && (
            <div className="page-view">
              <h1 className="page-title">Search YouTube</h1>
              <form onSubmit={handleSearchSubmit} className="import-form">
                <input
                  type="text"
                  placeholder="Search for tracks, albums, artists..."
                  className="form-input"
                  style={{ flex: 1 }}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <button type="submit" className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Search size={16} /> Search
                </button>
              </form>

              {isSearching && (
                <div style={{ textAlign: 'center', padding: '40px' }}>Searching YouTube...</div>
              )}

              {!isSearching && searchResults.length > 0 && (
                <div style={{ marginTop: '24px' }}>
                  <table className="track-table">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Title</th>
                        <th>Channel/Artist</th>
                        <th>Duration</th>
                        <th className="track-actions-col">Add</th>
                      </tr>
                    </thead>
                    <tbody>
                      {searchResults.map((video, idx) => (
                        <tr key={video.id} className="track-row">
                          <td className="track-index-col">{idx + 1}</td>
                          <td className="track-title-col">
                            <img src={video.thumbnail} className="track-thumbnail" alt="" />
                            <div className="track-info-detail">
                              <span 
                                className="track-title-text" 
                                style={{ cursor: 'pointer' }}
                                onClick={() => playSong({
                                  youtube_id: video.id,
                                  title: video.title,
                                  artist_name: video.artist,
                                  thumbnail_url: video.thumbnail,
                                  duration: video.duration
                                })}
                              >
                                {video.title}
                              </span>
                            </div>
                          </td>
                          <td>{video.artist}</td>
                          <td>{video.duration_text}</td>
                          <td className="track-actions-col">
                            <button 
                              className="action-icon-btn" 
                              style={{ borderRadius: '6px' }}
                              onClick={() => {
                                setSongToAddToPlaylist({
                                  youtube_id: video.id,
                                  title: video.title,
                                  artist_name: video.artist,
                                  thumbnail_url: video.thumbnail,
                                  duration: video.duration
                                });
                                setShowAddSongDialog(true);
                              }}
                            >
                              <Plus size={16} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* 4. Playlist Detail View */}
          {currentView === 'playlist-detail' && currentPlaylist && (
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
              {/* Banner */}
              <div className="banner">
                <div className="banner-artwork" style={{ background: 'linear-gradient(135deg, #1db954 0%, #191414 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ListMusic size={72} color="white" />
                </div>
                <div className="banner-info">
                  <div className="banner-type">Playlist</div>
                  <h1 className="banner-title">{currentPlaylist.name}</h1>
                  <div style={{ color: 'var(--text-muted)', marginBottom: '8px' }}>{currentPlaylist.description}</div>
                  <div className="banner-meta">
                    <span className="banner-meta-owner">{currentPlaylist.owner}</span>
                    <span>•</span>
                    <span>{currentPlaylist.songs?.length || 0} tracks</span>
                  </div>
                </div>
              </div>

              {/* Action Controls */}
              <div className="track-list-container">
                <div className="list-controls">
                  <button 
                    className="play-all-btn"
                    disabled={!currentPlaylist.songs || currentPlaylist.songs.length === 0}
                    onClick={() => {
                      if (currentPlaylist.songs && currentPlaylist.songs.length > 0) {
                        playSong(currentPlaylist.songs[0].song, currentPlaylist.songs);
                      }
                    }}
                  >
                    <Play size={16} fill="white" /> Play All
                  </button>
                  <button 
                    className={`fav-toggle-btn ${currentPlaylist.is_favorite ? 'active' : ''}`}
                    onClick={() => toggleFavoritePlaylist(currentPlaylist.id)}
                  >
                    <Heart size={18} fill={currentPlaylist.is_favorite ? 'var(--accent)' : 'none'} />
                  </button>
                </div>

                {/* Import Song Form */}
                <form onSubmit={handleImportSong} className="import-form">
                  <input
                    type="text"
                    placeholder="Paste YouTube Video URL (e.g. https://www.youtube.com/watch?v=...) to import"
                    className="form-input"
                    style={{ flex: 1 }}
                    value={importUrl}
                    onChange={(e) => setImportUrl(e.target.value)}
                    required
                  />
                  <button type="submit" className="btn-primary" disabled={isImporting}>
                    {isImporting ? 'Importing...' : 'Import Track'}
                  </button>
                </form>

                {/* Track Table */}
                <table className="track-table">
                  <thead>
                    <tr>
                      <th className="track-index-col">#</th>
                      <th>Title</th>
                      <th>Duration</th>
                      <th className="track-actions-col"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentPlaylist.songs?.map((playlistSong, index) => (
                      <tr key={playlistSong.id} className="track-row">
                        <td className="track-index-col">{index + 1}</td>
                        <td className="track-title-col">
                          <img src={playlistSong.song.thumbnail_url} className="track-thumbnail" alt="" />
                          <div className="track-info-detail">
                            <span 
                              className="track-title-text" 
                              style={{ cursor: 'pointer' }}
                              onClick={() => playSong(playlistSong.song, currentPlaylist.songs)}
                            >
                              {playlistSong.song.title}
                            </span>
                            <span className="track-artist-text">{playlistSong.song.artist_name}</span>
                          </div>
                        </td>
                        <td>{formatTime(playlistSong.song.duration)}</td>
                        <td className="track-actions-col">
                          <button 
                            className="track-action-btn"
                            onClick={() => removeSongFromPlaylist(playlistSong.song.id, currentPlaylist.id)}
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {(!currentPlaylist.songs || currentPlaylist.songs.length === 0) && (
                      <tr>
                        <td colSpan="4" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                          No songs in this playlist. Search YouTube to add tracks or paste a YouTube URL above!
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* LYRICS FULL OVERLAY */}
          {showLyrics && currentSong && (
            <div className="lyrics-overlay">
              <div className="lyrics-header-panel">
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <FileText size={20} color="var(--accent)" />
                  <span style={{ fontWeight: 800 }}>Lyrics Drawer</span>
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button 
                    className="lyrics-close-btn"
                    style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                    onClick={() => setIsEditingLyrics(!isEditingLyrics)}
                  >
                    <Edit size={14} /> {isEditingLyrics ? 'View Mode' : 'Edit Mode'}
                  </button>
                  <button className="lyrics-close-btn" onClick={() => setShowLyrics(false)}>
                    <X size={16} />
                  </button>
                </div>
              </div>

              <div className="lyrics-content-container">
                <h1 className="lyrics-song-title">{currentSong.title}</h1>
                <div className="lyrics-song-artist">{currentSong.artist_name}</div>
                
                {isLoadingLyrics ? (
                  <div style={{ fontSize: '20px', color: 'white', textAlign: 'center', margin: '80px 0' }}>
                    Searching lyrics database...
                  </div>
                ) : isEditingLyrics ? (
                  <div className="lyrics-editor">
                    <textarea 
                      className="lyrics-textarea"
                      value={lyricsInput}
                      onChange={(e) => setLyricsInput(e.target.value)}
                    ></textarea>
                    <button className="lyrics-save-btn" onClick={handleSaveLyrics}>
                      Save Lyrics
                    </button>
                  </div>
                ) : (
                  <div className="lyrics-text">{lyrics}</div>
                )}
              </div>
            </div>
          )}

        </main>
      </div>

      {/* Playback Control Bar (Footer) */}
      <footer className="player-bar">
        {/* Track Details */}
        <div className="player-left">
          {currentSong ? (
            <>
              <img 
                src={currentSong.thumbnail_url} 
                className="now-playing-artwork" 
                alt="" 
                onClick={() => {
                  fetchLyrics(currentSong.id);
                  setShowLyrics(true);
                }}
                style={{ cursor: 'pointer' }}
              />
              <div className="now-playing-info">
                <span className="now-playing-title" title={currentSong.title}>{currentSong.title}</span>
                <span className="now-playing-artist">{currentSong.artist_name}</span>
              </div>
            </>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--text-muted)', fontSize: '14px' }}>
              <Disc size={36} style={{ animation: 'spin 4s linear infinite' }} />
              <span>Select a song to play</span>
            </div>
          )}
        </div>

        {/* Playback Controls & Progress */}
        <div className="player-center">
          <div className="player-controls">
            <button className="control-btn" onClick={playPrev} disabled={queue.length === 0}>
              <SkipBack size={20} fill="currentColor" />
            </button>
            <button className="control-btn play-pause" onClick={togglePlay}>
              {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" style={{ marginLeft: '2px' }} />}
            </button>
            <button className="control-btn" onClick={playNext} disabled={queue.length === 0}>
              <SkipForward size={20} fill="currentColor" />
            </button>
          </div>

          <div className="timeline-container">
            <span>{formatTime(currentTime)}</span>
            <div className="timeline-slider-wrapper">
              <input
                type="range"
                min="0"
                max={duration || 100}
                value={currentTime}
                onChange={(e) => seek(parseInt(e.target.value))}
                className="slider-input"
              />
            </div>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Volume & Toggles */}
        <div className="player-right">
          <button 
            className={`control-btn ${showLyrics ? 'active' : ''}`}
            disabled={!currentSong}
            onClick={() => {
              if (currentSong) {
                fetchLyrics(currentSong.id);
                setShowLyrics(!showLyrics);
              }
            }}
          >
            <FileText size={18} />
          </button>
          
          <button 
            className={`control-btn ${loop ? 'active' : ''}`} 
            onClick={() => setLoop(!loop)}
            title="Loop"
          >
            <Radio size={18} style={{ transform: loop ? 'scale(1.2)' : 'none' }} />
          </button>

          <div className="volume-container">
            <button className="control-btn" onClick={toggleMute}>
              {isMuted || volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
            </button>
            <input
              type="range"
              min="0"
              max="100"
              value={isMuted ? 0 : volume}
              onChange={handleVolumeChange}
              className="slider-input"
              style={{ width: '80px' }}
            />
          </div>
        </div>
      </footer>

      {/* DIALOGS */}

      {/* 1. Create Playlist Dialog */}
      {showCreatePlaylistDialog && (
        <div className="dialog-overlay">
          <div className="dialog-content">
            <h3 className="dialog-title">Create Playlist</h3>
            <form onSubmit={handleCreatePlaylist}>
              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label className="form-label">Name</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="My chill vibes"
                  value={playlistName}
                  onChange={(e) => setPlaylistName(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Description (Optional)</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="A playlist with lo-fi beats"
                  value={playlistDesc}
                  onChange={(e) => setPlaylistDesc(e.target.value)}
                />
              </div>
              <div className="dialog-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowCreatePlaylistDialog(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Add Song To Playlist Selector Dialog */}
      {showAddSongDialog && songToAddToPlaylist && (
        <div className="dialog-overlay">
          <div className="dialog-content">
            <h3 className="dialog-title">Add track to playlist</h3>
            <div style={{ fontSize: '14px', marginBottom: '16px', fontWeight: 600 }}>
              {songToAddToPlaylist.title}
            </div>
            
            <div className="playlist-selector-list">
              {playlists.map(p => (
                <button
                  key={p.id}
                  className="playlist-selector-item"
                  onClick={async () => {
                    // We need to first add song to the backend DB, then link it to the playlist
                    // The 'add_song' endpoint on Playlist supports adding a song from search results
                    // by sending title, youtube_id, artist_name, duration, etc.
                    try {
                      const res = await fetch(`${API_BASE}/playlists/${p.id}/add_song/`, {
                        method: 'POST',
                        headers: { 
                          'Content-Type': 'application/json',
                          'Authorization': `Token ${token}`
                        },
                        body: JSON.stringify({
                          youtube_id: songToAddToPlaylist.youtube_id,
                          title: songToAddToPlaylist.title,
                          artist_name: songToAddToPlaylist.artist_name,
                          duration: songToAddToPlaylist.duration,
                          thumbnail_url: songToAddToPlaylist.thumbnail_url
                        })
                      });
                      if (res.ok) {
                        fetchPlaylists();
                        setShowAddSongDialog(false);
                        setSongToAddToPlaylist(null);
                        alert(`Added to "${p.name}"!`);
                      }
                    } catch (err) {}
                  }}
                >
                  {p.name}
                </button>
              ))}
              {playlists.length === 0 && (
                <div style={{ padding: '12px 0', fontSize: '13px', color: 'var(--text-muted)' }}>
                  Please create a playlist first.
                </div>
              )}
            </div>

            <div className="dialog-actions">
              <button 
                type="button" 
                className="btn-secondary" 
                onClick={() => {
                  setShowAddSongDialog(false);
                  setSongToAddToPlaylist(null);
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default App;
