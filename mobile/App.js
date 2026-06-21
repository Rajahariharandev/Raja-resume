import React, { useState, useEffect, useRef } from 'react';
import { 
  StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView, 
  FlatList, Image, SafeAreaView, StatusBar, ActivityIndicator, Alert, Dimensions
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function App() {
  // Config state (allows modifying backend URL dynamically for emulators/devices)
  const [apiHost, setApiHost] = useState('10.0.2.2:8000'); // default for Android emulator. Use local IP like 192.168.1.X:8000 for physical devices
  const API_BASE = `http://${apiHost}/api`;

  // Auth state
  const [token, setToken] = useState('');
  const [username, setUsername] = useState('');
  const [isLoginView, setIsLoginView] = useState(true);
  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [isAuthLoading, setIsAuthLoading] = useState(false);

  // Navigation state
  const [currentTab, setCurrentTab] = useState('home'); // home, search, library
  const [activePlaylist, setActivePlaylist] = useState(null); // currently viewed playlist
  const [isPlayerOpen, setIsPlayerOpen] = useState(false);

  // Playlists and history state
  const [playlists, setPlaylists] = useState([]);
  const [recentlyPlayed, setRecentlyPlayed] = useState([]);
  const [favoritePlaylists, setFavoritePlaylists] = useState([]);
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [importUrl, setImportUrl] = useState('');
  const [isImporting, setIsImporting] = useState(false);

  // Player state
  const [queue, setQueue] = useState([]);
  const [currentQueueIndex, setCurrentQueueIndex] = useState(-1);
  const [currentSong, setCurrentSong] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(180); // placeholder duration in seconds
  const [volume, setVolume] = useState(80);
  const [loop, setLoop] = useState(false);
  const [shuffle, setShuffle] = useState(false);
  
  // Lyrics state
  const [lyrics, setLyrics] = useState('');
  const [showLyrics, setShowLyrics] = useState(false);
  const [isLoadingLyrics, setIsLoadingLyrics] = useState(false);

  // Fetch Playlists, Favorites, and Recently Played on login/refresh
  useEffect(() => {
    if (token) {
      fetchPlaylists();
      fetchRecentlyPlayed();
      fetchFavoritePlaylists();
    }
  }, [token, apiHost]);

  // Audio Playback Timer Simulation
  // Note: For a production app with audio streaming, you would link the Youtube Iframe player.
  // We include standard playback state timers that match the React web app controls.
  useEffect(() => {
    let interval;
    if (isPlaying) {
      interval = setInterval(() => {
        setCurrentTime((prev) => {
          if (prev >= duration) {
            handleTrackEnded();
            return 0;
          }
          return prev + 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isPlaying, duration, currentQueueIndex, loop]);

  const handleTrackEnded = () => {
    if (loop) {
      setCurrentTime(0);
    } else {
      playNext();
    }
  };

  const playNext = () => {
    if (queue.length === 0) return;
    let nextIndex = currentQueueIndex + 1;
    if (shuffle) {
      nextIndex = Math.floor(Math.random() * queue.length);
    } else if (nextIndex >= queue.length) {
      nextIndex = 0;
    }
    playSongAtIndex(nextIndex);
  };

  const playPrev = () => {
    if (queue.length === 0) return;
    if (currentTime > 5) {
      setCurrentTime(0);
      return;
    }
    let prevIndex = currentQueueIndex - 1;
    if (prevIndex < 0) {
      prevIndex = queue.length - 1;
    }
    playSongAtIndex(prevIndex);
  };

  const playSongAtIndex = (index) => {
    if (index < 0 || index >= queue.length) return;
    const song = queue[index].song || queue[index];
    setCurrentQueueIndex(index);
    setCurrentSong(song);
    setCurrentTime(0);
    setDuration(song.duration || 180);
    setIsPlaying(true);
    logRecentlyPlayed(song);
    fetchLyrics(song.id);
  };

  const playSong = (song, context = []) => {
    if (context && context.length > 0) {
      setQueue(context);
      const idx = context.findIndex(item => (item.song?.youtube_id || item.youtube_id) === song.youtube_id);
      setQueueAndPlay(context, idx >= 0 ? idx : 0);
    } else {
      setQueue([song]);
      setQueueAndPlay([song], 0);
    }
    setIsPlayerOpen(true);
  };

  const setQueueAndPlay = (songsQueue, idx) => {
    setQueue(songsQueue);
    setCurrentQueueIndex(idx);
    const item = songsQueue[idx];
    const songObj = item.song || item;
    setCurrentSong(songObj);
    setCurrentTime(0);
    setDuration(songObj.duration || 180);
    setIsPlaying(true);
    logRecentlyPlayed(songObj);
    fetchLyrics(songObj.id);
  };

  // --- API SERVICE ---

  const handleAuth = async () => {
    setIsAuthLoading(true);
    const endpoint = isLoginView ? '/auth/login/' : '/auth/signup/';
    const body = isLoginView 
      ? { username: usernameInput, password: passwordInput }
      : { username: usernameInput, email: emailInput, password: passwordInput };

    try {
      const res = await fetch(`${API_BASE}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (res.ok) {
        setToken(data.token);
        setUsername(data.username);
        Alert.alert('Success', `Logged in as ${data.username}`);
      } else {
        Alert.alert('Error', data.error || 'Authentication failed');
      }
    } catch (err) {
      Alert.alert('Network Error', `Could not connect to backend API server at ${API_BASE}. Make sure the server is running and accessible.`);
    }
    setIsAuthLoading(false);
  };

  const handleLogout = () => {
    setToken('');
    setUsername('');
    setCurrentSong(null);
    setIsPlaying(false);
    setQueue([]);
  };

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

  const handleSearch = async () => {
    if (!searchQuery) return;
    setIsSearching(true);
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

  const handleImport = async () => {
    if (!importUrl || !activePlaylist) return;
    setIsImporting(true);
    try {
      const res = await fetch(`${API_BASE}/playlists/${activePlaylist.id}/add_song/`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Token ${token}`
        },
        body: JSON.stringify({ youtube_url: importUrl })
      });
      if (res.ok) {
        setImportUrl('');
        // Refresh playlist detail
        const updatedRes = await fetch(`${API_BASE}/playlists/${activePlaylist.id}/`, {
          headers: { 'Authorization': `Token ${token}` }
        });
        if (updatedRes.ok) {
          const playlistData = await updatedRes.json();
          setActivePlaylist(playlistData);
        }
      } else {
        Alert.alert('Import Failed', 'Please verify the YouTube link.');
      }
    } catch (err) {}
    setIsImporting(false);
  };

  const addSearchResultToPlaylist = async (video, playlistId) => {
    try {
      const res = await fetch(`${API_BASE}/playlists/${playlistId}/add_song/`, {
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
        Alert.alert('Added', `"${video.title}" added to playlist!`);
      }
    } catch (err) {}
  };

  const toggleFavoritePlaylist = async (playlistId) => {
    try {
      const res = await fetch(`${API_BASE}/playlists/${playlistId}/toggle_favorite/`, {
        method: 'POST',
        headers: { 'Authorization': `Token ${token}` }
      });
      if (res.ok) {
        fetchPlaylists();
        fetchFavoritePlaylists();
        // Update active playlist detail view favorite state
        setActivePlaylist(prev => prev && prev.id === playlistId ? { ...prev, is_favorite: !prev.is_favorite } : prev);
      }
    } catch (err) {}
  };

  const createPlaylist = () => {
    Alert.prompt(
      'New Playlist',
      'Enter playlist name:',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Create', 
          onPress: async (name) => {
            if (!name) return;
            try {
              const res = await fetch(`${API_BASE}/playlists/`, {
                method: 'POST',
                headers: { 
                  'Content-Type': 'application/json',
                  'Authorization': `Token ${token}`
                },
                body: JSON.stringify({ name })
              });
              if (res.ok) {
                fetchPlaylists();
              }
            } catch (err) {}
          } 
        }
      ],
      'plain-text'
    );
  };

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
      }
    } catch (err) {
      setLyrics('Could not retrieve lyrics.');
    }
    setIsLoadingLyrics(false);
  };

  // Helper formatting mm:ss
  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Render Login view if not logged in
  if (!token) {
    return (
      <SafeAreaView style={styles.authContainer}>
        <StatusBar barStyle="light-content" />
        <ScrollView contentContainerStyle={styles.authScroll}>
          <View style={styles.logoContainer}>
            <Ionicons name="radio" size={60} color="#1db954" />
            <Text style={styles.logoText}>SoundGrid</Text>
            <Text style={styles.tagline}>Spotify-like player for YouTube</Text>
          </View>

          <View style={styles.authCard}>
            <Text style={styles.authTitle}>{isLoginView ? 'Welcome Back' : 'Create Account'}</Text>
            
            <Text style={styles.inputLabel}>API Server Host IP</Text>
            <TextInput
              style={styles.authInput}
              placeholder="e.g. 192.168.1.50:8000"
              placeholderTextColor="#555"
              value={apiHost}
              onChangeText={setApiHost}
              autoCapitalize="none"
            />
            
            <Text style={styles.inputLabel}>Username</Text>
            <TextInput
              style={styles.authInput}
              placeholder="soundmaster"
              placeholderTextColor="#555"
              value={usernameInput}
              onChangeText={setUsernameInput}
              autoCapitalize="none"
            />

            {!isLoginView && (
              <>
                <Text style={styles.inputLabel}>Email Address</Text>
                <TextInput
                  style={styles.authInput}
                  placeholder="name@example.com"
                  placeholderTextColor="#555"
                  value={emailInput}
                  onChangeText={setEmailInput}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </>
            )}

            <Text style={styles.inputLabel}>Password</Text>
            <TextInput
              style={styles.authInput}
              placeholder="••••••••"
              placeholderTextColor="#555"
              value={passwordInput}
              onChangeText={setPasswordInput}
              secureTextEntry
              autoCapitalize="none"
            />

            <TouchableOpacity style={styles.authButton} onPress={handleAuth} disabled={isAuthLoading}>
              {isAuthLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.authButtonText}>{isLoginView ? 'Log In' : 'Sign Up'}</Text>
              )}
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.switchButton} onPress={() => setIsLoginView(!isLoginView)}>
            <Text style={styles.switchButtonText}>
              {isLoginView ? "Don't have an account? Sign up" : 'Already have an account? Log in'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* HEADER BAR */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.usernameText}>Hi, {username}</Text>
        </View>
        <TouchableOpacity onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={24} color="#ef4444" />
        </TouchableOpacity>
      </View>

      {/* VIEW VIEWS */}
      
      {/* 1. Home Tab */}
      {currentTab === 'home' && !activePlaylist && (
        <ScrollView style={styles.scrollContent}>
          <Text style={styles.sectionHeading}>Recently Played</Text>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={recentlyPlayed}
            keyExtractor={(item) => item.id.toString()}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.itemCard} onPress={() => playSong(item.song)}>
                <Image source={{ uri: item.song.thumbnail_url }} style={styles.itemCardArtwork} />
                <Text numberOfLines={1} style={styles.itemCardTitle}>{item.song.title}</Text>
                <Text numberOfLines={1} style={styles.itemCardSub}>{item.song.artist_name}</Text>
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Ionicons name="play-outline" size={32} color="#555" />
                <Text style={styles.emptyStateText}>No recently played songs.</Text>
              </View>
            }
          />

          <Text style={styles.sectionHeading}>Favorite Playlists</Text>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={favoritePlaylists}
            keyExtractor={(item) => item.id.toString()}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.itemCard} onPress={() => setActivePlaylist(item)}>
                <View style={[styles.itemCardArtwork, styles.playlistArtworkBack]}>
                  <Ionicons name="musical-notes" size={40} color="white" />
                </View>
                <Text numberOfLines={1} style={styles.itemCardTitle}>{item.name}</Text>
                <Text numberOfLines={1} style={styles.itemCardSub}>{item.songs?.length || 0} songs</Text>
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Ionicons name="heart-outline" size={32} color="#555" />
                <Text style={styles.emptyStateText}>No favorite playlists.</Text>
              </View>
            }
          />
        </ScrollView>
      )}

      {/* 2. Search Tab */}
      {currentTab === 'search' && !activePlaylist && (
        <View style={styles.tabContent}>
          <View style={styles.searchBarContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder="Search YouTube tracks..."
              placeholderTextColor="#888"
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={handleSearch}
            />
            <TouchableOpacity style={styles.searchBtn} onPress={handleSearch}>
              <Ionicons name="search" size={20} color="white" />
            </TouchableOpacity>
          </View>

          {isSearching ? (
            <ActivityIndicator size="large" color="#1db954" style={{ marginTop: 40 }} />
          ) : (
            <FlatList
              data={searchResults}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <View style={styles.trackRow}>
                  <Image source={{ uri: item.thumbnail }} style={styles.trackThumbnail} />
                  <View style={styles.trackInfo}>
                    <TouchableOpacity onPress={() => playSong({
                      youtube_id: item.id,
                      title: item.title,
                      artist_name: item.artist,
                      thumbnail_url: item.thumbnail,
                      duration: item.duration
                    })}>
                      <Text numberOfLines={1} style={styles.trackTitle}>{item.title}</Text>
                    </TouchableOpacity>
                    <Text style={styles.trackArtist}>{item.artist} • {item.duration_text}</Text>
                  </View>
                  <TouchableOpacity 
                    style={styles.addBtn}
                    onPress={() => {
                      if (playlists.length > 0) {
                        // Quick prompt to choose playlist
                        Alert.alert(
                          'Add Song',
                          'Choose playlist:',
                          playlists.map(p => ({
                            text: p.name,
                            onPress: () => addSearchResultToPlaylist(item, p.id)
                          }))
                        );
                      } else {
                        Alert.alert('No Playlists', 'Please create a playlist in Library tab first.');
                      }
                    }}
                  >
                    <Ionicons name="add-circle-outline" size={24} color="#1db954" />
                  </TouchableOpacity>
                </View>
              )}
              ListEmptyComponent={
                <View style={styles.emptyStateCentered}>
                  <Ionicons name="search" size={60} color="#333" />
                  <Text style={styles.emptyStateText}>Search YouTube for your favorite songs</Text>
                </View>
              }
            />
          )}
        </View>
      )}

      {/* 3. Library Tab */}
      {currentTab === 'library' && !activePlaylist && (
        <View style={styles.tabContent}>
          <TouchableOpacity style={styles.createBtn} onPress={createPlaylist}>
            <Ionicons name="plus-circle" size={20} color="white" />
            <Text style={styles.createBtnText}>Create Playlist</Text>
          </TouchableOpacity>

          <FlatList
            data={playlists}
            keyExtractor={(item) => item.id.toString()}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.playlistRow} onPress={() => setActivePlaylist(item)}>
                <View style={styles.playlistIconBack}>
                  <Ionicons name="list" size={24} color="white" />
                </View>
                <View style={styles.playlistInfo}>
                  <Text style={styles.playlistTitle}>{item.name}</Text>
                  <Text style={styles.playlistSub}>{item.songs?.length || 0} songs</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#555" />
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <View style={styles.emptyStateCentered}>
                <Ionicons name="folder-open-outline" size={60} color="#333" />
                <Text style={styles.emptyStateText}>No playlists created yet.</Text>
              </View>
            }
          />
        </View>
      )}

      {/* 4. Playlist Detail View */}
      {activePlaylist && (
        <View style={styles.tabContent}>
          <View style={styles.playlistHeader}>
            <TouchableOpacity onPress={() => { setActivePlaylist(null); fetchPlaylists(); }}>
              <Ionicons name="arrow-back" size={24} color="white" />
            </TouchableOpacity>
            <Text style={styles.playlistHeaderTitle} numberOfLines={1}>{activePlaylist.name}</Text>
            <TouchableOpacity onPress={() => toggleFavoritePlaylist(activePlaylist.id)}>
              <Ionicons 
                name={activePlaylist.is_favorite ? "heart" : "heart-outline"} 
                size={24} 
                color={activePlaylist.is_favorite ? "#1db954" : "white"} 
              />
            </TouchableOpacity>
          </View>

          {/* Import link form inside playlist */}
          <View style={styles.importForm}>
            <TextInput
              style={styles.importInput}
              placeholder="Paste YouTube Video URL to import"
              placeholderTextColor="#666"
              value={importUrl}
              onChangeText={setImportUrl}
            />
            <TouchableOpacity style={styles.importBtn} onPress={handleImport} disabled={isImporting}>
              {isImporting ? <ActivityIndicator size="small" color="#000" /> : <Text style={styles.importBtnText}>Import</Text>}
            </TouchableOpacity>
          </View>

          <FlatList
            data={activePlaylist.songs}
            keyExtractor={(item) => item.id.toString()}
            renderItem={({ item, index }) => (
              <TouchableOpacity 
                style={styles.trackRow}
                onPress={() => playSong(item.song, activePlaylist.songs)}
              >
                <Text style={styles.trackIndex}>{index + 1}</Text>
                <Image source={{ uri: item.song.thumbnail_url }} style={styles.trackThumbnail} />
                <View style={styles.trackInfo}>
                  <Text numberOfLines={1} style={styles.trackTitle}>{item.song.title}</Text>
                  <Text style={styles.trackArtist}>{item.song.artist_name}</Text>
                </View>
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <View style={styles.emptyStateCentered}>
                <Ionicons name="musical-note" size={60} color="#333" />
                <Text style={styles.emptyStateText}>No songs in this playlist. Paste a YouTube link above or search YouTube to add.</Text>
              </View>
            }
          />
        </View>
      )}

      {/* MINI PLAYER BAR (Sticky bottom above Tab Bar) */}
      {currentSong && !isPlayerOpen && (
        <TouchableOpacity style={styles.miniPlayer} onPress={() => setIsPlayerOpen(true)}>
          <Image source={{ uri: currentSong.thumbnail_url }} style={styles.miniPlayerArtwork} />
          <View style={styles.miniPlayerInfo}>
            <Text numberOfLines={1} style={styles.miniPlayerTitle}>{currentSong.title}</Text>
            <Text numberOfLines={1} style={styles.miniPlayerArtist}>{currentSong.artist_name}</Text>
          </View>
          <TouchableOpacity style={styles.miniPlayerBtn} onPress={togglePlay}>
            <Ionicons name={isPlaying ? "pause" : "play"} size={22} color="white" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.miniPlayerBtn} onPress={playNext}>
            <Ionicons name="skip-forward" size={22} color="white" />
          </TouchableOpacity>
        </TouchableOpacity>
      )}

      {/* FULL PLAYER SCREEN (Modal style) */}
      {isPlayerOpen && currentSong && (
        <View style={styles.playerFullScreen}>
          <SafeAreaView style={{ flex: 1 }}>
            
            {/* Header controls */}
            <View style={styles.playerHeader}>
              <TouchableOpacity onPress={() => setIsPlayerOpen(false)}>
                <Ionicons name="chevron-down" size={28} color="white" />
              </TouchableOpacity>
              <Text style={styles.playingFromText}>Playing track</Text>
              <TouchableOpacity onPress={() => { setShowLyrics(!showLyrics); }}>
                <Ionicons name="document-text-outline" size={24} color={showLyrics ? "#1db954" : "white"} />
              </TouchableOpacity>
            </View>

            {showLyrics ? (
              // Lyrics Overlay Panel
              <ScrollView style={styles.lyricsScroll}>
                <Text style={styles.lyricsSongTitle}>{currentSong.title}</Text>
                <Text style={styles.lyricsSongArtist}>{currentSong.artist_name}</Text>
                <View style={styles.lyricsDivider} />
                
                {isLoadingLyrics ? (
                  <ActivityIndicator size="large" color="#1db954" style={{ marginTop: 40 }} />
                ) : (
                  <Text style={styles.lyricsText}>{lyrics || "No lyrics available. Save them using the Web Client editor."}</Text>
                )}
              </ScrollView>
            ) : (
              // Music Player Artwork Panel
              <View style={styles.playerBody}>
                <Image source={{ uri: currentSong.thumbnail_url }} style={styles.playerArtwork} />
                <View style={styles.playerTrackMeta}>
                  <Text numberOfLines={2} style={styles.playerTrackTitle}>{currentSong.title}</Text>
                  <Text style={styles.playerTrackArtist}>{currentSong.artist_name}</Text>
                </View>
              </View>
            )}

            {/* Time / Progress indicators */}
            <View style={styles.progressContainer}>
              {/* Progress Bar background and progress fill */}
              <View style={styles.progressBarBg}>
                <View style={[styles.progressBarFill, { width: `${(currentTime / duration) * 100}%` }]} />
              </View>
              <View style={styles.timeLabelContainer}>
                <Text style={styles.timeLabel}>{formatTime(currentTime)}</Text>
                <Text style={styles.timeLabel}>{formatTime(duration)}</Text>
              </View>
            </View>

            {/* Playback Button Panel */}
            <View style={styles.playerControlsContainer}>
              <TouchableOpacity onPress={() => setShuffle(!shuffle)}>
                <Ionicons name="shuffle" size={22} color={shuffle ? "#1db954" : "#888"} />
              </TouchableOpacity>
              <TouchableOpacity onPress={playPrev}>
                <Ionicons name="play-skip-back" size={28} color="white" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.playerPlayBtn} onPress={() => setIsPlaying(!isPlaying)}>
                <Ionicons name={isPlaying ? "pause" : "play"} size={32} color="black" style={{ marginLeft: isPlaying ? 0 : 4 }} />
              </TouchableOpacity>
              <TouchableOpacity onPress={playNext}>
                <Ionicons name="play-skip-forward" size={28} color="white" />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setLoop(!loop)}>
                <Ionicons name="repeat" size={22} color={loop ? "#1db954" : "#888"} />
              </TouchableOpacity>
            </View>

            {/* Volume control */}
            <View style={styles.volumeContainer}>
              <Ionicons name="volume-mute" size={16} color="#888" />
              <View style={styles.volumeSliderBg}>
                <View style={[styles.volumeSliderFill, { width: `${volume}%` }]} />
              </View>
              <Ionicons name="volume-high" size={16} color="#888" />
            </View>

          </SafeAreaView>
        </View>
      )}

      {/* BOTTOM TAB NAV BAR */}
      {!isPlayerOpen && (
        <View style={styles.tabBar}>
          <TouchableOpacity 
            style={styles.tabItem} 
            onPress={() => { setCurrentTab('home'); setActivePlaylist(null); }}
          >
            <Ionicons name="home" size={22} color={currentTab === 'home' ? '#1db954' : '#888'} />
            <Text style={[styles.tabLabel, { color: currentTab === 'home' ? '#1db954' : '#888' }]}>Home</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.tabItem} 
            onPress={() => { setCurrentTab('search'); setActivePlaylist(null); }}
          >
            <Ionicons name="search" size={22} color={currentTab === 'search' ? '#1db954' : '#888'} />
            <Text style={[styles.tabLabel, { color: currentTab === 'search' ? '#1db954' : '#888' }]}>Search</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.tabItem} 
            onPress={() => { setCurrentTab('library'); setActivePlaylist(null); }}
          >
            <Ionicons name="library" size={22} color={currentTab === 'library' ? '#1db954' : '#888'} />
            <Text style={[styles.tabLabel, { color: currentTab === 'library' ? '#1db954' : '#888' }]}>Library</Text>
          </TouchableOpacity>
        </View>
      )}

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#09090b',
  },
  authContainer: {
    flex: 1,
    backgroundColor: '#09090b',
    justifyContent: 'center',
  },
  authScroll: {
    padding: 30,
    justifyContent: 'center',
    flexGrow: 1,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoText: {
    color: '#1db954',
    fontSize: 32,
    fontWeight: '800',
    marginTop: 8,
  },
  tagline: {
    color: '#888',
    fontSize: 14,
    marginTop: 4,
  },
  authCard: {
    backgroundColor: '#18181b',
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: '#27272a',
  },
  authTitle: {
    color: 'white',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 20,
    textAlign: 'center',
  },
  inputLabel: {
    color: '#a1a1aa',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
    marginTop: 12,
  },
  authInput: {
    backgroundColor: '#09090b',
    borderColor: '#27272a',
    borderWidth: 1,
    borderRadius: 8,
    color: 'white',
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
  },
  authButton: {
    backgroundColor: '#1db954',
    borderRadius: 24,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 24,
  },
  authButtonText: {
    color: 'white',
    fontWeight: '700',
    fontSize: 16,
  },
  switchButton: {
    marginTop: 24,
    alignItems: 'center',
  },
  switchButtonText: {
    color: '#1db954',
    fontSize: 14,
    fontWeight: '600',
  },
  header: {
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'between',
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#27272a',
  },
  headerLeft: {
    flex: 1,
  },
  usernameText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '700',
  },
  scrollContent: {
    flex: 1,
    paddingHorizontal: 24,
  },
  tabContent: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  sectionHeading: {
    color: 'white',
    fontSize: 20,
    fontWeight: '700',
    marginTop: 24,
    marginBottom: 16,
  },
  itemCard: {
    width: 140,
    marginRight: 16,
    backgroundColor: '#18181b',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#27272a',
  },
  itemCardArtwork: {
    width: '100%',
    height: 116,
    borderRadius: 8,
    backgroundColor: '#27272a',
  },
  playlistArtworkBack: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2e7d32',
  },
  itemCardTitle: {
    color: 'white',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 8,
  },
  itemCardSub: {
    color: '#a1a1aa',
    fontSize: 11,
    marginTop: 2,
  },
  emptyState: {
    width: 250,
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
    borderColor: '#27272a',
    borderWidth: 1,
    borderRadius: 12,
    borderStyle: 'dashed',
  },
  emptyStateText: {
    color: '#888',
    fontSize: 12,
    marginTop: 8,
  },
  emptyStateCentered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 100,
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#18181b',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#27272a',
    paddingHorizontal: 12,
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    color: 'white',
    height: 44,
    fontSize: 14,
  },
  searchBtn: {
    padding: 8,
  },
  trackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#18181b',
  },
  trackIndex: {
    color: '#555',
    width: 24,
    textAlign: 'center',
    marginRight: 8,
    fontSize: 13,
  },
  trackThumbnail: {
    width: 48,
    height: 48,
    borderRadius: 6,
    backgroundColor: '#18181b',
  },
  trackInfo: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
  trackTitle: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  trackArtist: {
    color: '#888',
    fontSize: 12,
    marginTop: 2,
  },
  addBtn: {
    padding: 6,
  },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1db954',
    alignSelf: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 20,
  },
  createBtnText: {
    color: 'white',
    fontWeight: '700',
    fontSize: 14,
    marginLeft: 6,
  },
  playlistRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#18181b',
  },
  playlistIconBack: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: '#2e7d32',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playlistInfo: {
    flex: 1,
    marginLeft: 16,
  },
  playlistTitle: {
    color: 'white',
    fontSize: 15,
    fontWeight: '600',
  },
  playlistSub: {
    color: '#888',
    fontSize: 12,
    marginTop: 2,
  },
  playlistHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#27272a',
    marginBottom: 16,
  },
  playlistHeaderTitle: {
    flex: 1,
    color: 'white',
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginHorizontal: 12,
  },
  importForm: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  importInput: {
    flex: 1,
    backgroundColor: '#18181b',
    borderColor: '#27272a',
    borderWidth: 1,
    borderRadius: 8,
    color: 'white',
    paddingHorizontal: 12,
    fontSize: 13,
    height: 38,
  },
  importBtn: {
    backgroundColor: '#1db954',
    borderRadius: 8,
    justifyContent: 'center',
    paddingHorizontal: 16,
    marginLeft: 10,
  },
  importBtnText: {
    color: 'black',
    fontWeight: '700',
    fontSize: 13,
  },
  miniPlayer: {
    position: 'absolute',
    bottom: 56, // above tabbar
    left: 10,
    right: 10,
    height: 58,
    backgroundColor: '#18181b',
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#27272a',
  },
  miniPlayerArtwork: {
    width: 42,
    height: 42,
    borderRadius: 4,
  },
  miniPlayerInfo: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
  miniPlayerTitle: {
    color: 'white',
    fontSize: 13,
    fontWeight: '600',
  },
  miniPlayerArtist: {
    color: '#888',
    fontSize: 11,
  },
  miniPlayerBtn: {
    padding: 8,
    marginLeft: 4,
  },
  tabBar: {
    height: 56,
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#27272a',
    backgroundColor: '#000',
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabLabel: {
    fontSize: 10,
    marginTop: 4,
  },
  playerFullScreen: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#09090b',
    paddingHorizontal: 24,
  },
  playerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: 54,
  },
  playingFromText: {
    color: '#888',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  playerBody: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  playerArtwork: {
    width: SCREEN_WIDTH - 80,
    height: SCREEN_WIDTH - 80,
    borderRadius: 16,
    backgroundColor: '#18181b',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 15,
  },
  playerTrackMeta: {
    alignSelf: 'flex-start',
    marginTop: 30,
    width: '100%',
  },
  playerTrackTitle: {
    color: 'white',
    fontSize: 22,
    fontWeight: '800',
  },
  playerTrackArtist: {
    color: '#888',
    fontSize: 16,
    marginTop: 6,
  },
  progressContainer: {
    marginTop: 20,
  },
  progressBarBg: {
    height: 4,
    backgroundColor: '#333',
    borderRadius: 2,
    width: '100%',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#1db954',
    borderRadius: 2,
  },
  timeLabelContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  timeLabel: {
    color: '#888',
    fontSize: 12,
  },
  playerControlsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginVertical: 24,
  },
  playerPlayBtn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
  },
  volumeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginTop: 10,
    marginBottom: 20,
  },
  volumeSliderBg: {
    flex: 1,
    height: 3,
    backgroundColor: '#333',
    borderRadius: 1.5,
    marginHorizontal: 12,
  },
  volumeSliderFill: {
    height: '100%',
    backgroundColor: '#888',
    borderRadius: 1.5,
  },
  lyricsScroll: {
    flex: 1,
    marginTop: 20,
    paddingHorizontal: 10,
  },
  lyricsSongTitle: {
    color: 'white',
    fontSize: 20,
    fontWeight: '700',
  },
  lyricsSongArtist: {
    color: '#888',
    fontSize: 14,
    marginTop: 4,
  },
  lyricsDivider: {
    height: 1,
    backgroundColor: '#27272a',
    marginVertical: 16,
  },
  lyricsText: {
    color: '#a1a1aa',
    fontSize: 20,
    fontWeight: '700',
    line-height: 32,
    paddingBottom: 40,
  }
});
