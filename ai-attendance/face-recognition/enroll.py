import cv2
import numpy as np
from insightface.app import FaceAnalysis
import os


# Load pretrained model
app = FaceAnalysis(
    name="buffalo_l",
    providers=["CPUExecutionProvider"]
)

app.prepare(
    ctx_id=-1,
    det_size=(1280, 1280)
)


# Student information
student_id = "103"

# Photo to enroll
image_path = "../test_images/barre.jpeg"

# Folder where embeddings will be stored
os.makedirs("embeddings", exist_ok=True)


# Load image
image = cv2.imread(image_path)

if image is None:
    print("Could not load image")
    exit()


# Detect face and generate embedding
faces = app.get(image)

print("Faces detected:", len(faces))


# We expect exactly one face for registration
if len(faces) == 0:
    print("No face detected.")
    exit()

if len(faces) > 1:
    print("Multiple faces detected.")
    print("Please use an image containing only one person.")
    exit()


# Get the student's embedding
embedding = faces[0].embedding

print("Embedding shape:", embedding.shape)
print("Embedding length:", len(embedding))


# Save embedding
output_path = f"embeddings/{student_id}.npy"

np.save(output_path, embedding)

print("Embedding saved to:", output_path)