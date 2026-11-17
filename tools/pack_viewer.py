"""Pack the built GLBs into viewer/models.js (base64), because artifact pages
cannot serve .glb files directly. The viewer decodes them back to the exact
bytes, so the sizes it shows are the real file sizes."""
import base64, json, os, sys
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
names = ["saw_bench", "pipe_machine", "tool_press", "generator", "truck", "props", "env", "site", "yard", "facilities", "level2", "level3", "level4", "level5", "worker", "owner"]
data = {n: base64.b64encode(open(os.path.join(root, "models", n + ".glb"), "rb").read()).decode() for n in names}
for out in (os.path.join(root, "viewer", "models.js"), os.path.join(root, "game", "models.js")):
    open(out, "w").write("window.IV_MODELS=" + json.dumps(data) + ";\n")
    print(out, round(os.path.getsize(out) / 1024, 1), "KiB")
