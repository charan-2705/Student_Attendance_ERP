import os
import time


# ============================================================
# NVIDIA CUDA / cuDNN DLL PATHS
# ============================================================

CONDA_SITE_PACKAGES = (
    r"C:\Users\HP\anaconda3\Lib\site-packages"
)

CUDA_BIN = os.path.join(
    CONDA_SITE_PACKAGES,
    "nvidia",
    "cu13",
    "bin",
    "x86_64"
)

CUDNN_BIN = os.path.join(
    CONDA_SITE_PACKAGES,
    "nvidia",
    "cudnn",
    "bin"
)


# Make CUDA and cuDNN DLL directories available
# before ONNX Runtime / InsightFace are loaded.
for dll_dir in (CUDA_BIN, CUDNN_BIN):

    if os.path.isdir(dll_dir):

        try:
            os.add_dll_directory(dll_dir)

        except (AttributeError, OSError):
            pass


# Also add them to PATH for dependent DLLs.
os.environ["PATH"] = (
    CUDA_BIN
    + os.pathsep
    + CUDNN_BIN
    + os.pathsep
    + os.environ.get("PATH", "")
)


# ============================================================
# IMPORTS
# ============================================================

import cv2
import numpy as np
import onnxruntime as ort

from flask import Flask, request, jsonify
from flask_cors import CORS
from insightface.app import FaceAnalysis


# Preload CUDA / cuDNN DLLs.
ort.preload_dlls()


# ============================================================
# FLASK APP
# ============================================================

app = Flask(__name__)

CORS(app)


# ============================================================
# SETTINGS
# ============================================================

THRESHOLD = 0.40

EMBEDDING_FOLDER = "embeddings"

# Internal detector resolution.
# Uploaded classroom images can remain 1280x960.
DET_SIZE = (640, 640)


# ============================================================
# LOAD INSIGHTFACE MODEL
# ============================================================

print()
print("========================================")
print("Loading face recognition model...")
print("========================================")

model_start = time.perf_counter()


face_app = FaceAnalysis(
    name="buffalo_l",
    providers=[
        "CUDAExecutionProvider",
        "CPUExecutionProvider"
    ]
)


face_app.prepare(
    ctx_id=0,
    det_size=DET_SIZE
)


model_time = (
    time.perf_counter() - model_start
)


print()
print(
    f"Model loaded in {model_time:.2f} seconds."
)

print(
    "Configured providers:"
)

print(
    ort.get_available_providers()
)


# ============================================================
# LOAD REGISTERED EMBEDDINGS
# ============================================================

print()
print("Loading registered embeddings...")


embedding_start = time.perf_counter()


registered_embeddings = {}


if not os.path.isdir(EMBEDDING_FOLDER):

    print(
        f"ERROR: Embedding folder not found: "
        f"{EMBEDDING_FOLDER}"
    )

else:

    for filename in os.listdir(
        EMBEDDING_FOLDER
    ):

        if not filename.lower().endswith(
            ".npy"
        ):
            continue


        student_id = os.path.splitext(
            filename
        )[0].strip().upper()


        path = os.path.join(
            EMBEDDING_FOLDER,
            filename
        )


        try:

            embedding = np.asarray(
                np.load(path),
                dtype=np.float32
            )


            # Validate embedding shape.
            if embedding.ndim != 1:

                print(
                    f"Skipping {filename}: "
                    f"invalid shape {embedding.shape}"
                )

                continue


            # Normalize once at startup.
            norm = np.linalg.norm(
                embedding
            )


            if norm == 0:

                print(
                    f"Skipping {filename}: "
                    f"zero embedding"
                )

                continue


            embedding = (
                embedding / norm
            )


            registered_embeddings[
                student_id
            ] = embedding


        except Exception as error:

            print(
                f"Failed to load {filename}: "
                f"{error}"
            )


# ============================================================
# PREPARE EMBEDDING MATRIX
# ============================================================

registered_ids = list(
    registered_embeddings.keys()
)


if registered_embeddings:

    registered_matrix = np.vstack(
        [
            registered_embeddings[
                student_id
            ]
            for student_id in registered_ids
        ]
    ).astype(
        np.float32
    )

else:

    registered_matrix = np.empty(
        (0, 512),
        dtype=np.float32
    )


embedding_time = (
    time.perf_counter()
    - embedding_start
)


print(
    f"Loaded {len(registered_ids)} "
    f"registered students in "
    f"{embedding_time:.2f} seconds."
)


print(
    "Registered students:",
    registered_ids
)


# ============================================================
# RECOGNIZE ENDPOINT
# ============================================================

