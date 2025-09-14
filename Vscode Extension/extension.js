// extension.js
const vscode = require("vscode");
const path = require("path");
const fs = require("fs");
const os = require("os");
const { default: fetch } = require("node-fetch");
const { Headers } = require("node-fetch");
const aws4 = require("aws4");
const FormData = require("form-data");
const { URLSearchParams } = require("url");
const ApiCommanderTreeDataProvider = require("./treeDataProvider");

const ALL_KEYS_STORAGE_KEY = "@api_commander_all_sessions";

function activate(context) {
  const treeDataProvider = new ApiCommanderTreeDataProvider(context);
  const treeView = vscode.window.createTreeView("apiCommanderView", {
    treeDataProvider,
  });
  context.subscriptions.push(treeView);

  context.subscriptions.push(
    vscode.commands.registerCommand("api-commander.showPanel", (keyToLoad) => {
      ApiCommanderPanel.createOrShow(context, keyToLoad);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("api-commander.refresh-history", () => {
      treeDataProvider.refresh();
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "api-commander.clear-all-history",
      async () => {
        const allKeys = context.globalState.get(ALL_KEYS_STORAGE_KEY, []);
        for (const key of allKeys) {
          await context.globalState.update(key, undefined);
        }
        await context.globalState.update(ALL_KEYS_STORAGE_KEY, []);
        treeDataProvider.refresh();
        if (ApiCommanderPanel.currentPanel) {
          ApiCommanderPanel.currentPanel.panel.webview.postMessage({
            command: "loadAllStates",
            payload: [],
          });
        }
        vscode.window.showInformationMessage(
          "All API Commander history has been cleared."
        );
      }
    )
  );

  // Helper function for exporting
  async function exportSession(sessionState, context) {
    const { state, name } = sessionState;
    const sessionJson = JSON.stringify({ state }, null, 2);
    const defaultName = name.replace(/[:/|\s]/g, "_");
    const uri = await vscode.window.showSaveDialog({
      defaultUri: vscode.Uri.file(`apicommander-session-${Date.now()}.json`),
    });
    if (uri) {
      await vscode.workspace.fs.writeFile(
        uri,
        Buffer.from(sessionJson, "utf8")
      );
      vscode.window.showInformationMessage("Session exported successfully!");
    }
  }

  // Register Import Command
  context.subscriptions.push(
    vscode.commands.registerCommand("api-commander.importSession", async () => {
      const uris = await vscode.window.showOpenDialog({
        canSelectMany: false,
        filters: { JSON: ["json"] },
      });
      if (uris && uris[0]) {
        try {
          const fileContent = await vscode.workspace.fs.readFile(uris[0]);
          const parsed = JSON.parse(fileContent.toString());
          if (parsed.state && parsed.state.httpMethod) {
            const newKey = `session_${Date.now()}`;
            const timestamp = Date.now();
            const newSession = {
              state: parsed.state,
              name: `(Imported) ${parsed.state.url.slice(0, 20)}...`,
              timestamp,
            };
            await context.globalState.update(newKey, newSession);
            const allKeys = context.globalState.get(ALL_KEYS_STORAGE_KEY, []);
            await context.globalState.update(ALL_KEYS_STORAGE_KEY, [
              newKey,
              ...allKeys,
            ]);
            treeDataProvider.refresh();
            vscode.window.showInformationMessage(
              "Session imported successfully."
            );
          } else {
            throw new Error("Invalid session file format.");
          }
        } catch (e) {
          vscode.window.showErrorMessage(`Import Failed: ${e.message}`);
        }
      }
    })
  );

  // Register Run Command
  context.subscriptions.push(
    vscode.commands.registerCommand("api-commander.runFromHistory", (item) => {
      const key = item.command.arguments[0];
      const session = context.globalState.get(key);
      if (session) {
        ApiCommanderPanel.createOrShow(context, key);
        // Use a timeout to ensure the panel is ready
        setTimeout(() => {
          if (ApiCommanderPanel.currentPanel) {
            ApiCommanderPanel.currentPanel.handleApiRequestFromState(
              session.state
            );
          }
        }, 500);
      }
    })
  );

  // Register Export Command
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "api-commander.exportFromHistory",
      (item) => {
        const key = item.command.arguments[0];
        const session = context.globalState.get(key);
        if (session) {
          exportSession(session, context);
        }
      }
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("api-commander.newRequest", () => {
      // This first part is correct: ensure the panel exists and is visible.
      ApiCommanderPanel.createOrShow(context);

      // This part correctly tells the webview to start a new request.
      setTimeout(() => {
        if (ApiCommanderPanel.currentPanel) {
          ApiCommanderPanel.currentPanel.panel.webview.postMessage({
            command: "initializeNew",
          });
        }
      }, 200);
    })
  );

  // Register Delete Command
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "api-commander.deleteFromHistory",
      async (item) => {
        const key = item.command.arguments[0];
        if (!key) return;

        const confirmation = await vscode.window.showWarningMessage(
          `Are you sure you want to delete this request?`,
          { modal: true },
          "Yes"
        );

        if (confirmation === "Yes") {
          // Remove from global state
          await context.globalState.update(key, undefined);

          // Remove from the list of keys
          let allKeys = context.globalState.get(ALL_KEYS_STORAGE_KEY, []);
          const newAllKeys = allKeys.filter((k) => k !== key);
          await context.globalState.update(ALL_KEYS_STORAGE_KEY, newAllKeys);

          // Refresh the side panel
          treeDataProvider.refresh();

          // Notify the webview if it's open
          if (ApiCommanderPanel.currentPanel) {
            ApiCommanderPanel.currentPanel.panel.webview.postMessage({
              command: "stateDeleted",
              payload: { key },
            });
          }

          vscode.window.showInformationMessage("Request deleted.");
        }
      }
    )
  );
}

