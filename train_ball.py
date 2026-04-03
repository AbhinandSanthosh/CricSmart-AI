from ultralytics import YOLO
import torch

def start_training():
    # Detect your MSI's GPU
    device = 0 if torch.cuda.is_available() else 'cpu'
    print(f"Using device: {device}")

    # Load your local yolov8n.pt
    model = YOLO('yolov8n.pt')

    # Start training
    model.train(
        data='data.yaml', 
        epochs=50, 
        imgsz=640, 
        device=device
    )

if __name__ == '__main__':
    start_training()