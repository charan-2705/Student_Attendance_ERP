import cv2
import numpy as np
import os
from insightface.app import FaceAnalysis


# -----------------------------------
# Settings
# -----------------------------------

THRESHOLD = 0.40

EMBEDDING_FOLDER = "embeddings"
TEST_IMAGE = "../test_images/man-test6.jpeg"


# -----------------------------------
# Load pretrained face recognition model
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
# Load all registered embeddings
# -----------------------------------

registered_embeddings = {}

for filename in os.listdir(EMBEDDING_FOLDER):

    if filename.endswith(".npy"):

        student_id = filename.replace(".npy", "")

        embedding_path = os.path.join(
            EMBEDDING_FOLDER,
            filename
        )

        embedding = np.load(embedding_path)

        registered_embeddings[student_id] = embedding


print("Total registered students:",
      len(registered_embeddings))


# -----------------------------------
# Load test image
# -----------------------------------

image = cv2.imread(TEST_IMAGE)

if image is None:

    print("Could not load test image")
    exit()


# -----------------------------------
# Detect faces + generate embeddings
# -----------------------------------

faces = app.get(image)

print("Faces detected:", len(faces))


if len(faces) == 0:

    print("No faces detected")
    exit()


# -----------------------------------
# Compare every detected face
# -----------------------------------

recognized_students = []


for face_number, face in enumerate(faces, start=1):

    test_embedding = face.embedding

    best_student = None
    best_similarity = -1


    # Compare this face with every registered student

    for student_id, registered_embedding in registered_embeddings.items():

        similarity = np.dot(
            registered_embedding,
            test_embedding
        ) / (
            np.linalg.norm(registered_embedding)
            * np.linalg.norm(test_embedding)
        )


        if similarity > best_similarity:

            best_similarity = similarity
            best_student = student_id


    # -----------------------------------
    # Check threshold
    # -----------------------------------

    if best_similarity >= THRESHOLD:

        recognized_students.append(
            (best_student, face_number)
        )


# -----------------------------------
# Final output
# -----------------------------------

print("\n========== RECOGNIZED STUDENTS ==========")

if len(recognized_students) == 0:

    print("No registered students recognized.")

else:

    for student_id, face_number in recognized_students:

        print(
            f"Student {student_id} - Face {face_number}"
        )