class ApiCommanderPanel {
  static currentPanel = undefined;
  static viewType = "apiCommander";

  static createOrShow(context, keyToLoad) {
    const column =
      vscode.window.activeTextEditor?.viewColumn || vscode.ViewColumn.One;

    if (ApiCommanderPanel.currentPanel) {
      ApiCommanderPanel.currentPanel.panel.reveal(column);
      if (keyToLoad) {
        ApiCommanderPanel.currentPanel.loadRequest(keyToLoad);
      }
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      ApiCommanderPanel.viewType,
      "API Commander",
      column,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [
          vscode.Uri.joinPath(context.extensionUri, "webview-ui"),
        ],
      }
    );
    ApiCommanderPanel.currentPanel = new ApiCommanderPanel(panel, context);
    if (keyToLoad) {
      ApiCommanderPanel.currentPanel.loadRequest(keyToLoad);
    }
  }

  constructor(panel, context) {
    this.panel = panel;
    this.context = context;
    this.disposables = [];

    this.updateWebviewContent();
    this.panel.onDidDispose(() => this.dispose(), null, this.disposables);

    this.panel.webview.onDidReceiveMessage(
      async (message) => {
        switch (message.command) {
          case "sendApiRequest":
            this.handleApiRequest(message.payload);
            break;
          case "fetchOauthToken":
            this.handleFetchOauthToken(message.payload);
            break;
          case "saveToVSCodeState": {
            const { key, state, isNew } = message.payload;
            await this.context.globalState.update(key, state);
            if (isNew) {
              await this.addKeyToAllKeys(key);
              this.panel.webview.postMessage({
                command: "loadState",
                payload: { key, ...state },
              });
            }
            vscode.commands.executeCommand("api-commander.refresh-history");
            break;
          }
          case "getAllStates":
            this.sendAllStates();
            break;
          case "deleteFromVSCodeState":
            await this.context.globalState.update(
              message.payload.key,
              undefined
            );
            await this.removeKeyFromAllKeys(message.payload.key);
            vscode.commands.executeCommand("api-commander.refresh-history");
            this.panel.webview.postMessage({
              command: "stateDeleted",
              payload: { key: message.payload.key },
            });
            break;
          case "exportState": {
            const { content, fileName } = message.payload;
            const uri = await vscode.window.showSaveDialog({
              defaultUri: vscode.Uri.file(fileName),
            });
            if (uri) {
              await vscode.workspace.fs.writeFile(
                uri,
                Buffer.from(content, "utf8")
              );
              vscode.window.showInformationMessage(
                "Session exported successfully!"
              );
            }
            break;
          }
          case "showToast":
            vscode.window.showInformationMessage(message.payload.text);
            break;
        }
      },
      null,
      this.disposables
    );
  }

  loadRequest(key) {
    const loadedState = this.context.globalState.get(key);
    this.panel.webview.postMessage({
      command: "loadState",
      payload: { key, ...loadedState },
    });
  }

  sendAllStates() {
    const allKeys = this.context.globalState.get(ALL_KEYS_STORAGE_KEY, []);
    const allStates = allKeys
      .map((key) => ({ key, ...this.context.globalState.get(key) }))
      .filter((state) => state.timestamp) // Ensure state exists
      .sort((a, b) => b.timestamp - a.timestamp); // Sort by newest first

    this.panel.webview.postMessage({
      command: "loadAllStates",
      payload: allStates,
    });
  }

  async handleApiRequest(payload) {
    console.log(fetch);
    const {
      method,
      url,
      params,
      headers,
      data: bodyConfig,
      authType,
      authDetails,
      bodyType,
    } = payload;

    const controller = new AbortController();
    const timeout = setTimeout(() => {
      controller.abort();
    }, 15000);

    const requestHeaders = new Headers();
    for (const key in headers) {
      if (Object.hasOwnProperty.call(headers, key)) {
        requestHeaders.append(key, headers[key]);
      }
    }

    // --- Handle Authentication ---
    if (authType === "basic" && authDetails.username) {
      const credentials = Buffer.from(
        `${authDetails.username}:${authDetails.password || ""}`
      ).toString("base64");
      requestHeaders.append("Authorization", `Basic ${credentials}`);
    } else if (authType === "bearer" && authDetails.token) {
      requestHeaders.append("Authorization", `Bearer ${authDetails.token}`);
    } else if (authType === "oauth2" && authDetails.accessToken) {
      requestHeaders.append(
        "Authorization",
        `${authDetails.headerPrefix || "Bearer"} ${authDetails.accessToken}`
      );
    }

    let body;
    // --- Handle Request Body ---
    if (method !== "GET" && method !== "HEAD") {
      if (bodyType === "json") {
        try {
          body = bodyConfig.jsonContent;
          if (!requestHeaders.has("Content-Type")) {
            requestHeaders.append("Content-Type", "application/json");
          }
        } catch (e) {
          this.panel.webview.postMessage({
            command: "apiRequestResult",
            payload: {
              error: `Invalid JSON Body: ${e.message}`,
              responseTime: 0,
            },
          });
          return;
        }
      } else if (bodyType === "graphql") {
        try {
          const graphqlBody = {
            query: bodyConfig.graphqlQuery,
            variables: bodyConfig.graphqlVariables
              ? JSON.parse(bodyConfig.graphqlVariables)
              : undefined,
          };
          body = JSON.stringify(graphqlBody);
          if (!requestHeaders.has("Content-Type")) {
            requestHeaders.append("Content-Type", "application/json");
          }
        } catch (e) {
          this.panel.webview.postMessage({
            command: "apiRequestResult",
            payload: {
              error: `Invalid GraphQL Variables JSON: ${e.message}`,
              responseTime: 0,
            },
          });
          return;
        }
      } else if (bodyType === "xml") {
        body = bodyConfig.xmlContent;
        if (!requestHeaders.has("Content-Type")) {
          requestHeaders.append("Content-Type", "application/xml");
        }
      } else if (bodyType === "text") {
        body = bodyConfig.textContent;
        if (!requestHeaders.has("Content-Type")) {
          requestHeaders.append("Content-Type", "text/plain");
        }
      } else if (bodyType === "formencode") {
        const encodedData = bodyConfig.formEncodedData
          .filter((d) => d.key)
          .reduce((acc, curr) => {
            acc[curr.key] = curr.value;
            return acc;
          }, {});

        body = new URLSearchParams(encodedData).toString();
        if (!requestHeaders.has("Content-Type")) {
          requestHeaders.append(
            "Content-Type",
            "application/x-www-form-urlencoded"
          );
        }
      } else if (bodyType === "formdata") {
        const form = new FormData();
        bodyConfig.formData.forEach((field) => {
          if (field.key && field.enabled) {
            if (field.type === "file" && field.file) {
              const base64Data = field.file.dataUrl.split(",")[1];
              const fileBuffer = Buffer.from(base64Data, "base64");
              form.append(field.key, fileBuffer, { filename: field.file.name });
            } else {
              form.append(field.key, field.value);
            }
          }
        });
        body = form;
        // Let node-fetch set the Content-Type for multipart/form-data
      } else if (bodyType === "binary" && bodyConfig.binaryFile) {
        const base64Data = bodyConfig.binaryFile.dataUrl.split(",")[1];
        body = Buffer.from(base64Data, "base64");
        if (!requestHeaders.has("Content-Type")) {
          requestHeaders.append(
            "Content-Type",
            bodyConfig.binaryFile.type || "application/octet-stream"
          );
        }
      }
    }

    const finalUrl = new URL(url);
    if (params) {
      for (const key in params) {
        if (Object.hasOwnProperty.call(params, key)) {
          finalUrl.searchParams.append(key, params[key]);
        }
      }
    }

    // --- AWS Signature v4 Signing ---
    if (
      authType === "aws" &&
      authDetails.accessKeyId &&
      authDetails.secretAccessKey
    ) {
      const urlObject = finalUrl;
      let awsOptions = {
        host: urlObject.hostname,
        path: urlObject.pathname + urlObject.search,
        method: method,
        headers: {},
        region: authDetails.region,
        service: authDetails.service,
        body: body,
      };

      for (const [key, value] of requestHeaders.entries()) {
        awsOptions.headers[key] = value;
      }

      try {
        aws4.sign(awsOptions, {
          accessKeyId: authDetails.accessKeyId,
          secretAccessKey: authDetails.secretAccessKey,
        });
        for (const key in awsOptions.headers) {
          if (Object.hasOwnProperty.call(awsOptions.headers, key)) {
            requestHeaders.set(key, awsOptions.headers[key]);
          }
        }
      } catch (e) {
        this.panel.webview.postMessage({
          command: "apiRequestResult",
          payload: {
            error: `AWS Signing Error: ${e.message}`,
            responseTime: 0,
          },
        });
        clearTimeout(timeout);
        return;
      }
    }

    const options = {
      method,
      headers: requestHeaders,
      signal: controller.signal,
      body: body,
    };

    if (method === "GET" || method === "HEAD") {
      delete options.body;
    }

    // --- Send Request ---
    const startTime = Date.now();
    try {
      const response = await fetch(finalUrl.toString(), options);
      const endTime = Date.now();
      clearTimeout(timeout);

      const responseText = await response.text();
      let responseData;
      try {
        responseData = JSON.parse(responseText);
      } catch (error) {
        responseData = responseText;
      }

      const responseHeaders = {};
      for (const [key, value] of response.headers.entries()) {
        responseHeaders[key] = value;
      }

      this.panel.webview.postMessage({
        command: "apiRequestResult",
        payload: {
          status: response.status,
          statusText: response.statusText,
          headers: responseHeaders,
          data: responseData,
          responseTime: endTime - startTime,
          size: responseText.length,
          cookies: response.headers.raw()["set-cookie"] || [],
        },
      });
    } catch (error) {
      clearTimeout(timeout);
      const endTime = Date.now();
      let errorMessage = `Request Failed: ${error.message}`;
      if (error.name === "AbortError") {
        errorMessage = "Request timed out after 15 seconds.";
      }

      this.panel.webview.postMessage({
        command: "apiRequestResult",
        payload: {
          error: errorMessage,
          responseTime: endTime - startTime,
        },
      });
    }
  }

  // In ApiCommanderPanel class, add the new handler method
  // In ApiCommanderPanel class, add the new handler method
  async handleApiRequestFromState(state) {
    // Construct the payload object, mapping state properties to payload properties
    const payload = {
      method: state.httpMethod,
      url: state.url,
      params: state.queryParams
        .filter((p) => p.enabled && p.key)
        .reduce((acc, curr) => {
          acc[curr.key] = curr.value;
          return acc;
        }, {}),
      headers: state.isRawHeaders
        ? state.rawHeadersText
            .split("\n")
            .filter((line) => line.trim())
            .reduce((acc, line) => {
              const parts = line.split(":");
              if (parts.length > 1) {
                acc[parts[0].trim()] = parts.slice(1).join(":").trim();
              }
              return acc;
            }, {})
        : state.headers
            .filter((h) => h.enabled && h.key)
            .reduce((acc, curr) => {
              acc[curr.key] = curr.value;
              return acc;
            }, {}),
      data: state.bodyConfig, // bodyConfig already contains the necessary data structure
      authType: state.authConfig.type.toLowerCase(), // Convert to lowercase as used in handleApiRequest
      authDetails: state.authConfig[state.authConfig.type.toLowerCase()], // Dynamically get auth details
      bodyType: state.bodyConfig.type.toLowerCase(), // Convert to lowercase as used in handleApiRequest
    };

    // The console.log and file writing are for debugging and can be removed in production
    // console.log(
    //   "Payload sent to handleApiRequest:",
    //   JSON.stringify(payload, null, 2)
    // );
    const homeDir = os.homedir();
    const filePath = path.join(homeDir, "api_commander_debug_state.json");
    try {
      fs.writeFileSync(filePath, JSON.stringify(state, null, 2));
      // console.log("Original state saved successfully to debug file!");
    } catch (err) {
      console.error("Error saving debug data:", err);
    }

    // Call the existing handleApiRequest with the properly constructed payload
    this.handleApiRequest(payload);
  }

  async handleFetchOauthToken(payload) {
    const { tokenUrl, clientId, clientSecret, scope } = payload;
    try {
      const params = new URLSearchParams();
      params.append("grant_type", "client_credentials");
      params.append("client_id", clientId);
      params.append("client_secret", clientSecret);
      if (scope) {
        params.append("scope", scope);
      }

      const response = await fetch(tokenUrl, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: params,
      });

      const data = await response.json();

      if (response.ok && data.access_token) {
        this.panel.webview.postMessage({
          command: "oauthTokenResult",
          payload: { token: data.access_token },
        });
      } else {
        const errorMessage =
          data.error_description ||
          data.error ||
          "Response did not contain an access_token.";
        throw new Error(errorMessage);
      }
    } catch (error) {
      const errorMessage = error.message;
      this.panel.webview.postMessage({
        command: "oauthTokenResult",
        payload: { error: `Failed to fetch token: ${errorMessage}` },
      });
    }
  }

  async addKeyToAllKeys(newKey) {
    const allKeys = this.context.globalState.get(ALL_KEYS_STORAGE_KEY, []);
    if (!allKeys.includes(newKey)) {
      await this.context.globalState.update(ALL_KEYS_STORAGE_KEY, [
        newKey,
        ...allKeys,
      ]);
    }
  }

  async removeKeyFromAllKeys(keyToRemove) {
    let allKeys = this.context.globalState.get(ALL_KEYS_STORAGE_KEY, []);
    allKeys = allKeys.filter((k) => k !== keyToRemove);
    await this.context.globalState.update(ALL_KEYS_STORAGE_KEY, allKeys);
  }

  dispose() {
    ApiCommanderPanel.currentPanel = undefined;
    this.panel.dispose();
    while (this.disposables.length) {
      this.disposables.pop()?.dispose();
    }
  }

  updateWebviewContent() {
    const htmlPath = vscode.Uri.joinPath(
      this.context.extensionUri,
      "webview-ui",
      "index.html"
    );
    vscode.workspace.fs.readFile(htmlPath).then((buffer) => {
      let htmlContent = buffer.toString();
      const nonce = getNonce();
      htmlContent = htmlContent.replace(/noncePlaceholder/g, nonce);
      this.panel.webview.html = htmlContent;
    });
  }
}

function getNonce() {
  let text = "";
  const possible =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}

module.exports = { activate };
