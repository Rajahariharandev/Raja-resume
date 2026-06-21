import os
import subprocess
import time
import webbrowser
import sys
import atexit

backend_process = None
frontend_process = None

def cleanup():
    """Terminate the backend and frontend processes on exit."""
    print("\n[SoundGrid Launcher] Shutting down servers...")
    if backend_process:
        try:
            backend_process.terminate()
            backend_process.wait(timeout=2)
        except Exception:
            pass
    if frontend_process:
        try:
            frontend_process.terminate()
            frontend_process.wait(timeout=2)
        except Exception:
            pass
    print("[SoundGrid Launcher] Clean shutdown complete.")

# Register cleanup handler
atexit.register(cleanup)

def start_servers():
    global backend_process, frontend_process
    print("=========================================")
    print("      Starting SoundGrid Music Player    ")
    print("=========================================")

    # Get absolute paths (handling PyInstaller executable dir vs script dir)
    if getattr(sys, 'frozen', False):
        root_dir = os.path.dirname(sys.executable)
    else:
        root_dir = os.path.dirname(os.path.abspath(__file__))
        
    backend_dir = os.path.join(root_dir, 'backend')
    frontend_dir = os.path.join(root_dir, 'frontend')

    # 1. Start Django Backend
    print("\n[1/3] Starting Django API server...")
    backend_python = os.path.join(backend_dir, 'venv', 'Scripts', 'python.exe')
    
    if not os.path.exists(backend_python):
        print(f"Error: Virtual environment python not found at {backend_python}")
        print("Please check that backend setup is complete.")
        sys.exit(1)

    try:
        backend_process = subprocess.Popen(
            [backend_python, 'manage.py', 'runserver'],
            cwd=backend_dir,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            creationflags=subprocess.CREATE_NO_WINDOW if os.name == 'nt' else 0
        )
    except Exception as e:
        print(f"Failed to start backend: {e}")
        sys.exit(1)

    # 2. Start React Frontend
    print("[2/3] Starting React frontend server...")
    try:
        frontend_process = subprocess.Popen(
            ['npm.cmd' if os.name == 'nt' else 'npm', 'run', 'dev'],
            cwd=frontend_dir,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            creationflags=subprocess.CREATE_NO_WINDOW if os.name == 'nt' else 0
        )
    except Exception as e:
        print(f"Failed to start frontend: {e}")
        cleanup()
        sys.exit(1)

    # 3. Wait for servers initialization
    print("[3/3] Initializing servers (waiting 4 seconds)...")
    time.sleep(4)

    # 4. Open in browser
    print("\nOpening web browser to SoundGrid player...")
    webbrowser.open('http://localhost:5173')

    print("\nSoundGrid is running successfully!")
    print("-----------------------------------------")
    print("-> Keep this terminal open while using the app.")
    print("-> Press Ctrl+C in this terminal or close it to shut down.")
    print("-----------------------------------------")
    
    try:
        # Keep launcher running to keep child processes alive
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        # cleanup is automatically called via atexit
        pass

if __name__ == '__main__':
    start_servers()
