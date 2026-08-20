from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
import webbrowser

PORT = 8000

server = ThreadingHTTPServer(("127.0.0.1", PORT), SimpleHTTPRequestHandler)

url = f"http://127.0.0.1:{PORT}/default.html#/"
print(f"Server running at {url}")
webbrowser.open(url)

server.serve_forever()