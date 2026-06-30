from langgraph.graph import StateGraph, START, END
from langgraph.prebuilt import ToolNode, tools_condition
from src.agents.sub_agents.dataset_analyzer import DATASET_ANALYZER_AGENT
from src.core.state import AgentState
from src.core.tools import get_sandbox_tool
from src.utils import running_code
from src.agents.utility_agents import STRUCTURED_OUTPUT_AGENT

def create_agent_subgraph(agent_node, llm):
    """
    Dynamic factory function jo kisi bhi agent ke liye 
    ready-to-use self-contained workflow compile karke deti hai.
    """
    sub_workflow = StateGraph(AgentState)
    
    # Node 1: Aapka customized agent (e.g., EDA_AGENT)
    sub_workflow.add_node("agent_brain", agent_node)
    
    # Node 2: Tool Execution Node (Dynamic tool binding injection)
    # Har run par fresh state ke sath tool generate karne ke liye wrapper node
    async def dynamic_tools_node(state: AgentState):
        from logger import logger
        logger.info("-> dynamic_tools_node CALLED")
        try:
            executable_tool = get_sandbox_tool(state, llm, running_code)
            tool_node = ToolNode([executable_tool])
            result = await tool_node.ainvoke(state)
            logger.info(f"-> dynamic_tools_node RESULT: {result}")
            return result
        except Exception as e:
            logger.error(f"-> dynamic_tools_node ERROR: {e}")
            raise e
        
    sub_workflow.add_node("execute_tools", dynamic_tools_node)
    
    # Node 3: Aapka universal output formatter
    sub_workflow.add_node("json_formatter", STRUCTURED_OUTPUT_AGENT)
    
    # --- Wiring the Sub-graph ---
    sub_workflow.add_edge(START, "agent_brain")
    
    # Routing Logic: Tool execution ya direct completion
    sub_workflow.add_conditional_edges(
        "agent_brain",
        tools_condition,
        {
            "tools": "execute_tools",
            END: "json_formatter"
        }
    )
    
    # Tool execution ke baad wapas brain ke paas jao
    sub_workflow.add_edge("execute_tools", "agent_brain")
    
    # Formatting ke baad sub-graph exit
    sub_workflow.add_edge("json_formatter", END)
    
    return sub_workflow.compile()
