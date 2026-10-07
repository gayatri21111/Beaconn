from dataclasses import dataclass


@dataclass
class Victim:
    victimId: str
    latitude: float
    longitude: float
    status: str
    timestamp: int