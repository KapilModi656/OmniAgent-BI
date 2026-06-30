import modal
import asyncio
import io
import contextlib
import pickle
import os
import json
import pandas as pd
import plotly.express as px
import traceback
image = modal.Image.debian_slim().pip_install(
    "pandas",
    "scikit-learn",
    "xgboost",
    "numpy",
    "plotly",
    "torch",
    "matplotlib",
    "seaborn",
)
volume = modal.Volume.from_name("model-store", create_if_missing=True)

CURRENT_DATASET_URL = None
CURRENT_MODEL_PATH = None

app = modal.App("omniAgent-Sandbox-Runner",image=image)
def _load_model_internal(model_path: str):
    
    if not os.path.exists(model_path):
        raise FileNotFoundError(f"No existing model weight artifacts tracked for model path: {model_path}")
    with open(model_path, "rb") as f:
        model = pickle.load(f)
    return model





@app.function(volumes={"/vault": volume}, timeout=60*60)
def run_code(code:str, userid:str, chatid:str, dataset_url: str | None = None, model_path=None,training_logs_path=None,feature_engineering_logs_path=None):
    """
    Runs Code inside Sandbox and give you the output And 
    to get output like model you had to write it inside local_scope dictionary in model key
    local_scope looks like:
    {
        model: None,
        metrics: {},
        output: {}
    }
    in output you had to write if json information or plotly.json to make graph on json
    Args:
    code : give the code which has to be run
    """
    volume.reload()
    session_model_dir = f"/vault/models/{userid}/{chatid}"
    os.makedirs(session_model_dir, exist_ok=True)

    local_scope = {
        "session_dir": session_model_dir,
    }
    stdout_capture = io.StringIO()
    
    try:
      
        with contextlib.redirect_stdout(stdout_capture):
            exec(code, globals(), local_scope)
            
        volume.commit()
            
    except Exception as e:
        error_trace = traceback.format_exc()
        stdout_capture.write(f"EXECUTION CRASHED.\nError: {str(e)}\nTraceback:\n{error_trace}\nPlease fix and try again.")
        raise e 
    terminal_output = stdout_capture.getvalue()

    return json.dumps({
        "output": terminal_output
    })

@app.function(volumes={"/vault": volume})
def get_model(model_path:str):
    """
    Get model from the final model path
    Args: model_path: file path of model stored
    output: model
    """
    volume.reload()
    model = _load_model_internal(model_path=model_path)
    return model

async def running_code(code:str, userid:str, chatid:str, dataset_url: str | None = None, model_path=None, training_logs_path=None, feature_engineering_logs_path=None):
    """
    Runs Code inside Sandbox and give you the output And 
    to get output like model you had to write it inside local_scope dictionary in model key
    local_scope looks like:
    {
        model: None,
        metrics: {},
        output: {}
    }
    in output you had to write if json information or plotly.json to make graph on json
    Args:
    code : give the code which has to be run
    """
    f = modal.Function.from_name("omniAgent-Sandbox-Runner", "run_code")
    result = await f.remote.aio(
        code,
        userid,
        chatid
    )
            
    return result

@app.function(volumes={"/vault": volume})
async def get_file(file_path: str):
    """
    Get a file from the volume
    Args: file_path: path to the file in the volume
    Returns: file content
    """
    volume.reload()
    with open(file_path, "r") as f:
        content = f.read()
    return content

async def getFile(file_path: str):
    """
    Async version of get_file to fetch file content from the volume
    """
    f = modal.Function.from_name("omniAgent-Sandbox-Runner", "get_file")
    content = await f.remote.aio(file_path)
    return content