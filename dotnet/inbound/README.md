# Quickstart: Inbound webhooks with C# and ASP.NET Core

An example application demonstrating receiving a webhook with C# and
[ASP.NET Core](https://learn.microsoft.com/en-us/aspnet/core/?view=aspnetcore-6.0).

- Follow the [Hookdeck Inbound Webhook Quickstart](https://hookdeck.com/docs/receive-webhooks)
- Check out the [Hookdeck docs](https://hookdeck.com/docs?ref=github-quickstarts)

## Before you begin

You'll need:

- The [Hookdeck CLI](https://hookdeck.com/docs/cli?ref=github-quickstarts-dotnet)
- The [.NET CLI](https://learn.microsoft.com/en-us/dotnet/core/tools/)

## Get the code

```sh
git clone https://github.com/hookdeck/quickstarts hookdeck-quickstarts
cd hookdeck-quickstarts/dotnet/inbound
```

## Configuration (optional)

To use webhook verification, get your webhook secret from the **Settings** -> **Secrets** section
of your Hookdeck Project.

```sh
dotnet user-secrets init --project "."
dotnet user-secrets set "inbound:HookdeckWebhookSecret" "YOUR-WEBHOOK-SECRET" \
  --project "."
```

## Run the app

```sh
dotnet run
```

Run the Hookdeck localtunnel using the Hookdeck CLI:

```sh
hookdeck listen 5176 inbound-dotnet
```