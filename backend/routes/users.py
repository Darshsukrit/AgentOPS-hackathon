from fastapi import APIRouter

router = APIRouter(prefix="/users", tags=["Users"])

users = []

@router.post("/")
def create_user(name: str, email: str, role: str):
    user = {
        "id": len(users) + 1,
        "name": name,
        "email": email,
        "role": role
    }
    users.append(user)
    return {"success": True, "data": user}

@router.get("/")
def get_users():
    return {"success": True, "data": users}