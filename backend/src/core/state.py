
from typing import TypedDict, Annotated, Optional, Any
from pydantic import BaseModel, Field


from langchain_core.messages import BaseMessage

from langgraph.graph.message import add_messages


class AgentState(TypedDict):
    messages: Annotated[list[BaseMessage], add_messages]
    userid: str
    chatid: str
    dataset_url: str | None
    training_logs_path: str | None
    pipeline_path: str | None
    route: str
    model_analyzer_output: dict | None
    dataset_analyzer_output: dict | None
    training_output: dict | None
    eda_output: dict | None
    inference_output: dict | None
    is_ok: bool
    code_review: str | None
    curr: classmethod | None
    training_logs: str | None
    dataset_columns: list[str] | None
    
    

class MODEL_ANALYZER_RESULT(BaseModel):
    column_types: dict[str, str] = Field(..., description="Dictionary mapping column names to their data types")
    feature_importance: dict[str, float] = Field(..., description="Dictionary mapping feature names to their importance scores")
    model_summary: str = Field(..., description="Textual summary of the model architecture, parameters, and performance")
    transformation_logs: str = Field(..., description="Logs of the transformations applied to the model get from the transformation log file from the given file path")
    target_column: str = Field(..., description="Name of the target column")
    column_names: list[str] = Field(..., description="List of column names")

class DATASET_ANALYZER_RESULT(BaseModel):
    column_types: dict[str, str] = Field(..., description="Dictionary mapping column names to their data types")
    missing_values: dict[str, int] = Field(..., description="Dictionary mapping column names to the count of missing values")
    dataset_summary: str = Field(..., description="Textual summary of the dataset")
    column_names: list[str] = Field(..., description="List of column names")
    dataset_info: str = Field(..., description="Information about the dataset")
    target_column: str = Field(..., description="Name of the target column")
    dataset_size: tuple[int, int] = Field(..., description="Size of the dataset as (num_rows, num_columns)")

class TRAINING_RESULT(BaseModel):
    training_logs_path: str = Field(..., description="path to the logs of the training process and transformations applied to the model get from the training log file from the given file path")
    model_metrics: dict[str, Any] = Field(..., description="Metrics evaluating the model's performance")
    pipeline_path: str = Field(..., description="Path to the saved model pipeline with preprocessor")
    
class EDA_RESULT(BaseModel):
    eda_plots_paths: list[str] = Field(..., description="List of paths to the plots generated during EDA")


class FEATURE_ENGINEERING_RESULT(BaseModel):
    feature_engineering_logs: str = Field(..., description="Logs of the feature engineering process")
    transformed_dataset_path: Optional[str] = Field(..., description="Path to the transformed dataset file")
    transformation_logs_path: Optional[str] = Field(..., description="Path to the transformation logs file")

class INFERENCE_RESULT(BaseModel):
    predictions_path: str = Field(..., description="Path to the predictions file")
   

    
class CODE_REVIEW_RESULT(BaseModel):
    is_ok: bool = Field(..., description="Indicates whether the code is correct and follows best practices")
    issues_found: list[str] = Field(..., description="List of issues found in the code")
    suggestions: list[str] = Field(..., description="List of suggestions for improving the code")
    