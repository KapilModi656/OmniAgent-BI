from src.core.state import AgentState, EDA_RESULT
from src.core.tools import get_sandbox_tool
from src.utils import running_code
from dotenv import load_dotenv
from logger import logger

from langchain_mistralai import ChatMistralAI
from langchain_core.messages import SystemMessage

load_dotenv()



mistral_model = "codestral-latest"
llm = ChatMistralAI(model=mistral_model, temperature=0.7, timeout=300, max_retries=5)



async def EDA_AGENT(state: AgentState) -> dict:
    logger.info("--- Phase 1: EDA Agent Coding & Executing ---")
  
    executable_tool = get_sandbox_tool(state, llm, running_code)
    dataset_url = state.get('dataset_url')
    curr_messages = state.get('messages', [])
    
    
    eda_prompt = f"""You are an Expert Data Scientist performing Exploratory Data Analysis (EDA).
    Your task is to analyze the dataset located at: '{dataset_url}'.

    SANDBOX ENVIRONMENT RULES:
    - Predefined parameters in scope:  `session_dir` (str).
    - Use print() and output all results in print() statements. Do not return values from functions.
    DATASET ANALYSIS:
        {state.get('dataset_analyzer_output', 'No dataset analysis available.')}
    REQUIRED TASKS:
    Write a Python script using `pandas` and `plotly.express` to generate exactly 6 plots.
    - `session_dir` is predefined. Save JSON plots there.
    
    **STRICT RULES:**
    1. **GENERATE EXACTLY 6 PLOTS**
    2. **SIZE LIMIT (CRITICAL):** Aggregate data for Bar/Line charts. Sample to `n=2000` for Scatter/Box plots if dataset > 10K rows.
    5. **SAVE FIGURES CORRECTLY:** Use `f.write(fig.to_json())` to save the JSON directly. DO NOT use `json.dump()` as it double-encodes the string and breaks the frontend!
    6. Call `review_and_execute_code` with the code parameter. Do not apologize on errors, just retry.
    
    **OUTPUT FORMAT (CRITICAL FOR FAST-PATH):**
    You MUST output the final result strictly as a JSON string using `json.dumps()`. DO NOT print anything else at the end.
    Also your save data path should stricly be os.path.join(session_dir, "plot1.json"), os.path.join(session_dir, "plot2.json"), ..., os.path.join(session_dir, "plot6.json").
    and session_dir is a predefined variable in the sandbox environment. Do not hardcode any paths.
    ```python
    eda_paths = [os.path.join(session_dir, "plot1.json"), ...] # ONLY paths that exist
    import json
    print(json.dumps({{"eda_plots_paths": eda_paths}}))
    ```
    """
    system_message = SystemMessage(content=eda_prompt)

    # 2. User ki original request nikaalein taaki agent apna main task na bhoole
    human_messages = [msg for msg in curr_messages if msg.type == "human"]

    # 3. History mein se AI aur Tool ke saare messages alag karein
    ai_messages = [msg for msg in curr_messages if msg.type == "ai"]
    tool_messages = [msg for msg in curr_messages if msg.type == "tool"]

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
        eda_agent = llm.bind_tools(
            [executable_tool], 
            tool_choice={
                "type": "function",
                "function": {"name": "review_and_execute_code"}
            }
        )
    else:
        eda_agent = llm.bind_tools([executable_tool],tool_choice="auto")

    execution_response = await eda_agent.ainvoke(messages_to_pass)
    curr_response = execution_response
    logger.info(f"-> EDA Agent Execution Response:\n{curr_response}")
    return {
        "curr": EDA_RESULT,
        "messages": [execution_response],
    }