declare interface HTTPSOptions {
  version?: number;
  requestTimeout?: number;
  domain?: string;
  headers: any;
}

declare interface HTTPSRequestOptions {
  method?: string;
  body?: any;
  auth?: boolean;
}
