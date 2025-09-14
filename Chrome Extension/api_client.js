// ====================================================================================
//                                  JAVASCRIPT LOGIC
// ====================================================================================
document.addEventListener("DOMContentLoaded", () => {
  // ==================== Constants & Defaults ====================
  const ASYNC_STORAGE_KEYS = {
    ALL_SESSIONS: "@apicommander_all_keys",
    SESSION_PREFIX: "@apicommander_session_",
    LAST_ACTIVE: "@apicommander_last_active_key",
    DARK_MODE: "@apicommander_dark_mode",
  };

  const emptyKeyValue = { key: "", value: "", enabled: true };
  const emptyFormValue = {
    key: "",
    value: "",
    type: "text",
    file: null,
    enabled: true,
  };

  const getDefaultState = () => ({
    httpMethod: "POST",
    url: "", //https://jsonplaceholder.typicode.com/posts
    requestTab: "Body",
    queryParams: [{ id: Date.now(), ...emptyKeyValue }],
    headers: [
      {
        id: Date.now() + 1,
        key: "User-Agent",
        value: "API Commander/1.0.1",
        enabled: true,
      },
      { id: Date.now() + 2, ...emptyKeyValue },
    ],
    requestCookies: [{ id: Date.now() + 5, ...emptyKeyValue }],
    isRawHeaders: false,
    rawHeadersText: "User-Agent: API Commander/2.0.0",
    authConfig: {
      type: "None",
      basic: { username: "", password: "" },
      bearer: { token: "" },
      // oauth2: {
      //   accessToken: "",
      //   tokenUrl: "",
      //   clientId: "",
      //   clientSecret: "",
      //   scope: "",
      // },
      // aws: {
      //   accessKeyId: "",
      //   secretAccessKey: "",
      //   region: "us-east-1",
      //   service: "execute-api",
      // },
    },
    bodyConfig: {
      type: "JSON",
      jsonContent: '{\n  "id": 101\n}',
      textContent: "",
      xmlContent: "",
      // graphqlQuery: "{ posts { id title } }",
      // graphqlVariables: '{ "limit": 10 }',
      formData: [{ id: Date.now() + 3, ...emptyFormValue }],
      formEncodedData: [{ id: Date.now() + 4, ...emptyKeyValue }],
      binaryFile: null,
    },
  });

  const httpStatusMessages = {
    100: "Continue",
    101: "Switching Protocols",
    200: "OK",
    201: "Created",
    202: "Accepted",
    204: "No Content",
    301: "Moved Permanently",
    302: "Found",
    304: "Not Modified",
    400: "Bad Request",
    401: "Unauthorized",
    403: "Forbidden",
    404: "Not Found",
    405: "Method Not Allowed",
    408: "Request Timeout",
    500: "Internal Server Error",
    501: "Not Implemented",
    502: "Bad Gateway",
    503: "Service Unavailable",
    504: "Gateway Timeout",
  };

  // ==================== Global State & DOM References ====================
  let appState = getDefaultState();
  let sessions = {};
  let activeSessionKey = null;
  let responseState = {
    data: null,
    headers: null,
    status: null,
    size: null,
    time: null,
    error: null,
    responseTab: "Response",
    cookies: [],
  };
  let isLoading = false;
  let isInitialLoad = true;

  const dom = {
    body: document.body,
    initialLoader: document.getElementById("initial-load-container"),
    darkModeSwitch: document.getElementById("dark-mode-switch"),
    sessionPicker: document.getElementById("session-picker"),
    newSessionBtn: document.getElementById("new-session-btn"),
    importSessionBtn: document.getElementById("import-session-btn"),
    exportSessionBtn: document.getElementById("export-session-btn"),
    deleteSessionBtn: document.getElementById("delete-session-btn"),
    methodDropdown: document.getElementById("method-dropdown"),
    urlInput: document.getElementById("url-input"),
    sendBtn: document.getElementById("send-btn"),
    mainContent: document.getElementById("main-content"),
    requestPanel: document.getElementById("request-panel"),
    responsePanel: document.getElementById("response-panel"),
    requestTabContainer: document.getElementById("request-tab-container"),
    requestPanelBody: document.getElementById("request-panel-body"),
    responseTabContainer: document.getElementById("response-tab-container"),
    responsePanelBody: document.getElementById("response-panel-body"),
    resStatus: document.getElementById("res-status"),
    resSize: document.getElementById("res-size"),
    resTime: document.getElementById("res-time"),
    resizer: document.getElementById("resizer"),
    toastContainer: document.getElementById("toast-container"),
    fileImporter: document.getElementById("file-importer"),
    formFilePicker: document.getElementById("form-file-picker"),
  };

  // ==================== Utility Functions ====================
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

  const showToast = (message, type = "info", duration = 3000) => {
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    toast.textContent = message;
    dom.toastContainer.appendChild(toast);
    setTimeout(() => {
      toast.classList.add("show");
    }, 10);
    setTimeout(() => {
      toast.classList.remove("show");
      setTimeout(() => toast.remove(), 300);
    }, duration);
  };

  const debounce = (func, delay) => {
    let timeout;
    return (...args) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), delay);
    };
  };

  // ==================== AWS v4 Signing Logic (Native Crypto) ====================
  async function sha256_hex(message) {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  }

  async function hmacSha256(key, data) {
    const keyBuffer =
      typeof key === "string" ? new TextEncoder().encode(key) : key;
    const dataBuffer = new TextEncoder().encode(data);
    const cryptoKey = await crypto.subtle.importKey(
      "raw",
      keyBuffer,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    return await crypto.subtle.sign("HMAC", cryptoKey, dataBuffer);
  }

  async function getSignatureKey(key, dateStamp, regionName, serviceName) {
    const kDate = await hmacSha256("AWS4" + key, dateStamp);
    const kRegion = await hmacSha256(kDate, regionName);
    const kService = await hmacSha256(kRegion, serviceName);
    return await hmacSha256(kService, "aws4_request");
  }

  async function signRequestV4(request, credentials) {
    const { accessKeyId, secretAccessKey, region, service } = credentials;
    const { method, host, path, headers, body } = request;
    const amzDate = new Date().toISOString().replace(/[:-]|\.\d{3}/g, "");
    const dateStamp = amzDate.substr(0, 8);

    const headerEntries = Object.keys(headers).map((key) => [
      key.toLowerCase(),
      headers[key].toString().trim(),
    ]);
    headerEntries.sort((a, b) => a[0].localeCompare(b[0]));

    const canonicalHeaders = headerEntries
      .map(([k, v]) => `${k}:${v}\n`)
      .join("");
    const signedHeaders = headerEntries.map(([k]) => k).join(";");

    const payloadHash = await sha256_hex(body || "");
    const canonicalRequest = `${method}\n${path}\n\n${canonicalHeaders}\n${signedHeaders}\n${payloadHash}`;

    const algorithm = "AWS4-HMAC-SHA256";
    const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
    const hashedCanonicalRequest = await sha256_hex(canonicalRequest);
    const stringToSign = `${algorithm}\n${amzDate}\n${credentialScope}\n${hashedCanonicalRequest}`;

    const signingKey = await getSignatureKey(
      secretAccessKey,
      dateStamp,
      region,
      service
    );
    const signatureRaw = await hmacSha256(signingKey, stringToSign);
    const signature = Array.from(new Uint8Array(signatureRaw))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    const authorizationHeader = `${algorithm} Credential=${accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

    return {
      "x-amz-date": amzDate,
      Authorization: authorizationHeader,
      "x-amz-content-sha256": payloadHash,
    };
  }

  // ==================== State Management & Rendering ====================
  function render() {
    dom.methodDropdown.value = appState.httpMethod;
    dom.urlInput.value = appState.url;
    renderTabs(
      dom.requestTabContainer,
      ["Body", "Query", "Headers", "Cookies", "Auth"],
      appState.requestTab
    );
    renderRequestContent();
    renderTabs(
      dom.responseTabContainer,
      ["Response", "Headers", "Cookies"],
      responseState.responseTab
    );
    renderResponseContent();
    renderResponseStatus();
    dom.sendBtn.disabled = isLoading;
    dom.sendBtn.querySelector("span").textContent = isLoading
      ? "Sending..."
      : "Send";
  }

  function renderTabs(container, tabs, activeTab) {
    container.innerHTML = "";
    tabs.forEach((tab) => {
      const button = document.createElement("button");
      button.className = "tab-button";
      button.dataset.tab = tab;
      button.textContent = tab;
      if (tab === activeTab) button.classList.add("active");
      container.appendChild(button);
    });
  }

  function renderSubTabs(container, tabs, activeTab, onTabClick) {
    container.innerHTML = "";
    tabs.forEach((tab) => {
      const button = document.createElement("button");
      button.className = "sub-tab-button";
      button.dataset.tab = tab;
      button.textContent = tab;
      if (tab === activeTab) button.classList.add("active");
      button.onclick = () => onTabClick(tab);
      container.appendChild(button);
    });
  }

  function renderRequestContent() {
    const body = dom.requestPanelBody;
    body.innerHTML = "";
    switch (appState.requestTab) {
      case "Query":
        body.appendChild(
          createKvView(appState.queryParams, "queryParams", {
            hasCheckbox: true,
          })
        );
        break;
      case "Headers":
        body.appendChild(createHeadersView());
        break;
      case "Cookies":
        body.appendChild(
          createKvView(appState.requestCookies, "requestCookies", {
            hasCheckbox: true,
            keyPlaceholder: "cookie name",
          })
        );
        break;
      case "Auth":
        body.appendChild(createAuthView());
        break;
      case "Body":
        body.appendChild(createBodyView());
        break;
    }
  }

  function createKvView(items, stateKey, options = {}) {
    const container = document.createElement("div");
    container.className = "kv-container";
    items.forEach((item) => {
      const row = document.createElement("div");
      row.className = "param-row";
      let checkboxHtml = "";
      if (options.hasCheckbox) {
        checkboxHtml = `
                <label>
                    <input type="checkbox" data-id="${
                      item.id
                    }" data-field="enabled" ${item.enabled ? "checked" : ""}>
                    <span class="checkbox-container"><span class="checkmark">✓</span></span>
                </label>`;
      }
      row.innerHTML = `
                ${checkboxHtml}
                <input type="text" class="param-input" placeholder="${
                  options.keyPlaceholder || "key"
                }" value="${item.key}" data-id="${item.id}" data-field="key">
                <input type="text" class="param-input" placeholder="${
                  options.valuePlaceholder || "value"
                }" value="${item.value}" data-id="${
        item.id
      }" data-field="value">
                <button class="remove-button" data-id="${
                  item.id
                }">&#128465;</button>`; // Trash icon
      container.appendChild(row);
    });

    container.addEventListener("input", (e) => {
      if (e.target.matches(".param-input")) {
        const { id, field } = e.target.dataset;
        updateKvItem(stateKey, id, field, e.target.value);
      }
    });
    container.addEventListener("change", (e) => {
      if (e.target.matches('input[type="checkbox"]')) {
        const { id, field } = e.target.dataset;
        updateKvItem(stateKey, id, field, e.target.checked);
      }
    });
    container.addEventListener("click", (e) => {
      const removeBtn = e.target.closest(".remove-button");
      if (removeBtn) {
        removeKvItem(stateKey, removeBtn.dataset.id);
      }
    });

    return container;
  }

  function createHeadersView() {
    const container = document.createElement("div");
    container.style.cssText =
      "display:flex; flex-direction:column; height:100%;";
    const { isRawHeaders, rawHeadersText, headers } = appState;

    container.innerHTML = `
            <div class="raw-toggle-container">
                <label for="raw-headers-switch">Raw Input</label>
                <label class="switch">
                    <input type="checkbox" id="raw-headers-switch" ${
                      isRawHeaders ? "checked" : ""
                    }>
                    <span class="slider"></span>
                </label>
            </div>
            <div id="headers-content" style="flex: 1; display: flex; flex-direction: column;"></div>`;

    const contentDiv = container.querySelector("#headers-content");
    if (isRawHeaders) {
      const textArea = document.createElement("textarea");
      textArea.className = "raw-headers-input";
      textArea.value = rawHeadersText;
      textArea.placeholder = "HeaderName: HeaderValue";
      textArea.addEventListener("input", (e) => {
        appState.rawHeadersText = e.target.value;
        debouncedSave(appState);
      });
      contentDiv.appendChild(textArea);
    } else {
      contentDiv.appendChild(
        createKvView(headers, "headers", {
          hasCheckbox: true,
          keyPlaceholder: "header",
        })
      );
    }

    container
      .querySelector("#raw-headers-switch")
      .addEventListener("change", (e) => {
        appState.isRawHeaders = e.target.checked;
        if (appState.isRawHeaders) {
          appState.rawHeadersText = appState.headers
            .filter((h) => h.key && h.enabled)
            .map((h) => `${h.key}: ${h.value}`)
            .join("\n");
        }
        render();
        debouncedSave(appState);
      });
    return container;
  }

  function createAuthView() {
    const container = document.createElement("div");
    container.style.cssText =
      "display:flex; flex-direction:column; height:100%;";
    const tabsContainer = document.createElement("div");
    tabsContainer.className = "sub-tab-container";
    const contentContainer = document.createElement("div");
    contentContainer.className = "sub-tab-content";
    container.append(tabsContainer, contentContainer);

    const authTabs = [
      "None",
      "Basic",
      "Bearer",
      // "OAuth 2.0", "AWS v4"
    ];
    renderSubTabs(tabsContainer, authTabs, appState.authConfig.type, (tab) => {
      appState.authConfig.type = tab;
      render();
      debouncedSave(appState);
    });

    const {
      type,
      basic,
      bearer,
      // , oauth2, aws
    } = appState.authConfig;
    let contentHtml = "";
    switch (type) {
      case "Basic":
        contentHtml = `<input type="text" class="auth-input" placeholder="Username" data-section="basic" data-field="username" value="${
          basic.username || ""
        }"><input type="password" class="auth-input" placeholder="Password" data-section="basic" data-field="password" value="${
          basic.password || ""
        }">`;
        break;
      case "Bearer":
        contentHtml = `<input type="text" class="auth-input" placeholder="Token" data-section="bearer" data-field="token" value="${
          bearer.token || ""
        }">`;
        break;
      // case "OAuth 2.0":
      //   contentHtml = `
      //           <p class="input-label" style="margin-bottom:10px;">Client Credentials Grant</p>
      //           <input type="text" class="auth-input" placeholder="Access Token URL" data-section="oauth2" data-field="tokenUrl" value="${
      //             oauth2.tokenUrl || ""
      //           }">
      //           <input type="text" class="auth-input" placeholder="Client ID" data-section="oauth2" data-field="clientId" value="${
      //             oauth2.clientId || ""
      //           }">
      //           <input type="password" class="auth-input" placeholder="Client Secret" data-section="oauth2" data-field="clientSecret" value="${
      //             oauth2.clientSecret || ""
      //           }">
      //           <input type="text" class="auth-input" placeholder="Scope (optional)" data-section="oauth2" data-field="scope" value="${
      //             oauth2.scope || ""
      //           }">
      //           <button class="send-button" id="fetch-oauth-token-btn" style="align-self: flex-start; margin-top: 5px; margin-bottom: 20px;">
      //             <span>Fetch Token</span>
      //           </button>
      //           <hr style="border-color: var(--border); width: 100%; margin: 15px 0;">
      //           <input type="text" class="auth-input" placeholder="Access Token" data-section="oauth2" data-field="accessToken" value="${
      //             oauth2.accessToken || ""
      //           }">`;
      //   break;
      // case "AWS v4":
      //   contentHtml = `<input type="text" class="auth-input" placeholder="Access Key ID" data-section="aws" data-field="accessKeyId" value="${
      //     aws.accessKeyId || ""
      //   }"><input type="password" class="auth-input" placeholder="Secret Access Key" data-section="aws" data-field="secretAccessKey" value="${
      //     aws.secretAccessKey || ""
      //   }"><input type="text" class="auth-input" placeholder="Region" data-section="aws" data-field="region" value="${
      //     aws.region || ""
      //   }"><input type="text" class="auth-input" placeholder="Service" data-section="aws" data-field="service" value="${
      //     aws.service || ""
      //   }">`;
      //   break;
      default:
        contentHtml = `<p>No authentication required.</p>`;
    }
    contentContainer.innerHTML = contentHtml;
    contentContainer.addEventListener("input", (e) => {
      if (e.target.matches(".auth-input")) {
        const { section, field } = e.target.dataset;
        appState.authConfig[section][field] = e.target.value;
        debouncedSave(appState);
      }
    });

    // if (type === "OAuth 2.0") {
    //   const fetchBtn = contentContainer.querySelector("#fetch-oauth-token-btn");
    //   if (fetchBtn) {
    //     fetchBtn.addEventListener("click", fetchOAuthToken);
    //   }
    // }

    return container;
  }

  function createBodyView() {
    const container = document.createElement("div");
    container.style.cssText =
      "display:flex; flex-direction:column; height:100%;";
    const tabsContainer = document.createElement("div");
    tabsContainer.className = "sub-tab-container";
    const contentContainer = document.createElement("div");
    contentContainer.className = "sub-tab-content";
    container.append(tabsContainer, contentContainer);

    const bodyTabs = [
      "JSON",
      "Text",
      "XML",
      "Form",
      "Form-encode",
      // "GraphQL",
      "Binary",
    ];
    renderSubTabs(tabsContainer, bodyTabs, appState.bodyConfig.type, (tab) => {
      appState.bodyConfig.type = tab;
      render();
      debouncedSave(appState);
    });

    const {
      type,
      jsonContent,
      textContent,
      xmlContent,
      // graphqlQuery,
      // graphqlVariables,
      formData,
      formEncodedData,
      binaryFile,
    } = appState.bodyConfig;

    switch (type) {
      case "JSON": {
        const isJsonValid = isValidJson(jsonContent);
        contentContainer.innerHTML = `<div class="input-container"><div class="input-header"><span class="input-label">JSON</span><button class="prettify-button" id="prettify-json">Prettify</button></div><textarea id="json-content-input" class="json-input ${
          isJsonValid ? "" : "invalid"
        }">${jsonContent}</textarea></div>`;
        const input = contentContainer.querySelector("#json-content-input");
        input.addEventListener("input", () => {
          appState.bodyConfig.jsonContent = input.value;
          input.classList.toggle("invalid", !isValidJson(input.value));
          debouncedSave(appState);
        });
        contentContainer.querySelector("#prettify-json").onclick = () => {
          try {
            const parsed = JSON.parse(appState.bodyConfig.jsonContent);
            appState.bodyConfig.jsonContent = JSON.stringify(parsed, null, 2);
            render();
            debouncedSave(appState);
          } catch (e) {
            showToast("Invalid JSON. Cannot prettify.", "danger");
          }
        };
        break;
      }
      case "Text":
      case "XML": {
        const fieldKey = type === "Text" ? "textContent" : "xmlContent";
        contentContainer.innerHTML = `<div class="input-container"><div class="input-header"><span class="input-label">${type}</span></div><textarea class="json-input">${appState.bodyConfig[fieldKey]}</textarea></div>`;
        contentContainer
          .querySelector("textarea")
          .addEventListener("input", (e) => {
            appState.bodyConfig[fieldKey] = e.target.value;
            debouncedSave(appState);
          });
        break;
      }
      // case "GraphQL": {
      //   const isVarsValid = isValidJson(graphqlVariables);
      //   contentContainer.innerHTML = `<div style="display:flex; flex-direction:column; height:100%; gap:10px;"><div class="input-container" style="flex:1;"><div class="input-header"><span class="input-label">Query</span></div><textarea class="json-input" id="graphql-query-input" style="min-height:100px;">${graphqlQuery}</textarea></div><div class="input-container" style="flex:1;"><div class="input-header"><span class="input-label">Variables</span><button class="prettify-button" id="prettify-gql-vars">Prettify</button></div><textarea class="json-input ${
      //     isVarsValid ? "" : "invalid"
      //   }" id="graphql-vars-input" style="min-height:100px;">${graphqlVariables}</textarea></div></div>`;
      //   contentContainer
      //     .querySelector("#graphql-query-input")
      //     .addEventListener("input", (e) => {
      //       appState.bodyConfig.graphqlQuery = e.target.value;
      //       debouncedSave(appState);
      //     });
      //   const varsInput = contentContainer.querySelector("#graphql-vars-input");
      //   varsInput.addEventListener("input", () => {
      //     appState.bodyConfig.graphqlVariables = varsInput.value;
      //     varsInput.classList.toggle("invalid", !isValidJson(varsInput.value));
      //     debouncedSave(appState);
      //   });
      //   contentContainer.querySelector("#prettify-gql-vars").onclick = () => {
      //     try {
      //       const parsed = JSON.parse(appState.bodyConfig.graphqlVariables);
      //       appState.bodyConfig.graphqlVariables = JSON.stringify(
      //         parsed,
      //         null,
      //         2
      //       );
      //       render();
      //       debouncedSave(appState);
      //     } catch (e) {
      //       showToast("Invalid JSON in Variables.", "danger");
      //     }
      //   };
      //   break;
      // }
      case "Form-encode":
        contentContainer.appendChild(
          createKvView(formEncodedData, "formEncodedData", {
            hasCheckbox: false,
          })
        );
        break;
      case "Form": {
        const kvContainer = document.createElement("div");
        kvContainer.className = "kv-container";
        formData.forEach((item) => {
          const row = document.createElement("div");
          row.className = "param-row";
          const valueInputHtml =
            item.type === "file"
              ? `<button class="file-button" data-id="${item.id}">${
                  item.file ? item.file.name : "Click To Select File"
                }</button>`
              : `<input type="text" class="param-input" placeholder="value" value="${item.value}" data-id="${item.id}" data-field="value">`;
          row.innerHTML = `<input type="text" class="param-input" placeholder="key" value="${
            item.key
          }" data-id="${
            item.id
          }" data-field="key">${valueInputHtml}<select class="form-type-dropdown" data-id="${
            item.id
          }" data-field="type"><option value="text" ${
            item.type === "text" ? "selected" : ""
          }>Text</option><option value="file" ${
            item.type === "file" ? "selected" : ""
          }>File</option></select><button class="remove-button" data-id="${
            item.id
          }">&#128465;</button>`;
          kvContainer.appendChild(row);
        });
        kvContainer.addEventListener("click", (e) => {
          const fileBtn = e.target.closest(".file-button");
          if (fileBtn) {
            dom.formFilePicker.dataset.formId = fileBtn.dataset.id;
            dom.formFilePicker.onchange = handleFormFilePick;
            dom.formFilePicker.click();
          }
          const removeBtn = e.target.closest(".remove-button");
          if (removeBtn) {
            removeKvItem("formData", removeBtn.dataset.id, "form");
          }
        });
        kvContainer.addEventListener("input", (e) => {
          if (e.target.matches(".param-input")) {
            const { id, field } = e.target.dataset;
            updateKvItem("formData", id, field, e.target.value);
          }
        });
        kvContainer.addEventListener("change", (e) => {
          if (e.target.matches(".form-type-dropdown")) {
            const { id, field } = e.target.dataset;
            updateKvItem("formData", id, field, e.target.value);
          }
        });
        contentContainer.appendChild(kvContainer);
        break;
      }
      case "Binary":
        contentContainer.innerHTML = `<div style="text-align: center;"><button class="send-button" id="binary-file-select">Select File</button><p id="binary-file-name" style="margin-top: 15px;">${
          binaryFile ? `Selected: ${binaryFile.name}` : ""
        }</p></div>`;
        contentContainer.querySelector("#binary-file-select").onclick = () => {
          dom.formFilePicker.dataset.formId = "binary";
          dom.formFilePicker.onchange = handleFormFilePick;
          dom.formFilePicker.click();
        };
        break;
    }
    return container;
  }

  function renderResponseContent() {
    const body = dom.responsePanelBody;
    body.innerHTML = "";
    if (isLoading) {
      body.innerHTML = `<div class="response-body-container"><div style="margin:auto;"><div class="spinner"></div></div></div>`;
      return;
    }
    if (!responseState.status) {
      body.innerHTML = `<div class="response-body-container"><p class="promo-text">Click 'Send' to see the response.</p></div>`;
      return;
    }
    if (responseState.error) {
      body.innerHTML = `<div class="response-body-container" style="padding: 15px; align-items: flex-start;"><p style="color:var(--text-danger);">${responseState.data}</p></div>`;
    } else {
      switch (responseState.responseTab) {
        case "Response":
          const responseData =
            typeof responseState.data === "string"
              ? responseState.data
              : JSON.stringify(responseState.data, null, 2);
          body.innerHTML = `<div class="response-body-container"><div class="copy-button-container"><button class="copy-button" id="copy-response-btn">Copy</button></div><textarea readonly>${responseData}</textarea></div>`;
          break;
        case "Headers":
          body.innerHTML = `<div class="response-body-container"><textarea readonly>${JSON.stringify(
            responseState.headers,
            null,
            2
          )}</textarea></div>`;
          break;
        case "Cookies":
          const cookiesText =
            responseState.cookies.length > 0
              ? responseState.cookies.join("\n")
              : "No cookies in response.";
          body.innerHTML = `<div class="response-body-container"><textarea readonly>${cookiesText}</textarea></div>`;
          break;
      }
      const copyBtn = body.querySelector("#copy-response-btn");
      if (copyBtn) copyBtn.onclick = handleCopyResponse;
    }
  }

  function renderResponseStatus() {
    const { status, size, time } = responseState;
    const statusColorClass = getStatusColorClass(status);
    const statusText =
      status === null
        ? "-"
        : status === "Error"
        ? "Error"
        : `${status} ${httpStatusMessages[status] || ""}`;
    dom.resStatus.textContent = statusText;
    dom.resStatus.className = `value ${statusColorClass}`;
    dom.resSize.textContent = formatBytes(size);
    dom.resSize.className = `value ${statusColorClass}`;
    dom.resTime.textContent = time !== null ? `${time} ms` : "-";
    dom.resTime.className = `value ${statusColorClass}`;
  }

  // ==================== Session Management Logic ====================
  const debouncedSave = debounce((stateToSave) => {
    if (!activeSessionKey || isInitialLoad) return;
    try {
      const timestamp = sessions[activeSessionKey]?.timestamp || Date.now();
      const sessionToSave = {
        state: stateToSave,
        name: generateSessionName(stateToSave, timestamp),
        timestamp: timestamp,
      };
      sessions[activeSessionKey] = sessionToSave;
      localStorage.setItem(activeSessionKey, JSON.stringify(sessionToSave));
      let allKeys = JSON.parse(
        localStorage.getItem(ASYNC_STORAGE_KEYS.ALL_SESSIONS) || "[]"
      );
      allKeys = allKeys.filter((k) => k !== activeSessionKey);
      allKeys.unshift(activeSessionKey);
      localStorage.setItem(
        ASYNC_STORAGE_KEYS.ALL_SESSIONS,
        JSON.stringify(allKeys)
      );
      const optionToUpdate = dom.sessionPicker.querySelector(
        `option[value="${activeSessionKey}"]`
      );
      if (optionToUpdate) optionToUpdate.textContent = sessionToSave.name;
    } catch (e) {
      console.error("Failed to save session.", e);
      showToast("Failed to save session.", "danger");
    }
  }, 1000);

  async function loadAllSessions() {
    try {
      const allKeys = JSON.parse(
        localStorage.getItem(ASYNC_STORAGE_KEYS.ALL_SESSIONS) || "[]"
      );
      if (allKeys.length === 0) {
        await initializeNewRequest();
        return;
      }
      const loadedSessions = allKeys.reduce((acc, key) => {
        const value = localStorage.getItem(key);
        if (value) acc[key] = JSON.parse(value);
        return acc;
      }, {});
      sessions = loadedSessions;
      const lastActiveKey = localStorage.getItem(
        ASYNC_STORAGE_KEYS.LAST_ACTIVE
      );
      const keyToLoad =
        lastActiveKey && sessions[lastActiveKey] ? lastActiveKey : allKeys[0];
      await switchActiveSession(keyToLoad);
      renderSessionPicker();
    } catch (e) {
      console.error("Failed to load sessions.", e);
      await initializeNewRequest();
    } finally {
      isInitialLoad = false;
      dom.initialLoader.style.display = "none";
    }
  }

  async function initializeNewRequest(importedState = null) {
    const newKey = `${ASYNC_STORAGE_KEYS.SESSION_PREFIX}${Date.now()}`;
    const timestamp = Date.now();
    const newState = importedState || getDefaultState();
    const newSession = {
      state: newState,
      name: generateSessionName(newState, timestamp),
      timestamp: timestamp,
    };
    try {
      let allKeys = JSON.parse(
        localStorage.getItem(ASYNC_STORAGE_KEYS.ALL_SESSIONS) || "[]"
      );
      allKeys.unshift(newKey);
      localStorage.setItem(newKey, JSON.stringify(newSession));
      localStorage.setItem(
        ASYNC_STORAGE_KEYS.ALL_SESSIONS,
        JSON.stringify(allKeys)
      );
      localStorage.setItem(ASYNC_STORAGE_KEYS.LAST_ACTIVE, newKey);
      sessions[newKey] = newSession;
      activeSessionKey = newKey;
      appState = newState;
      resetResponseState();
      renderSessionPicker();
      render();
      showToast(
        importedState ? "Session imported" : "New request created",
        "success"
      );
    } catch (e) {
      console.error("Failed to init new request.", e);
    }
  }

  async function switchActiveSession(key) {
    if (key && sessions[key]) {
      activeSessionKey = key;
      appState = sessions[key].state;
      localStorage.setItem(ASYNC_STORAGE_KEYS.LAST_ACTIVE, key);
      resetResponseState();
      render();
    }
  }

  function handleDeleteSession() {
    if (!activeSessionKey || !sessions[activeSessionKey]) return;

    // FIX: Removed the check that prevents deleting the last session.
    // if (Object.keys(sessions).length <= 1) {
    //   showToast("Cannot delete the last session.", "warning");
    //   return;
    // }

    try {
      const keyToDelete = activeSessionKey;
      let allKeys = JSON.parse(
        localStorage.getItem(ASYNC_STORAGE_KEYS.ALL_SESSIONS) || "[]"
      );
      const newAllKeys = allKeys.filter((k) => k !== keyToDelete);

      localStorage.removeItem(keyToDelete);
      localStorage.setItem(
        ASYNC_STORAGE_KEYS.ALL_SESSIONS,
        JSON.stringify(newAllKeys)
      );
      delete sessions[keyToDelete];
      showToast("Session deleted", "success");

      // FIX: If no sessions are left, create a new one. Otherwise, switch to the newest one.
      if (newAllKeys.length === 0) {
        initializeNewRequest();
      } else {
        switchActiveSession(newAllKeys[0]);
        renderSessionPicker();
      }
    } catch (e) {
      console.error("Failed to delete session.", e);
      showToast("Error deleting session.", "danger");
    }
  }

  function handleExport() {
    if (!activeSessionKey || !sessions[activeSessionKey]) return;
    try {
      const sessionJson = JSON.stringify(
        { state: sessions[activeSessionKey].state },
        null,
        2
      );
      const blob = new Blob([sessionJson], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `apicommander-session-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(a.href);
      showToast("Session exported.", "success");
    } catch (e) {
      console.error("Export failed", e);
    }
  }

  function handleImport() {
    dom.fileImporter.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const parsed = JSON.parse(event.target.result);
          if (parsed.state && parsed.state.httpMethod)
            await initializeNewRequest(parsed.state);
          else throw new Error("Invalid session file format.");
        } catch (err) {
          showToast(`Import failed: ${err.message}`, "danger");
        }
      };
      reader.readAsText(file);
      e.target.value = "";
    };
    dom.fileImporter.click();
  }

  function renderSessionPicker() {
    dom.sessionPicker.innerHTML = "";
    Object.keys(sessions)
      .map((key) => ({ session: sessions[key], key }))
      .sort((a, b) => b.session.timestamp - a.session.timestamp)
      .forEach(({ session, key }) => {
        try {
          session.name = generateSessionName(session.state, session.timestamp);
        } catch (error) {
          console.log(error);
        }
        const option = document.createElement("option");
        option.value = key;
        option.textContent = session.name;
        dom.sessionPicker.appendChild(option);
      });
    dom.sessionPicker.value = activeSessionKey;
  }

  function generateSessionName(sessionState, timestamp) {
    const { httpMethod, url } = sessionState;
    const timeAgo = formatTimeAgo(timestamp);
    const shortUrl =
      url && url.length > 40 ? `${url.substring(0, 40)}...` : url;
    return `${httpMethod}: ${shortUrl || "[No URL]"} | ${timeAgo}`;
  }

  // ==================== Request/Response Logic ====================
  // async function fetchOAuthToken() {
  //   const fetchBtn = dom.requestPanelBody.querySelector(
  //     "#fetch-oauth-token-btn"
  //   );
  //   if (!fetchBtn || fetchBtn.disabled) return;

  //   const { oauth2 } = appState.authConfig;
  //   if (!oauth2.tokenUrl) {
  //     showToast("Access Token URL is required.", "danger");
  //     return;
  //   }

  //   fetchBtn.disabled = true;
  //   fetchBtn.querySelector("span").textContent = "Fetching...";

  //   try {
  //     const params = new URLSearchParams();
  //     params.append("grant_type", "client_credentials");
  //     params.append("client_id", oauth2.clientId);
  //     params.append("client_secret", oauth2.clientSecret);
  //     if (oauth2.scope) params.append("scope", oauth2.scope);

  //     const response = await fetch(oauth2.tokenUrl, {
  //       method: "POST",
  //       headers: { "Content-Type": "application/x-www-form-urlencoded" },
  //       body: params.toString(),
  //     });

  //     const data = await response.json();

  //     if (response.ok && data.access_token) {
  //       appState.authConfig.oauth2.accessToken = data.access_token;
  //       showToast("OAuth Token Fetched Successfully!", "success");
  //       render();
  //       debouncedSave(appState);
  //     } else {
  //       const errorMessage =
  //         data.error_description || data.error || "Failed to fetch token.";
  //       throw new Error(errorMessage);
  //     }
  //   } catch (e) {
  //     console.error("OAuth Fetch Error:", e);
  //     showToast(`Error: ${e.message}`, "danger");
  //     const finalFetchBtn = dom.requestPanelBody.querySelector(
  //       "#fetch-oauth-token-btn"
  //     );
  //     if (finalFetchBtn) {
  //       finalFetchBtn.disabled = false;
  //       finalFetchBtn.querySelector("span").textContent = "Fetch Token";
  //     }
  //   }
  // }

  async function handleSend() {
    if (!validateRequest()) return;
    isLoading = true;
    render();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    resetResponseState(true);
    const startTime = Date.now();

    try {
      const finalUrl = new URL(appState.url);
      appState.queryParams
        .filter((p) => p.enabled && p.key)
        .forEach((p) => finalUrl.searchParams.append(p.key, p.value));

      const requestHeaders = new Headers();
      appState.headers
        .filter((h) => h.enabled && h.key)
        .forEach((h) => requestHeaders.append(h.key, h.value));
      const activeCookies = appState.requestCookies
        .filter((c) => c.enabled && c.key)
        .map((c) => `${c.key}=${c.value}`)
        .join("; ");
      if (activeCookies) requestHeaders.append("Cookie", activeCookies);

      const { authConfig } = appState;
      if (authConfig.type === "Basic")
        requestHeaders.append(
          "Authorization",
          `Basic ${btoa(
            `${authConfig.basic.username}:${authConfig.basic.password}`
          )}`
        );
      if (authConfig.type === "Bearer")
        requestHeaders.append(
          "Authorization",
          `Bearer ${authConfig.bearer.token}`
        );
      // if (authConfig.type === "OAuth 2.0")
      //   requestHeaders.append(
      //     "Authorization",
      //     `Bearer ${authConfig.oauth2.accessToken}`
      //   );

      let requestBody;
      const { bodyConfig, httpMethod } = appState;
      if (httpMethod !== "GET" && httpMethod !== "HEAD") {
        switch (bodyConfig.type) {
          // case "GraphQL":
          //   requestBody = JSON.stringify({
          //     query: bodyConfig.graphqlQuery,
          //     variables: bodyConfig.graphqlVariables.trim()
          //       ? JSON.parse(bodyConfig.graphqlVariables)
          //       : {},
          //   });
          //   if (!requestHeaders.has("Content-Type"))
          //     requestHeaders.set("Content-Type", "application/json");
          //   break;
          case "JSON":
            requestBody = bodyConfig.jsonContent;
            if (!requestHeaders.has("Content-Type"))
              requestHeaders.set("Content-Type", "application/json");
            break;
          case "Text":
            requestBody = bodyConfig.textContent;
            if (!requestHeaders.has("Content-Type"))
              requestHeaders.set("Content-Type", "text/plain");
            break;
          case "XML":
            requestBody = bodyConfig.xmlContent;
            if (!requestHeaders.has("Content-Type"))
              requestHeaders.set("Content-Type", "application/xml");
            break;
          case "Form":
            requestBody = new FormData();
            for (const f of bodyConfig.formData.filter((f) => f.key)) {
              if (f.type === "file" && f.file) {
                const fileBlob = await (await fetch(f.file.dataUrl)).blob();
                requestBody.append(f.key, fileBlob, f.file.name);
              } else {
                requestBody.append(f.key, f.value);
              }
            }
            break;
          case "Form-encode":
            requestBody = new URLSearchParams(
              bodyConfig.formEncodedData
                .filter((f) => f.key)
                .map((f) => [f.key, f.value])
            ).toString();
            if (!requestHeaders.has("Content-Type"))
              requestHeaders.set(
                "Content-Type",
                "application/x-www-form-urlencoded"
              );
            break;
          case "Binary":
            if (bodyConfig.binaryFile) {
              requestBody = await (
                await fetch(bodyConfig.binaryFile.dataUrl)
              ).blob();
              if (!requestHeaders.has("Content-Type"))
                requestHeaders.set(
                  bodyConfig.binaryFile.type || "application/octet-stream"
                );
            }
            break;
        }
      }

      let options = {
        method: httpMethod,
        headers: requestHeaders,
        body: requestBody,
        signal: controller.signal,
      };

      if (authConfig.type === "AWS v4" && authConfig.aws.accessKeyId) {
        const awsHeaders = Object.fromEntries(options.headers.entries());
        awsHeaders["host"] = finalUrl.hostname;
        const bodyForSigning =
          requestBody instanceof FormData || requestBody instanceof Blob
            ? ""
            : requestBody;
        const signedAwsHeaders = await signRequestV4(
          {
            method: httpMethod,
            host: finalUrl.hostname,
            path: finalUrl.pathname + finalUrl.search,
            headers: awsHeaders,
            body: bodyForSigning,
          },
          authConfig.aws
        );
        Object.keys(signedAwsHeaders).forEach((key) =>
          options.headers.set(key, signedAwsHeaders[key])
        );
      }

      if (options.body instanceof FormData)
        options.headers.delete("Content-Type");

      const apiResponse = await fetch(finalUrl.toString(), options);
      clearTimeout(timeoutId);
      const responseText = await apiResponse.text();
      let responseData = responseText;
      try {
        responseData = JSON.parse(responseText);
      } catch (e) {
        /* Not JSON */
      }

      responseState = {
        data: responseData,
        headers: Object.fromEntries(apiResponse.headers.entries()),
        status: apiResponse.status,
        size: new Blob([responseText]).size,
        time: Date.now() - startTime,
        error: null,
        responseTab: "Response",
        cookies:
          apiResponse.headers
            .get("set-cookie")
            ?.split(",")
            .map((c) => c.split(";")[0]) || [],
      };
      showToast(
        `Request ${apiResponse.ok ? "successful" : "failed"}`,
        apiResponse.ok ? "success" : "warning"
      );
    } catch (error) {
      clearTimeout(timeoutId);
      responseState = {
        data: error.message,
        status: "Error",
        time: Date.now() - startTime,
        error: true,
        headers: null,
        size: null,
        responseTab: "Response",
        cookies: [],
      };
      if (error.name !== "AbortError") showToast(error.message, "danger");
    } finally {
      isLoading = false;
      render();
    }
  }

  function validateRequest() {
    try {
      new URL(appState.url);
    } catch (e) {
      showToast("Invalid URL format.", "danger");
      return false;
    }
    if (
      appState.bodyConfig.type === "JSON" &&
      !isValidJson(appState.bodyConfig.jsonContent)
    ) {
      showToast("Invalid JSON in request body.", "danger");
      return false;
    }
    // if (
    //   appState.bodyConfig.type === "GraphQL" &&
    //   !isValidJson(appState.bodyConfig.graphqlVariables)
    // ) {
    //   showToast("GraphQL Variables are not valid JSON.", "danger");
    //   return false;
    // }
    if (
      appState.authConfig.type === "AWS v4" &&
      (!appState.authConfig.aws.accessKeyId ||
        !appState.authConfig.aws.secretAccessKey)
    ) {
      showToast("AWS v4 requires Access Key and Secret Key.", "danger");
      return false;
    }
    return true;
  }

  function handleCopyResponse() {
    if (responseState.data === null) return;
    const contentToCopy =
      typeof responseState.data === "string"
        ? responseState.data
        : JSON.stringify(responseState.data, null, 2);
    navigator.clipboard.writeText(contentToCopy).then(
      () => showToast("Response copied!", "success"),
      () => showToast("Failed to copy.", "danger")
    );
  }

  // ==================== Event Handlers & Helpers ====================
  function handleStateChange(key, value) {
    appState[key] = value;
    render();
    debouncedSave(appState);
  }

  function updateKvItem(stateKey, id, field, value) {
    let isLastRow = false;
    const items = appState[stateKey] || appState.bodyConfig[stateKey];
    const updatedItems = items.map((p, index) => {
      if (p.id == id) {
        if (index === items.length - 1) isLastRow = true;
        return { ...p, [field]: value };
      }
      return p;
    });
    if (
      isLastRow &&
      (updatedItems[updatedItems.length - 1].key ||
        updatedItems[updatedItems.length - 1].value ||
        updatedItems[updatedItems.length - 1].file)
    ) {
      updatedItems.push({
        ...(stateKey === "formData" ? emptyFormValue : emptyKeyValue),
        id: Date.now(),
      });
    }
    if (appState[stateKey]) appState[stateKey] = updatedItems;
    else appState.bodyConfig[stateKey] = updatedItems;
    if (updatedItems.length > items.length) render();
    debouncedSave(appState);
  }

  function removeKvItem(stateKey, id, type = "kv") {
    let items = appState[stateKey] || appState.bodyConfig[stateKey];
    let newItems = items.filter((p) => p.id != id);
    if (newItems.length === 0) {
      newItems.push({
        ...(type === "form" ? emptyFormValue : emptyKeyValue),
        id: Date.now(),
      });
    }
    if (appState[stateKey]) appState[stateKey] = newItems;
    else appState.bodyConfig[stateKey] = newItems;
    render();
    debouncedSave(appState);
  }

  function handleFormFilePick(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const fileData = {
        name: file.name,
        type: file.type,
        size: file.size,
        dataUrl: event.target.result,
      };
      if (e.target.dataset.formId === "binary")
        appState.bodyConfig.binaryFile = fileData;
      else updateKvItem("formData", e.target.dataset.formId, "file", fileData);
      showToast(`Selected: ${file.name}`, "success");
      render();
      debouncedSave(appState);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  function getStatusColorClass(status) {
    if (status === "Error" || status >= 500) return "error";
    if (status >= 400) return "warning";
    if (status >= 200 && status < 300) return "success";
    return "info";
  }

  function resetResponseState(isLoadingState = false) {
    responseState = {
      data: null,
      headers: null,
      status: null,
      size: null,
      time: null,
      error: null,
      responseTab: "Response",
      cookies: [],
    };
    if (!isLoadingState) isLoading = false;
    renderResponseContent();
    renderResponseStatus();
  }

  // ==================== Initialization ====================
  function init() {
    // Corrected Dark Mode Initialization
    const savedDarkMode = localStorage.getItem(ASYNC_STORAGE_KEYS.DARK_MODE);
    if (savedDarkMode === "true" || savedDarkMode === null) {
      // Default to dark if no setting
      dom.body.classList.add("dark-mode");
      dom.darkModeSwitch.checked = true;
    } else {
      dom.body.classList.remove("dark-mode");
      dom.darkModeSwitch.checked = false;
    }
    dom.darkModeSwitch.addEventListener("change", (e) => {
      localStorage.setItem(ASYNC_STORAGE_KEYS.DARK_MODE, e.target.checked);
      dom.body.classList.toggle("dark-mode", e.target.checked);
    });

    // Corrected Panel Resizing Logic
    let isResizing = false;

    const applyOrientation = () => {
      const isPortrait = window.innerHeight > window.innerWidth;
      dom.mainContent.style.flexDirection = isPortrait ? "column" : "row";
      dom.resizer.className = `resizer ${
        isPortrait ? "vertical" : "horizontal"
      }`;
      // Reset panel sizes on orientation change to avoid weird states
      dom.requestPanel.style.flex = "";
      dom.responsePanel.style.flex = "";
    };

    const startResize = (e) => {
      isResizing = true;
      const isPortrait = window.innerHeight > window.innerWidth;
      dom.body.style.cursor = isPortrait ? "row-resize" : "col-resize";
      dom.body.style.userSelect = "none";
    };

    const doResize = (e) => {
      if (!isResizing) return;
      const isPortrait = window.innerHeight > window.innerWidth;
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      const rect = dom.mainContent.getBoundingClientRect();
      let reqPanelSizePercent = isPortrait
        ? ((clientY - rect.top) / rect.height) * 100
        : ((clientX - rect.left) / rect.width) * 100;
      reqPanelSizePercent = Math.max(15, Math.min(85, reqPanelSizePercent));
      dom.requestPanel.style.flex = `0 0 ${reqPanelSizePercent}%`;
      dom.responsePanel.style.flex = `0 0 ${100 - reqPanelSizePercent}%`;
    };

    const stopResize = () => {
      isResizing = false;
      dom.body.style.cursor = "default";
      document.body.style.userSelect = "auto";
    };

    applyOrientation(); // Set initial orientation on page load
    window.addEventListener("resize", applyOrientation);

    dom.resizer.addEventListener("mousedown", startResize);
    document.addEventListener("mousemove", doResize);
    document.addEventListener("mouseup", stopResize);
    dom.resizer.addEventListener("touchstart", startResize, {
      passive: true,
    });
    document.addEventListener("touchmove", doResize);
    document.addEventListener("touchend", stopResize);

    // Remaining event listeners
    dom.sessionPicker.addEventListener("change", (e) =>
      switchActiveSession(e.target.value)
    );
    dom.newSessionBtn.addEventListener("click", () => initializeNewRequest());
    dom.importSessionBtn.addEventListener("click", handleImport);
    dom.exportSessionBtn.addEventListener("click", handleExport);
    dom.deleteSessionBtn.addEventListener("click", handleDeleteSession);
    dom.methodDropdown.addEventListener("change", (e) =>
      handleStateChange("httpMethod", e.target.value)
    );
    dom.urlInput.addEventListener("input", (e) => {
      appState.url = e.target.value;
      debouncedSave(appState);
    });
    dom.sendBtn.addEventListener("click", handleSend);
    dom.requestTabContainer.addEventListener("click", (e) => {
      if (e.target.matches(".tab-button"))
        handleStateChange("requestTab", e.target.dataset.tab);
    });
    dom.responseTabContainer.addEventListener("click", (e) => {
      if (e.target.matches(".tab-button")) {
        responseState.responseTab = e.target.dataset.tab;
        render();
      }
    });

    loadAllSessions();
  }

  init();
});
