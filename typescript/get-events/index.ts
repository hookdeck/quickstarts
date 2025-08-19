#!/usr/bin/env npx ts-node

import dotenv from "dotenv";
import { Command } from "commander";
import { writeFileSync } from "fs";

dotenv.config();

// Valid status values for Hookdeck events
const VALID_STATUSES = ['SCHEDULED', 'QUEUED', 'HOLD', 'SUCCESSFUL', 'FAILED'] as const;
type EventStatus = typeof VALID_STATUSES[number];

// Date query operators
const DATE_OPERATORS = ['gte', 'gt', 'lte', 'lt', 'any'] as const;
type DateOperator = typeof DATE_OPERATORS[number];

interface DateQuery {
  operator: DateOperator;
  value?: string; // ISO date string, not needed for 'any'
}

interface Event {
  id: string;
  team_id: string;
  workspace_id: string;
  connection_id: string;
  destination_id: string;
  request_id: string;
  event_id: string;
  status: string;
  successful_at?: string;
  created_at: string;
  updated_at: string;
  [key: string]: any;
}

interface DetailedEvent extends Event {
  data?: {
    headers?: Record<string, string>;
    body?: any;
    query?: Record<string, string>;
  };
}

interface EventsResponse {
  models: Event[];
  pagination: {
    next?: string;
    prev?: string;
  };
  count: number;
}

class HookdeckAPIClient {
  private apiKey: string;
  private baseUrl = "https://api.hookdeck.com/2024-09-01";
  private lastRequestTime = 0;
  private minRequestInterval = 1000; // 1 request per second
  private maxRetries = 5;

  constructor(requestsPerSecond = 1, maxRetries = 5) {
    const apiKey = process.env.HOOKDECK_API_KEY;
    if (!apiKey) {
      console.error("❌ Error: HOOKDECK_API_KEY environment variable is required");
      process.exit(1);
    }
    this.apiKey = apiKey;
    this.minRequestInterval = 1000 / requestsPerSecond;
    this.maxRetries = maxRetries;
  }

  private async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async enforceRateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    if (timeSinceLastRequest < this.minRequestInterval) {
      const waitTime = this.minRequestInterval - timeSinceLastRequest;
      process.stderr.write(`⏱️  Rate limiting: waiting ${waitTime}ms...\n`);
      await this.sleep(waitTime);
    }
    
