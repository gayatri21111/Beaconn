
from app.firebase.firebase import root_ref
from fastapi import FastAPI
import socketio

from app.socket_manager import sio
from app.sockets import events  # IMPORTANT: registers events

app = FastAPI()

@app.get("/")
def home():
    return {"message": "Rescue Beacon Running"}

socket_app = socketio.ASGIApp(
    socketio_server=sio,
    other_asgi_app=app
)