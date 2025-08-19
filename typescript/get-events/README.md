# Get Events Example Script

A TypeScript example script demonstrating how to retrieve events from the Hookdeck API with filtering and automatic pagination. This example shows how to interact with Hookdeck's Events API to query and retrieve event data programmatically.

## Prerequisites

- Node.js (v16 or higher)
- A Hookdeck API key

## Setup

1. Install dependencies:
```bash
npm install
```

2. Set your Hookdeck API key as an environment variable:
```bash
export HOOKDECK_API_KEY=your_api_key_here
```

Or create a `.env` file:
```
HOOKDECK_API_KEY=your_api_key_here
```

## Running the Example

No build step required! The script runs directly from TypeScript using ts-node.

### Run the Script
```bash
npm start -- [options]
```

Or run directly:
```bash
./index.ts [options]
```

### Available Options

The script accepts command-line arguments to demonstrate different API query capabilities:

**Basic Filters:**
- `--status <status>`: Filter events by status. Valid values: SCHEDULED, QUEUED, HOLD, SUCCESSFUL, FAILED (case-insensitive)
- `--destination-id <destination_id>`: Filter events by destination ID

**Date Filters (created_at):**
- `--created-after <date>`: Events created **after** this date (exclusive, uses `gt` operator)
- `--created-before <date>`: Events created **before** this date (exclusive, uses `lt` operator)  
- `--created-from <date>`: Events created **from** this date onwards (inclusive, uses `gte` operator)
- `--created-until <date>`: Events created **until** this date (inclusive, uses `lte` operator)
- `--created-any`: Events that have a created_at value (not null, uses `any` operator)
- `--last-days <days>`: Events from the last X days (e.g., `--last-days 7` for last week)

> **Note:** `--last-days` cannot be combined with other date filters. It's a convenience option that automatically calculates the start date.

## Date Filter Examples

To illustrate the differences, let's say you have events created on these dates:
- Event A: `2024-01-01T12:00:00Z`
- Event B: `2024-01-02T12:00:00Z` 
- Event C: `2024-01-03T12:00:00Z`

**Exclusive filters (after/before):**
```bash
# --created-after 2024-01-02T12:00:00Z
# Returns: Event C only (created AFTER 2024-01-02T12:00:00Z)
# Event B is NOT included because it's exactly at that time

# --created-before 2024-01-02T12:00:00Z  
# Returns: Event A only (created BEFORE 2024-01-02T12:00:00Z)
# Event B is NOT included because it's exactly at that time
```

**Inclusive filters (from/until):**
```bash
# --created-from 2024-01-02T12:00:00Z
# Returns: Event B and Event C (created FROM 2024-01-02T12:00:00Z onwards)
# Event B IS included because it's exactly at that time

# --created-until 2024-01-02T12:00:00Z
# Returns: Event A and Event B (created UNTIL 2024-01-02T12:00:00Z)  
# Event B IS included because it's exactly at that time
```

**Common date range patterns:**
```bash
# Get events for exactly January 2024 (inclusive range)
--created-from 2024-01-01T00:00:00Z --created-until 2024-01-31T23:59:59Z

# Get events for exactly January 2024 (using exclusive end)
--created-from 2024-01-01T00:00:00Z --created-before 2024-02-01T00:00:00Z

# Get events from last 24 hours (exclusive)
--created-after 2024-01-01T12:00:00Z

# Get events up to a specific point (inclusive)
--created-until 2024-01-01T12:00:00Z
```

**Quick Reference:**

| Parameter | API Operator | Includes Exact Time? | Use Case |
|-----------|-------------|---------------------|----------|
| `--created-after` | `gt` | ❌ No (exclusive) | "Events newer than X" |
| `--created-before` | `lt` | ❌ No (exclusive) | "Events older than X" |
| `--created-from` | `gte` | ✅ Yes (inclusive) | "Events from X onwards" |
| `--created-until` | `lte` | ✅ Yes (inclusive) | "Events up to and including X" |
| `--created-any` | `any` | N/A | "Events with non-null created_at" |
| `--last-days` | `gte` | ✅ Yes (inclusive) | "Events from X days ago until now" |

**Output & Performance:**
- `-o, --output <file>`: Write JSON output to file instead of stdout
- `--rate-limit <rps>`: Maximum requests per second (default: 1)
- `--max-retries <count>`: Maximum retry attempts for rate limited requests (default: 5)
- `-h, --help`: Display help information

**Date Format:** All date options accept ISO 8601 format (e.g., `2024-01-01T00:00:00Z` or `2024-01-01`)

### Example Usage

**Basic queries:**
```bash
# Retrieve all events to stdout
npm start

# Save all events to a file
npm start -- --output events.json

# Filter events by status
npm start -- --status SUCCESSFUL
```

