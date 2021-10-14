declare interface HTTPSOptions {
  version?: number;
  requestTimeout?: number;
  domain?: string;
  headers: any;
}

declare interface Attachment {
  attachment: ArrayBuffer | any,
  name: string
}

declare interface HTTPSRequestOptions {
  method?: string;
  body?: any;
  auth?: boolean;
  attachments?: Attachment[],
  boundary?: string
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

export class MultipartData {
    buffers: any[]

   /**
    * @param boundaryName The name of boundary
    */
    constructor(boundaryName: string)

  /**
   * @param name Attachment name
   * @param filename File name
   * @param data Image data
   */
    append(name: string, data: any, filename?: string): void
    finish(): any[]
}
  
declare module "discord-request" {
  class Requester {
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

    static MultipartData: typeof MultipartData
  }

  export = Requester
}
