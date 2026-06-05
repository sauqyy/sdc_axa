import urllib.request
import time

def test_endpoint(url):
    print(f"Testing {url}...")
    start_time = time.time()
    try:
        req = urllib.request.Request(url)
        with urllib.request.urlopen(req, timeout=10) as response:
            code = response.getcode()
            content = response.read(200) # Read first 200 bytes
            duration = time.time() - start_time
            print(f"SUCCESS: {code} in {duration:.3f}s")
            print(f"Snippet: {content[:100]}...\n")
    except Exception as e:
        print(f"FAILED: {e}\n")

if __name__ == "__main__":
    time.sleep(1) # Wait a bit
    test_endpoint("http://127.0.0.1:5000/")
    test_endpoint("http://127.0.0.1:5000/static/js/data.js")
    test_endpoint("http://127.0.0.1:5000/static/js/dashboard.js")
    test_endpoint("http://127.0.0.1:5000/api/portfolio")
