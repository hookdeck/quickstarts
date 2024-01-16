from datetime import datetime
import json
import logging
from flask import Flask, request

logging.basicConfig(
    level=logging.INFO,
    handlers=[logging.StreamHandler()]
)

app = Flask(__name__)
app.logger.setLevel(logging.INFO)


@app.route("/<path:path>", methods=["POST"])
def handle(path):
    app.logger.info("webhook_received %s %s",
                    datetime.now().isoformat(),
                    json.dumps(request.json, indent=2))

    return {
        "status": "ACCEPTED"
    }


if __name__ == "__main__":
    app.run(debug=True, port=3030)
