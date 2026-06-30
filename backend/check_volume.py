import modal
import os

image = modal.Image.debian_slim()
volume = modal.Volume.from_name("model-store", create_if_missing=True)
app = modal.App("check-volume-app", image=image)

@app.function(volumes={"/vault": volume})
def list_files(path: str):
    volume.reload()
    if not os.path.exists(path):
        return f"Path {path} does not exist"
    return os.listdir(path)

@app.local_entrypoint()
def main():
    print("Listing files in /vault/models/3/3:")
    print(list_files.remote("/vault/models/3/3"))
