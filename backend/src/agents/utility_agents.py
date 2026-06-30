import json

from src.core.state import AgentState, MODEL_ANALYZER_RESULT, DATASET_ANALYZER_RESULT, TRAINING_RESULT, EDA_RESULT, FEATURE_ENGINEERING_RESULT, INFERENCE_RESULT
from logger import logger

from langchain_mistralai import ChatMistralAI
from dotenv import load_dotenv
import os
from langgraph.graph.message import RemoveMessage
load_dotenv()



mistral_model = "codestral-latest"
llm = ChatMistralAI(model=mistral_model, temperature=0.7)

ctv = {
    MODEL_ANALYZER_RESULT: "model_analyzer_output",
    DATASET_ANALYZER_RESULT: "dataset_analyzer_output",
    TRAINING_RESULT: "training_output",
    EDA_RESULT: "eda_output",
    FEATURE_ENGINEERING_RESULT: "feature_engineering_output",
    INFERENCE_RESULT: "inference_output"
}



async def STRUCTURED_OUTPUT_AGENT(state: AgentState) -> dict:
    logger.info("--- Phase 0: Structured Output Agent ---")
    curr = state.get('curr')

    userid = state.get('userid')
    chatid = state.get('chatid')
    output_key = ctv.get(curr)
    messages = state.get('messages', [])
    execution_logs = "No tool execution logs found."
    for msg in reversed(messages):
        if msg.type == "tool":
            execution_logs = msg.content
            break

    # Fast-Path: Try to extract JSON directly from tool execution logs to save an LLM call!
    logger.info(f"--> [FORMATTER] Attempting fast-path JSON parsing for {output_key}...")
    import re
    try:
        # Check if the execution_logs itself is a JSON with an "output" field
        tool_resp = json.loads(execution_logs)
        terminal_output = tool_resp.get("output", execution_logs)
    except Exception:
        terminal_output = execution_logs

    # Scan for JSON block
    try:
        json_match = re.search(r'\{.*\}', terminal_output, re.DOTALL)
        if json_match:
            parsed_json = json.loads(json_match.group())
            validated = curr.model_validate(parsed_json)
            
            logger.info(f"--> [FORMATTER] FAST-PATH SUCCESS! Bypassing LLM for {output_key}.")
            delete_messages = [RemoveMessage(id=msg.id) for msg in messages if msg.id is not None]
            return {
                output_key: validated.model_dump(),
                "messages": delete_messages
            }
    except Exception as e:
        logger.warning(f"--> [FORMATTER] Fast-path failed: {str(e)}. Falling back to LLM...")

    # 5. BACKUP LAYER: If programmatic fails, let LLM refine it
    logger.info("--> [FORMATTER] Triggering LLM Structured Refiner Node...")
    eda_structured_prompt = f"""
    YOU ARE AN EXPERT STRUCTURED OUTPUT REFINER. 
    Your task is to extract and format the raw output from a tool execution into the strictly requested JSON structure.
    
    RAW TOOL OUTPUT:
    ```
    {execution_logs}
    ```
    """

    structured_llm = llm.with_structured_output(curr)
    final_structured_result = await structured_llm.ainvoke(eda_structured_prompt)
    
    delete_messages = [RemoveMessage(id=msg.id) for msg in messages if msg.id is not None]
    logger.info(f"--> [FORMATTER] LLM Refinement completed for {output_key}. Final structured output ready.")
    return {
        output_key: final_structured_result.model_dump(),
        "messages": delete_messages
    }