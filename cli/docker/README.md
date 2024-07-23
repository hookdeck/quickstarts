# Using the Hookdeck CLI with Docker

This quickstart demonstrates how to use the Hookdeck CLI from Docker.

It includes ensuring that a Hookdeck [Connection](https://hookdeck.com/docs/connections?ref=github-quickstarts-cli-docker)
(a [Source](https://hookdeck.com/docs/sources?ref=github-quickstarts-cli-docker) and a [Destination](https://hookdeck.com/docs/destinations?ref=github-quickstarts-cli-docker))
exists by running a cURL command from the container.

To receive events within the docker contains, you also need to add your own web server.

## Before you begin

You'll need:

- [Docker](https://docs.docker.com/get-docker/) installed
- A [Hookdeck account](https://dashboard.hookdeck.com/signup?ref=github-quickstarts-cli-docker)

## Set up

Copy the example `.env.example` file:

```sh
cp .env.example .env
```

Set `HOOKDECK_API_KEY` to the value of your Project API key, which is found in the [secrets settings](https://dashboard.hookdeck.com/settings/project/secrets).

Set `HOOKDECK_SOURCE_NAME` to the name of your source. If this source does not exist, it will be created.

Set `APP_SERVICE_PORT` to the port of the application running in the Docker container.

## Run

```sh
docker-compose up
```


You will see output similar to the following:

```sh
docker-compose up
[+] Running 1/0
 ✔ Container hookdeck  Created                                                                                                                                                                                                                                    0.0s 
Attaching to hookdeck
hookdeck  | hookdeck version 0.10.1
hookdeck  | Checking for new versions...
hookdeck  | 
hookdeck  | 2024/07/16 12:22:00 The Hookdeck CLI is configured on project quickstarts in organization Examples
hookdeck  | 
hookdeck  | OK: 14 MiB in 24 packages
hookdeck  | Ensuring connection exists for source example-webhooks-v3
hookdeck  |   % Total    % Received % Xferd  Average Speed   Time    Time     Time  Current
hookdeck  |                                  Dload  Upload   Total   Spent    Left  Speed
100  1366  100   991  100   375   1806    683 --:--:-- --:--:-- --:--:--  2488
hookdeck  | {"id":"web_qafVAiPDiXFq","team_id":"tm_zDDhLIPBQw2e","updated_at":"2024-07-16T12:22:00.709Z","created_at":"2024-07-16T12:22:00.882Z","paused_at":null,"name":null,"rules":[],"description":null,"destination":{"id":"des_JZ9yNGgVwjcu","team_id":"tm_zDDhLIPBQw2e","url":null,"updated_at":"2024-07-16T12:22:00.715Z","created_at":"2024-07-16T12:11:09.437Z","rate_limit":null,"rate_limit_period":"second","cli_path":"/","path_forwarding_disabled":false,"name":"CLI","http_method":null,"auth_method":{"type":"HOOKDECK_SIGNATURE","config":{}},"description":null,"disabled_at":null},"source":{"id":"src_l5u7nwyghz0gec","team_id":"tm_zDDhLIPBQw2e","updated_at":"2024-07-16T12:22:00.714Z","created_at":"2024-07-16T11:44:55.964Z","name":"example-webhooks-v3","allowed_http_methods":["GET","PUT","PATCH","DELETE","POST"],"custom_response":null,"description":null,"url":"https://hkdk.events/l5u7nwyghz0gec","disabled_at":null,"verification":null},"disabled_at":null,"full_name":"example-webhooks-v3 -> CLI"}
hookdeck  | Dashboard
hookdeck  | 👉 Inspect and replay events: https://dashboard.hookdeck.com?team_id=tm_zDDhLIPBQw2e
hookdeck  | 
hookdeck  | example-webhooks-v3 Source
hookdeck  | 🔌 Event URL: https://hkdk.events/irq4hh3eu54hxs
hookdeck  | 
hookdeck  | Connections
hookdeck  | example-webhooks-v3_to_CLI forwarding to /
hookdeck  | 
hookdeck  | Getting ready...
hookdeck  | Ready! (^C to quit)
```

Requests to the **Event URL** from the CLI output will be forwarded to an application running on the port identified by `APP_SERVICE_PORT`. You will need to create this application.