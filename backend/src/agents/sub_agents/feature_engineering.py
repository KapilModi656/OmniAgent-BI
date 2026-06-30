from src.core.state import AgentState, FEATURE_ENGINEERING_RESULT
from src.core.tools import get_sandbox_tool
from src.utils import running_code
from dotenv import load_dotenv
from logger import logger

from langchain_mistralai import ChatMistralAI
from langchain_core.messages import SystemMessage
import os

load_dotenv()


mistral_model = "codestral-latest"
llm = ChatMistralAI(model=mistral_model, temperature=0.1, timeout=300, max_retries=5)



async def FEATURE_ENGINEERING_AGENT(state: AgentState) -> dict:
    logger.info("--- Phase 1: FEATURE_ENGINEERING_AGENT Coding & Executing ---")
  
    executable_tool = get_sandbox_tool(state, llm, running_code)
    dataset_url = state.get('dataset_url')
    userid = state.get('userid')
    chatid = state.get('chatid')
    curr_messages = state.get('messages', [])
    if not curr_messages:
    
        fe_prompt = f"""You are an Automated Data Engineering Engine. Your ONLY task is to write and execute a Python script to preprocess a dataset. 

--- CONTEXT ---
- Dataset Location: `{dataset_url}`
- Dataset Insights: {state.get('dataset_analyzer_output', 'No dataset analysis available.')}`

--- INSTRUCTIONS ---
1. Load the dataset from `dataset_url` using pandas.
2. Perform necessary preprocessing steps based on the dataset insights.
3. Save the transformed dataset as a CSV file to `os.path.join(session_dir, "transformed_dataset.csv")`.
4. Create a log file with a summary of the transformations at `os.path.join(session_dir, "transformation_steps.log")`.
5. You MUST populate the `output` dictionary with the exact following keys:
    - `output["transformed_dataset_path"]`: The absolute path to the transformed CSV file (Must be a valid string, NULL VALUES ARE STRICTLY FORBIDDEN).
    - `output["transformation_logs_path"]`: The absolute path to the transformation logs file (Must be a valid string, NULL VALUES ARE STRICTLY FORBIDDEN).
    - `output["feature_engineering_logs"]`: A string summarizing the feature engineering process.
6. You MUST call the `review_and_execute_code` tool and pass your complete Python script as the 'code' argument.
7. YOU MUSTN'T DEFINE OR INITIALIZE THE `output` DICTIONARY IN YOUR CODE. IT IS ALREADY AVAILABLE IN THE ENVIRONMENT SCOPE. JUST DIRECTLY POPULATE THE KEYS IN THE `output` DICTIONARY WITH PROPERLY TYPED VALUES.

--- CRITICAL CONSTRAINTS ---
- You just had to feature engineer the dataset based on the insights you got from the dataset analysis step. DO NOT perform any modeling, EDA, or data analysis in this step. JUST PURE FEATURE ENGINEERING.
- NO CHIT-CHAT: Do not explain your plan or reply with conversational text. 
- TOOL EXECUTION REQUIRED: You MUST call the `review_and_execute_code` tool and pass your complete Python script as the 'code' argument. 
- ENVIRONMENT: The `output` dictionary and `session_dir` variable are already globally available in the sandbox. Do not initialize them.
- NO PRINT STATEMENTS: Do not use `print()` or `display()`. All results must go into the `output` dictionary.
"""
        curr_messages = [SystemMessage(content=fe_prompt)]
    
    has_successful_execution = any(
        msg.type == "tool" and "EXECUTION SUCCESSFUL" in str(msg.content)
        for msg in curr_messages
    )
   

    data_agent = llm.bind_tools(
        [executable_tool], 
        tool_choice={
            "type": "function",
            "function": {"name": "review_and_execute_code"}
        }
    )
    
    
    execution_response = await data_agent.ainvoke(curr_messages)
   
    logger.info(f"-> FEATURE_ENGINEERING_AGENT Execution Response:\n{execution_response}")
    return {
        "curr": FEATURE_ENGINEERING_RESULT,
        "messages": [execution_response],
    }

