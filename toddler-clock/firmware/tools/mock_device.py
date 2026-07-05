#!/usr/bin/env python3
"""Mock toddler clock: runs the real parent web app without hardware.

Implements the firmware's exact HTTP + WebSocket contract (see
src/webserver.cpp) with in-memory state, and serves data/www/. Use it to
develop or demo the UI:

    pip install aiohttp
    python3 tools/mock_device.py            # http://localhost:8080
    python3 tools/mock_device.py --wiggle   # simulates the toddler pressing
                                            # the button every 20 s

WS commands accepted (the hot paths): {"cmd":"symbol","id":...},
{"cmd":"nightlight","on":...}, {"cmd":"nlconfig",r,g,b,brightness,timeoutS},
{"cmd":"lamp","brightness":...}. Every change broadcasts the full state to
all connected clients — same as the device.
"""

import argparse
import asyncio
import datetime
import json
import weakref
from pathlib import Path

from aiohttp import WSMsgType, web

WWW = Path(__file__).resolve().parent.parent / "data" / "www"
ICONS_DIR = Path(__file__).resolve().parent / "_mock_icons"

BUILTIN_ICONS = ["sun", "moon", "star", "smiley", "heart"]

state = {"symbol": "moon", "nightlightOn": False}
settings = {
    "wifiSsid": "MockNet",
    "mqttHost": "",
    "mqttPort": 1883,
    "mqttUser": "",
    "lampBrightness": 30,
    "mirror": True,
    "scheduleEnabled": True,
    "nightlight": {"r": 255, "g": 130, "b": 30, "brightness": 60, "timeoutS": 900},
    "schedule": [
        {"time": "07:00", "symbol": "sun"},
        {"time": "19:30", "symbol": "moon"},
    ],
}


def custom_icons():
    return sorted(p.name for p in ICONS_DIR.glob("*.png")) if ICONS_DIR.is_dir() else []


def state_json():
    now = datetime.datetime.now()
    return {
        **state,
        "nightlight": settings["nightlight"],
        "lampBrightness": settings["lampBrightness"],
        "scheduleEnabled": settings["scheduleEnabled"],
        "icons": BUILTIN_ICONS,
        "customIcons": custom_icons(),
        "time": now.strftime("%H:%M"),
        "timeValid": True,
        "wifi": True,
        "rssi": -52,
        "ip": "127.0.0.1",
    }


websockets = weakref.WeakSet()


async def broadcast():
    payload = json.dumps(state_json())
    for ws in set(websockets):
        try:
            await ws.send_str(payload)
        except ConnectionError:
            pass


def handle_command(doc):
    cmd = doc.get("cmd")
    if cmd == "symbol" and isinstance(doc.get("id"), str):
        state["symbol"] = doc["id"]
    elif cmd == "nightlight" and isinstance(doc.get("on"), bool):
        state["nightlightOn"] = doc["on"]
    elif cmd == "nlconfig":
        for k in ("r", "g", "b", "brightness", "timeoutS"):
            if isinstance(doc.get(k), int):
                settings["nightlight"][k] = doc[k]
    elif cmd == "lamp" and isinstance(doc.get("brightness"), int):
        settings["lampBrightness"] = max(0, min(100, doc["brightness"]))
    else:
        return False
    print(f"[mock] ws command: {doc}")
    return True


async def ws_handler(request):
    ws = web.WebSocketResponse()
    await ws.prepare(request)
    websockets.add(ws)
    await ws.send_str(json.dumps(state_json()))
    async for msg in ws:
        if msg.type == WSMsgType.TEXT:
            try:
                doc = json.loads(msg.data)
            except json.JSONDecodeError:
                continue
            if handle_command(doc):
                await broadcast()
    return ws


async def get_state(_):
    return web.json_response(state_json())


async def post_state(request):
    doc = await request.json()
    if isinstance(doc.get("symbol"), str):
        state["symbol"] = doc["symbol"]
    if isinstance(doc.get("nightlightOn"), bool):
        state["nightlightOn"] = doc["nightlightOn"]
    await broadcast()
    return web.json_response(state_json())


async def get_settings(_):
    return web.json_response(settings)


async def post_settings(request):
    doc = await request.json()
    reboot_needed = any(
        k in doc and doc[k] != settings.get(k) for k in ("wifiSsid", "wifiPass", "mqttHost")
    )
    for key, value in doc.items():
        if key == "nightlight":
            settings["nightlight"].update(value)
        elif key in settings or key in ("wifiPass", "mqttPass"):
            settings[key] = value
    print(f"[mock] settings update: {list(doc)}")
    await broadcast()
    return web.json_response({"ok": True, "rebootRequired": reboot_needed})


async def post_icon(request):
    reader = await request.multipart()
    field = await reader.next()
    name = "".join(c for c in (field.filename or "") if c.isalnum() or c in "-_.")
    if name.endswith(".png"):
        ICONS_DIR.mkdir(exist_ok=True)
        (ICONS_DIR / name).write_bytes(await field.read())
        print(f"[mock] icon uploaded: {name}")
    await broadcast()
    return web.json_response({"ok": True})


async def delete_icon(request):
    name = request.query.get("name", "")
    path = ICONS_DIR / name
    if path.is_file():
        path.unlink()
        await broadcast()
        return web.json_response({"ok": True})
    return web.json_response({"error": "not found"}, status=404)


async def post_reboot(_):
    print("[mock] reboot requested (ignored)")
    return web.json_response({"ok": True})


async def wiggle(app):
    while True:
        await asyncio.sleep(20)
        state["nightlightOn"] = not state["nightlightOn"]
        print("[mock] *toddler presses the button*")
        await broadcast()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--port", type=int, default=8080)
    parser.add_argument("--wiggle", action="store_true",
                        help="toggle the night light every 20s (fake button presses)")
    args = parser.parse_args()

    app = web.Application()
    app.router.add_get("/ws", ws_handler)
    app.router.add_get("/api/state", get_state)
    app.router.add_post("/api/state", post_state)
    app.router.add_get("/api/settings", get_settings)
    app.router.add_post("/api/settings", post_settings)
    app.router.add_post("/api/icons", post_icon)
    app.router.add_delete("/api/icons", delete_icon)
    app.router.add_post("/api/reboot", post_reboot)
    if ICONS_DIR.is_dir() or True:
        ICONS_DIR.mkdir(exist_ok=True)
        app.router.add_static("/icons/", ICONS_DIR)
    app.router.add_get("/", lambda r: web.FileResponse(WWW / "index.html"))
    app.router.add_static("/", WWW)

    if args.wiggle:
        async def start_wiggle(app):
            app["wiggle"] = asyncio.create_task(wiggle(app))
        app.on_startup.append(start_wiggle)

    print(f"[mock] serving {WWW} on http://localhost:{args.port}")
    web.run_app(app, port=args.port, print=None)


if __name__ == "__main__":
    main()
