const HTTPS = require("https");
const Zlib = require("zlib");

module.exports = class Requester {
  #token;
  #headers;
  /**
   * @constructor
   * @param {String} token Client token for auth
   * @param {HTTPSOptions} options Https options
   */
  constructor(token, options) {
    /** Gateway version
     * @type {Number}
     */
    this.restVersion = options.version ?? 9;

    /** Api used to request
     * @type {String}
     */
    this.url = `/api/v${String(this.restVersion)}`;

    /** Discord domain
     * @type {String}
     */
    this.domain = options.domain ?? "discord.com";

    /** Request timeout
     * @type {Number}
     */
    this.timeout = options.requestTimeout ?? 15000;

    this.#headers = options.headers;
    this.#token = token;
  }

  /**
   * Send request to discord api
   * @param {String} endpoint Endpoint for request
   * @param {HTTPSRequestOptions} [options] Request options
   */
  async request(endpoint, options) {
    options = {
      auth: options?.auth ?? true,
      method: options?.method ?? "GET",
      body:
        typeof options?.body === "object"
          ? JSON.stringify(options.body)
          : options?.body,
    };

    return new Promise((resolve, reject) => {
      const body = options?.body;

      const req = HTTPS.request(
        {
          path: `${this.url}${
            endpoint.startsWith("/") ? endpoint : `/${endpoint}`
          }`,
          hostname: this.domain,
          auth: options?.auth ? this.#token : null,
          headers: this.#headers,
          method: options?.method,
          timeout: this.timeout,
        },
        (res) => {
          let data = "";

          /**
           * @type {res | Zlib.Gunzip}
           */
          let _res = res;
          if (res.headers["content-encoding"]?.includes("gzip")) {
            _res = res.pipe(Zlib.createGunzip());
          } else if (res.headers["content-encoding"]?.includes("deflate")) {
            _res = res.pipe(Zlib.createInflate());
          }

          _res
            ?.on("data", (chunk) => {
              data += chunk;
            })
            .on("error", (err) => {
              req.destroy(err);
              reject(err);
            })
            .once("end", () => {
              try {
                data = JSON.parse(data);
                resolve(data);
              } catch (err) {}
            });
        }
      );

      req.setHeader("Content-Type", "application/json");
      if (body) {
        if (Array.isArray(body)) {
          for (const chunk of body) {
            req.write(chunk);
          }
          req.end();
        } else {
          req.write(body);
          req.end();
        }
      } else req.end();
    });
  }
};
