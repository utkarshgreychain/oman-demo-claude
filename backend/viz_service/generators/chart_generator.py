"""Chart generator using matplotlib with dark theme support."""

import os
import uuid

import matplotlib
matplotlib.use("Agg")  # Headless rendering -- must be set before importing pyplot
import matplotlib.pyplot as plt
import numpy as np

from shared.config import get_settings
from shared.logger import get_logger
from ..models.schemas import VizRequest

logger = get_logger(__name__)
settings = get_settings()

# ---------------------------------------------------------------------------
# Dark theme configuration
# ---------------------------------------------------------------------------

DARK_THEME = {
    "figure.facecolor": "#1a1a2e",
    "axes.facecolor": "#16213e",
    "axes.edgecolor": "#334155",
    "axes.labelcolor": "#e2e8f0",
    "text.color": "#e2e8f0",
    "xtick.color": "#94a3b8",
    "ytick.color": "#94a3b8",
    "grid.color": "#1e293b",
    "legend.facecolor": "#16213e",
    "legend.edgecolor": "#334155",
}

CHART_COLORS = [
    "#6366f1",
    "#f59e0b",
    "#ef4444",
    "#22c55e",
    "#3b82f6",
    "#ec4899",
    "#8b5cf6",
]

# Ensure the output directory exists
VIZ_OUTPUT_DIR = settings.VIZ_OUTPUT_DIR
os.makedirs(VIZ_OUTPUT_DIR, exist_ok=True)


def _apply_dark_theme():
    """Apply the dark theme to matplotlib's rcParams."""
    for key, value in DARK_THEME.items():
        matplotlib.rcParams[key] = value


def _get_colors(dataset_index: int, num_items: int, dataset: dict | None = None) -> list[str]:
    """Return a list of colors for a dataset.

    Uses colours from the dataset if provided, otherwise cycles through
    CHART_COLORS based on `dataset_index` or the number of items.
    """
    if dataset and "colors" in dataset and dataset["colors"]:
        return dataset["colors"]
    # For charts where each item should have a different colour (pie, donut, bar with single dataset)
    if num_items > 1 and dataset_index == 0:
        return [CHART_COLORS[i % len(CHART_COLORS)] for i in range(num_items)]
    return [CHART_COLORS[dataset_index % len(CHART_COLORS)]] * num_items


def _save_figure(fig, viz_id: str) -> str:
    """Save a figure to disk and return the file path."""
    output_path = os.path.join(VIZ_OUTPUT_DIR, f"{viz_id}.png")
    fig.savefig(output_path, dpi=150, bbox_inches="tight", facecolor=fig.get_facecolor())
    plt.close(fig)
    logger.info(f"Chart saved: {output_path}")
    return output_path


# ---------------------------------------------------------------------------
# Individual chart type renderers
# ---------------------------------------------------------------------------

def _render_bar(fig, ax, labels, datasets, x_label, y_label):
    """Render a vertical bar chart."""
    x = np.arange(len(labels))
    num_datasets = len(datasets)
    width = 0.8 / max(num_datasets, 1)

    for i, ds in enumerate(datasets):
        values = ds.get("values", ds.get("data", []))
        colors = _get_colors(i, len(values), ds)
        offset = (i - num_datasets / 2 + 0.5) * width
        bars = ax.bar(x + offset, values, width, label=ds.get("label", f"Dataset {i + 1}"),
                       color=colors[0] if num_datasets > 1 else colors)
        # Add value labels on top of bars
        for bar in bars:
            height = bar.get_height()
            ax.annotate(f"{height:g}",
                        xy=(bar.get_x() + bar.get_width() / 2, height),
                        xytext=(0, 4), textcoords="offset points",
                        ha="center", va="bottom", fontsize=8, color="#94a3b8")

    ax.set_xticks(x)
    ax.set_xticklabels(labels, rotation=45, ha="right")
    ax.set_xlabel(x_label or "")
    ax.set_ylabel(y_label or "")
    ax.grid(axis="y", alpha=0.3)
    if num_datasets > 1:
        ax.legend()


