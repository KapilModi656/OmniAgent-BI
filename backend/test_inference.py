from src.workflow.inference_workflow import INFERENCE_WORKFLOW
from langchain_mistralai import ChatMistralAI
from dotenv import load_dotenv
import asyncio

load_dotenv()

async def main():
    llm = ChatMistralAI(model="codestral-latest", temperature=0.7)
    graph = INFERENCE_WORKFLOW(llm)
    
    state = {
        "userid": 1,
        "chatid": 1,
        "dataset_url": "/vault/models/1/1/dataset.csv",
        "dataset_analyzer_output": {"target_column": "target"},
        "pipeline_path": "/vault/models/1/1/pipeline.pkl",
        "messages": []
    }
    
    print("Starting inference...")
    try:
        async for chunk in graph.astream(state):
            print("CHUNK:", chunk)
    except Exception as e:
        print("ERROR:", e)

if __name__ == "__main__":
    asyncio.run(main())
