# Python Flask Query Application

This example demonstrates how to use Hookdeck with a Python Flask application to programmatically create a connection, publish events to it, and query those events.

## Setup

1.  **Clone the repository:**

    ```bash
    git clone https://github.com/hookdeck/quickstarts.git
    ```
2.  **Navigate to the directory:**

    ```bash
    cd python/query
    ```

3.  **Set up the environment:**

    Create a `.env` file by copying the example file:

    ```bash
    cp .env.example .env
    ```

    You'll need to populate this file with your `HOOKDECK_API_KEY`.

4.  **Activate the virtual environment:**

    This project uses [Poetry](https://python-poetry.org/) for dependency management. Activate the virtual environment with:

    ```bash
    poetry shell
    ```

5.  **Install dependencies:**

    Once the shell is activated, install the dependencies with:

    ```bash
    poetry install --no-root
    ```

## Running the application

When you first run the application, it will automatically create a new Hookdeck connection named `python-query-example` for you.

To run the Flask application, use the following command from within the Poetry shell:

```bash
python -m flask run
```

The application will be available at `http://127.0.0.1:5000`.

## Usage

The application exposes the following endpoints:

*   `/publish`: A simple endpoint to generate and publish a sample event to your connection's source.
*   `/events`: An endpoint to query all events for the connection created by this application.

### Publish an event

You can publish a sample event by sending a GET request to the `/publish` endpoint:

```bash
curl http://127.0.0.1:5000/publish
```

### Query events

You can retrieve all events for the connection by sending a GET request to the `/events` endpoint:

```bash
curl http://127.0.0.1:5000/events