import requests
from django.shortcuts import get_object_or_404
from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from rest_framework import viewsets, status
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.authtoken.models import Token

from .models import Song, Playlist, PlaylistSong, RecentlyPlayed
from .serializers import (
    UserSerializer, SongSerializer, PlaylistSerializer, 
    PlaylistSongSerializer, RecentlyPlayedSerializer
)
from .youtube_helper import extract_video_id, get_video_details, search_youtube_keyless

# --- AUTHENTICATION VIEWS ---

@api_view(['POST'])
@permission_classes([AllowAny])
def signup_view(request):
    serializer = UserSerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.save()
        token, _ = Token.objects.get_or_create(user=user)
        return Response({
            'token': token.key,
            'username': user.username,
            'email': user.email
        }, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['POST'])
@permission_classes([AllowAny])
def login_view(request):
    username = request.data.get('username')
    password = request.data.get('password')
    
    if not username or not password:
        return Response({'error': 'Please provide both username and password'}, status=status.HTTP_400_BAD_REQUEST)
        
    user = authenticate(username=username, password=password)
    if user is not None:
        token, _ = Token.objects.get_or_create(user=user)
        return Response({
            'token': token.key,
            'username': user.username,
            'email': user.email
        }, status=status.HTTP_200_OK)
    return Response({'error': 'Invalid credentials'}, status=status.HTTP_401_UNAUTHORIZED)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout_view(request):
    try:
        request.user.auth_token.delete()
        return Response({'message': 'Logged out successfully'}, status=status.HTTP_200_OK)
    except Exception:
        return Response({'error': 'Something went wrong'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# --- SONG VIEWSET ---

class SongViewSet(viewsets.ModelViewSet):
    queryset = Song.objects.all()
    serializer_class = SongSerializer
    permission_classes = [IsAuthenticated]


# --- PLAYLIST VIEWSET ---

class PlaylistViewSet(viewsets.ModelViewSet):
    serializer_class = PlaylistSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        # Users can view their own playlists
        return Playlist.objects.filter(owner=self.request.user)

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)

    @action(detail=False, methods=['GET'])
    def favorites(self, request):
        favorites = Playlist.objects.filter(owner=request.user, is_favorite=True)
        serializer = self.get_serializer(favorites, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['POST'])
    def toggle_favorite(self, request, pk=None):
        playlist = self.get_object()
        playlist.is_favorite = not playlist.is_favorite
        playlist.save()
        return Response({
            'status': 'success',
            'is_favorite': playlist.is_favorite
        })

    @action(detail=True, methods=['POST'])
    def add_song(self, request, pk=None):
        playlist = self.get_object()
        youtube_url = request.data.get('youtube_url')
        youtube_id = request.data.get('youtube_id')
        
        if not youtube_id and youtube_url:
            youtube_id = extract_video_id(youtube_url)
            
        if not youtube_id:
            return Response({'error': 'A valid YouTube ID or URL is required'}, status=status.HTTP_400_BAD_REQUEST)
            
        # Get or create the song
        song, created = Song.objects.get_or_create(youtube_id=youtube_id)
        if created or not song.title or song.title.startswith("YouTube Video"):
            details = get_video_details(youtube_id)
            song.title = request.data.get('title') or details.get('title') or song.title
            song.artist_name = request.data.get('artist_name') or details.get('artist') or song.artist_name
            song.thumbnail_url = details.get('thumbnail') or song.thumbnail_url
            song.duration = request.data.get('duration') or details.get('duration') or song.duration
            song.save()
            
        # Find next order index
        max_order = PlaylistSong.objects.filter(playlist=playlist).count()
        
        # Check if already in playlist
        playlist_song, created_link = PlaylistSong.objects.get_or_create(
            playlist=playlist,
            song=song,
            defaults={'order': max_order}
        )
        
        if not created_link:
            return Response({'message': 'Song is already in this playlist'}, status=status.HTTP_200_OK)
            
        return Response(PlaylistSerializer(playlist).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['POST'])
    def remove_song(self, request, pk=None):
        playlist = self.get_object()
        song_id = request.data.get('song_id')
        
        if not song_id:
            return Response({'error': 'Song ID is required'}, status=status.HTTP_400_BAD_REQUEST)
            
        playlist_song = PlaylistSong.objects.filter(playlist=playlist, song_id=song_id)
        if playlist_song.exists():
            playlist_song.delete()
            
            # Re-order remaining songs
            remaining = PlaylistSong.objects.filter(playlist=playlist).order_by('order', 'added_at')
            for index, rel in enumerate(remaining):
                rel.order = index
                rel.save()
                
            return Response(PlaylistSerializer(playlist).data, status=status.HTTP_200_OK)
            
        return Response({'error': 'Song not found in playlist'}, status=status.HTTP_404_NOT_FOUND)


# --- RECENTLY PLAYED VIEWS ---

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def recently_played_view(request):
    if request.method == 'GET':
        recents = RecentlyPlayed.objects.filter(user=request.user)[:20]
        serializer = RecentlyPlayedSerializer(recents, many=True)
        return Response(serializer.data)
        
    elif request.method == 'POST':
        song_id = request.data.get('song_id')
        youtube_id = request.data.get('youtube_id')
        
        if not song_id and youtube_id:
            try:
                song = Song.objects.get(youtube_id=youtube_id)
                song_id = song.id
            except Song.DoesNotExist:
                # If song played doesn't exist, create it
                details = get_video_details(youtube_id)
                song = Song.objects.create(
                    youtube_id=youtube_id,
                    title=request.data.get('title', details.get('title')),
                    artist_name=request.data.get('artist_name', details.get('artist')),
                    thumbnail_url=details.get('thumbnail'),
                    duration=request.data.get('duration', details.get('duration'))
                )
                song_id = song.id
                
        if not song_id:
            return Response({'error': 'Song ID or YouTube ID is required'}, status=status.HTTP_400_BAD_REQUEST)
            
        # Create recently played entry
        recent = RecentlyPlayed.objects.create(user=request.user, song_id=song_id)
        
        # Maintain history size limit (e.g. keep last 20)
        user_history = RecentlyPlayed.objects.filter(user=request.user)
        if user_history.count() > 20:
            ids_to_keep = user_history.values_list('pk', flat=True)[:20]
            RecentlyPlayed.objects.filter(user=request.user).exclude(pk__in=list(ids_to_keep)).delete()
            
        return Response(RecentlyPlayedSerializer(recent).data, status=status.HTTP_201_CREATED)


# --- YOUTUBE INTEGRATION ---

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def youtube_search_view(request):
    query = request.query_params.get('q', '')
    if not query:
        return Response({'error': 'Search query is required'}, status=status.HTTP_400_BAD_REQUEST)
        
    results = search_youtube_keyless(query)
    return Response(results)


# --- LYRICS FETCHING ---

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def lyrics_view(request):
    """
    GET: Resolves and fetches lyrics for a song (by song_id, or by artist and title).
    Saves lyrics to the database if resolved successfully.
    POST: Allows manually setting/editing the lyrics of a song.
    """
    if request.method == 'GET':
        song_id = request.query_params.get('song_id')
        artist = request.query_params.get('artist')
        title = request.query_params.get('title')
        
        song = None
        if song_id:
            song = get_object_or_404(Song, id=song_id)
            if song.lyrics:
                return Response({'lyrics': song.lyrics})
            artist = artist or song.artist_name
            title = title or song.title
            
        if not artist or not title:
            return Response({'error': 'Both artist and title are required if song_id is not provided or lacks details.'}, status=status.HTTP_400_BAD_REQUEST)
            
        # Try fetching from lyrics.ovh
        clean_artist = artist.strip()
        clean_title = title.split('(')[0].split('-')[0].strip() # Clean extra info in titles like (Official Video) or - Single
        
        lyrics_url = f"https://api.lyrics.ovh/v1/{requests.utils.quote(clean_artist)}/{requests.utils.quote(clean_title)}"
        lyrics_text = ""
        
        try:
            res = requests.get(lyrics_url, timeout=5)
            if res.status_code == 200:
                lyrics_text = res.json().get('lyrics', '')
        except Exception:
            pass
            
        if not lyrics_text:
            lyrics_text = f"Lyrics not found for '{title}' by '{artist}'.\n\nYou can manually add lyrics using the Admin panel or Edit button."
            
        # Save to song database if found and song is retrieved
        if song and lyrics_text and not lyrics_text.startswith("Lyrics not found"):
            song.lyrics = lyrics_text
            song.save()
            
        return Response({'lyrics': lyrics_text, 'artist': artist, 'title': title})
        
    elif request.method == 'POST':
        song_id = request.data.get('song_id')
        lyrics_text = request.data.get('lyrics')
        
        if not song_id or lyrics_text is None:
            return Response({'error': 'Song ID and lyrics content are required'}, status=status.HTTP_400_BAD_REQUEST)
            
        song = get_object_or_404(Song, id=song_id)
        song.lyrics = lyrics_text
        song.save()
        
        return Response({'message': 'Lyrics updated successfully', 'lyrics': song.lyrics})
