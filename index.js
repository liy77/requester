const HTTPS = require("https");
const Zlib = require("zlib");

class MultipartData {
  buffers = []
  
  /**
   * @param {String} boundaryName The name of boundary
   */
  constructor(boundaryName) {
    this._boundary = `----------------${boundaryName}`
  }

  /**
   * @param {String} name Attachment name
   * @param {String?} filename File name
   * @param {any} data Image data
   */
  append(name, data, filename) {
    var str = `\r
    --${this._boundary}\r
    Content-Disposition: form-data; name="${name}"`

    if (filename) str += `; filename="${filename}"`

    if (ArrayBuffer.isView(data)) {
      str +="\r\nContent-Type: application/octet-stream"
      if (!(data instanceof Uint8Array)) data = new Uint8Array(data.buffer, data.byteOffset, data.byteLength)
    } else if (typeof data === "object") {
      str +="\r\nContent-Type: application/json"
      data = Buffer.from(JSON.stringify(data))
    } else {
      data = Buffer.from("" + data);
    }
    this.buffers.push(Buffer.from(str + "\r\n\r\n"));
    this.buffers.push(data);
  }

  finish() {
    this.buffers.push(Buffer.from("\r\n--" + this.boundary + "--"));
    return this.buffers;
  }
}

module.exports.MultipartData = MultipartData

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
      var body = options?.body;
      const url = `${this.url}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`

      const req = HTTPS.request(
        {
          path: url,
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
        if (body.reason) {
          let reason = body.reason

          try {
            if (reason.includes("%") && !reason.includes(" ")) reason = decodeURIComponent(reason)
          } catch { }
          
          req.setHeader("X-Audit-Log-Reason", encodeURIComponent(reason))

          if ((options.method !== "PUT" || !url.includes("/bans")) && (options.method !== "POST" || !url.includes("/prune"))) {
            delete body.reason
          } else {
            body.reason = reason
          }
        }

        if (body.attachments) {
          const MD = new MultipartData("LRD-Requester")
          req.setHeader("Content-Type", "multipart/form-data; boundary=" + MD._boundary);
          for (const attach of body.attachments) {
            if (!attach.attachment) return

            MD.append(attach.name, attach.attachment, attach.name)
          }

          MD.append("payload_json", body)
          body = MD.finish()
        }

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