    this.lastRequestTime = Date.now();
  }

  private async makeRequest(url: string, retryCount = 0): Promise<any> {
    await this.enforceRateLimit();

    try {
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
      });

      if (response.status === 429) {
        // Handle rate limiting with exponential backoff
        if (retryCount >= this.maxRetries) {
          throw new Error(`Rate limit exceeded after ${this.maxRetries} retries`);
        }

        const retryAfter = response.headers.get('retry-after');
        const backoffTime = retryAfter 
          ? parseInt(retryAfter) * 1000 
          : Math.pow(2, retryCount) * 1000; // Exponential backoff: 1s, 2s, 4s, 8s, 16s

        console.error(`⚠️  Rate limited (429). Retrying in ${backoffTime/1000}s... (attempt ${retryCount + 1}/${this.maxRetries})`);
        await this.sleep(backoffTime);
        
        return this.makeRequest(url, retryCount + 1);
      }

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to fetch from Hookdeck API: ${error.message}`);
      }
      throw new Error("Unknown error occurred while fetching from Hookdeck API");
    }
  }

  async getEvent(eventId: string): Promise<DetailedEvent> {
    const url = `${this.baseUrl}/events/${eventId}`;
    return this.makeRequest(url);
  }

  async getAllEvents(
    status?: EventStatus, 
    destinationId?: string, 
    createdAtQueries?: DateQuery[],
    progressCallback?: (current: number, total: number) => void
  ): Promise<DetailedEvent[]> {
    const params = new URLSearchParams();
    
    if (status) {
      params.append("status", status);
    }
    
    if (destinationId) {
      params.append("destination_id", destinationId);
    }

    // Add date queries for created_at
    if (createdAtQueries) {
      for (const query of createdAtQueries) {
        if (query.operator === 'any') {
          params.append('created_at[any]', '');
        } else if (query.value) {
          params.append(`created_at[${query.operator}]`, query.value);
        }
      }
    }

    let allEvents: Event[] = [];
    let nextUrl = `${this.baseUrl}/events?${params.toString()}`;
    let pageCount = 0;

    // First request to get total count estimate
    process.stderr.write("🔍 Starting to fetch events...\n");
    
    while (nextUrl) {
      pageCount++;
      process.stderr.write(`📄 Fetching page ${pageCount}...\n`);
      
      const response: EventsResponse = await this.makeRequest(nextUrl);
      allEvents = allEvents.concat(response.models);

      process.stderr.write(`   └─ Found ${response.models.length} events on this page (${allEvents.length} total so far)\n`);

      if (progressCallback) {
        progressCallback(allEvents.length, response.count);
      }

      if (response.pagination?.next) {
        nextUrl = `${this.baseUrl}/events?${response.pagination.next}`;
      } else {
        nextUrl = "";
      }
    }

    process.stderr.write(`✅ Completed! Retrieved ${allEvents.length} events across ${pageCount} pages.\n`);

    // Always fetch detailed information for each event
    process.stderr.write(`🔍 Fetching detailed information for ${allEvents.length} events...\n`);
    const detailedEvents: DetailedEvent[] = [];
    
    for (let i = 0; i < allEvents.length; i++) {
      const event = allEvents[i];
      process.stderr.write(`📋 Fetching details for event ${i + 1}/${allEvents.length} (${event.id})...\n`);
      
      try {
        const detailedEvent = await this.getEvent(event.id);
        detailedEvents.push(detailedEvent);
      } catch (error) {
        console.error(`⚠️  Failed to fetch details for event ${event.id}: ${error}`);
        // Include the basic event without details
        detailedEvents.push(event as DetailedEvent);
      }
    }
    
    process.stderr.write(`✅ Completed detailed fetch! Retrieved full details for ${detailedEvents.length} events.\n`);
    return detailedEvents;
  }
}

async function main() {
  const program = new Command();

  program
    .name("get-events")
    .description("Example script to retrieve events from Hookdeck API")
    .version("1.0.0")
    .option("--status <status>", `Filter events by status. Valid values: ${VALID_STATUSES.join(', ')}`)
    .option("--destination-id <destination_id>", "Filter events by destination ID")
    .option("-o, --output <file>", "Write JSON output to file instead of stdout")
    .option("--rate-limit <rps>", "Maximum requests per second (default: 1)", "1")
    .option("--max-retries <count>", "Maximum retry attempts for rate limited requests (default: 5)", "5")
    .option("--created-after <date>", "Filter events created after this date (ISO 8601 format, e.g., 2024-01-01T00:00:00Z)")
    .option("--created-before <date>", "Filter events created before this date (ISO 8601 format)")
    .option("--created-from <date>", "Filter events created from this date onwards (inclusive)")
    .option("--created-until <date>", "Filter events created until this date (inclusive)")
    .option("--created-any", "Filter events that have a created_at value (not null)")
    .option("--last-days <days>", "Filter events from the last X days (e.g., --last-days 7 for last week)")
    .helpOption("-h, --help", "Display help for command");

  program.parse();

  const options = program.opts();

  // Helper function to validate and parse ISO date
  function validateISODate(dateString: string, paramName: string): string {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        throw new Error(`Invalid date format`);
      }
      return date.toISOString();
    } catch (error) {
      console.error(`❌ Error: Invalid ${paramName} '${dateString}'. Please use ISO 8601 format (e.g., 2024-01-01T00:00:00Z or 2024-01-01)`);
      process.exit(1);
    }
  }

  // Validate status parameter
  if (options.status && !VALID_STATUSES.includes(options.status.toUpperCase())) {
    console.error(`❌ Error: Invalid status '${options.status}'. Valid values are: ${VALID_STATUSES.join(', ')}`);
    process.exit(1);
  }

  // Validate rate limit parameter
  const rateLimit = parseInt(options.rateLimit);
  if (isNaN(rateLimit) || rateLimit <= 0) {
    console.error(`❌ Error: Invalid rate limit '${options.rateLimit}'. Must be a positive number.`);
    process.exit(1);
  }

  // Validate max retries parameter
  const maxRetries = parseInt(options.maxRetries);
  if (isNaN(maxRetries) || maxRetries < 0) {
    console.error(`❌ Error: Invalid max retries '${options.maxRetries}'. Must be a non-negative number.`);
    process.exit(1);
  }

  // Validate last-days parameter
  let lastDays: number | undefined;
  if (options.lastDays) {
    lastDays = parseInt(options.lastDays);
    if (isNaN(lastDays) || lastDays <= 0) {
      console.error(`❌ Error: Invalid last-days '${options.lastDays}'. Must be a positive number.`);
      process.exit(1);
    }
  }

  // Check for conflicting date options
  const explicitDateOptions = [
    options.createdAfter,
    options.createdBefore, 
    options.createdFrom,
    options.createdUntil,
    options.createdAny
  ].filter(Boolean);

  if (lastDays && explicitDateOptions.length > 0) {
    console.error(`❌ Error: --last-days cannot be used with other date filters (--created-after, --created-before, --created-from, --created-until, --created-any)`);
    process.exit(1);
  }

  // Build date queries
  const createdAtQueries: DateQuery[] = [];
  
  if (lastDays) {
    // Calculate date X days ago from now
    const now = new Date();
    const daysAgo = new Date(now.getTime() - (lastDays * 24 * 60 * 60 * 1000));
    createdAtQueries.push({
      operator: 'gte',
      value: daysAgo.toISOString()
    });
  } else {
    // Handle explicit date options
    if (options.createdAfter) {
      createdAtQueries.push({
        operator: 'gt',
        value: validateISODate(options.createdAfter, '--created-after')
      });
    }
    
    if (options.createdBefore) {
      createdAtQueries.push({
        operator: 'lt',
        value: validateISODate(options.createdBefore, '--created-before')
      });
    }
    
    if (options.createdFrom) {
      createdAtQueries.push({
        operator: 'gte',
        value: validateISODate(options.createdFrom, '--created-from')
      });
    }
    
    if (options.createdUntil) {
      createdAtQueries.push({
        operator: 'lte',
        value: validateISODate(options.createdUntil, '--created-until')
      });
    }
    
    if (options.createdAny) {
      createdAtQueries.push({
        operator: 'any'
      });
    }
  }

  // Normalize status to uppercase
  const normalizedStatus = options.status ? options.status.toUpperCase() as EventStatus : undefined;

  try {
    const client = new HookdeckAPIClient(rateLimit, maxRetries);
    
    // Display configuration
    process.stderr.write("⚙️  Configuration:\n");
    if (normalizedStatus) {
      process.stderr.write(`   Status filter: ${normalizedStatus}\n`);
    }
    if (options.destinationId) {
      process.stderr.write(`   Destination ID filter: ${options.destinationId}\n`);
    }
    if (createdAtQueries.length > 0) {
      if (lastDays) {
        process.stderr.write(`   Date filter: Last ${lastDays} day${lastDays > 1 ? 's' : ''}\n`);
        process.stderr.write(`     created_at[gte]: ${createdAtQueries[0].value}\n`);
      } else {
        process.stderr.write(`   Date filters:\n`);
        for (const query of createdAtQueries) {
          if (query.operator === 'any') {
            process.stderr.write(`     created_at[any]: not null\n`);
          } else {
            process.stderr.write(`     created_at[${query.operator}]: ${query.value}\n`);
          }
        }
      }
    }
    if (options.output) {
      process.stderr.write(`   Output file: ${options.output}\n`);
    }
    process.stderr.write(`   Rate limit: ${rateLimit} requests/second\n`);
    process.stderr.write(`   Max retries: ${maxRetries}\n`);
    process.stderr.write("\n");

    const events = await client.getAllEvents(normalizedStatus, options.destinationId, createdAtQueries.length > 0 ? createdAtQueries : undefined);
    
    const jsonOutput = JSON.stringify(events, null, 2);
    
    if (options.output) {
      try {
        writeFileSync(options.output, jsonOutput);
        process.stderr.write(`💾 Output written to: ${options.output}\n`);
        process.stderr.write(`📊 Total events saved: ${events.length}\n`);
      } catch (writeError) {
        console.error(`❌ Failed to write to file ${options.output}: ${writeError}`);
        process.exit(1);
      }
    } else {
      console.log(jsonOutput);
    }
  } catch (error) {
    if (error instanceof Error) {
      console.error(`❌ Error: ${error.message}`);
    } else {
      console.error("❌ An unknown error occurred");
    }
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}