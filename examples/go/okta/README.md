# Go Okta Example with Hookdeck

This example demonstrates how to:
1.  Programmatically create a Hookdeck Connection and an Okta Event Hook using Go.
2.  Receive Okta webhooks locally via the Hookdeck CLI and verify the Hookdeck signature using a Go server.

## Files

*   `main.go`: A simple Go web server (using Gin) that listens for incoming webhooks on port 3030 (or `$PORT`), verifies the `x-hookdeck-signature` header using the project's signing secret, and logs the received payload.
*   `setup_connection.go`: A Go script to idempotently create the necessary Hookdeck Connection and Okta Event Hook via their respective APIs. It uses the `//go:build setup` tag to avoid conflicts with `main.go`.
*   `go.mod` / `go.sum`: Go module files.

## Prerequisites

*   Go installed (version 1.23 or later recommended).
*   Hookdeck CLI installed and authenticated (`hookdeck login`).
*   A Hookdeck account and API Key.
*   Your Hookdeck Team's Signing Secret (found in your Hookdeck Dashboard under Team Settings > Signing Secret).
*   An Okta developer account, your Okta domain, and an Okta API Token with permissions to manage Event Hooks.

## Setup

1.  **Set Environment Variables:**
    You need to provide API credentials and configuration via environment variables. You can either:
    *   **Export them directly** in your shell:
        ```bash
        export HOOKDECK_API_KEY="hk_..."
        export HOOKDECK_WEBHOOK_SECRET="whsec_..."
        export OKTA_DOMAIN="your-org.okta.com"
        export OKTA_API_TOKEN="00..."
        ```
    *   **Create a `.env` file** in the `examples/go/okta` directory with the following format:
        ```dotenv
        # .env file
        HOOKDECK_API_KEY="hk_..."
        HOOKDECK_WEBHOOK_SECRET="whsec_..."
        OKTA_DOMAIN="your-org.okta.com"
        OKTA_API_TOKEN="00..."
        # Optional: Set the server port
        # PORT=3030
        ```
        Both `main.go` and `setup_connection.go` have been updated to automatically load variables from this `.env` file if it exists, using the `godotenv` library. Variables set directly in the environment will override those in the `.env` file.

    *(Ensure the `HOOKDECK_WEBHOOK_SECRET` is set using one of these methods before running `main.go`)*

2.  **Create Hookdeck Connection and Okta Event Hook:**
    Run the setup script using the `setup` build tag. This script will:
    *   Use the Hookdeck API (`2025-01-01` version) to create/update a Connection named `okta-to-cli-go-example` with the `okta` source and `hookdeck-cli` destination.
    *   Use the Okta API to create/update an Event Hook named `Hookdeck Go Example Hook` pointing to the Hookdeck Connection URL. It subscribes to the `user.lifecycle.create` event by default.

    ```bash
    go run -tags setup setup_connection.go
    ```
    The script will output the details of the created/updated resources.

## Running the Example

1.  **Start the Hookdeck CLI Listener:**
    Open a terminal and run `hookdeck listen`. This command connects to Hookdeck and forwards incoming webhooks for the `hookdeck-cli` destination to `http://localhost:3030` (the default port for `main.go`).

    ```bash
    hookdeck listen 3030
    ```

2.  **Start the Go Web Server:**
    Open another terminal in the `examples/go/okta` directory. Ensure the required environment variables (especially `HOOKDECK_WEBHOOK_SECRET`) are set either via export or in a `.env` file (see Setup Step 1), then run the server:

    ```bash
    go run main.go
    ```
    The server will start listening on `http://localhost:3030`.

3.  **Trigger an Okta Event:**
    Perform an action in your Okta organization that triggers the event subscribed to by the Event Hook (e.g., create a new user to trigger `user.lifecycle.create`).

4.  **Observe:**
    *   Okta will send the event webhook to your Hookdeck Connection URL.
    *   Hookdeck will process it and forward it to the `hookdeck listen` process.
    *   `hookdeck listen` will forward the request to your running Go server (`main.go`) at `http://localhost:3030`.
    *   The Go server will verify the Hookdeck signature using the `HOOKDECK_WEBHOOK_SECRET` and log the received payload if the signature is valid. You will see output similar to `webhook_received: { ... }` in the terminal where `go run main.go` is running.