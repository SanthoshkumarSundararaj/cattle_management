# Cow Monitoring and Identification System

### **Overview**

This repository contains a comprehensive system for monitoring and identifying cows in a barn using cutting-edge deep learning and machine learning techniques. The system automates the detection, tracking, and identification of cows, with a user-friendly visualization via a React.js dashboard. This enhances barn management and provides valuable insights into cow behavior.

---

### **Key Features**
- **Object Detection**: Detect cows in real-time using YOLOv8 for precise localization.
- **Object Tracking**: Monitor their movements across the barn to understand patterns and behaviors.
- **Identification**: Recognize individual cows using a machine learning algorithm based on stickers.
- **Visualization**: View real-time data and results on an interactive React.js dashboard.

---

### **System Architecture**

```plaintext
+-----------------------+         +-----------------------+         +-----------------------+
|   Input Video Feed    | ----->  | Object Detection      | ----->  | Object Tracking       |
| (Barn surveillance)   |         | (YOLOv8)             |         | (DeepSORT or YOLOv8)  |
+-----------------------+         +-----------------------+         +-----------------------+
            |                                                                   |
            v                                                                   v
+-----------------------+         +---------------------------------------------+
| Identification        | ------> | React.js Dashboard for Visualization       |
| (Sticker-based YOLO)  |         | (Displays detection, tracking, ID data)    |
+-----------------------+         +---------------------------------------------+
```

---

### **Flowchart**

```plaintext
[ Video Input ] --> [ YOLOv8 Detection ] --> [ YOLO DeepSORT Tracking ] --> [ YOLO Identification ]
                        |
                        v
[ Data Logging ] <--- [ React.js Visualization ]
```

---

### **Detailed Code Explanation**

#### **1. Object Detection**
- **File**: `server/server.py`
- **Description**: Detects cows in video frames using YOLOv8.
- **Key Functionality**:
  - Loads the YOLOv8 model pre-trained on a barn dataset.
  - Processes video frames and outputs bounding boxes and confidence scores.

#### 🥇 Code Examples - object detection
```python
def process_image(image_path):
    global COORDINATES
    print("COORDINATES:", COORDINATES)
    results = []
    behaviour_count = defaultdict(int)
    
    # Perform detection using the behavior model
    detection_model_result = behaviour_model.predict(image_path, conf=0.45)
    
    for result in detection_model_result:
        # Get cropped images for detected objects
        cropped_images = display_cropped_images(result)
        
        for detected_area, x_offset, y_offset, behavior_class_id in cropped_images:
            # Identify the shape of the detected object
            shape_classes = shape_finder(detected_area, x_offset, y_offset, result.orig_img.shape)
            behavior_name = behaviours.get(int(behavior_class_id.item()), "Unknown")
            
            # Define the bounding box coordinates
            x1, y1, x2, y2 = x_offset, y_offset, x_offset + detected_area.shape[1], y_offset + detected_area.shape[0]
            # print("hereeeee is behaviour class ID", behavior_class_id ,type(result))
            
            # Check if the bounding box is inside the defined zone
            if is_inside_coordinates(x1, y1, x2, y2, COORDINATES) :
                # Set behavior to 'Eating' if inside coordinates
                if shape_classes:
                    result_str = {class_map[shape_classes[0]]: "Eating"}
                else:
                    result_str = {"Unknown": "Eating"}
                    
                behaviour_count["Eating"] += 1
                
            elif shape_classes:
                # Use the detected behavior if not inside the zone csv
                result_str = {class_map[shape_classes[0]]: behavior_name}
                behaviour_count[behavior_name] += 1
            else:
                # Handle unknown cases
                result_str = {"Unknown": behavior_name}

            results.append(result_str)
    
    # Draw bounding boxes on the image
    boxed_image_path = draw_bounding_boxes(result, image_path, COORDINATES)
    return results, boxed_image_path
```
#### **2. Object Tracking**
- **File**: `server/server.py`
- **Description**: Tracks detected cows across frames to maintain consistency in identification.
- **Key Functionality**:
  - Uses DeepSORT (or integrated YOLO tracking) to handle tracking even with partial occlusion.
  - Assigns a unique ID to each cow for subsequent identification.


#### **3. Individual Identification**
- **File**: `server/server.py`
- **Description**: Identifies individual cows using a YOLO shape identification algorithm.
- **Key Functionality**:
  - Extracts features from detected bounding boxes, focusing on stickers.
  - Compares sticker features using a trained model to match identities.
  
#### 🥇 Code Examples - shape identification
```python
def shape_finder(detected_area, x_offset, y_offset, original_size):
    shape_model_results = shape_model.predict(detected_area)
    boxes = shape_model_results[0].boxes.xyxy.cpu().numpy()
    class_ids = shape_model_results[0].boxes.cls.cpu().numpy()
    predicted_classes = [shape_model_results[0].names[int(class_id)] for class_id in class_ids]

    img_center = (detected_area.shape[1] / 2, detected_area.shape[0] / 2)

    if len(boxes) > 1:
        distances = [distance_to_center(*box, img_center) for box in boxes]
        min_index = np.argmin(distances)
        boxes = [boxes[min_index]]
        predicted_classes = [predicted_classes[min_index]]

    return predicted_classes
```

