from django.contrib import admin
from .models import Song, Playlist, PlaylistSong, RecentlyPlayed

class PlaylistSongInline(admin.TabularInline):
    model = PlaylistSong
    extra = 1

@admin.register(Song)
class SongAdmin(admin.ModelAdmin):
    list_display = ('title', 'artist_name', 'youtube_id', 'added_at')
    search_fields = ('title', 'artist_name', 'youtube_id')
    list_filter = ('added_at',)

@admin.register(Playlist)
class PlaylistAdmin(admin.ModelAdmin):
    list_display = ('name', 'owner', 'is_favorite', 'created_at')
    search_fields = ('name', 'description')
    list_filter = ('is_favorite', 'created_at')
    inlines = [PlaylistSongInline]

@admin.register(RecentlyPlayed)
class RecentlyPlayedAdmin(admin.ModelAdmin):
    list_display = ('user', 'song', 'played_at')
    list_filter = ('played_at',)
    search_fields = ('user__username', 'song__title')
