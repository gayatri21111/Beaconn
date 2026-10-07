from app.firebase.firebase import root_ref

root_ref.child("test").set({
    "message": "Firebase Connected Successfully!"
})

print("Firebase Connected!")