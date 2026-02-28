from pydantic import BaseModel
from typing import Optional


class VizRequest(BaseModel):
    chart_type: str  # "bar", "line", "pie", "scatter", "heatmap", "area", "horizontal_bar", "stacked_bar", "donut"
    title: str
    x_label: Optional[str] = None
    y_label: Optional[str] = None
    data: dict  # {"labels": [...], "datasets": [{"label": "...", "values": [...], "colors": [...]}]}
    style: str = "dark"


class VizResponse(BaseModel):
    viz_id: str
    chart_type: str
    title: str
    download_url: str
