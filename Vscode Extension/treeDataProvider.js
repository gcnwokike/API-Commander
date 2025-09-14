// treeDataProvider.js
const vscode = require("vscode");

const ALL_KEYS_STORAGE_KEY = "@api_commander_all_sessions";

class ApiCommanderTreeDataProvider {
  constructor(context) {
    this._onDidChangeTreeData = new vscode.EventEmitter();
    this.onDidChangeTreeData = this._onDidChangeTreeData.event;
    this.context = context;
  }

  refresh() {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element) {
    return element;
  }

  getChildren(element) {
    if (element) {
      return Promise.resolve([]); // Individual requests have no children
    }

    const newRequestItem = new vscode.TreeItem(
      "New Request",
      vscode.TreeItemCollapsibleState.None
    );
    newRequestItem.iconPath = new vscode.ThemeIcon("add");
    // newRequestItem.command = {
    //   command: "api-commander.showPanel",
    //   title: "New Request",
    //   arguments: [null], // null signifies a new request
    // };

    newRequestItem.command = {
      command: "api-commander.newRequest",
      title: "New Request",
    };
    newRequestItem.contextValue = "newRequestTreeItem";
    // Add the Import Session item
    const importItem = new vscode.TreeItem(
      "Import Session",
      vscode.TreeItemCollapsibleState.None
    );
    importItem.iconPath = new vscode.ThemeIcon("cloud-upload");
    importItem.command = {
      command: "api-commander.importSession",
      title: "Import Session",
    };
    importItem.contextValue = "importItem";

    const allKeys = this.context.globalState.get(ALL_KEYS_STORAGE_KEY, []);
    if (allKeys.length === 0) {
      return Promise.resolve([newRequestItem]);
    }

    const historyItems = allKeys
      .map((key) => {
        const session = this.context.globalState.get(key);
        if (!session || !session.name) {
          return null; // Skip if session data is missing or corrupt
        }

        const { name, timestamp, state } = session;
        const label = `${state.httpMethod}: ${state.url || "No URL"}`;
        const item = new vscode.TreeItem(
          label,
          vscode.TreeItemCollapsibleState.None
        );
        item.description = new Date(timestamp).toLocaleString();
        item.tooltip = name;
        item.command = {
          command: "api-commander.showPanel",
          title: "Open Request",
          arguments: [key], // Pass the key to load
        };
        item.contextValue = "historyItem";
        return { item, timestamp };
      })
      .filter(Boolean); // Remove null entries

    // Sort items by timestamp, descending (newest first)
    historyItems.sort((a, b) => b.timestamp - a.timestamp);

    return Promise.resolve([
      newRequestItem,
      importItem,
      ...historyItems.map((i) => i.item),
    ]);
    // return Promise.resolve([
    //   newRequestItem,
    //   ...historyItems.map((i) => i.item),
    // ]);
  }
}

module.exports = ApiCommanderTreeDataProvider;
