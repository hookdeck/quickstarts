import os
from datetime import datetime
import json
import logging
import hashlib
import hmac
import base64
from flask import Flask, request

logging.basicConfig(level=logging.INFO, handlers=[logging.StreamHandler()])

app = Flask(__name__)
app.logger.setLevel(logging.INFO)

HOOKDECK_WEBHOOK_SECRET = os.getenv("HOOKDECK_WEBHOOK_SECRET")


def verify_webhook(request):
    if HOOKDECK_WEBHOOK_SECRET is None:
        app.logger.warn(
            "No HOOKDECK_WEBHOOK_SECRET found in environment variables. Skipping verification."
        )
        return False

    # Extract x-hookdeck-signature and x-hookdeck-signature-2 headers from the request
    hmac_header = request.headers.get("x-hookdeck-signature")
    hmac_header2 = request.headers.get("x-hookdeck-signature-2")

    # Create a hash based on the raw body
    hash = base64.b64encode(
        hmac.new(
            HOOKDECK_WEBHOOK_SECRET.encode(), request.data, hashlib.sha256
        ).digest()
    ).decode()

    # Compare the created hash with the value of the x-hookdeck-signature
    # Also check x-hookdeck-signature-2 header in case the secret was rolled
    return hash == hmac_header or (hmac_header2 and hash == hmac_header2)


@app.route("/<path:path>", methods=["POST"])
def handle(path):
    app.logger.info(
        "webhook_received %s %s",
        datetime.now().isoformat(),
        json.dumps(request.json, indent=2),
    )

    if not verify_webhook(request):
        return {"status": "UNAUTHORIZED"}, 403
    else:
        return {"status": "ACCEPTED"}, 200


if __name__ == "__main__":
    app.run(debug=True, port=3031)
