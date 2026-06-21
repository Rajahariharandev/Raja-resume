import json
import re
import requests

def extract_video_id(url):
    """
    Extracts the 11-character video ID from various YouTube URL formats.
    e.g. watch?v=ID, youtu.be/ID, embed/ID, shorts/ID, or plain ID.
    """
    patterns = [
        r'(?:v=|\/v\/|embed\/|youtu\.be\/|\/shorts\/)([a-zA-Z0-9_-]{11})',
        r'^[a-zA-Z0-9_-]{11}$'
    ]
    for pattern in patterns:
        match = re.search(pattern, url)
        if match:
            return match.group(1)
    return None

def parse_duration(duration_str):
    """Parses duration string like MM:SS or HH:MM:SS into total seconds."""
    parts = duration_str.split(':')
    try:
        if len(parts) == 2:
            return int(parts[0]) * 60 + int(parts[1])
        elif len(parts) == 3:
            return int(parts[0]) * 3600 + int(parts[1]) * 60 + int(parts[2])
    except ValueError:
        pass
    return 0

def get_video_details(video_id):
    """Fetches video details (title, channel/artist, thumbnail) using oEmbed."""
    oembed_url = f"https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v={video_id}&format=json"
    try:
        response = requests.get(oembed_url, timeout=5)
        if response.status_code == 200:
            data = response.json()
            return {
                'id': video_id,
                'title': data.get('title', ''),
                'artist': data.get('author_name', ''),
                'thumbnail': data.get('thumbnail_url', f"https://img.youtube.com/vi/{video_id}/hqdefault.jpg"),
                'duration': 0
            }
    except Exception:
        pass
    return {
        'id': video_id,
        'title': f"YouTube Video {video_id}",
        'artist': 'YouTube',
        'thumbnail': f"https://img.youtube.com/vi/{video_id}/hqdefault.jpg",
        'duration': 0
    }

def search_youtube_keyless(query):
    """
    Performs a keyless search on YouTube by scraping the results page
    and parsing the embedded ytInitialData JSON structure.
    """
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9'
    }
    url = f"https://www.youtube.com/results?search_query={requests.utils.quote(query)}"
    try:
        response = requests.get(url, headers=headers, timeout=10)
        html = response.text
        
        # Look for ytInitialData JSON object
        match = re.search(r'ytInitialData\s*=\s*({.+?});', html)
        if not match:
            match = re.search(r'var ytInitialData\s*=\s*({.+?});', html)
            
        if match:
            data = json.loads(match.group(1))
            videos = []
            
            # Traverse YouTube's complex search results JSON
            try:
                contents = data['contents']['twoColumnSearchResultsRenderer']['primaryContents']['sectionListRenderer']['contents']
                video_items = []
                for content in contents:
                    if 'itemSectionRenderer' in content:
                        video_items.extend(content['itemSectionRenderer']['contents'])
                        
                for item in video_items:
                    if 'videoRenderer' in item:
                        vid = item['videoRenderer']
                        video_id = vid.get('videoId')
                        if not video_id:
                            continue
                            
                        # Extract title
                        title = ""
                        title_runs = vid.get('title', {}).get('runs', [])
                        if title_runs:
                            title = title_runs[0].get('text', '')
                            
                        # Extract channel/artist
                        channel = ""
                        owner_runs = vid.get('longBylineText', {}).get('runs', [])
                        if not owner_runs:
                            owner_runs = vid.get('ownerText', {}).get('runs', [])
                        if owner_runs:
                            channel = owner_runs[0].get('text', '')
                            
                        # Extract thumbnails
                        thumbnails = vid.get('thumbnail', {}).get('thumbnails', [])
                        thumbnail_url = thumbnails[-1].get('url') if thumbnails else f"https://img.youtube.com/vi/{video_id}/hqdefault.jpg"
                        
                        # Extract duration
                        duration_text = vid.get('lengthText', {}).get('simpleText', '0:00')
                        duration = parse_duration(duration_text)
                        
                        videos.append({
                            'id': video_id,
                            'title': title,
                            'artist': channel,
                            'thumbnail': thumbnail_url,
                            'duration': duration,
                            'duration_text': duration_text,
                            'url': f"https://www.youtube.com/watch?v={video_id}"
                        })
                        
                        if len(videos) >= 15:
                            break
            except Exception as e:
                # Silent catch if JSON parsing structure changes slightly
                pass
                
            return videos
    except Exception as e:
        print("Error scraping YouTube:", e)
        
    return []
