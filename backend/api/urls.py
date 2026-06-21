from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    signup_view, login_view, logout_view,
    SongViewSet, PlaylistViewSet,
    recently_played_view, youtube_search_view, lyrics_view
)

router = DefaultRouter()
router.register(r'songs', SongViewSet, basename='song')
router.register(r'playlists', PlaylistViewSet, basename='playlist')

urlpatterns = [
    path('auth/signup/', signup_view, name='api_signup'),
    path('auth/login/', login_view, name='api_login'),
    path('auth/logout/', logout_view, name='api_logout'),
    path('recently-played/', recently_played_view, name='api_recently_played'),
    path('youtube/search/', youtube_search_view, name='api_youtube_search'),
    path('lyrics/', lyrics_view, name='api_lyrics'),
    path('', include(router.urls)),
]
