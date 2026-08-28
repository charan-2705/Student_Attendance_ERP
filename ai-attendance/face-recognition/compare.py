import cv2
import numpy as np
import os
from insightface.app import FaceAnalysis


# -----------------------------------
# Load pretrained model
# -----------------------------------

app = FaceAnalysis(
    name="buffalo_l",
    providers=["CPUExecutionProvider"]
)

app.prepare(
    ctx_id=-1,
    det_size=(1280, 1280)
)


# -----------------------------------
# Load ALL registered embeddings
# -----------------------------------

embedding_folder = "embeddings"

registered_embeddings = {}

for filename in os.listdir(embedding_folder):

    if filename.endswith(".npy"):

        student_id = filename.replace(".npy", "")

        embedding_path = os.path.join(
            embedding_folder,
            filename
        )

        embedding = np.load(embedding_path)

        registered_embeddings[student_id] = embedding

        print(
            f"Loaded student {student_id} "
            f"with embedding shape {embedding.shape}"
        )


print("\nTotal registered students:",
      len(registered_embeddings))


# -----------------------------------
# Load test image
# -----------------------------------

image = cv2.imread("../test_images/man-test6.jpeg")

if image is None:
    print("Could not load test image")
    exit()


# -----------------------------------
# Detect all faces
# -----------------------------------

faces = app.get(image)

print("\nFaces detected:", len(faces))


if len(faces) == 0:
    print("No faces detected")
    exit()


# -----------------------------------
# Compare EVERY face
# against EVERY registered student
# -----------------------------------

for face_number, face in enumerate(faces):

    test_embedding = face.embedding

    print(f"\n========== FACE {face_number + 1} ==========")

    best_student = None
    best_similarity = -1

    for student_id, registered_embedding in registered_embeddings.items():

        similarity = np.dot(
            registered_embedding,
            test_embedding
        ) / (
            np.linalg.norm(registered_embedding)
            * np.linalg.norm(test_embedding)
        )

        print(
            f"Student {student_id}: "
            f"{similarity:.4f}"
        )

        # Keep highest similarity
        if similarity > best_similarity:

            best_similarity = similarity
            best_student = student_id


    print("\nBest match:")
    print("Student:", best_student)
    print("Similarity:", round(best_similarity, 4))