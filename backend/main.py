import time
import base64
from typing import Optional
from fastapi import FastAPI
from fastapi import UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from src.workflow.retraining import RETRAINING_WORKFLOW
from src.workflow.training_workflow import TRAINING_WORKFLOW
from src.workflow.inference_workflow import INFERENCE_WORKFLOW
from langchain_mistralai import ChatMistralAI
from src.utils import getFile, running_code
from dotenv import load_dotenv
load_dotenv()
from pydantic import BaseModel

llm = ChatMistralAI(model="codestral-latest", temperature=0.7)
app = FastAPI()
cors_allowed_origins = ["*"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
training = TRAINING_WORKFLOW(llm)
inference = INFERENCE_WORKFLOW(llm)
retraining = RETRAINING_WORKFLOW(llm)
class TrainRequest(BaseModel):
    userid: int
    chatid: int
    dataset_url: str

class InferenceRequest(BaseModel):
    userid: int
    chatid: int
    dataset_url: str
    training_path: str
    pipeline_path: str
    dataset_columns: list[dict]
    target_column: Optional[str] = None
class SaveDatasetRequest(BaseModel):
    userid: int
    chatid: int
    input_data: dict[str, list]
class RetrainRequest(BaseModel):
    userid: int
    chatid: int
    pipeline_path: str
    dataset_url: str
@app.post("/train")
async def train_model(request: TrainRequest):
    
    initial_state = {
        "userid": request.userid,
        "chatid": request.chatid,
        "dataset_url": request.dataset_url
    }
    try:
        final_state = await training.ainvoke(initial_state)
    except Exception as e:
        return {"status": "error", "message": str(e)}
    return {
            "status": "success",
            "dataset_analyzer_output": final_state.get("dataset_analyzer_output"),
            "eda_output": final_state.get("eda_output").get("eda_plots_paths") if final_state.get("eda_output") else None,
            "training_path": final_state.get("training_output").get("training_logs_path") if final_state.get("training_output") else None,
            "pipeline_path": final_state.get("training_output").get("pipeline_path") if final_state.get("training_output") else None,
            "model_metrics": final_state.get("training_output").get("model_metrics") if final_state.get("training_output") else None,
        }

@app.post("/predict")
async def run_inference(request: InferenceRequest):
    training_logs = await getFile(request.training_path)
    
    target_col = request.target_column
    if not target_col and request.dataset_columns:
        last_col = request.dataset_columns[-1]
        target_col = last_col.get('name') or last_col.get('columnName') or 'target'
        
    initial_state = {
        "userid": request.userid,
        "chatid": request.chatid,
        "pipeline_path": request.pipeline_path,
        "dataset_url": request.dataset_url,
        "training_logs": training_logs,
        "dataset_columns": request.dataset_columns,
        "dataset_analyzer_output": {
            "target_column": target_col
        }
    }
    result = await inference.ainvoke(initial_state)
    
    predictions_path = result.get("inference_output", {}).get("predictions_path")
    
    if not predictions_path:
        import json
        for msg in reversed(result.get("messages", [])):
            if msg.type == "tool":
                try:
                    tool_data = json.loads(msg.content)
                    if "predictions_path" in tool_data:
                        predictions_path = tool_data["predictions_path"]
                        break
                except Exception:
                    pass

    return {
        "status": "success",
        "predictions_path": predictions_path
    }

@app.post("/retrain")
async def retrain_model(request: RetrainRequest):
    
    initial_state = {
        "userid": request.userid,
        "chatid": request.chatid,
        "pipeline_path": request.pipeline_path,
        "dataset_url": request.dataset_url
    }
    result = await retraining.ainvoke(initial_state)
    predictions = await getFile(result.get("inference_output", {}).get("predictions_path", {}))
    return predictions

@app.post("/save_dataset")
async def save_dataset(request: SaveDatasetRequest):
    """
    Endpoint to save dataset from FE to BE
    Args:
        userid: The ID of the user.
        chatid: The ID of the chat.
        data_points: A dictionary where keys are column names and values are lists of column values.
    Returns:
        A success message with the path to the saved dataset.
    """
    file_name = int(time.time())
    file_path = f"/vault/models/{request.userid}/{request.chatid}/dataset_{file_name}.csv"
    code = f"""
import os
import pandas as pd
data = {request.input_data}
df = pd.DataFrame(data)
os.makedirs("/vault/models/{request.userid}/{request.chatid}", exist_ok=True)

dataset_path = "{file_path}"
df.to_csv(dataset_path, index=False)
"""
    try:
        await running_code(code=code, userid=str(request.userid), chatid=str(request.chatid), dataset_url=None)
        return {"status": "success", "message": f"Dataset saved successfully at {file_path}","filepath": file_path}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.post("/delete_file")
async def delete_file(userid: str, chatid: str, file_path: str):
    """
    Endpoint to delete a file from the volume
    Args:
        file_path: The path of the file to be deleted.
    Returns:
        A success message confirming the deletion of the file.
    """
    code = f"""
import os
file_path = "/vault/models/{userid}/{chatid}/{file_path}"
if os.path.exists(file_path):
    os.remove(file_path)
"""
    try:
        await running_code(code=code, userid=userid, chatid=chatid, dataset_url=None)
        return {"status": "success", "message": f"File at {file_path} deleted successfully."}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.post("/delete_chat_data")
async def delete_chat_data(userid: str = Form(...), chatid: str = Form(...)):
    """
    Endpoint to delete all files for a chat from the volume
    """
    code = f"""
import shutil
import os
chat_dir = f"/vault/models/{userid}/{chatid}"
if os.path.exists(chat_dir):
    shutil.rmtree(chat_dir, ignore_errors=True)
"""
    try:
        await running_code(code=code, userid=userid, chatid=chatid, dataset_url=None)
        return {"status": "success", "message": f"Chat data deleted successfully."}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.post("/upload_file")
async def upload_file(userid: str = Form(...), chatid: str = Form(...), file: UploadFile = File(...)):
    """
    Endpoint to upload a file to the volume
    Args:
        file: The file to be uploaded.
    Returns:
        A success message confirming the upload of the file.
    """
    file_bytes = await file.read()
    filename = file.filename
    import time
    timestamp = int(time.time())
    file_location = f"/vault/models/{userid}/{chatid}/dataset_{timestamp}_{filename}"
    from src.utils import saveFile
    await saveFile(file_location, file_bytes)
    return {"status": "success", "filepath": file_location, "message": f"File {file.filename} uploaded successfully."}

class GetFileRequest(BaseModel):
    file_path: str

@app.post("/get_file")
async def get_file_endpoint(request: GetFileRequest):
    """
    Endpoint to get file content from the volume.
    """
    from src.utils import getFile
    try:
        content = await getFile(request.file_path)
        return {"status": "success", "content": content}
    except Exception as e:
        # Check if it's a file not found error (FileNotFoundError usually)
        if "No such file" in str(e) or isinstance(e, FileNotFoundError):
            return {"status": "error", "message": "File not found"}
        return {"status": "error", "message": str(e)}