def _render_horizontal_bar(fig, ax, labels, datasets, x_label, y_label):
    """Render a horizontal bar chart."""
    y = np.arange(len(labels))
    num_datasets = len(datasets)
    height = 0.8 / max(num_datasets, 1)

    for i, ds in enumerate(datasets):
        values = ds.get("values", ds.get("data", []))
        colors = _get_colors(i, len(values), ds)
        offset = (i - num_datasets / 2 + 0.5) * height
        bars = ax.barh(y + offset, values, height, label=ds.get("label", f"Dataset {i + 1}"),
                        color=colors[0] if num_datasets > 1 else colors)
        for bar in bars:
            w = bar.get_width()
            ax.annotate(f"{w:g}",
                        xy=(w, bar.get_y() + bar.get_height() / 2),
                        xytext=(4, 0), textcoords="offset points",
                        ha="left", va="center", fontsize=8, color="#94a3b8")

    ax.set_yticks(y)
    ax.set_yticklabels(labels)
    ax.set_xlabel(x_label or "")
    ax.set_ylabel(y_label or "")
    ax.grid(axis="x", alpha=0.3)
    if num_datasets > 1:
        ax.legend()


def _render_stacked_bar(fig, ax, labels, datasets, x_label, y_label):
    """Render a stacked bar chart."""
    x = np.arange(len(labels))
    bottom = np.zeros(len(labels))

    for i, ds in enumerate(datasets):
        values = ds.get("values", ds.get("data", []))
        color = CHART_COLORS[i % len(CHART_COLORS)]
        ax.bar(x, values, 0.6, bottom=bottom, label=ds.get("label", f"Dataset {i + 1}"),
               color=color)
        bottom += np.array(values, dtype=float)

    ax.set_xticks(x)
    ax.set_xticklabels(labels, rotation=45, ha="right")
    ax.set_xlabel(x_label or "")
    ax.set_ylabel(y_label or "")
    ax.grid(axis="y", alpha=0.3)
    ax.legend()


def _render_line(fig, ax, labels, datasets, x_label, y_label):
    """Render a line chart."""
    x = np.arange(len(labels))

    for i, ds in enumerate(datasets):
        values = ds.get("values", ds.get("data", []))
        color = CHART_COLORS[i % len(CHART_COLORS)]
        ax.plot(x, values, marker="o", markersize=5, linewidth=2,
                label=ds.get("label", f"Dataset {i + 1}"), color=color)

    ax.set_xticks(x)
    ax.set_xticklabels(labels, rotation=45, ha="right")
    ax.set_xlabel(x_label or "")
    ax.set_ylabel(y_label or "")
    ax.grid(alpha=0.3)
    if len(datasets) > 1:
        ax.legend()


def _render_area(fig, ax, labels, datasets, x_label, y_label):
    """Render an area chart."""
    x = np.arange(len(labels))

    for i, ds in enumerate(datasets):
        values = ds.get("values", ds.get("data", []))
        color = CHART_COLORS[i % len(CHART_COLORS)]
        ax.fill_between(x, values, alpha=0.35, color=color)
        ax.plot(x, values, linewidth=2, label=ds.get("label", f"Dataset {i + 1}"), color=color)

    ax.set_xticks(x)
    ax.set_xticklabels(labels, rotation=45, ha="right")
    ax.set_xlabel(x_label or "")
    ax.set_ylabel(y_label or "")
    ax.grid(alpha=0.3)
    if len(datasets) > 1:
        ax.legend()


def _render_pie(fig, ax, labels, datasets, x_label, y_label):
    """Render a pie chart with percentage labels."""
    ds = datasets[0] if datasets else {"values": []}
    values = ds.get("values", ds.get("data", []))
    colors = _get_colors(0, len(values), ds)

    wedges, texts, autotexts = ax.pie(
        values,
        labels=labels,
        colors=colors,
        autopct="%1.1f%%",
        startangle=140,
        pctdistance=0.85,
        textprops={"color": "#e2e8f0", "fontsize": 9},
    )
    for autotext in autotexts:
        autotext.set_fontsize(8)
        autotext.set_color("#e2e8f0")
    ax.set_aspect("equal")