@app.route(
    "/recognize",
    methods=["POST"]
)
def recognize():

    request_start = time.perf_counter()


    # ========================================================
    # CHECK IMAGE
    # ========================================================

    if "image" not in request.files:

        return jsonify({
            "error": "No image provided"
        }), 400


    file = request.files["image"]


    # ========================================================
    # DECODE IMAGE
    # ========================================================

    decode_start = time.perf_counter()


    image_bytes = file.read()


    image_array = np.frombuffer(
        image_bytes,
        np.uint8
    )


    image = cv2.imdecode(
        image_array,
        cv2.IMREAD_COLOR
    )


    decode_time = (
        time.perf_counter()
        - decode_start
    )


    if image is None:

        return jsonify({
            "error": "Invalid image"
        }), 400


    # ========================================================
    # FACE DETECTION + EMBEDDING EXTRACTION
    # ========================================================

    detection_start = time.perf_counter()


    try:

        faces = face_app.get(
            image
        )

    except Exception as error:

        print(
            "Face detection error:",
            error
        )

        return jsonify({
            "error":
                f"Face detection failed: {error}"
        }), 500


    detection_time = (
        time.perf_counter()
        - detection_start
    )


    recognized_students = []


    # ========================================================
    # FACE COMPARISON
    # ========================================================

    comparison_start = time.perf_counter()


    if len(registered_ids) > 0:

        for face in faces:

            # -----------------------------------------------
            # Get test embedding
            # -----------------------------------------------

            test_embedding = np.asarray(
                face.embedding,
                dtype=np.float32
            )


            # -----------------------------------------------
            # Validate embedding
            # -----------------------------------------------

            if test_embedding.ndim != 1:

                continue


            # -----------------------------------------------
            # Normalize embedding
            # -----------------------------------------------

            norm = np.linalg.norm(
                test_embedding
            )


            if norm == 0:

                continue


            test_embedding = (
                test_embedding / norm
            )


            # -----------------------------------------------
            # Vectorized cosine similarity
            #
            # Both registered and test embeddings are
            # normalized, so dot product = cosine similarity.
            # -----------------------------------------------

            similarities = (
                registered_matrix
                @ test_embedding
            )


            # -----------------------------------------------
            # Find best match
            # -----------------------------------------------

            best_index = int(
                np.argmax(
                    similarities
                )
            )


            best_similarity = float(
                similarities[
                    best_index
                ]
            )


            best_student = (
                registered_ids[
                    best_index
                ]
            )


            # -----------------------------------------------
            # Apply threshold
            # -----------------------------------------------

            if (
                best_similarity >= THRESHOLD
            ):

                recognized_students.append(
                    best_student
                )


    comparison_time = (
        time.perf_counter()
        - comparison_start
    )


    # ========================================================
    # REMOVE DUPLICATES
    # ========================================================

    recognized_students = list(
        dict.fromkeys(
            recognized_students
        )
    )


    # ========================================================
    # TOTAL REQUEST TIME
    # ========================================================

    total_time = (
        time.perf_counter()
        - request_start
    )


    # ========================================================
    # TERMINAL REPORT
    # ========================================================

    print()

    print(
        "========== FACE ATTENDANCE =========="
    )

    print(
        f"Image decode : "
        f"{decode_time:.3f}s"
    )

    print(
        f"Face detection : "
        f"{detection_time:.3f}s"
    )

    print(
        f"Face comparison : "
        f"{comparison_time:.3f}s"
    )

    print(
        f"Total request : "
        f"{total_time:.3f}s"
    )

    print(
        f"Faces detected : "
        f"{len(faces)}"
    )

    print(
        f"Recognized : "
        f"{len(recognized_students)}"
    )

    print(
        "Recognized students:",
        recognized_students
    )

    print(
        "======================================"
    )

    print()


    # ========================================================
    # RETURN RESPONSE
    # ========================================================

    return jsonify({

        "faces_detected":
            len(faces),

        "recognized_students":
            recognized_students,

        # Timing information for frontend
        "image_decode_time_seconds":
            round(
                decode_time,
                3
            ),

        "face_detection_time_seconds":
            round(
                detection_time,
                3
            ),

        "face_comparison_time_seconds":
            round(
                comparison_time,
                3
            ),

        "total_processing_time_seconds":
            round(
                total_time,
                3
            )
    })


# ============================================================
# START SERVER
# ============================================================

if __name__ == "__main__":

    app.run(
        host="127.0.0.1",
        port=5001,
        debug=False,
        use_reloader=False
    )