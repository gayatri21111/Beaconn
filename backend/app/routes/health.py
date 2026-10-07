from fastapi import APIRouter

router = APIRouter()


@router.get("/")
async def home():
    return {
        "message": "Rescue Beacon Backend Running"
    }


@router.get("/health")
async def health():
    return {
        "status": "Backend Running"
    }