from src.agents.agent import create_agent_subgraph
from langgraph.graph import StateGraph, START, END
from src.agents.sub_agents.eda import EDA_AGENT
from src.agents.sub_agents.feature_engineering import FEATURE_ENGINEERING_AGENT
from src.agents.sub_agents.dataset_analyzer import DATASET_ANALYZER_AGENT
from src.agents.sub_agents.training import TRAINING_AGENT
from src.core.state import AgentState
def TRAINING_WORKFLOW(llm):
    # Step 1: Dataset Analysis Subgraph
    dataset_analyzer_subgraph = DATASET_ANALYZER_AGENT
    
    # Step 2: EDA Subgraph
    eda_subgraph = create_agent_subgraph(EDA_AGENT, llm)
    
    # Step 3: Model Training Subgraph
    training_subgraph = create_agent_subgraph(TRAINING_AGENT, llm)
    
  
    main_workflow = StateGraph(AgentState)
    
    # Adding subgraphs as nodes
    main_workflow.add_node("dataset_analysis", dataset_analyzer_subgraph)
    main_workflow.add_node("eda", eda_subgraph)
    main_workflow.add_node("training", training_subgraph)
    
    # Wiring the workflow
    main_workflow.add_edge(START, "dataset_analysis")
    main_workflow.add_edge("dataset_analysis", "eda")
    main_workflow.add_edge("eda", "training")
    main_workflow.add_edge("training", END)
    
    return main_workflow.compile()