import json
import logging
from flask import Flask, request

logging.basicConfig(
    level=logging.INFO,
    handlers=[logging.StreamHandler()]
)

app = Flask(__name__)
app.logger.setLevel(logging.INFO)


@app.route("/webhook", methods=["POST"])
def webhook():
    app.logger.info("Webhook received %s", json.dumps(request.json, indent=2))

    return {
        "order_status": "accepted"
    }


if __name__ == "__main__":
    app.run(debug=True)
