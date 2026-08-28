import cv2
import insightface
from insightface.app import FaceAnalysis


# Create face analysis application
app = FaceAnalysis(
    name="buffalo_l",
    allowed_modules=["detection"]
)

# CPU
app.prepare(
    ctx_id=-1,
    det_size=(1280, 1280)
)


# Load image
image_path = "../test_images/test5.png"
image = cv2.imread(image_path)

if image is None:
    print("Could not load image")
    exit()


# Detect faces
faces = app.get(image)

print("Faces detected:", len(faces))


# Draw bounding boxes
for i, face in enumerate(faces):

    x1, y1, x2, y2 = face.bbox.astype(int)

    confidence = face.det_score

    print(
        f"Face {i + 1}: "
        f"confidence={confidence:.3f}, "
        f"box=({x1}, {y1}, {x2}, {y2})"
    )

    cv2.rectangle(
        image,
        (x1, y1),
        (x2, y2),
        (255, 0, 0),
        2
    )


# Save result
output_path = "../test_images/scrfd_output5a.png"

cv2.imwrite(output_path, image)

print("Output saved to:", output_path)