"""The brain: turns spoken drawing requests into Excalidraw elements.

Every tool below dispatches an Action of the same shape. The browser receives it
as an RTVI `ui-command` and hands the payload to Excalidraw's element skeleton
API, so the field names here are deliberately the ones Excalidraw already knows.
"""

from typing import Literal

from google import genai
from voqalize.sdk import Action
from voqalize.sdk.gemini import GeminiBrain

# The visible canvas the model is told it is drawing on, in Excalidraw's own
# coordinates: origin top-left, y grows downward. The page scrolls to fit after
# every change, so being off by a little is harmless.
CANVAS_W, CANVAS_H = 1200, 700

SYSTEM = f"""You draw on an Excalidraw whiteboard for a user who is speaking to you.

The canvas is {CANVAS_W} wide and {CANVAS_H} tall. The origin is the top-left
corner and y grows downward, so the middle of the canvas is about
x={CANVAS_W // 2}, y={CANVAS_H // 2}. The x and y you pass are the TOP-LEFT of
the shape, not its centre, so subtract half the width and half the height to
centre something.

Draw first, talk after. When a request is clear enough to draw, call the tools
and then say one short sentence about what you drew. Never read coordinates or
hex codes out loud, and never ask which shade of red they meant.

Place things so they do not overlap unless the user asked them to. Keep a rough
memory of where you have already put things and leave about 60 units of space
between them. For a flow or a diagram, lay the boxes out left to right and join
them with arrows.

Colors may be plain CSS names like "red" or "cornflowerblue". Use
background_color to fill a shape; the default is no fill at all. A label is
drawn in black inside the shape, so when a shape has a label, fill it with a
pale color like "lightblue" and put the strong color on the stroke instead.

You are a whiteboard, not a chatbot. If the user just chats, reply in one line."""


class DrawShape(Action):
    """A closed shape on the canvas."""

    shape: Literal["rectangle", "ellipse", "diamond"] = "rectangle"
    x: int = 100
    y: int = 100
    width: int = 200
    height: int = 120
    stroke_color: str = "#1e1e1e"
    background_color: str = "transparent"
    label: str = ""


class DrawArrow(Action):
    """A straight arrow or line between two points."""

    x1: int = 100
    y1: int = 100
    x2: int = 300
    y2: int = 100
    stroke_color: str = "#1e1e1e"
    label: str = ""
    arrowhead: bool = True


class DrawText(Action):
    """A standalone line of text."""

    text: str
    x: int = 100
    y: int = 100
    font_size: int = 20
    stroke_color: str = "#1e1e1e"


class ClearCanvas(Action):
    """Wipe the canvas."""


class UndoLast(Action):
    """Remove the most recently drawn element."""


class ExcalidrawBrain(GeminiBrain):
    def __init__(self) -> None:
        super().__init__(client=genai.Client(), system_instruction=SYSTEM)

    async def greet(self, session) -> str:
        return "Whiteboard's ready. What should I draw?"

    @property
    def tools(self):
        return [self.draw_shape, self.draw_arrow, self.draw_text, self.clear_canvas, self.undo_last]

    async def draw_shape(self, args: DrawShape) -> str:
        """Draw a rectangle, ellipse or diamond, optionally with a label inside it."""
        self.session.dispatch(args)
        return "drawn"

    async def draw_arrow(self, args: DrawArrow) -> str:
        """Draw an arrow or plain line from one point to another."""
        self.session.dispatch(args)
        return "drawn"

    async def draw_text(self, args: DrawText) -> str:
        """Write a line of text on the canvas, on its own rather than inside a shape."""
        self.session.dispatch(args)
        return "written"

    async def clear_canvas(self) -> str:
        """Erase everything on the canvas. Only when the user clearly asks for a blank slate."""
        self.session.dispatch(ClearCanvas())
        return "cleared"

    async def undo_last(self) -> str:
        """Remove the single most recent element, for 'undo that' or 'take that back'."""
        self.session.dispatch(UndoLast())
        return "removed"
