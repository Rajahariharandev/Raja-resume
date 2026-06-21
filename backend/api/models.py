from django.db import models
from django.contrib.auth.models import User

class Song(models.Model):
    title = models.CharField(max_length=255)
    youtube_id = models.CharField(max_length=50, unique=True)
    duration = models.IntegerField(default=0)  # duration in seconds
    thumbnail_url = models.URLField(max_length=500, blank=True, null=True)
    artist_name = models.CharField(max_length=255, blank=True, null=True)
    lyrics = models.TextField(blank=True, null=True)
    added_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.title} - {self.artist_name or 'Unknown Artist'}"

class Playlist(models.Model):
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name='owned_playlists')
    is_favorite = models.BooleanField(default=False)
    songs = models.ManyToManyField(Song, through='PlaylistSong', related_name='playlists')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.name} (by {self.owner.username})"

class PlaylistSong(models.Model):
    playlist = models.ForeignKey(Playlist, on_delete=models.CASCADE)
    song = models.ForeignKey(Song, on_delete=models.CASCADE)
    order = models.PositiveIntegerField(default=0)
    added_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['order', 'added_at']
        unique_together = ('playlist', 'song')

    def __str__(self):
        return f"{self.playlist.name} - {self.song.title} (Order: {self.order})"

class RecentlyPlayed(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='recently_played')
    song = models.ForeignKey(Song, on_delete=models.CASCADE)
    played_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-played_at']

    def __str__(self):
        return f"{self.user.username} played {self.song.title} at {self.played_at}"
