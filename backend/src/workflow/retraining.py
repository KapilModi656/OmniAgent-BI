from src.agents.agent import create_agent_subgraph
from langgraph.graph import StateGraph, START, END
from src.agents.sub_agents.dataset_analyzer import DATASET_ANALYZER_AGENT
from src.agents.sub_agents.model_analyzer_agent import MODEL_ANALYZER_AGENT
from src.agents.sub_agents.eda import EDA_AGENT
from src.agents.sub_agents.feature_engineering import FEATURE_ENGINEERING_AGENT
from src.agents.sub_agents.training import TRAINING_AGENT
from src.core.state import AgentState
from IPython.display import display, Image

def RETRAINING_WORKFLOW(llm):
    
    dataset_analyzer_subgraph = create_agent_subgraph(DATASET_ANALYZER_AGENT, llm)
   
    eda_subgraph = create_agent_subgraph(EDA_AGENT, llm)
    feature_engineering_subgraph = create_agent_subgraph(FEATURE_ENGINEERING_AGENT, llm)
    
    training_subgraph = create_agent_subgraph(TRAINING_AGENT, llm)
   
    main_workflow = StateGraph(AgentState)
    
    # Adding subgraphs as nodes
    main_workflow.add_node("model_analysis", create_agent_subgraph(MODEL_ANALYZER_AGENT, llm))
    main_workflow.add_node("dataset_analysis", dataset_analyzer_subgraph)
    main_workflow.add_node("eda", eda_subgraph)
    main_workflow.add_node("feature_engineering", feature_engineering_subgraph)
    main_workflow.add_node("training", training_subgraph)
    
    # Wiring the workflow
    main_workflow.add_edge(START, "dataset_analysis")
    main_workflow.add_edge("dataset_analysis", "model_analysis")
    main_workflow.add_edge("model_analysis", "eda")
    main_workflow.add_edge("eda", "feature_engineering")
    main_workflow.add_edge("feature_engineering", "training")
    main_workflow.add_edge("training", END)
    
    return main_workflow.compile()

if __name__ == "__main__":
    from langchain_mistralai import ChatMistralAI
    mistral_model = "codestral-latest"
    llm = ChatMistralAI(model=mistral_model, temperature=0.7)
    workflow = RETRAINING_WORKFLOW(llm)
    png_bytes = workflow.get_graph(xray=True).draw_mermaid_png()
    
    # 2. File me save karna ("wb" mode lagana zaroori hai kyuki data binary format me h)
    with open("retraining_workflow.png", "wb") as f:
        f.write(png_bytes)