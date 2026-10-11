"""Demoyu yalnızca bu bilgisayarda sunar. Ctrl+C ile kapatılır."""
import os
from pathlib import Path
import threading
import webbrowser
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

os.chdir(Path(__file__).resolve().parent)
SimpleHTTPRequestHandler.extensions_map['.wasm'] = 'application/wasm'
try:
    server = ThreadingHTTPServer(('127.0.0.1', 8000), SimpleHTTPRequestHandler)
except OSError as exc:
    print('Sunucu baslatilamadi:', exc)
    print('8000 portunu kullanan eski demo penceresini kapatip tekrar dene.')
    raise SystemExit(1)
print('Demo: http://127.0.0.1:8000')
print('Bu pencereyi acik tut. Kapatmak icin Ctrl+C.')
threading.Timer(0.8, lambda: webbrowser.open('http://127.0.0.1:8000')).start()
try:
    server.serve_forever()
except KeyboardInterrupt:
    pass
finally:
    server.server_close()
