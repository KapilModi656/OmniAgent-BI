
from src.core.state import AgentState, DATASET_ANALYZER_RESULT

from src.utils import running_code
from dotenv import load_dotenv
from logger import logger 
import json
import textwrap
from langchain_mistralai import ChatMistralAI
from langchain_core.messages import SystemMessage

load_dotenv()


mistral_model = "codestral-latest"
llm = ChatMistralAI(model=mistral_model, temperature=0.3, timeout=300, max_retries=5)



async def DATASET_ANALYZER_AGENT(state: AgentState) -> dict:
    logger.info("--- Phase 1: DATASET_ANALYZER_AGENT Coding & Executing ---")
    code = textwrap.dedent(f"""
    import pandas as pd
    
    df = pd.read_csv("{state.get('dataset_url')}")
    column_types = df.dtypes.apply(lambda x: str(x)).to_dict()
    column_names = df.columns.tolist()
    dataset_info = df.info()
    missing_values = df.isnull().sum().to_dict()
    target_column = df.columns[-1]
    dataset_size = df.shape
    dataset_summary = df.describe().to_string()
    print("column_types:", column_types)
    print("column_names:", column_names)
    print("dataset_info:", dataset_info)
    print("missing_values:", missing_values)
    print("target_column:", target_column)
    print("dataset_size:", dataset_size)
    print("dataset_summary:", dataset_summary)
    """)
    result = await running_code(code=code,userid=state.get('userid'), chatid=state.get('chatid'), dataset_url=state.get('dataset_url'))
    result = json.loads(result)
    logger.info(f"Dataset Analyzer Output: {result}")
    structured_prompt = f"""
    YOU ARE AN EXPERT STRUCTURED OUTPUT REFINER. 
    Your task is to extract and format the raw output from a tool execution into the strictly requested JSON structure.
    
    RAW TOOL OUTPUT:
    ```
    {result}
    ```
    """
    structured_llm = llm.with_structured_output(DATASET_ANALYZER_RESULT)
    final_structured_result = await structured_llm.ainvoke(structured_prompt)
    logger.info(f"--> [FORMATTER] LLM Refinement completed for dataset_analyzer_output. Final structured output ready. Final structured output: {final_structured_result.model_dump()}")
    return {
        "dataset_analyzer_output": final_structured_result.model_dump()
    }
    
    