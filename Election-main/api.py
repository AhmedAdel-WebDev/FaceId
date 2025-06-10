from flask import Flask, request, jsonify
import cv2
import numpy as np
import os
import base64
from FaceRecognizer import FaceRecognizer # Assuming FaceRecognizer.py is in the same directory

app = Flask(__name__)

# Initialize the recognizer (loads database on startup)
# Adjust thresholds as needed
recognizer = FaceRecognizer(distance_threshold=0.2, quality_threshold=0.4)
print("Face Recognizer Initialized.")

def image_from_base64(base64_string):
    """Decodes base64 string to an OpenCV image."""
    img_bytes = base64.b64decode(base64_string)
    img_array = np.frombuffer(img_bytes, dtype=np.uint8)
    img = cv2.imdecode(img_array, cv2.IMREAD_COLOR)
    return img

@app.route('/register', methods=['POST'])
def register_face():
    data = request.get_json()
    # Expect 'username' and 'images' (array)
    if not data or 'username' not in data or 'images' not in data:
        return jsonify({"error": "Missing username or images data"}), 400

    username = data['username']
    images_b64 = data['images'] # Expecting an array of base64 strings

    if not username:
        return jsonify({"error": "Username cannot be empty"}), 400
    if not isinstance(images_b64, list) or not images_b64:
        return jsonify({"error": "Images must be a non-empty list"}), 400

    saved_count = 0
    errors = []
    base_dir = os.path.dirname(os.path.abspath(__file__))
    user_dir = os.path.join(base_dir, 'database', username)
    os.makedirs(user_dir, exist_ok=True) # Create directory if it doesn't exist

    for index, image_b64 in enumerate(images_b64):
        try:
            # Remove potential data URL prefix
            if ',' in image_b64:
                image_data = image_b64.split(',')[1]
            else:
                image_data = image_b64

            img = image_from_base64(image_data)
            if img is None:
                errors.append(f"Image {index+1}: Invalid image data")
                continue

            # Save the image with an index
            img_filename = f"{username}_{index+1}.jpg" # e.g., john_doe_1.jpg
            img_path = os.path.join(user_dir, img_filename)

            # Save the image
            success = cv2.imwrite(img_path, img)
            if success:
                print(f"Saved image {index+1} for user '{username}' to {img_path}")
                saved_count += 1
            else:
                errors.append(f"Image {index+1}: Failed to save image to disk.")

        except base64.binascii.Error:
            errors.append(f"Image {index+1}: Invalid base64 string")
        except Exception as e:
            error_detail = f"Image {index+1}: {str(e)}"
            print(f"Error processing image {index+1} for user '{username}': {e}")
            errors.append(error_detail)

    if saved_count > 0:
        # Reload the recognizer's database only if at least one image was saved
        try:
            recognizer.load_database() # Reload the database
            print(f"Recognizer database reloaded after saving {saved_count} images for '{username}'.")
        except AttributeError:
            print("Warning: recognizer.load_database() method not found. Database not reloaded automatically.")
        except Exception as db_load_e:
            print(f"Error reloading database after registration for '{username}': {db_load_e}")
            errors.append(f"Database reload failed: {str(db_load_e)}")

    if not errors:
        return jsonify({"message": f"User '{username}' registered successfully with {saved_count} images."}), 200
    elif saved_count > 0:
        # Partial success
        return jsonify({
            "message": f"User '{username}' registered with {saved_count} images, but some errors occurred.",
            "errors": errors
        }), 207 # Multi-Status
    else:
        # Complete failure
        return jsonify({
            "error": f"Failed to register any images for user '{username}'.",
            "details": errors
        }), 500


@app.route('/recognize', methods=['POST'])
def recognize_face():
    data = request.get_json()
    if not data or 'image' not in data:
        return jsonify({"error": "Missing image data"}), 400

    try:
        image_b64 = data['image']
        # Remove potential data URL prefix (e.g., "data:image/jpeg;base64,")
        if ',' in image_b64:
            image_b64 = image_b64.split(',')[1]

        img = image_from_base64(image_b64)
        if img is None:
             return jsonify({"error": "Invalid image data"}), 400

        # Use the recognizer instance
        names, locations = recognizer.extract_faces(img)

        recognized_name = "Unknown"
        if names:
            # Handle multiple faces if necessary, here we take the first non-unknown
            for name in names:
                if name != "Unknown" and not name.startswith("Face Quality not met"):
                    recognized_name = name
                    break # Or decide how to handle multiple recognized faces

        print(f"Recognition result (username): {recognized_name}") # Server-side log
        # Return 'username' instead of 'name'
        return jsonify({"username": recognized_name})

    except Exception as e:
        print(f"Error during recognition: {e}") # Log the error
        return jsonify({"error": "Failed to process image", "details": str(e)}), 500

# Add a simple health check endpoint
@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({"status": "ok"})

if __name__ == '__main__':
    # Run on localhost, choose a port (e.g., 5001) that doesn't conflict with Node.js
    app.run(host='0.0.0.0', port=5001, debug=True) # Use debug=False in production