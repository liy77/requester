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
    if(data === undefined) {
      return;
    }

    var str = `\r\n--${this._boundary}\r\nContent-Disposition: form-data; name="${name}"`

    var contentType = ""

    if (filename) {
      str += `; filename="${filename}"`

      const extension = filename.match(/\.(png|apng|gif|jpg|jpeg|webp|svg|json)$/i);

      if (extension) {
        var ext = extension[1].toLowerCase();

        switch (ext) {
          case "png":
          case "apng":
          case "gif":
          case "jpg":
          case "jpeg":
          case "webp":
          case "svg": {
            if(ext === "svg") {
              ext = "svg+xml";
            }

            contentType = "image/";
          break;
          }
          case "json": {
            contentType = "application/";
          break;
          }
        }

        contentType += ext
      }
    }

    if (contentType) {
      str += `\r\nContent-Type: ${contentType}`;
    } else if (ArrayBuffer.isView(data)) {
      str += "\r\nContent-Type: application/octet-stream"
      if (!(data instanceof Uint8Array)) {
        data = new Uint8Array(data.buffer, data.byteOffset, data.byteLength)
      }
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
    this.buffers.push(Buffer.from("\r\n--" + this._boundary + "--"));
    return this.buffers;
  }
}

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
      attachments: options.attachments,
      boundary: options.boundary
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
        var json_body = JSON.parse(body)

        if (json_body.reason) {
          let reason = json_body.reason

          try {
            if (reason.includes("%") && !reason.includes(" ")) reason = decodeURIComponent(reason)
          } catch { }
          
          req.setHeader("X-Audit-Log-Reason", encodeURIComponent(reason))

          if ((options.method !== "PUT" || !url.includes("/bans")) && (options.method !== "POST" || !url.includes("/prune"))) {
            delete json_body.reason
          } else {
            json_body.reason = reason
          }
        }

        if (json_body.attachments || options.attachments) {
          const attachments = json_body.attachments ?? options.attachments

          const MD = new MultipartData(options.boundary ?? "Discord-Request")
          
          req.setHeader("Content-Type", "multipart/form-data; boundary=" + MD._boundary);
          for (const attach of attachments) {
            if (!attach.attachment) return

            MD.append(attach.name, attach.attachment, attach.name)
          }

          if (json_body.attachments) {
            delete json_body.attachments
            json_body = json_body
          }

          MD.append("payload_json", json_body)

          body = json_body = MD.finish().filter((buf) => Buffer.isBuffer(buf))
        } else {
          body = JSON.stringify(json_body)
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

module.exports.MultipartData = MultipartData