#### **4. Visualization**
- **File**: `dashboard/src/App.js`
- **Description**: React.js application displaying detection, tracking, and identification data.
- **Key Components**:
  - **Live View**: Displays real-time video with overlaid detection and tracking info.
  - **Data Analytics**: Provides insights like cow count, movement patterns, and ID logs.
 
```python
def process_video(video_path, csv_file_path, fps, stop_event):
    """
    Function to process the video and progressively write results to a CSV file in the background.
    Terminates if stop_event is set.
    """
    global RESULTS , CAMERA
    RESULTS = {}  # Reset the RESULTS dictionary
    cap = cv2.VideoCapture(video_path)

    # Create the CSV file with headers based on class_map
    with open(csv_file_path, mode='w', newline='') as csv_file:
        fieldnames = ['frameNumber'] + list(class_map.values())
        writer = csv.DictWriter(csv_file, fieldnames=fieldnames)
        writer.writeheader()

        count = 0
        while not stop_event.is_set():  # Continue processing unless stop_event is set
            ret, frame = cap.read()
            if not ret:
                break
            frame_number = int(cap.get(cv2.CAP_PROP_POS_FRAMES))
            if frame_number % int(fps) == 0:  # Extract one frame per second
                temp_frame_path = os.path.join(cache_dir, f"frame_{frame_number}.jpg")
                count += 1

                # Resize the frame to 640x640
                resized_frame = cv2.resize(frame, (640, 640))
                cv2.imwrite(temp_frame_path, resized_frame)

                # Process the frame and get the results
                results, boxed_image_path = process_image(temp_frame_path)
                print(f"Results for frame {frame_number}: {results}")

                # Create a dictionary for the CSV row with 'nan' if a class is not detected frameNumber
                row = {}
                for class_name in class_map.values():
                    detected = next((result for result in results if class_name in result), None)
                    if detected:
                        row[class_name] = (list(detected.values())[0] , CAMERA)
                    else:
                        row[class_name] = ('nan',"Out of field")

                # Write the row to the CSV file
                writer.writerow(row)

                # Construct the image URL manually using the base URL
                image_url = f"/cache/{os.path.basename(boxed_image_path)}"

                # Add the frame number, results, and boxed image URL to the RESULTS dictionary
                RESULTS[frame_number] = [row, {'frameNumber': frame_number, 'image_url': image_url , 'count': count}]

    cap.release()
    print(f"Stopped processing video at frame {frame_number}")
```

---

### **Images**

1. Visual demo of the entire app

![Dashboard Screenshot](https://github.com/SanthoshkumarSundararaj/cattle_management/blob/main/images/Screenshot%202024-12-31%20123419.png)

2. List of all tracked cows

![Dashboard Screenshot](https://github.com/SanthoshkumarSundararaj/cattle_management/blob/main/images/Screenshot%202024-12-31%20123510.png)

3. Tracked cows filtered based on Metabolic Disorders

![Dashboard Screenshot](https://github.com/SanthoshkumarSundararaj/cattle_management/blob/main/images/Screenshot%202024-12-31%20123540.png)

4. Cow analysis dashboard overall barn

![Dashboard Screenshot](https://github.com/SanthoshkumarSundararaj/cattle_management/blob/main/images/Screenshot%202024-12-31%20124341.png)

5. Cow analysis dashboard individual

![Dashboard Screenshot](https://github.com/SanthoshkumarSundararaj/cattle_management/blob/main/images/Screenshot%202024-12-31%20125421.png)

6. Sample video of the barn with detection/tracking and identification of the activity

![Dashboard Screenshot](https://github.com/SanthoshkumarSundararaj/cattle_management/blob/main/images/Screenshot%202024-12-31%20125948.png)

---

### **Folder Structure**

```plaintext
cow-monitoring-system/
├── server/
│   ├── server.py         # YOLOv8 detection/tracking logic + Shape detection YOLO logic
│   ├── calculation.py    # calculation to interpret the behavioural data
│   ├── healthReport.py   # Generation of final report for the react
│   ├── app.py            # Central script orchestrating the backend
├── dashboard/
│   ├── src/
│   │   ├── components/      # React.js UI components
│   │   ├── App.js           # Main React.js application
│   └── public/              # Static assets
├── input/                   # Video feed input directory
├── output/                  # Processed results
├── requirements.txt         # Python dependencies
└── README.md                # Project documentation
```

---

### **Installation and Usage**

#### **Installation**
1. Clone the repository:
   ```bash
   git clone https://github.com/SanthoshkumarSundararaj/cattle_management.git
   cd cattle_management
   ```
2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   cd client
   npm install
   ```

#### **Usage**
1. Start the backend:
   ```bash
   python server/server.py
   ```
2. Launch the dashboard:
   ```bash
   npm start
   ```
3. Upload barn video feeds to the `input/` directory and monitor results on the dashboard.

---

### **Future Enhancements**
- Integrate more robust tracking for occlusion handling.
- Use alternative identifiers (e.g., RFID or patterns) for better accuracy.
- Extend the system for additional livestock behaviour analysis.

---