def _render_donut(fig, ax, labels, datasets, x_label, y_label):
    """Render a donut chart (pie with a centre circle)."""
    ds = datasets[0] if datasets else {"values": []}
    values = ds.get("values", ds.get("data", []))
    colors = _get_colors(0, len(values), ds)

    wedges, texts, autotexts = ax.pie(
        values,
        labels=labels,
        colors=colors,
        autopct="%1.1f%%",
        startangle=140,
        pctdistance=0.85,
        wedgeprops={"width": 0.4},
        textprops={"color": "#e2e8f0", "fontsize": 9},
    )
    for autotext in autotexts:
        autotext.set_fontsize(8)
        autotext.set_color("#e2e8f0")
    ax.set_aspect("equal")


def _render_scatter(fig, ax, labels, datasets, x_label, y_label):
    """Render a scatter plot."""
    for i, ds in enumerate(datasets):
        values = ds.get("values", ds.get("data", []))
        color = CHART_COLORS[i % len(CHART_COLORS)]
        # x values default to indices if not enough labels
        x_vals = list(range(len(values)))
        ax.scatter(x_vals, values, color=color, s=60, alpha=0.8,
                   label=ds.get("label", f"Dataset {i + 1}"), edgecolors="white", linewidths=0.5)

    ax.set_xlabel(x_label or "")
    ax.set_ylabel(y_label or "")
    ax.grid(alpha=0.3)
    if len(datasets) > 1:
        ax.legend()


def _render_heatmap(fig, ax, labels, datasets, x_label, y_label):
    """Render a heatmap."""
    # Build a 2D matrix from datasets: each dataset is a row
    matrix = []
    row_labels = []
    for ds in datasets:
        values = ds.get("values", ds.get("data", []))
        matrix.append(values)
        row_labels.append(ds.get("label", ""))

    data = np.array(matrix, dtype=float)
    im = ax.imshow(data, cmap="viridis", aspect="auto")

    # Tick labels
    ax.set_xticks(np.arange(len(labels)))
    ax.set_xticklabels(labels, rotation=45, ha="right")
    ax.set_yticks(np.arange(len(row_labels)))
    ax.set_yticklabels(row_labels)

    # Annotate cells with values
    for i in range(len(row_labels)):
        for j in range(len(labels)):
            text_color = "white" if data[i, j] < data.max() / 2 else "black"
            ax.text(j, i, f"{data[i, j]:g}", ha="center", va="center",
                    color=text_color, fontsize=8)

    fig.colorbar(im, ax=ax, fraction=0.046, pad=0.04)
    ax.set_xlabel(x_label or "")
    ax.set_ylabel(y_label or "")


# ---------------------------------------------------------------------------
# Chart type dispatcher
# ---------------------------------------------------------------------------

CHART_RENDERERS = {
    "bar": _render_bar,
    "horizontal_bar": _render_horizontal_bar,
    "stacked_bar": _render_stacked_bar,
    "line": _render_line,
    "area": _render_area,
    "pie": _render_pie,
    "donut": _render_donut,
    "scatter": _render_scatter,
    "heatmap": _render_heatmap,
}


def generate_chart(viz_request: VizRequest) -> str:
    """Generate a chart from a VizRequest and return the viz_id (UUID).

    The rendered PNG is saved to VIZ_OUTPUT_DIR/{viz_id}.png.
    """
    _apply_dark_theme()

    viz_id = str(uuid.uuid4())
    labels = viz_request.data.get("labels", [])
    datasets = viz_request.data.get("datasets", [])

    fig, ax = plt.subplots(figsize=(10, 6))
    fig.patch.set_facecolor("#1a1a2e")

    renderer = CHART_RENDERERS.get(viz_request.chart_type)
    if renderer is None:
        logger.warning(f"Unsupported chart type '{viz_request.chart_type}', falling back to bar")
        renderer = _render_bar

    renderer(fig, ax, labels, datasets, viz_request.x_label, viz_request.y_label)

    # Title
    ax.set_title(viz_request.title, fontsize=14, fontweight="bold", color="#e2e8f0", pad=15)

    fig.tight_layout()
    _save_figure(fig, viz_id)

    return viz_id
