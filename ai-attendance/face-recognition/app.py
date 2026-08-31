import cv2
import numpy as np
import os

from flask import Flask, request, jsonify
from flask_cors import CORS
from insightface.app import FaceAnalysis


app = Flask(__name__)
CORS(app)


# -----------------------------------
# Settings
# -----------------------------------

THRESHOLD = 0.40
EMBEDDING_FOLDER = "embeddings"


# -----------------------------------
# Load Buffalo model
# -----------------------------------

print("Loading face recognition model...")

face_app = FaceAnalysis(
    name="buffalo_l",
    providers=["CPUExecutionProvider"]
)

face_app.prepare(
    ctx_id=-1,
    det_size=(1280, 1280)
)

print("Model loaded.")


# -----------------------------------
# Load registered embeddings
# -----------------------------------

registered_embeddings = {}

for filename in os.listdir(EMBEDDING_FOLDER):

    if filename.endswith(".npy"):

        student_id = filename.replace(".npy", "")

        path = os.path.join(
            EMBEDDING_FOLDER,
            filename
        )

        embedding = np.load(path)

        registered_embeddings[student_id] = embedding


print(
    "Registered students:",
    list(registered_embeddings.keys())
)


# -----------------------------------
# Cosine similarity
# -----------------------------------

def cosine_similarity(embedding1, embedding2):

    return np.dot(
        embedding1,
        embedding2
    ) / (
        np.linalg.norm(embedding1)
        * np.linalg.norm(embedding2)
    )


# -----------------------------------
# Recognize endpoint
# -----------------------------------

@app.route("/recognize", methods=["POST"])
def recognize():

    # Check whether image was provided

    if "image" not in request.files:

        return jsonify({
            "error": "No image provided"
        }), 400


    file = request.files["image"]


    # Convert uploaded image to OpenCV image

    image_bytes = file.read()

    image_array = np.frombuffer(
        image_bytes,
        np.uint8
    )

    image = cv2.imdecode(
        image_array,
        cv2.IMREAD_COLOR
    )


    if image is None:

        return jsonify({
            "error": "Invalid image"
        }), 400


    # -----------------------------------
    # Detect faces
    # -----------------------------------

    faces = face_app.get(image)


    recognized_students = []


    # -----------------------------------
    # Compare each detected face
    # -----------------------------------

    for face in faces:

        test_embedding = face.embedding

        best_student = None
        best_similarity = -1


        for student_id, registered_embedding in registered_embeddings.items():

            similarity = cosine_similarity(
                registered_embedding,
                test_embedding
            )


            if similarity > best_similarity:

                best_similarity = similarity
                best_student = student_id


        # -----------------------------------
        # Apply threshold
        # -----------------------------------

        if best_similarity >= THRESHOLD:

            recognized_students.append(
                best_student
            )


    # -----------------------------------
    # Remove duplicates
    # -----------------------------------

    recognized_students = list(
        dict.fromkeys(recognized_students)
    )


    # -----------------------------------
    # Return result
    # -----------------------------------

    return jsonify({

        "faces_detected": len(faces),

        "recognized_students":
            recognized_students

    })


# -----------------------------------
# Start server
# -----------------------------------

if __name__ == "__main__":

    app.run(
        host="127.0.0.1",
        port=5001,
        debug=True
    )