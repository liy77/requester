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

declare module "requester" {
  export = class Requester {
    restVersion: number;
    url: string;
    domain: string;
    timeout: number;
    /**
     * 
     * @param token Client token for auth
     * @param options HTTPS Options
     */
    constructor(token: string, options: HTTPSOptions)

    /**
     * Send request to discord api
     * @param endpoint Endpoint for request
     * @param options Request options
     */
    request(endpoint: string, options?: HTTPSRequestOptions): Promise<any>
  }
}
