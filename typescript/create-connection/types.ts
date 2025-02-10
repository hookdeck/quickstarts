interface SourceConfig {
  name: string;
}

interface DestinationConfig {
  name: string;
  url?: string;
  cli_path?: string;
}

interface ConnectionConfig {
  name: string;
  source: SourceConfig;
  destination: DestinationConfig;
}

interface ConnectionResponse {
  source: SourceConfig & { url?: string; cli_path?: string };
  destination: DestinationConfig;
}
