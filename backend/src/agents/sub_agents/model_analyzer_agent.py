from src.core.state import AgentState, MODEL_ANALYZER_RESULT
from src.core.tools import get_sandbox_tool
from src.utils import running_code
from dotenv import load_dotenv
from logger import logger

from langchain_mistralai import ChatMistralAI
from langchain_core.messages import SystemMessage

load_dotenv()



mistral_model = "codestral-latest"
llm = ChatMistralAI(model=mistral_model, temperature=0.7, timeout=300, max_retries=5)



async def MODEL_ANALYZER_AGENT(state: AgentState) -> dict:
    logger.info("--- Phase 1: MODEL_ANALYZER_AGENT Coding & Executing ---")
  
 
    dataset_url = state.get('dataset_url')
    userid = state.get('userid')
    chatid = state.get('chatid')
    curr_messages = state.get('messages', [])
    if not curr_messages:
    
        data_prompt = f"""You are an Expert ML Interpreter and Core Data Architect.
        Your task is to extract internal structural coefficients and feature importances from the trained model.

        SANDBOX ENVIRONMENT RULES:
        - Predefined parameters in scope: `output` (dict), `session_dir` (str), `feature_engineering_logs_path` (str/None), and `training_logs_path` (str/None).
        - INJECTED MODEL RULE: The trained model instance is ALREADY loaded and available in scope as a variable named `model`.
        - DO NOT use print(). All outputs must be saved directly inside the predefined `output` dictionary.

        REQUIRED TASKS:
        Write a python script that analyzes model parameters, reads structural context logs, and populates `output`:
        - output["column_types"]: A dictionary mapping features to their column data types.
        - output["feature_importance"]: Extract parameters from `model.feature_importances_` or `model.coef_`. Map each feature name string to its float relative importance score inside a dictionary.
        - output["model_summary"]: A string detailing estimator parameters, hyperparameters configurations, and layer/tree sizes.
        - output["transformation_logs"]: CRUCIAL! Open and read the file content located at the injected `feature_engineering_logs_path` variable. Extract the logs of transformations applied to the dataset from that file, and save that log data as a clean string here.
        - output["target_column"]: A string indicating the predictive target label of this model.
        - output["column_names"]: A flat list of feature column name strings that the model expects as input arrays.
        """
        curr_messages = [SystemMessage(content=data_prompt)]
    
    executable_tool = get_sandbox_tool(state, llm, running_code)
    has_successful_execution = any(
        msg.type == "tool" and "EXECUTION SUCCESSFUL" in str(msg.content)
        for msg in curr_messages
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

    execution_response = await data_agent.ainvoke(curr_messages)
   
    logger.info(f"-> MODEL_ANALYZER_AGENT Execution Response:\n{execution_response}")
    return {
        "curr": MODEL_ANALYZER_RESULT,
        "messages": [execution_response],
    }
    
    