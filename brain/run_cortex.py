"""Run the brain against the hosted Voqalize relay.

The agent is in `cortex` mode, so nothing dials us: this process dials out and
stays connected. That is what makes a laptop a valid place to run a brain.
"""

import asyncio
import os

from dotenv import load_dotenv
from voqalize.sdk import configure_logging, serve

from excalidraw_brain import ExcalidrawBrain

load_dotenv()


async def main() -> None:
    configure_logging()
    await serve(
        ExcalidrawBrain,
        version="1.0.0",
        cortex_url=os.environ["VOQALIZE_CORTEX_URL"],
        api_key=os.environ["VOQALIZE_AGENT_SECRET"],
    )


if __name__ == "__main__":
    asyncio.run(main())
