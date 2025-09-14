const fs = require("fs");
const path = require("path");
const { uuidv4 } = require("./utils");

/**
 * A key-value store that mimics the browser's localStorage API using pure Node.js file system operations.
 * It is designed to be a direct replacement for the previous implementation,
 * aligning it with the logic used in thunder7.html.
 */
class KVStore {
  /**
   * Creates a new KVStore instance.
   * @param {string} dbPath - The path to the directory where the database files will be stored.
   */
  constructor(dbPath) {
    this.dbPath = path.resolve(dbPath); // Resolve to an absolute path
    if (!fs.existsSync(this.dbPath)) {
      fs.mkdirSync(this.dbPath, { recursive: true });
    }
  }

  /**
   * Helper to get the full path for a given key.
   * @param {string} key - The key.
   * @returns {string} The full file path for the key.
   */
  _getFilePath(key) {
    // Sanitize the key to be a valid filename.
    // Replace characters that are typically invalid in filenames with underscores.
    const sanitizedKey = key.replace(/[^a-zA-Z0-9-_.]/g, "@");
    // const sanitizedKey = key.replace(/[^a-zA-Z0-9-_.]/g, "_");

    return path.join(this.dbPath, sanitizedKey + ".json"); // Using .json extension for consistency
  }

  /**
   * Sets a key-value pair in the store.
   * @param {string} key - The key.
   * @param {any} value - The value, which will be JSON stringified.
   */
  setItem(key, value) {
    const filePath = this._getFilePath(key);
    try {
      // Ensure the directory exists before writing the file
      if (!fs.existsSync(path.dirname(filePath))) {
        fs.mkdirSync(path.dirname(filePath), { recursive: true });
      }
      fs.writeFileSync(filePath, JSON.stringify(value), "utf8");
    } catch (e) {
      console.error(`Error setting item for key "${key}":`, e);
    }
  }

  /**
   * Gets the value for a given key.
   * @param {string} key - The key.
   * @returns {any|null} The parsed value, or null if the key does not exist.
   */
  getItem(key) {
    const filePath = this._getFilePath(key);
    if (!fs.existsSync(filePath)) {
      return null;
    }
    try {
      const item = fs.readFileSync(filePath, "utf8");
      return JSON.parse(item);
    } catch (e) {
      // If parsing fails, it might not have been a JSON string (e.g., if directly written)
      // or the file is corrupted. Return the raw content or null depending on desired behavior.
      console.warn(
        `Error parsing item for key "${key}". Returning raw content or null.`,
        e
      );
      try {
        return fs.readFileSync(filePath, "utf8"); // Return raw content if JSON.parse fails
      } catch (readErr) {
        console.error(`Error reading raw content for key "${key}":`, readErr);
        return null;
      }
    }
  }

  /**
   * Removes a key-value pair from the store.
   * @param {string} key - The key.
   */
  removeItem(key) {
    const filePath = this._getFilePath(key);
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch (e) {
        console.error(`Error removing item for key "${key}":`, e);
      }
    }
  }

  /**
   * Clears all key-value pairs from the store.
   */
  clear() {
    try {
      const files = fs.readdirSync(this.dbPath);
      for (const file of files) {
        // Only remove files that were likely created by our store
        if (file.endsWith(".json")) {
          fs.unlinkSync(path.join(this.dbPath, file));
        }
      }
    } catch (e) {
      console.error("Error clearing the store:", e);
    }
  }

  /**
   * Gets all keys from the store.
   * @returns {string[]} An array of all keys.
   */
  getAllKeys() {
    try {
      const files = fs.readdirSync(this.dbPath);
      // Filter for files created by our store and extract the original key
      const keys = files
        .filter((file) => file.endsWith(".json"))
        .map((file) => file.substring(0, file.length - ".json".length));
      return keys;
    } catch (e) {
      console.error("Error getting all keys:", e);
      return [];
    }
  }
}
const INITIAL_STATE = {
  sessionId: uuidv4(),
  httpMethod: "POST",
  url: "", //"https://jsonplaceholder.typicode.com/posts",
  queryParams: [{ ...this.emptyKeyValue, id: Date.now() }],
  headers: [{ ...this.emptyKeyValue, id: Date.now() + 1 }],
  rawHeadersText: "",
  isRawHeaders: false,
  requestCookies: [{ ...this.emptyKeyValue, id: Date.now() + 2 }],
  auth: {
    type: "none",
    basic: { username: "", password: "" },
    bearer: { token: "" },
    oauth2: {
      accessToken: "",
      tokenUrl: "",
      clientId: "",
      clientSecret: "",
      scope: "",
    },
    aws: {
      accessKeyId: "",
      secretAccessKey: "",
      region: "us-east-1",
      service: "execute-api",
    },
  },
  body: {
    type: "json",
    jsonContent: '{ "id": 101 }',
    textContent: "Plain text content.",
    xmlContent: "<root><key>value</key></root>",
    graphqlQuery: "{ posts { id title } }",
    graphqlVariables: '{ "limit": 10 }',
    formData: [{ ...this.emptyFormValue, id: Date.now() + 3 }],
    formEncodedData: [{ ...this.emptyKeyValue, id: Date.now() + 4 }],
    binaryFilePath: null,
  },
};
const APP_STATE = {
  orientation: 1, // 1 for Horizontal, 2 for Vertical
  is_darkmode: true,
};

module.exports = { KVStore, INITIAL_STATE, APP_STATE };
