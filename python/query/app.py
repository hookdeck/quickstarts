import os
import httpx
from flask import Flask, jsonify
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)

HOOKDECK_API_KEY = os.environ.get("HOOKDECK_API_KEY")
HOOKDECK_API_URL = "https://api.hookdeck.com/2025-01-01"
HOOKDECK_PUBLISH_URL = "https://hkdk.events/v1/publish"
CONNECTION_NAME = "python-query-example"
SOURCE_NAME = "python-query-source"
DESTINATION_NAME = "python-query-destination"
DESTINATION_URL = "https://mock.hookdeck.com"

# This will store the source ID and connection ID for the connection
source_id = None
connection_id = None


def upsert_connection():
    """
    Create or update a connection (upsert).
    """
    headers = {
        "Authorization": f"Bearer {HOOKDECK_API_KEY}",
        "Content-Type": "application/json",
    }
    json_data = {
        "name": CONNECTION_NAME,
        "source": {
            "name": SOURCE_NAME,
            "type": "PUBLISH_API",
        },
        "destination": {
            "name": DESTINATION_NAME,
            "config": {
                "url": DESTINATION_URL,
            },
        },
    }
    with httpx.Client(headers=headers) as client:
        # A PUT request to the connections endpoint with a name will create or
        # update.
        url = f"{HOOKDECK_API_URL}/connections"
        response = client.put(url, json=json_data)
        try:
            response.raise_for_status()
            return response.json()
        except httpx.HTTPStatusError as e:
            print(f"API Error: {e}")
            print(f"Response body: {e.response.text}")
            raise


def setup_connection():
    """
    Idempotently create or update a Hookdeck connection on startup.
    """
    global source_id, connection_id
    print("Upserting connection...")
    connection = upsert_connection()
    print("Connection ready.")

    source_id = connection["source"]["id"]
    connection_id = connection["id"]
    print(f"Source ID: {source_id}")
    print(f"Connection ID: {connection_id}")


setup_connection()


@app.route("/")
def hello_world():
    return "Hello, World!"


@app.route("/publish", methods=["GET"])
def publish_event():
    """
    Publish a sample event to the connection's source using the Publish API.
    """
    if not source_id:
        return "Source ID not found", 500

    headers = {
        "Authorization": f"Bearer {HOOKDECK_API_KEY}",
        "X-Hookdeck-Source-Id": source_id,
        "Content-Type": "application/json",
    }
    # The event payload can be any JSON
    json_data = {"message": "Hello, World!"}

    with httpx.Client(headers=headers) as client:
        response = client.post(
            HOOKDECK_PUBLISH_URL,
            json=json_data,
        )
        response.raise_for_status()
        # The publish API returns a 200 OK with an empty body on success
        return "Event published successfully"


@app.route("/events", methods=["GET"])
def list_events():
    """
    Retrieve all events for the connection and their full details.
    """
    if not connection_id:
        return "Connection ID not found", 500

    headers = {
        "Authorization": f"Bearer {HOOKDECK_API_KEY}",
    }
    params = {
        "connection_id": connection_id,
    }
    with httpx.Client(headers=headers) as client:
        # First, get the list of event summaries
        list_response = client.get(f"{HOOKDECK_API_URL}/events", params=params)
        list_response.raise_for_status()
        events_response = list_response.json()

        # Augment the response by fetching full details for each event
        if "models" in events_response:
            for i, event_summary in enumerate(events_response["models"]):
                event_id = event_summary.get("id")
                if event_id:
                    event_url = f"{HOOKDECK_API_URL}/events/{event_id}"
                    detail_response = client.get(event_url)
                    detail_response.raise_for_status()
                    events_response["models"][i] = detail_response.json()

        return jsonify(events_response)


if __name__ == "__main__":
    app.run(debug=True)
