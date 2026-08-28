import cv2
import insightface
import numpy as np
from insightface.app import FaceAnalysis


# Load pretrained face recognition model
app = FaceAnalysis(
    name="buffalo_l",
    providers=["CPUExecutionProvider"]
)

app.prepare(
    ctx_id=-1,
    det_size=(1280, 1280)
)


# Load image
image = cv2.imread("../test_images/test1.png")

if image is None:
    print("Could not load image")
    exit()


# Detect faces + generate embeddings
faces = app.get(image)

print("Faces detected:", len(faces))


# Print embedding information
for i, face in enumerate(faces):

    embedding = face.embedding

    print(f"\nFace {i + 1}")

    print("Embedding shape:", embedding.shape)

    print("First 10 values:")
    print(embedding[:40])

    print("Embedding length:", len(embedding))