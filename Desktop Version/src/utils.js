const crypto = require("crypto");

const formatTimeAgo = (timestamp) => {
  const now = Date.now();
  const seconds = Math.floor((now - timestamp) / 1000);
  let interval = seconds / 31536000;
  if (interval > 1) return Math.floor(interval) + " years ago";
  interval = seconds / 2592000;
  if (interval > 1) return Math.floor(interval) + " months ago";
  interval = seconds / 604800;
  if (interval > 1) return Math.floor(interval) + " weeks ago";
  interval = seconds / 86400;
  if (interval > 1) return Math.floor(interval) + " days ago";
  interval = seconds / 3600;
  if (interval > 1) return Math.floor(interval) + " hours ago";
  interval = seconds / 60;
  if (interval > 1) return Math.floor(interval) + " minutes ago";
  return "just now";
};

const formatBytes = (bytes, decimals = 2) => {
  if (bytes === null || bytes === undefined) return "-";
  if (bytes === 0) return "0 B";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
};

const isValidJson = (str) => {
  if (typeof str !== "string" || !str.trim()) return true;
  try {
    JSON.parse(str);
  } catch (e) {
    return false;
  }
  return true;
};

const generateSessionName = (sessionState, timestamp) => {
  const { httpMethod, url } = sessionState;
  const timeAgo = formatTimeAgo(timestamp);
  const shortUrl =
    url && url.length > 100 ? `${url.substring(0, 100)}...` : url;
  return `${httpMethod}: ${shortUrl || "[No URL]"} | ${timeAgo}`;
};

// AWS v4 Signing Logic using Node.js Crypto
function sha256(message) {
  return crypto.createHash("sha256").update(message).digest("hex");
}

function hmac(key, data) {
  return crypto.createHmac("sha256", key).update(data).digest();
}

function getSignatureKey(key, dateStamp, regionName, serviceName) {
  const kDate = hmac("AWS4" + key, dateStamp);
  const kRegion = hmac(kDate, regionName);
  const kService = hmac(kRegion, serviceName);
  const kSigning = hmac(kService, "aws4_request");
  return kSigning;
}

function signRequestV4(request, credentials) {
  const { accessKeyId, secretAccessKey, region, service } = credentials;
  const { method, host, path, headers, body } = request;

  const amzDate = new Date().toISOString().replace(/[:-]|\.\d{3}/g, "") + "Z";
  const dateStamp = amzDate.substr(0, 8);

  const canonicalHeaders = Object.keys(headers)
    .sort()
    .map((key) => `${key.toLowerCase()}:${headers[key].toString().trim()}\n`)
    .join("");

  const signedHeaders = Object.keys(headers)
    .sort()
    .map((key) => key.toLowerCase())
    .join(";");
  const payloadHash = sha256(body || "");

  const canonicalRequest = `${method}\n${path}\n\n${canonicalHeaders}\n${signedHeaders}\n${payloadHash}`;

  const algorithm = "AWS4-HMAC-SHA256";
  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const stringToSign = `${algorithm}\n${amzDate}\n${credentialScope}\n${sha256(
    canonicalRequest
  )}`;

  const signingKey = getSignatureKey(
    secretAccessKey,
    dateStamp,
    region,
    service
  );
  const signature = crypto
    .createHmac("sha256", signingKey)
    .update(stringToSign)
    .digest("hex");

  const authorizationHeader = `${algorithm} Credential=${accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  return {
    "x-amz-date": amzDate,
    Authorization: authorizationHeader,
    "x-amz-content-sha256": payloadHash,
  };
}

function uuidv4() {
  // Use crypto.getRandomValues for better randomness in browser environments
  // and Node.js crypto module for Node.js environments.
  // The fallback to Math.random is less secure and should be avoided for critical applications.
  const getRandomValues =
    typeof crypto !== "undefined" && crypto.getRandomValues
      ? (arr) => crypto.getRandomValues(arr)
      : (arr) => {
          // Fallback for environments without crypto.getRandomValues (less secure)
          for (let i = 0; i < arr.length; i++) {
            arr[i] = Math.floor(Math.random() * 256);
          }
          return arr;
        };

  // Generate 16 random bytes (128 bits)
  const bytes = new Uint8Array(16);
  getRandomValues(bytes);

  // Set the version (4) and variant (10xx) bits
  // byte 6: set version to 0100 (4)
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  // byte 8: set variant to 10xx (RFC 4122)
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  // Convert bytes to hexadecimal string and format
  const hex = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  // Format the hexadecimal string into the UUID format:
  // xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
  return (
    hex.substring(0, 8) +
    "-" +
    hex.substring(8, 12) +
    "-" +
    hex.substring(12, 16) +
    "-" +
    hex.substring(16, 20) +
    "-" +
    hex.substring(20, 32)
  );
}

function isValidUrl(url) {
  try {
    new URL(url);
    return true;
  } catch (error) {
    return false;
  }
}

module.exports = {
  formatTimeAgo,
  formatBytes,
  isValidJson,
  generateSessionName,
  signRequestV4,
  uuidv4,
  isValidUrl,
};
