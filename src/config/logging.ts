// src/config/logging.ts
export interface LoggingConfig {
  level: string;
  loki: {
    enabled: boolean;
    url?: string;
    user?: string;
    password?: string;
  };
  logtail: {
    enabled: boolean;
    url?: string;
    token?: string;
  };
}

export function getLoggingConfig(): LoggingConfig {
  const lokiUrl = process.env.LOKI_URL;
  const logtailUrl = process.env.LOGTAIL_URL;
  
  // Check if URLs are placeholder/template values
  const isLokiUrlValid = lokiUrl && 
    !lokiUrl.includes('<') && 
    !lokiUrl.includes('>') && 
    lokiUrl.startsWith('http');
    
  const isLogtailUrlValid = logtailUrl && 
    !logtailUrl.includes('<') && 
    !logtailUrl.includes('>') && 
    logtailUrl.startsWith('http');

  return {
    level: process.env.LOG_LEVEL ?? "info",
    loki: {
      enabled: Boolean(process.env.LOG_ENABLE_LOKI === "true" && isLokiUrlValid),
      url: isLokiUrlValid ? lokiUrl : undefined,
      user: process.env.LOKI_USER,
      password: process.env.LOKI_PASS,
    },
    logtail: {
      enabled: Boolean(process.env.LOG_ENABLE_LOGTAIL === "true" && isLogtailUrlValid),
      url: isLogtailUrlValid ? logtailUrl : undefined,
      token: process.env.LOGTAIL_TOKEN,
    },
  };
}