**Date range queries:**
```bash
# Events from the last 24 hours
npm start -- --created-after 2024-01-01T00:00:00Z

# Events from a specific date range
npm start -- --created-from 2024-01-01 --created-until 2024-01-31

# Events before a specific time
npm start -- --created-before 2024-01-15T12:00:00Z
```

**Convenient last-days queries:**
```bash
# Events from the last 7 days
npm start -- --last-days 7

# Events from the last 24 hours (1 day)
npm start -- --last-days 1

# Events from the last 30 days
npm start -- --last-days 30
```

**Combined filters:**
```bash
# Failed events from the last week (using convenience option)
npm start -- --status FAILED --last-days 7 --output failed-recent.json

# Failed events from the last week (using explicit date)
npm start -- --status FAILED --created-after 2024-01-15T00:00:00Z --output failed-recent.json

# Events for specific destination in date range
npm start -- --destination-id dest_123abc --created-from 2024-01-01 --created-until 2024-01-31

# Recent events with rate limiting
npm start -- --status SUCCESSFUL --last-days 3 --rate-limit 2 --output recent-success.json
```

## What This Example Demonstrates

This script showcases several key concepts for working with the Hookdeck API:

- **API Authentication**: Using environment variables to securely store and access API keys
- **Event Querying**: Making HTTP requests to the Hookdeck Events API endpoint
- **Filtering**: Applying query parameters to filter results by status and destination
- **Date Queries**: Using comparison operators (gte, gt, lte, lt, any) for temporal filtering
- **Pagination Handling**: Automatically fetching all pages of results for large datasets
- **Rate Limiting**: Respecting API rate limits with configurable requests per second
- **Retry Logic**: Automatic retry with exponential backoff for 429 (Too Many Requests) errors
- **Progress Logging**: Real-time feedback during API operations with emojis and status updates
- **File Output**: Writing results to JSON files for further processing
- **Error Handling**: Proper error handling for API failures and validation
- **JSON Output**: Processing and displaying API response data

## Response Format

The script outputs a JSON array of events to stdout (or to a file when using `--output`). Each event object includes:
- `id`: Unique event identifier
- `status`: Current event status (successful, failed, etc.)
- `destination_id`: Associated destination identifier
- `connection_id`: Associated connection identifier
- `created_at`: Event creation timestamp
- `updated_at`: Last modification timestamp
- Additional event metadata

## Progress Logging

The script provides real-time progress updates via stderr, including:

```
⚙️  Configuration:
   Status filter: FAILED
   Date filter: Last 7 days
     created_at[gte]: 2024-01-24T10:30:45.123Z
   Output file: failed-events.json
   Rate limit: 1 requests/second
   Max retries: 5

🔍 Starting to fetch events...
📄 Fetching page 1...
⏱️  Rate limiting: waiting 500ms...
   └─ Found 25 events on this page (25 total so far)
📄 Fetching page 2...
⚠️  Rate limited (429). Retrying in 2s... (attempt 1/5)
   └─ Found 18 events on this page (43 total so far)
✅ Completed! Retrieved 43 events across 2 pages.
💾 Output written to: failed-events.json
📊 Total events saved: 43
```

Progress messages are sent to stderr, so they don't interfere with JSON output to stdout.

## Implementation Details

### Key Components

1. **HookdeckAPIClient Class**: Encapsulates API communication logic with built-in rate limiting
2. **Rate Limiting**: Enforces configurable requests per second to respect API limits
3. **Retry Logic**: Handles 429 errors with exponential backoff (1s, 2s, 4s, 8s, 16s...)
4. **Pagination Logic**: Automatically follows pagination links to retrieve complete datasets
5. **Command-line Interface**: Uses Commander.js for argument parsing and help display
6. **Environment Configuration**: Loads API credentials from environment variables

### Rate Limiting Strategy

The script implements a comprehensive rate limiting strategy:

- **Proactive Rate Limiting**: Enforces minimum intervals between requests
- **429 Error Handling**: Automatically retries when rate limited
- **Exponential Backoff**: Increases wait time for subsequent retries (2^retry * 1000ms)
- **Retry-After Header**: Respects server-provided retry timing when available
- **Configurable Limits**: Adjustable requests per second and maximum retry attempts

### API Endpoints Used

This example interacts with the Hookdeck API v2024-09-01:
- **Events Endpoint**: `GET /events` - [API Documentation](https://hookdeck.com/docs/api#retrieve-all-events)

## Learn More

- [Hookdeck API Documentation](https://hookdeck.com/docs/api)
- [Events API Reference](https://hookdeck.com/docs/api#retrieve-all-events)
- [Authentication Guide](https://hookdeck.com/docs/api#authentication)