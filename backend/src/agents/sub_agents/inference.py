from src.core.state import AgentState, INFERENCE_RESULT
from src.core.tools import get_sandbox_tool
from src.utils import running_code
from dotenv import load_dotenv
from logger import logger

from langchain_mistralai import ChatMistralAI
from langchain_core.messages import SystemMessage
import os
import time

load_dotenv()

mistral_model = "codestral-latest" # Ensure using correct model name
llm = ChatMistralAI(model=mistral_model, temperature=0.7, timeout=300, max_retries=5)

async def INFERENCE_AGENT(state: AgentState) -> dict:
    logger.info("--- Phase 3: INFERENCE_AGENT Coding & Executing ---")
  
    executable_tool = get_sandbox_tool(state, llm, running_code)
    dataset_url = state.get('dataset_url')
    target_column = state.get('dataset_analyzer_output', {}).get('target_column', '')
    curr_messages = state.get('messages', [])
    
    # 1. Hamesha naya System Prompt banayein (No 'if not curr_messages' bug)
    fe_prompt = f"""You are an Expert Deployment Engineer running batch inferences.
Your task is to make predictions on the dataset located at: '{dataset_url}'.

SANDBOX ENVIRONMENT RULES:
- Predefined parameters in scope: `session_dir` (str).
- Use `print()` to output your final results in a valid JSON format.

STRICT INSTRUCTIONS:
- Training logs: {state.get('training_logs', 'No training log provided.')}
- Pipeline path: {state.get('pipeline_path', 'No pipeline path provided.')}
- Target column to DROP (if it exists in the test data): '{target_column}'
- You MUST call the `review_and_execute_code` tool and pass your complete Python script.
- The pipeline already contains the preprocessor. Just load the pipeline and predict.
- You must explicitly import all libraries you use (e.g., `import pandas as pd`, `import joblib`, `import json`, `import os`).
- CRITICAL: If the target column '{target_column}' exists in the test dataset, you MUST drop it before calling `pipeline.predict()`.
- session_dir is a predefined variable that points to the sandbox directory where you can save your predictions file.So you mustn't initialize it or change it. Use it to save your predictions file.
REQUIRED TASKS:
Write a python script that executes predictions, saves ONLY the prediction column to a new CSV file, and prints the path in JSON format.
Example Code Structure:
```python
import pandas as pd
import os
import joblib
import json

# 1. Load pipeline and data
model_pipeline = joblib.load('{state.get('pipeline_path')}')
dataset = pd.read_csv('{dataset_url}')

# 2. Drop target column if user accidentally uploaded it
if '{target_column}' and '{target_column}' in dataset.columns:
    dataset = dataset.drop(columns=['{target_column}'])
# 3. Transform data as mentioned in the training logs (if any)
# 4. Predict and format
predictions = model_pipeline.predict(dataset)
predictions_df = pd.DataFrame(predictions, columns=['{target_column}'])

# 5. Save ONLY the predictions column
import time
predictions_filename = f'predictions_{int(time.time())}.csv'
predictions_path = os.path.join(session_dir, predictions_filename)
predictions_df.to_csv(predictions_path, index=False)

# 6. Output Result explicitly as JSON string inside print
print(json.dumps({{"predictions_path": predictions_path}}))
```
"""

    system_message = SystemMessage(content=fe_prompt)
    filtered_messages = [msg for msg in curr_messages if msg.type != "system"]

    human_messages = [msg for msg in filtered_messages if msg.type == "human"]
    ai_messages = [msg for msg in filtered_messages if msg.type == "ai"]
    tool_messages = [msg for msg in filtered_messages if msg.type == "tool"]

    last_ai_message = [ai_messages[-1]] if ai_messages else []
    last_tool_message = [tool_messages[-1]] if tool_messages else []

    messages_to_pass = [system_message] + human_messages + last_ai_message + last_tool_message

    has_successful_execution = any(
    "EXECUTION SUCCESSFUL" in str(msg.content)
    for msg in last_tool_message
    )

    if has_successful_execution:
        logger.info("Inference successful. Bypassing LLM call to save time.")
        from langchain_core.messages import AIMessage
        return {
            "curr": INFERENCE_RESULT,
            "messages": [AIMessage(content="Code executed successfully. Proceeding to formatting.")]
        }

    logger.warning("No successful tool execution detected. Forcing tool call.")
    data_agent = llm.bind_tools(
        [executable_tool],
        tool_choice="review_and_execute_code" # FORCE TOOL USE
    )

    execution_response = await data_agent.ainvoke(messages_to_pass)

    logger.info(f"-> INFERENCE_AGENT Execution Response:\n{execution_response.content}")

    return {
    "curr": INFERENCE_RESULT,
    "messages": [execution_response],
    }