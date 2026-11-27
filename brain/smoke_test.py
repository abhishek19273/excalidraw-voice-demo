"""Drive the brain in text mode: no microphone, no browser, real model.

Checks the two things a voice demo actually depends on — that a spoken request
produces the right action with sane geometry, and that the brain talks about it
afterwards rather than reading coordinates out loud.
"""

import asyncio
import json

from dotenv import load_dotenv

load_dotenv()

from voqalize.conformance import (  # noqa: E402
    DirectConnection,
    VoqalizeDriver,
    brain_server,
    generate_keypair,
    mint_voqalize_token,
)

from excalidraw_brain import ExcalidrawBrain  # noqa: E402

TURNS = [
    "Draw a big red circle in the middle of the canvas.",
    "Now put a blue box labelled login below it, and draw an arrow from the circle to the box.",
    "Actually, undo that.",
]


async def main() -> None:
    keypair = generate_keypair()
    async with brain_server(ExcalidrawBrain, public_keys=keypair.public_pem) as server:
        token = mint_voqalize_token(
            private_key_pem=keypair.private_pem,
            session_id="s1",
            agent_id="agent_test",
            tenant_id="tenant_test",
        )
        driver = VoqalizeDriver(
            DirectConnection(server.url, "s1", token=token),
            session_id="s1",
            default_timeout=60.0,
        )
        await driver.open()
        await driver.start_session()

        # collect_ui_commands returns everything the session has dispatched so
        # far, so keep a mark and print only what this turn added.
        seen = 0
        for text in TURNS:
            print(f"\n\033[1muser:\033[0m {text}")
            turn = await driver.user_says(text)
            print(f"\033[1magent:\033[0m {turn.text.strip()}")
            commands = await driver.collect_ui_commands()
            for cmd in commands[seen:]:
                print(f"  → {cmd['command']} {json.dumps(cmd['payload'])}")
            seen = len(commands)

        await driver.aclose()


if __name__ == "__main__":
    asyncio.run(main())
