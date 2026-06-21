from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Song, Playlist, PlaylistSong, RecentlyPlayed

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'password')
        extra_kwargs = {'password': {'write_only': True}}

    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data.get('email', ''),
            password=validated_data['password']
        )
        return user

class SongSerializer(serializers.ModelSerializer):
    class Meta:
        model = Song
        fields = '__all__'

class PlaylistSongSerializer(serializers.ModelSerializer):
    song = SongSerializer(read_only=True)
    song_id = serializers.PrimaryKeyRelatedField(
        queryset=Song.objects.all(), source='song', write_only=True
    )

    class Meta:
        model = PlaylistSong
        fields = ('id', 'song', 'song_id', 'order', 'added_at')

class PlaylistSerializer(serializers.ModelSerializer):
    owner = serializers.ReadOnlyField(source='owner.username')
    songs = serializers.SerializerMethodField()

    class Meta:
        model = Playlist
        fields = ('id', 'name', 'description', 'owner', 'is_favorite', 'songs', 'created_at', 'updated_at')

    def get_songs(self, obj):
        # Order songs by the PlaylistSong ordering fields
        playlist_songs = PlaylistSong.objects.filter(playlist=obj).order_by('order', 'added_at')
        return PlaylistSongSerializer(playlist_songs, many=True).data

class RecentlyPlayedSerializer(serializers.ModelSerializer):
    song = SongSerializer(read_only=True)
    song_id = serializers.PrimaryKeyRelatedField(
        queryset=Song.objects.all(), source='song', write_only=True
    )
    user = serializers.ReadOnlyField(source='user.username')

    class Meta:
        model = RecentlyPlayed
        fields = ('id', 'user', 'song', 'song_id', 'played_at')
