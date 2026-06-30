import json

from src.core.state import AgentState,CODE_REVIEW_RESULT
from langchain_core.tools import tool
from dotenv import load_dotenv
from logger import logger
from langchain_mistralai import ChatMistralAI
from pydantic import BaseModel, Field
from src.utils import run_code
load_dotenv()


mistral_model = "codestral-latest"
llm = ChatMistralAI(model=mistral_model, temperature=0.7)
class CodeExecutionInput(BaseModel):
    code: str = Field(
        default="", 
        description="The absolute raw Python code string to be executed. Do not include any other keys or flags."
    )
    script: str = Field(
        default="",
        description="Fallback field in case the LLM uses 'script' as the argument key."
    )
    review_and_execute_code: str = Field(
        default="",
        description="Fallback field in case the LLM uses the tool name as the argument key."
    )
    source: str = Field(
        default="",
        description="Fallback field in case the LLM uses 'source' as the argument key."
    )

async def _execute_core(code: str, userid: str, chatid: str, dataset_url: str | None, model_path: str | None, training_logs_path: str | None, fe_logs_path: str | None, llm, running_code) -> str:
    logger.info("-> Global Runner Called: Reviewing code internally...")
    
    # Code Review Layer
    review_prompt = f"""Review this Python script for critical syntax errors or severe logic flaws ONLY.
    
IGNORE the following rules (DO NOT reject the code for these):
1. The variable `session_dir` are globally injected by the sandbox environment. They are NOT undefined.
2. Exception handling (try/except blocks) and input validation are NOT required for this script.
3. Logging or monitoring is NOT required.

Code to review:
```python
{code}
"""
    structured_reviewer = llm.with_structured_output(CODE_REVIEW_RESULT)
    review = await structured_reviewer.ainvoke(review_prompt)
    
    if not review.is_ok:
        logger.info("-> Global Runner: Code Rejected!")
        return f"EXECUTION BLOCKED. Code Review Failed.\nIssues: {review.issues_found}\nPlease fix and try again."
    
    # Modal Sandbox Execution Layer
    logger.info("-> Global Runner: Code Approved! Launching Modal Sandbox...")
    try:
        logs = await running_code(
            code=code, 
            userid=userid, 
            chatid=chatid, 
            dataset_url=dataset_url,
            model_path=model_path,
            training_logs_path=training_logs_path,
            feature_engineering_logs_path=fe_logs_path
        )
        return f"EXECUTION SUCCESSFUL.\nModal Output:\n{logs}"
    except Exception as e:
        return f"EXECUTION CRASHED.\nError: {str(e)}\nPlease fix and try again."


# --- 2. THE TOOL FACTORY (Yeh aapka code reuse karega) ---
def get_sandbox_tool(state: dict, llm, running_code):
    """
    Factory function jo Agent ki State lekar ek ready-to-use 
    LangChain tool return karta hai.
    """
    userid = state.get('userid')
    chatid = state.get('chatid')
    dataset_url = state.get('dataset_url')
    model_path = state.get('model_path')
    training_logs_path = state.get('training_logs_path')
    fe_logs_path = state.get('transformation_logs_path')
   

    # Yeh dynamic tool sirf 'code' input lega LLM se, baaki variables background se milenge
    @tool(args_schema=CodeExecutionInput)
    async def review_and_execute_code(code: str = "", script: str = "", review_and_execute_code: str = "", source: str = "") -> str:
        """
        Executes a raw Python string script inside the secure container sandbox environment.
        Accepts ONLY a single 'code' string argument. Do not pass review flags or boolean parameters.
        """
        actual_code = code or script or review_and_execute_code or source
        # Global core logic ko call karna
        return await _execute_core(actual_code, userid, chatid, dataset_url, model_path, training_logs_path, fe_logs_path, llm, running_code)


    return review_and_execute_code