"""
CricSmart AI - Train a Better Ball Detection Model
Downloads a large cricket ball detection dataset from Roboflow
and fine-tunes YOLOv8 on it.

Usage:
    python train_better_model.py --api-key YOUR_ROBOFLOW_API_KEY

Requirements:
    pip install roboflow ultralytics
"""

import argparse
import os
import sys

def main():
    parser = argparse.ArgumentParser(description="Train cricket ball detection model")
    parser.add_argument("--api-key", required=True, help="Roboflow API key")
    parser.add_argument("--epochs", type=int, default=80, help="Training epochs (default: 80)")
    parser.add_argument("--model-size", default="s", choices=["n", "s", "m", "l"],
                        help="YOLOv8 model size: n(ano), s(mall), m(edium), l(arge). Default: s")
    parser.add_argument("--img-size", type=int, default=640, help="Image size (default: 640)")
    parser.add_argument("--batch", type=int, default=-1, help="Batch size (-1 for auto)")
    args = parser.parse_args()

    from roboflow import Roboflow
    from ultralytics import YOLO

    print("\n=== CricSmart AI - Model Training ===\n")

    # --- Step 1: Download dataset from Roboflow ---
    print("[1/4] Connecting to Roboflow...")
    rf = Roboflow(api_key=args.api_key)

    # Try to find and download a cricket ball detection dataset
    # We'll try multiple known datasets in order of preference
    datasets_to_try = [
        # (workspace, project, version, description)
        ("cricket-igtxs", "cricket-ball-detection-f0ikj", 1, "Cricket Ball Detection (multi-class)"),
        ("cricketballdetection", "cricket-ball-fvq6i", 1, "Cricket Ball Detection"),
        ("cricket-d6raf", "cricket-ball-detection-sjhvy", 1, "Cricket Ball Detection v2"),
        ("sample-svwbs", "cricket-fhzgr", 1, "Cricket Object Detection"),
    ]

    dataset = None
    for ws, proj, ver, desc in datasets_to_try:
        try:
            print(f"  Trying: {desc} ({ws}/{proj})...")
            project = rf.workspace(ws).project(proj)
            dataset = project.version(ver).download("yolov8", location="./cricket_dataset")
            print(f"  Downloaded: {desc}")
            break
        except Exception as e:
            print(f"  Not found: {e}")
            continue

    if dataset is None:
        print("\nCould not find a pre-existing dataset automatically.")
        print("Please go to https://universe.roboflow.com and search for 'cricket ball detection'")
        print("Then download in YOLOv8 format and place in ./cricket_dataset/")
        print("\nAlternatively, provide the workspace/project info:")
        ws = input("  Workspace name: ").strip()
        proj = input("  Project name: ").strip()
        ver = int(input("  Version (default 1): ").strip() or "1")
        try:
            project = rf.workspace(ws).project(proj)
            dataset = project.version(ver).download("yolov8", location="./cricket_dataset")
        except Exception as e:
            print(f"Error: {e}")
            sys.exit(1)

    data_yaml = os.path.join(dataset.location, "data.yaml")
    print(f"\n  Dataset location: {dataset.location}")
    print(f"  data.yaml: {data_yaml}")

    # Show dataset info
    with open(data_yaml, 'r') as f:
        print(f"\n  Dataset config:")
        print(f"  {f.read()}")

    # --- Step 2: Initialize YOLOv8 model ---
    print(f"\n[2/4] Loading YOLOv8{args.model_size} base model...")
    model = YOLO(f"yolov8{args.model_size}.pt")
    print(f"  Base model: yolov8{args.model_size}.pt (COCO pretrained)")

    # --- Step 3: Train ---
    print(f"\n[3/4] Starting training...")
    print(f"  Epochs: {args.epochs}")
    print(f"  Image size: {args.img_size}")
    print(f"  Batch size: {'auto' if args.batch == -1 else args.batch}")
    print(f"  Device: MPS (Apple Silicon) if available, else CPU")
    print()

    import torch
    device = "mps" if torch.backends.mps.is_available() else "cpu"
    print(f"  Using device: {device}")

    results = model.train(
        data=data_yaml,
        epochs=args.epochs,
        imgsz=args.img_size,
        batch=args.batch,
        device=device,
        project="cricsmart_training",
        name="cricket_ball_v2",
        patience=20,          # Early stopping
        save=True,
        plots=True,
        verbose=True,
        # Augmentation for better generalization
        hsv_h=0.015,          # Hue augmentation
        hsv_s=0.4,            # Saturation augmentation
        hsv_v=0.3,            # Value augmentation
        degrees=5,            # Small rotation
        translate=0.1,
        scale=0.3,
        flipud=0.0,           # No vertical flip (cricket has clear up/down)
        fliplr=0.5,           # Horizontal flip OK
        mosaic=0.8,
        mixup=0.1,
    )

    # --- Step 4: Export best model ---
    best_path = os.path.join("cricsmart_training", "cricket_ball_v2", "weights", "best.pt")
    output_path = "cricket_ball_v2_best.pt"

    if os.path.exists(best_path):
        import shutil
        shutil.copy2(best_path, output_path)
        print(f"\n[4/4] Training complete!")
        print(f"  Best model saved to: {output_path}")
        print(f"  Training results in: cricsmart_training/cricket_ball_v2/")

        # Show metrics
        print(f"\n  Final metrics:")
        print(f"  mAP50: {results.results_dict.get('metrics/mAP50(B)', 'N/A')}")
        print(f"  mAP50-95: {results.results_dict.get('metrics/mAP50-95(B)', 'N/A')}")

        print(f"\n  To use this model in CricSmart:")
        print(f"  1. Copy {output_path} to web/ml-service/")
        print(f"  2. Update server.py MODEL_PATH to '{output_path}'")
        print(f"  3. Restart the ML service")
    else:
        print(f"\nTraining finished but couldn't find best.pt at {best_path}")
        print("Check cricsmart_training/ directory for results.")


if __name__ == "__main__":
    main()
