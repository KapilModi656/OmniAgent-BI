from src.agents.agent import create_agent_subgraph
from langgraph.graph import StateGraph, START, END
from src.agents.sub_agents.inference import INFERENCE_AGENT
from src.core.state import AgentState
from src.agents.sub_agents.model_analyzer_agent import MODEL_ANALYZER_AGENT

def INFERENCE_WORKFLOW(llm):

    inference_subgraph = create_agent_subgraph(INFERENCE_AGENT, llm)
    
    # --- Main Workflow Graph ---
    main_workflow = StateGraph(AgentState)
    
  
    main_workflow.add_node("inference", inference_subgraph)
    
    # Wiring the workflow
    main_workflow.add_edge(START, "inference")
    main_workflow.add_edge("inference", END)
    
    return main_workflow.compile()