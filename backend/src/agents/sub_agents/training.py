
import time

from src.core.state import AgentState, TRAINING_RESULT
from src.core.tools import get_sandbox_tool
from src.utils import running_code
from dotenv import load_dotenv
from logger import logger

from langchain_mistralai import ChatMistralAI
from langchain_core.messages import SystemMessage

load_dotenv()



mistral_model = "codestral-latest"
llm = ChatMistralAI(model=mistral_model, temperature=0.5, timeout=500, max_retries=10)



async def TRAINING_AGENT(state: AgentState) -> dict:
    logger.info("--- Phase 1: TRAINING_AGENT Coding & Executing ---")
  
    executable_tool = get_sandbox_tool(state, llm, running_code)
    dataset_url = state.get('dataset_url')
    userid = state.get('userid')
    chatid = state.get('chatid')
    session_dir = f"/vault/models/{userid}/{chatid}"
    curr_messages = state.get('messages', [])
    
    
    fe_prompt = f"""You are an Automated Training Engine. Write a script to train an ML model.

--- STATE CONTRACT ---
- DATASET URL: '{dataset_url}'
- Absolute Target Feature: '{state.get('dataset_analyzer_output', {}).get('target_column')}'
- Predefined Scope Objects: `session_dir`. You don't need to initialize session_dir it is already available in the environment scope.
- Dataset ANALYSIS: '{state.get('dataset_analyzer_output', {})}'
- AND VALUE OF 'session_dir' IS ABSOLUTE PATH TO THE SESSION DIRECTORY WHERE ALL FILES ARE SAVED. SO YOU CAN USE IT TO DEFINE PATHS FOR MODEL AND PREPROCESSOR SAVING IN THE CONTRACT DEFINED ABOVE. it is `{session_dir}`
--- RUNTIME LAWS ---
- Separate features/label: `y = df['{state.get('dataset_analyzer_output', {}).get('target_column')}']`
- **ENSEMBLE SEARCH:** Use `RandomizedSearchCV` on params of model to minimize error and get the best model.
- **PIPELINE WARN:** Prefix hyperparams with step name (e.g., `model__n_estimators`).
- **ERROR AVOIDANCE (CRITICAL):** 
  1) `PicklingError`: Do NOT write custom inline functions (e.g. for `FunctionTransformer`). Use ONLY built-in Scikit-learn classes (like `SimpleImputer`) so `pickle` can save the pipeline.
- Transform dataset properly, call `review_and_execute_code`, and log all steps to `training.log`.
- Save final pipeline to `os.path.join(session_dir, "model.pkl")`.
- **CODE EXAMPLE:**
```python
from sklearn.pipeline import Pipeline
from xgboost import XGBRegressor
from sklearn.model_selection import RandomizedSearchCV
pipe_xg = Pipeline([('preprocessor', preprocessor), ('model', XGBRegressor())])
params = {{
    'model__n_estimators': [50, 60, 100],
    'model__max_depth': [3, 5, 7],
    'model__learning_rate': [0.01, 0.1, 0.2]
}}
search_xg = RandomizedSearchCV(pipe_xg, params, cv=2).fit(X, y)
final_pipe = search_xg.best_estimator_
import pickle
with open(os.path.join(session_dir, "model.pkl"), "wb") as f: pickle.dump(final_pipe, f)
```
- YOU HAVE TO TRANSFORM THE DATASET TO MAKE IT MORE APPROPRIATE FOR MODEL TRAINING BASED ON THE DATASET ANALYSIS LOGS YOU GOT FROM THE PREVIOUS STEP.
- You MUST call the `review_and_execute_code` tool and pass your complete Python script as the 'code' argument.
- Carefully log the training process and transformation steps in a file named `training.log` inside the `session_dir`. print the absolute path of the log file as `print("training_logs_path: " + os.path.join(session_dir, "training.log"))`. As it will be used in further processes.
- In logging File you have to write about each process in detail what transformation you are doing like if you are changing column then you have to name that column so after training prediction would be bit easier to understand. So you have to write about each transformation in detail in the log file.Also define in which column you had used preprocessor
--- MANDATORY TARGET KEYS ---
1. model_metrics: Must be a flat dictionary of float validation scores (e.g., `{{"accuracy": 0.91}}`).
2. training_logs_path: Path to the training log file where the training process and transformation of dataset is logged.
3. pipeline_path: Path to the saved model pipeline with preprocessor. Save it as `os.path.join(session_dir, "model.pkl")`.
4. session_dir is already available in the environment scope. You don't need to initialize session_dir it is already available in the environment scope.
- You MUST print all the above data using `json.dumps()`. DO NOT print anything else at the end.
LOGGING RULES (CRITICAL):
- You MUST use Python's standard `logging` module to generate the `training.log` file.
- Configure the logger at the very beginning of your script to OVERWRITE the file (delete old, create new) by setting `filemode='w'`. Example:
  `import logging; logging.basicConfig(filename=os.path.join(session_dir, 'training.log'), filemode='w', level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')`
- You must log EVERY SINGLE transformation step in detail. For example, if you impute missing values in a column, log the column name and the imputation strategy. If you encode categories, log the columns and the encoding type.
- Do NOT just write a simple summary. Write professional, timestamped logs for data loading, preprocessing steps, hyperparameter tuning, and final evaluation.
**OUTPUT FORMAT (CRITICAL FOR FAST-PATH):**
```python
import json
output_dict = {{
    "model_metrics": {{"accuracy": 0.91, "f1_score": 0.89}},
    "pipeline_path": os.path.join(session_dir, "model.pkl"),
    "training_logs_path": os.path.join(session_dir, "training.log")
}}
print(json.dumps(output_dict))
```
"""
    system_message = SystemMessage(content=fe_prompt)

    # 2. User ki original request nikaalein taaki agent apna main task na bhoole
    human_messages = [msg for msg in curr_messages if msg.type == "human"]

    # 3. History mein se AI aur Tool ke saare messages alag karein
    ai_messages = [msg for msg in curr_messages if msg.type == "ai"]
    tool_messages = [msg for msg in curr_messages if msg.type == "tool"]

    # 4. Sirf sabse aakhri (latest) AI aur Tool message uthayein
    last_ai_message = [ai_messages[-1]] if ai_messages else []
    last_tool_message = [tool_messages[-1]] if tool_messages else []

    # 5. Apna perfectly optimized context banayein
    messages_to_pass = [system_message] + human_messages + last_ai_message + last_tool_message
        
    has_successful_execution = any(
        msg.type == "tool" and "EXECUTION SUCCESSFUL" in str(msg.content)
        for msg in messages_to_pass
    )
    if not has_successful_execution:
        logger.warning("No successful tool execution detected in messages. Check if the executable tool is properly integrated.")
        data_agent = llm.bind_tools(
            [executable_tool], 
            tool_choice={
                "type": "function",
                "function": {"name": "review_and_execute_code"}
            }
        )
    else:
        data_agent = llm.bind_tools([executable_tool],tool_choice="auto")
   
    execution_response = await data_agent.ainvoke(messages_to_pass)
   
    logger.info(f"-> TRAINING_AGENT Execution Response:\n{execution_response}")
    return {
        "curr": TRAINING_RESULT,
        "messages": [execution_response],
    }
    
    