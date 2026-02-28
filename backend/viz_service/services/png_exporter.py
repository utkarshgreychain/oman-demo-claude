"""Functions to serve chart PNGs from the visualization output directory."""

import os

from shared.config import get_settings

settings = get_settings()

VIZ_OUTPUT_DIR = settings.VIZ_OUTPUT_DIR


def get_chart_path(viz_id: str) -> str:
    """Return the absolute filesystem path for a chart PNG.

    Args:
        viz_id: The UUID identifier of the chart.

    Returns:
        The full path to the PNG file (may or may not exist on disk).
    """
    return os.path.join(VIZ_OUTPUT_DIR, f"{viz_id}.png")


def chart_exists(viz_id: str) -> bool:
    """Check whether the chart PNG exists on disk.

    Args:
        viz_id: The UUID identifier of the chart.

    Returns:
        True if the file exists, False otherwise.
    """
    return os.path.isfile(get_chart_path(viz_id))
