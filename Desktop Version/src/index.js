const {
  QMainWindow,
  QWidget,
  QLabel,
  QLineEdit,
  QPushButton,
  QTabWidget,
  QGridLayout,
  QBoxLayout,
  Direction,
  QComboBox,
  QCheckBox,
  QPlainTextEdit,
  QFileDialog,
  QMessageBox,
  ButtonRole,
  QProgressBar,
  QSplitter,
  QRadioButton,
  QButtonGroup,
  QScrollArea,
  QApplication,
  QClipboard,
  QVariant,
  QIcon,
} = require("@nodegui/nodegui");
const path = require("path");
const fs = require("fs");
const os = require("os");
const axios = require("axios");
const FormData = require("form-data");

const { KVStore, INITIAL_STATE, APP_STATE } = require("./kv"); // Add this line to import KVStore
const {
  formatTimeAgo,
  formatBytes,
  isValidJson,
  generateSessionName,
  signRequestV4,
  uuidv4,
  isValidUrl,
} = require("./utils");

const EventEmitter = require("events").EventEmitter;
const myEmitter = new EventEmitter();

// Mock dependencies for standalone execution
const { globalStyleSheet } = require("./styles");
const { imgs } = require("./imageImport");
const fetch = require("node-fetch");
const { Headers } = require("node-fetch");
const ASYNC_STORAGE_KEYS = {
  ALL_SESSIONS: "@apicommander_all_keys",
  SESSION_PREFIX: "@apicommander_session_",
  LAST_ACTIVE: "@apicommander_last_active_key",
  DARKMODE_STATE: "@apicommander_darkmode_state",
  ORIENTATION_STATE: "@apicommander_orientation_state",
};
class Toast extends QWidget {
  constructor(
    parent,
    message,
    isDarkMode = true,
    isError = false,
    timer = 2000
  ) {
    super(parent);
    const backgroundColor = (() => {
      if (isError == true) {
        return isDarkMode ? "darkred" : "darkred"; //isDarkMode ? "#323232" : "#f0f0f0";
      } else {
        return isDarkMode ? "darkgreen" : "lightgreen"; //isDarkMode ? "#323232" : "#f0f0f0";
      }
    })();
    const textColor = (() => {
      if (isError == true) {
        return isDarkMode ? "white" : "white"; //isDarkMode ? "#323232" : "#f0f0f0";
      } else {
        return isDarkMode ? "#ffffff" : "#333333"; //isDarkMode ? "#323232" : "#f0f0f0";
      }
    })();
    this.setStyleSheet(`
      background-color: ${backgroundColor};
      color: ${textColor};
      border-radius: 5px;
      padding: 10px;
    `);
    this.timer = timer;
    this.label = new QLabel();
    this.label.setText(message);
    this.label.setWordWrap(true);
    this.label.setStyleSheet(`
      color: ${textColor};
      font-weight: bold;
    `);
    const layout = new QBoxLayout(Direction.LeftToRight);
    layout.addWidget(this.label);
    this.setLayout(layout);
    // this.setFixedWidth(200);
    this.label.adjustSize();
    this.adjustSize();
    this.move(10, parent.height() - this.height() - 10);
  }

  showToast() {
    this.show();
    setTimeout(() => {
      this.close();
    }, this.timer);
  }
}

class ApiCommanderApp {
  constructor() {
    this.app = new QApplication();
    this.win = new QMainWindow();
    this.new_object_name = (x_object_name) => {
      this.statusLabel.setObjectName(x_object_name);
      this.sizeLabel.setObjectName(x_object_name);
      this.timeLabel.setObjectName(x_object_name);
    };
    this.state = this._getInitialState();
    this.app_state = this._getAppState();
    // Initial state setup
    this.emptyKeyValue = { id: 0, key: "", value: "", enabled: true };
    this.emptyFormValue = {
      id: 0,
      key: "",
      value: "",
      type: "text",
      file: null,
      enabled: true,
    };
    this.toast_message = "Api Commander Desktop App!!";
    this.sessionStorage = new KVStore(
      process.env.NODE_ENV === "production"
        ? path.join(os.homedir(), ".api_db")
        : path.join(__dirname, "sessions_db")
    );

    this.sessions = {};
    this.activeSessionKey = null;
    this.isUpdatingDropdown = false;
    this._initMainWindow();
    this._createWidgets();
    this._createLayout();

    this._connectEventListeners();
    this._performInitialRenders();
    this._loadSessions(); // Load sessions on startup. This will overwrite the initial state and trigger a re-render.
    this._first_time_load();
    this.win.setCentralWidget(this.centralWidget);
  }

  /**
   * Initializes the application state.
   */
  //None Control State
  _getInitialState() {
    return {
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
  }

  // Control State e.g Darkmode, Orientation e.t.c
  _getAppState() {
    return {
      orientation: 1, // 1 for Horizontal, 2 for Vertical
      is_darkmode: true,
    };
  }
  /**
   * Configures the main application window.
   */
  _initMainWindow() {
    this.win.setWindowTitle("API Commander Desktop App");
    this.win.resize(1200, 800);
    try {
      const appIconPath = path.resolve(
        __dirname,
        process.env.NODE_ENV === "production"
          ? "assets/nodegui.png"
          : "../assets/nodegui.png"
      );
      const appIcon = new QIcon(appIconPath);
      this.win.setWindowIcon(appIcon);
    } catch (e) {
      console.error("Icon not found, skipping.", e);
    }
  }

  /**
   * Creates all UI widgets for the application.
   */
  _createWidgets() {
    this.centralWidget = new QWidget();
    this.rootLayout = new QBoxLayout(Direction.TopToBottom);
    this.centralWidget.setLayout(this.rootLayout);

    // Main Splitter
    this.splitter = new QSplitter();
    this.splitter.setOrientation(this.app_state.orientation);

    // Request and Response Panels
    this._createGlobalHeader();
    this._createSessionManagement();
    this._createRequestHeader();
    this._createRequestPanel();
    this._createResponsePanel();
  }

  /**
   * Assembles the main layout of the application.
   */
  _createLayout() {
    this.rootLayout.addLayout(this.globalHeaderLayout);
    this.rootLayout.addLayout(this.sessionLayout);
    this.rootLayout.addLayout(this.headerLayout);

    this.splitter.addWidget(this.requestPanel);
    this.splitter.addWidget(this.responsePanel);
    this.rootLayout.addWidget(this.splitter, 1);
  }

  // --- UI Creation Methods ---

  _createGlobalHeader() {
    this.globalHeaderLayout = new QBoxLayout(Direction.LeftToRight);
    this.globalHeaderLabel = new QLabel();
    this.globalHeaderLabel.setObjectName("headerLabel");
    this.globalHeaderLabel.setText("API Commander");

    this.globalOrientationControl = new QCheckBox();
    this.globalOrientationControl.setObjectName("headerCheckBox");
    this.globalOrientationControl.setText("Vertical Layout");
    this.globalOrientationControl.setChecked(this.app_state.orientation === 2);

    this.globalColorTheme = new QCheckBox();
    this.globalColorTheme.setObjectName("headerCheckBox");
    this.globalColorTheme.setText("DarkMode");
    this.globalColorTheme.setChecked(true);

    this.globalHeaderLayout.addWidget(this.globalHeaderLabel, 1);
    this.globalHeaderLayout.addWidget(this.globalOrientationControl);
    this.globalHeaderLayout.addWidget(this.globalColorTheme);
  }

  _createSessionManagement() {
    this.sessionLayout = new QBoxLayout(Direction.LeftToRight);
    this.sessionDropdown = new QComboBox();
    this.sessionDropdown.addItems(["Default Session List"]);
    this.newRequestButton = new QPushButton();
    this.newRequestButton.setObjectName("newRequestBtn");
    this.newRequestButton.setText("New Request");
    this.importRequestButton = new QPushButton();
    this.importRequestButton.setObjectName("importRequestBtn");
    this.importRequestButton.setText("Import");
    this.exportRequestButton = new QPushButton();
    this.exportRequestButton.setObjectName("exportRequestBtn");
    this.exportRequestButton.setText("Export");
    this.deleteRequestButton = new QPushButton();
    this.deleteRequestButton.setObjectName("deleteRequestBtn");
    this.deleteRequestButton.setText("Delete");

    this.sessionLayout.addWidget(this.sessionDropdown, 1);
    this.sessionLayout.addWidget(this.newRequestButton);
    this.sessionLayout.addWidget(this.importRequestButton);
    this.sessionLayout.addWidget(this.exportRequestButton);
    this.sessionLayout.addWidget(this.deleteRequestButton);
  }

  _createRequestHeader() {
    this.headerLayout = new QBoxLayout(Direction.LeftToRight);
    this.methodDropdown = new QComboBox();
    this.methodDropdown.addItems([
      "POST",
      "GET",
      "PUT",
      "PATCH",
      "DELETE",
      "HEAD",
      "OPTIONS",
    ]);
    this.methodDropdown.setCurrentText(this.state.httpMethod);

    this.urlInput = new QLineEdit();
    this.urlInput.setPlaceholderText(this.state.url);
    this.urlInput.setText(this.state.url);

    this.sendButton = new QPushButton();
    this.sendButton.setObjectName("sendBtn");
    this.sendButton.setText("Send");

    this.headerLayout.addWidget(this.methodDropdown);
    this.headerLayout.addWidget(this.urlInput, 1);
    this.headerLayout.addWidget(this.sendButton);
  }

  _createRequestPanel() {
    this.requestPanel = new QWidget();
    const requestLayout = new QBoxLayout(Direction.TopToBottom);
    this.requestPanel.setLayout(requestLayout);
    this.requestTabs = new QTabWidget();
    requestLayout.addWidget(this.requestTabs);

    this._createBodyTab();
    this._createQueryTab();
    this._createHeadersTab();
    this._createCookiesTab();
    this._createAuthTab();
  }

  _createBodyTab() {
    const bodyTab = new QWidget();
    const bodyLayout = new QBoxLayout(Direction.TopToBottom);
    bodyTab.setLayout(bodyLayout);
    const bodySubTabs = new QTabWidget();
    bodyLayout.addWidget(bodySubTabs);
    this.bodySubTabs = bodySubTabs;

    // JSON Body
    const jsonBodyTab = new QWidget();
    const jsonBodyLayout = new QBoxLayout(Direction.TopToBottom);
    jsonBodyTab.setLayout(jsonBodyLayout);
    this.jsonContent = new QPlainTextEdit();
    this.jsonContent.setPlainText(this.state.body.jsonContent);
    jsonBodyLayout.addWidget(this.jsonContent);
    bodySubTabs.addTab(jsonBodyTab, new QIcon(), "JSON");

    // Text Body
    const textBodyTab = new QWidget();
    const textBodyLayout = new QBoxLayout(Direction.TopToBottom);
    textBodyTab.setLayout(textBodyLayout);
    this.textContent = new QPlainTextEdit();
    this.textContent.setPlainText(this.state.body.textContent);
    textBodyLayout.addWidget(this.textContent);
    bodySubTabs.addTab(textBodyTab, new QIcon(), "Text");

    // XML Body
    const xmlBodyTab = new QWidget();
    const xmlBodyLayout = new QBoxLayout(Direction.TopToBottom);
    xmlBodyTab.setLayout(xmlBodyLayout);
    this.xmlContent = new QPlainTextEdit();
    this.xmlContent.setPlainText(this.state.body.xmlContent);
    xmlBodyLayout.addWidget(this.xmlContent);
    bodySubTabs.addTab(xmlBodyTab, new QIcon(), "XML");

    // Form Data
    const { tab: formBodyTab, scrollArea } = this._createScrollableTab();
    this.formScrollArea = scrollArea;
    const formAddButton = new QPushButton();
    formAddButton.setText("Add Form Field");
    formAddButton.addEventListener("clicked", () => {
      this._addNewKeyValueRow(this.state.body.formData, true);
      this.renderFormTab();
    });
    formBodyTab.layout().addWidget(formAddButton);
    bodySubTabs.addTab(formBodyTab, new QIcon(), "Form");

    // Form Encoded
    const { tab: formEncodeBodyTab, scrollArea: formEncodeScrollArea } =
      this._createScrollableTab();
    this.formEncodeScrollArea = formEncodeScrollArea;
    const formEncodeAddButton = new QPushButton();
    formEncodeAddButton.setText("Add Field");
    formEncodeAddButton.addEventListener("clicked", () => {
      this._addNewKeyValueRow(this.state.body.formEncodedData);
      this.renderFormEncodeTab();
    });
    formEncodeBodyTab.layout().addWidget(formEncodeAddButton);
    bodySubTabs.addTab(formEncodeBodyTab, new QIcon(), "Form-encode");

    // GraphQL
    // const graphqlBodyTab = new QWidget();
    // const graphqlBodyLayout = new QBoxLayout(Direction.TopToBottom);
    // graphqlBodyTab.setLayout(graphqlBodyLayout);
    // const graphqlQueryLabel = new QLabel();
    // graphqlQueryLabel.setText("Query");
    // this.graphqlQuery = new QPlainTextEdit();
    // this.graphqlQuery.setPlainText(this.state.body.graphqlQuery);
    // const graphqlVariablesLabel = new QLabel();
    // graphqlVariablesLabel.setText("Variables");
    // this.graphqlVariables = new QPlainTextEdit();
    // this.graphqlVariables.setPlainText(this.state.body.graphqlVariables);
    // graphqlBodyLayout.addWidget(graphqlQueryLabel);
    // graphqlBodyLayout.addWidget(this.graphqlQuery, 1);
    // graphqlBodyLayout.addWidget(graphqlVariablesLabel);
    // graphqlBodyLayout.addWidget(this.graphqlVariables, 1);
    // bodySubTabs.addTab(graphqlBodyTab, new QIcon(), "GraphQL");

    // Binary
    const binaryBodyTab = new QWidget();
    const binaryBodyLayout = new QBoxLayout(Direction.TopToBottom);
    binaryBodyTab.setLayout(binaryBodyLayout);
    this.selectFileButton = new QPushButton();
    this.selectFileButton.setText("Select File");
    this.selectedFileLabel = new QLabel();
    this.selectedFileLabel.setText(
      this.state.body.binaryFilePath || "No file selected"
    );
    binaryBodyLayout.addWidget(this.selectFileButton);
    binaryBodyLayout.addWidget(this.selectedFileLabel);
    bodySubTabs.addTab(binaryBodyTab, new QIcon(), "Binary");

    this.requestTabs.addTab(bodyTab, new QIcon(), "Body");
  }

  _createQueryTab() {
    const { tab: queryTab, scrollArea } = this._createScrollableTab();
    this.queryScrollArea = scrollArea;
    const queryAddButton = new QPushButton();
    queryAddButton.setText("Add Param");
    queryAddButton.addEventListener("clicked", () => {
      this._addNewKeyValueRow(this.state.queryParams);
      this.renderQueryTab();
    });
    queryTab.layout().addWidget(queryAddButton);
    this.requestTabs.addTab(queryTab, new QIcon(), "Query");
  }

  _createHeadersTab() {
    const headersTab = new QWidget();
    const headersLayout = new QBoxLayout(Direction.TopToBottom);
    headersTab.setLayout(headersLayout);

    // Raw Toggle
    const rawHeadersToggleLayout = new QBoxLayout(Direction.LeftToRight);
    rawHeadersToggleLayout.addStretch(1);
    this.rawHeadersCheckbox = new QCheckBox();
    this.rawHeadersCheckbox.setText("Raw Input");
    this.rawHeadersCheckbox.setChecked(this.state.isRawHeaders);
    rawHeadersToggleLayout.addWidget(this.rawHeadersCheckbox);
    headersLayout.addLayout(rawHeadersToggleLayout);

    // Raw Text Edit
    this.rawHeadersText = new QPlainTextEdit();
    this.rawHeadersText.setPlainText(this.state.rawHeadersText);

    // Key-Value View
    const { tab: headersKeyValueTab, scrollArea } = this._createScrollableTab();
    this.headersScrollArea = scrollArea;
    this.headersKeyValueTab = headersKeyValueTab;
    const headersAddButton = new QPushButton();
    headersAddButton.setText("Add Header");
    headersAddButton.addEventListener("clicked", () => {
      this._addNewKeyValueRow(this.state.headers);
      this.renderHeadersTab();
    });
    headersKeyValueTab.layout().addWidget(headersAddButton);

    headersLayout.addWidget(headersKeyValueTab);
    headersLayout.addWidget(this.rawHeadersText);
    this.requestTabs.addTab(headersTab, new QIcon(), "Headers");
  }

  _createCookiesTab() {
    const { tab: cookiesTab, scrollArea } = this._createScrollableTab();
    this.cookiesScrollArea = scrollArea;
    const cookiesAddButton = new QPushButton();
    cookiesAddButton.setText("Add Cookie");
    cookiesAddButton.addEventListener("clicked", () => {
      this._addNewKeyValueRow(this.state.requestCookies);
      this.renderCookiesTab();
    });
    cookiesTab.layout().addWidget(cookiesAddButton);
    this.requestTabs.addTab(cookiesTab, new QIcon(), "Cookies");
  }

  _createAuthTab() {
    const authTab = new QWidget();
    const authLayout = new QBoxLayout(Direction.TopToBottom);
    authTab.setLayout(authLayout);
    const authSubTabs = new QTabWidget();
    authLayout.addWidget(authSubTabs);
    this.authSubTabs = authSubTabs;

    // No Auth
    const noAuthTab = new QWidget();
    noAuthTab.setLayout(new QBoxLayout(Direction.TopToBottom));
    const noAuthLabel = new QLabel();
    noAuthLabel.setText("No authentication required.");
    noAuthTab.layout().addWidget(noAuthLabel);
    authSubTabs.addTab(noAuthTab, new QIcon(), "None");

    // Basic Auth
    const basicAuthTab = new QWidget();
    const basicAuthLayout = new QGridLayout();
    basicAuthTab.setLayout(basicAuthLayout);
    this.basicUsername = new QLineEdit();
    this.basicUsername.setPlaceholderText("Username");
    this.basicPassword = new QLineEdit();
    this.basicPassword.setPlaceholderText("Password");
    this.basicPassword.setEchoMode(2);
    const usernameLabel = new QLabel();
    usernameLabel.setText("Username");
    basicAuthLayout.addWidget(usernameLabel, 0, 0);
    basicAuthLayout.addWidget(this.basicUsername, 0, 1);
    const passwordLabel = new QLabel();
    passwordLabel.setText("Password");
    basicAuthLayout.addWidget(passwordLabel, 1, 0);
    basicAuthLayout.addWidget(this.basicPassword, 1, 1);
    authSubTabs.addTab(basicAuthTab, new QIcon(), "Basic");

    // Bearer Auth
    const bearerAuthTab = new QWidget();
    const bearerAuthLayout = new QBoxLayout(Direction.TopToBottom);
    bearerAuthTab.setLayout(bearerAuthLayout);
    this.bearerToken = new QLineEdit();
    this.bearerToken.setPlaceholderText("Token");
    const tokenLabel = new QLabel();
    tokenLabel.setText("Token");
    bearerAuthLayout.addWidget(tokenLabel);
    bearerAuthLayout.addWidget(this.bearerToken);
    authSubTabs.addTab(bearerAuthTab, new QIcon(), "Bearer");

    // OAuth 2.0
    // const oauth2AuthTab = new QWidget();
    // const oauth2AuthLayout = new QGridLayout();
    // oauth2AuthTab.setLayout(oauth2AuthLayout);
    // this.oauth2TokenUrl = new QLineEdit();
    // this.oauth2TokenUrl.setPlaceholderText("Access Token URL");
    // this.oauth2ClientId = new QLineEdit();
    // this.oauth2ClientId.setPlaceholderText("Client ID");
    // this.oauth2ClientSecret = new QLineEdit();
    // this.oauth2ClientSecret.setPlaceholderText("Client Secret");
    // this.oauth2Scope = new QLineEdit();
    // this.oauth2Scope.setPlaceholderText("Scope (optional)");
    // this.fetchTokenButton = new QPushButton();
    // this.fetchTokenButton.setText("Fetch Token");
    // this.oauth2AccessToken = new QLineEdit();
    // this.oauth2AccessToken.setPlaceholderText("Access Token");
    // const accessTokenUrlLabel = new QLabel();
    // accessTokenUrlLabel.setText("Access Token URL");
    // oauth2AuthLayout.addWidget(accessTokenUrlLabel, 0, 0);
    // oauth2AuthLayout.addWidget(this.oauth2TokenUrl, 0, 1);
    // const clientIdLabel = new QLabel();
    // clientIdLabel.setText("Client ID");
    // oauth2AuthLayout.addWidget(clientIdLabel, 1, 0);
    // oauth2AuthLayout.addWidget(this.oauth2ClientId, 1, 1);
    // const clientSecretLabel = new QLabel();
    // clientSecretLabel.setText("Client Secret");
    // oauth2AuthLayout.addWidget(clientSecretLabel, 2, 0);
    // oauth2AuthLayout.addWidget(this.oauth2ClientSecret, 2, 1);
    // const scopeLabel = new QLabel();
    // scopeLabel.setText("Scope");
    // oauth2AuthLayout.addWidget(scopeLabel, 3, 0);
    // oauth2AuthLayout.addWidget(this.oauth2Scope, 3, 1);
    // oauth2AuthLayout.addWidget(this.fetchTokenButton, 4, 1);
    // const accessTokenLabel = new QLabel();
    // accessTokenLabel.setText("Access Token");
    // oauth2AuthLayout.addWidget(accessTokenLabel, 5, 0);
    // oauth2AuthLayout.addWidget(this.oauth2AccessToken, 5, 1);
    // authSubTabs.addTab(oauth2AuthTab, new QIcon(), "OAuth 2.0");

    // // AWS v4
    // const awsAuthTab = new QWidget();
    // const awsAuthLayout = new QGridLayout();
    // awsAuthTab.setLayout(awsAuthLayout);
    // this.awsAccessKeyId = new QLineEdit();
    // this.awsAccessKeyId.setPlaceholderText("Access Key ID");
    // this.awsSecretAccessKey = new QLineEdit();
    // this.awsSecretAccessKey.setPlaceholderText("Secret Access Key");
    // this.awsSecretAccessKey.setEchoMode(2);
    // this.awsRegion = new QLineEdit();
    // this.awsRegion.setPlaceholderText("Region");
    // this.awsService = new QLineEdit();
    // this.awsService.setPlaceholderText("Service");
    // const accessKeyIdLabel = new QLabel();
    // accessKeyIdLabel.setText("Access Key ID");
    // awsAuthLayout.addWidget(accessKeyIdLabel, 0, 0);
    // awsAuthLayout.addWidget(this.awsAccessKeyId, 0, 1);
    // const secretAccessKeyLabel = new QLabel();
    // secretAccessKeyLabel.setText("Secret Access Key");
    // awsAuthLayout.addWidget(secretAccessKeyLabel, 1, 0);
    // awsAuthLayout.addWidget(this.awsSecretAccessKey, 1, 1);
    // const regionLabel = new QLabel();
    // regionLabel.setText("Region");
    // awsAuthLayout.addWidget(regionLabel, 2, 0);
    // awsAuthLayout.addWidget(this.awsRegion, 2, 1);
    // const serviceLabel = new QLabel();
    // serviceLabel.setText("Service");
    // awsAuthLayout.addWidget(serviceLabel, 3, 0);
    // awsAuthLayout.addWidget(this.awsService, 3, 1);
    // authSubTabs.addTab(awsAuthTab, new QIcon(), "AWS v4");

    // this.requestTabs.addTab(authTab, new QIcon(), "Auth");
  }

  _createResponsePanel() {
    this.responsePanel = new QWidget();
    const responseLayout = new QBoxLayout(Direction.TopToBottom);
    this.responsePanel.setLayout(responseLayout);

    // Info Bar
    const responseInfoLayout = new QBoxLayout(Direction.LeftToRight);
    this.statusLabel = new QLabel();
    this.statusLabel.setText("Status: -");
    this.sizeLabel = new QLabel();
    this.sizeLabel.setText("Size: -");
    this.timeLabel = new QLabel();
    this.timeLabel.setText("Time: -");
    responseInfoLayout.addWidget(this.statusLabel);
    responseInfoLayout.addWidget(this.sizeLabel);
    responseInfoLayout.addWidget(this.timeLabel);
    responseLayout.addLayout(responseInfoLayout);

    // Progress Bar
    this.progressBar = new QProgressBar();
    this.progressBar.setTextVisible(false);
    this.progressBar.setMinimum(0);
    this.progressBar.setMaximum(0); // Indeterminate
    this.progressBar.hide();

    // Response Tabs
    const responseTabs = new QTabWidget();
    responseLayout.addWidget(responseTabs, 1);
    responseLayout.addWidget(this.progressBar);

    // Response Body
    const responseBodyTab = new QWidget();
    const responseBodyLayout = new QBoxLayout(Direction.TopToBottom);
    responseBodyTab.setLayout(responseBodyLayout);
    this.copyResponseButton = new QPushButton();
    this.copyResponseButton.setText("Copy Response");
    this.responseContent = new QPlainTextEdit();
    this.responseContent.setReadOnly(true);
    responseBodyLayout.addWidget(this.copyResponseButton);

    responseBodyLayout.addWidget(this.responseContent, 1);
    responseTabs.addTab(responseBodyTab, new QIcon(), "Response");

    // Response Headers
    const responseHeadersTab = new QWidget();
    responseHeadersTab.setLayout(new QBoxLayout(Direction.TopToBottom));
    this.responseHeadersContent = new QPlainTextEdit();
    this.responseHeadersContent.setReadOnly(true);
    responseHeadersTab.layout().addWidget(this.responseHeadersContent, 1);
    responseTabs.addTab(responseHeadersTab, new QIcon(), "Headers");

    // Response Cookies
    const responseCookiesTab = new QWidget();
    responseCookiesTab.setLayout(new QBoxLayout(Direction.TopToBottom));
    this.responseCookiesContent = new QPlainTextEdit();
    this.responseCookiesContent.setReadOnly(true);
    responseCookiesTab.layout().addWidget(this.responseCookiesContent, 1);
    responseTabs.addTab(responseCookiesTab, new QIcon(), "Cookies");
  }

  // --- Event Listener Connection ---

  _connectEventListeners() {
    // Global controls
    this.globalOrientationControl.addEventListener("toggled", (checked) => {
      const orientation = checked ? 2 : 1;
      this.splitter.setOrientation(orientation);
      this.app_state.orientation = orientation;
      this._toast("Layout Changed");
      try {
        this.sessionStorage.setItem(
          ASYNC_STORAGE_KEYS.ORIENTATION_STATE,
          orientation
        );
      } catch (error) {
        console.error(error);
      }
    });
    this.globalColorTheme.addEventListener("toggled", () => {
      this._updateStyleSheet();
      this._toast("Theme Changed");
    });

    // Session Management
    this.newRequestButton.addEventListener("clicked", () => {
      this._initializeNewRequest(INITIAL_STATE, true);
      this._toast("New Request Created!!");
    });
    this.importRequestButton.addEventListener("clicked", () =>
      this._importSession()
    );
    this.exportRequestButton.addEventListener("clicked", () =>
      this._exportSession()
    );
    this.deleteRequestButton.addEventListener("clicked", () => {
      this._deleteSession();
      this._toast("Current Session Deleted");
      // setTimeout(() => {
      //   this._toast("New Session Created!!");
      // }, 1500);
    });
    this.sessionDropdown.addEventListener("currentIndexChanged", (index) => {
      if (this.isUpdatingDropdown || index < 0) {
        return;
      }
      const keyVariant = this.sessionDropdown.itemData(index);
      const key = keyVariant.toString();
      if (key && this.sessions[key]) {
        this._switchActiveSession(key);
      }
    });

    // Request Header
    this.methodDropdown.addEventListener("currentTextChanged", (text) => {
      this.state.httpMethod = text;
      this._saveCurrentSession();
    });

    // Correct implementation in _connectEventListeners
    this.urlInput.addEventListener("textChanged", (text) => {
      this.state.url = text;
      this._saveCurrentSession();
    });
    this.sendButton.addEventListener("clicked", this._sendRequest.bind(this));

    // Body content
    this.jsonContent.addEventListener("textChanged", () => {
      this.state.body.jsonContent = this.jsonContent.toPlainText();
      this._saveCurrentSession();
    });
    this.textContent.addEventListener("textChanged", () => {
      this.state.body.textContent = this.textContent.toPlainText();
      this._saveCurrentSession();
    });
    this.xmlContent.addEventListener("textChanged", () => {
      this.state.body.xmlContent = this.xmlContent.toPlainText();
      this._saveCurrentSession();
    });
    // this.graphqlQuery.addEventListener("textChanged", () => {
    //   this.state.body.graphqlQuery = this.graphqlQuery.toPlainText();
    //   this._saveCurrentSession();
    // });
    // this.graphqlVariables.addEventListener("textChanged", () => {
    //   this.state.body.graphqlVariables = this.graphqlVariables.toPlainText();
    //   this._saveCurrentSession();
    // });

    // Binary file selection
    this.selectFileButton.addEventListener("clicked", () => {
      const fileDialog = new QFileDialog();
      fileDialog.setFileMode(1);
      if (fileDialog.exec()) {
        const selectedFiles = fileDialog.selectedFiles();
        if (selectedFiles.length > 0) {
          this.selectedFileLabel.setText(path.basename(selectedFiles[0]));
          this.state.body.binaryFilePath = selectedFiles[0];
        }
      }
    });

    // Headers raw toggle
    this.rawHeadersCheckbox.addEventListener(
      "toggled",
      this._syncAndToggleRawHeaders.bind(this)
    );
    this.rawHeadersText.addEventListener("textChanged", () => {
      this.state.rawHeadersText = this.rawHeadersText.toPlainText();
      this._saveCurrentSession();
    });

    // Response controls
    this.copyResponseButton.addEventListener("clicked", () => {
      QApplication.clipboard().setText(this.responseContent.toPlainText());
      const originalText = this.copyResponseButton.text();
      this.copyResponseButton.setText("Copied!");
      setTimeout(() => this.copyResponseButton.setText(originalText), 2000);
    });

    // Basic Auth fields
    this.basicUsername.addEventListener("textChanged", (text) => {
      this.state.basicAuthUsername = text;
      this._saveCurrentSession();
    });
    this.basicPassword.addEventListener("textChanged", (text) => {
      this.state.basicPassword = text;
      this._saveCurrentSession();
    });

    // Bearer Auth token field
    this.bearerToken.addEventListener("textChanged", (text) => {
      this.state.bearerToken = text;
      this._saveCurrentSession();
    });

    // OAuth 2.0 fields
    // this.oauth2TokenUrl.addEventListener("textChanged", (text) => {
    //   this.state.oauth2TokenUrl = text;
    //   this._saveCurrentSession();
    // });
    // this.oauth2ClientId.addEventListener("textChanged", (text) => {
    //   this.state.oauth2ClientId = text;
    //   this._saveCurrentSession();
    // });
    // this.oauth2ClientSecret.addEventListener("textChanged", (text) => {
    //   this.state.oauth2ClientSecret = text;
    //   this._saveCurrentSession();
    // });
    // this.oauth2Scope.addEventListener("textChanged", (text) => {
    //   this.state.oauth2Scope = text;
    //   this._saveCurrentSession();
    // });
    // this.oauth2AccessToken.addEventListener("textChanged", (text) => {
    //   this.state.oauth2AccessToken = text;
    //   this._saveCurrentSession();
    // });
    // this.fetchTokenButton.addEventListener("clicked", async () => {
    //   try {
    //     const tokenUrl = this.oauth2TokenUrl.text();
    //     const clientId = this.oauth2ClientId.text();
    //     const clientSecret = this.oauth2ClientSecret.text();
    //     const scope = this.oauth2Scope.text();

    //     if (!tokenUrl || !clientId || !clientSecret) {
    //       this._toast(
    //         "Token URL, Client ID, and Client Secret are required.",
    //         true
    //       );
    //       return;
    //     }

    //     const auth = Buffer.from(`${clientId}:${clientSecret}`).toString(
    //       "base64"
    //     );
    //     const headers = {
    //       "Content-Type": "application/x-www-form-urlencoded",
    //       Authorization: `Basic ${auth}`,
    //     };

    //     const body = new URLSearchParams({
    //       grant_type: "client_credentials",
    //       scope: scope || undefined,
    //     });

    //     const response = await fetch(tokenUrl, {
    //       method: "POST",
    //       headers,
    //       body: body.toString(),
    //     });

    //     if (!response.ok) {
    //       const errorResponse = await response.json();
    //       const errorMessage = errorResponse.error || response.statusText;
    //       this._toast(`Failed to fetch token: ${errorMessage}`, true);
    //       return;
    //     }

    //     const tokenResponse = await response.json();
    //     const accessToken = tokenResponse.access_token;

    //     if (!accessToken) {
    //       this._toast("Access token not found in response.", true);
    //       return;
    //     }

    //     this.oauth2AccessToken.setText(accessToken);
    //     this._toast("Token fetched successfully!");
    //   } catch (error) {
    //     console.error(error);
    //     if (
    //       error instanceof TypeError &&
    //       error.message.includes("Failed to fetch")
    //     ) {
    //       this._toast("Failed to connect to the token URL.", true);
    //     } else if (error.message.includes("JSON")) {
    //       this._toast("Invalid JSON response from the token URL.", true);
    //     } else {
    //       this._toast(`Error fetching token: ${error.message}`, true);
    //     }
    //   }
    // });

    // AWS v4 fields
    // this.awsAccessKeyId.addEventListener("textChanged", (text) => {
    //   this.state.awsAccessKeyId = text;
    //   this._saveCurrentSession();
    // });
    // this.awsSecretAccessKey.addEventListener("textChanged", (text) => {
    //   this.state.awsSecretAccessKey = text;
    //   this._saveCurrentSession();
    // });
    // this.awsRegion.addEventListener("textChanged", (text) => {
    //   this.state.awsRegion = text;
    //   this._saveCurrentSession();
    // });
    // this.awsService.addEventListener("textChanged", (text) => {
    //   this.state.awsService = text;
    //   this._saveCurrentSession();
    // });
    // In the _createAuthTab method
    this.authSubTabs.addEventListener("currentChanged", (index) => {
      switch (index) {
        case 0:
          this.state.auth.type = "none";
          break;
        case 1:
          this.state.auth.type = "basic";
          break;
        case 2:
          this.state.auth.type = "bearer";
          break;
        case 3:
        //   this.state.auth.type = "oauth2";
        //   break;
        // case 4:
        //   this.state.auth.type = "awsv4";
        //   break;
        default:
          this.state.auth.type = "none";
      }
      this._saveCurrentSession();
    });

    // In the _createBodyTab method
    this.bodySubTabs.addEventListener("currentChanged", (index) => {
      switch (index) {
        case 0:
          this.state.body.type = "json";
          break;
        case 1:
          this.state.body.type = "text";
          break;
        case 2:
          this.state.body.type = "xml";
          break;
        case 3:
          this.state.body.type = "form";
          break;
        case 4:
          this.state.body.type = "form-encoded";
          break;
        case 5:
          this.state.body.type = "graphql";
          break;
        case 6:
          this.state.body.type = "binary";
          break;
        default:
          this.state.body.type = "json";
      }
      this._saveCurrentSession();
    });
  }
  _saveCurrentSession() {
    if (this.activeSessionKey && this.sessions[this.activeSessionKey]) {
      this.sessions[this.activeSessionKey].state = { ...this.state };
      this.sessionStorage.setItem(
        this.activeSessionKey,
        this.sessions[this.activeSessionKey]
      );
    }
  }
  // --- Dynamic UI Rendering ---

  /**
   * Helper to create a basic scrollable tab.
   */
  _createScrollableTab() {
    const tab = new QWidget();
    const tabLayout = new QBoxLayout(Direction.TopToBottom);
    tab.setLayout(tabLayout);
    const scrollArea = new QScrollArea();
    scrollArea.setWidgetResizable(true);
    tabLayout.addWidget(scrollArea, 1);
    scrollArea.setWidget(new QWidget());
    return { tab, scrollArea };
  }

  /**
   * Adds a new empty row to a key-value data array.
   */
  _addNewKeyValueRow(items, isForm = false) {
    items.push({
      ...(isForm ? this.emptyFormValue : this.emptyKeyValue),
      id: Date.now(),
    });
  }

  /**
   * Renders the key-value editor UI inside a scroll area.
   */
  _renderKeyValueSection(items, scrollArea, rerenderer, options = {}) {
    const { isForm = false, hasCheckbox = true } = options;
    const contentWidget = new QWidget();
    const layout = new QBoxLayout(Direction.TopToBottom);
    contentWidget.setLayout(layout);

    items.forEach((item) => {
      const rowWidget = new QWidget();
      const rowLayout = new QBoxLayout(Direction.LeftToRight);
      rowWidget.setLayout(rowLayout);

      const removeItem = () => {
        const newItems = items.filter((p) => p.id !== item.id);
        const emptyItem = isForm
          ? { ...this.emptyFormValue, id: Date.now() }
          : { ...this.emptyKeyValue, id: Date.now() };

        if (items === this.state.body.formData) {
          this.state.body.formData =
            newItems.length > 0 ? newItems : [emptyItem];
        } else if (items === this.state.body.formEncodedData) {
          this.state.body.formEncodedData =
            newItems.length > 0 ? newItems : [emptyItem];
        } else {
          const dataKey = Object.keys(this.state).find(
            (key) =>
              Array.isArray(this.state[key]) &&
              this.state[key].some((i) => i.id === item.id)
          );
          if (dataKey) {
            this.state[dataKey] = newItems.length > 0 ? newItems : [emptyItem];
          }
        }
        rerenderer();
      };

      if (hasCheckbox) {
        const checkbox = new QCheckBox();
        checkbox.setChecked(item.enabled);
        checkbox.addEventListener(
          "toggled",
          (checked) => (item.enabled = checked)
        );
        rowLayout.addWidget(checkbox);
      }

      const keyInput = new QLineEdit();
      keyInput.setText(item.key);
      keyInput.addEventListener("textChanged", (text) => (item.key = text));
      rowLayout.addWidget(keyInput, 1);

      if (isForm && item.type === "file") {
        const fileButton = new QPushButton();
        fileButton.setText(
          item.file ? path.basename(item.file) : "Select File"
        );
        fileButton.addEventListener("clicked", () => {
          const fileDialog = new QFileDialog();
          fileDialog.setFileMode(1);
          if (fileDialog.exec()) {
            const [selectedFile] = fileDialog.selectedFiles();
            if (selectedFile) {
              item.file = selectedFile;
              fileButton.setText(path.basename(item.file));
            }
          }
        });
        rowLayout.addWidget(fileButton, 1);
      } else {
        const valueInput = new QLineEdit();
        valueInput.setText(item.value);
        valueInput.addEventListener(
          "textChanged",
          (text) => (item.value = text)
        );
        rowLayout.addWidget(valueInput, 1);
      }

      if (isForm) {
        const typeDropdown = new QComboBox();
        typeDropdown.addItems(["text", "file"]);
        typeDropdown.setCurrentText(item.type);
        typeDropdown.addEventListener("currentTextChanged", (text) => {
          item.type = text;
          rerenderer();
        });
        rowLayout.addWidget(typeDropdown);
      }

      // FIX START
      const removeButton = new QPushButton();
      removeButton.setText("✖");
      // FIX END
      removeButton.setObjectName("removeButton");
      removeButton.addEventListener("clicked", removeItem);
      rowLayout.addWidget(removeButton);

      layout.addWidget(rowWidget);
    });

    layout.addStretch(1);
    const oldWidget = scrollArea.takeWidget();
    if (oldWidget) {
      oldWidget.close();
    }
    scrollArea.setWidget(contentWidget);
  }

  /**
   * Rerenders the dynamic tabs.
   */
  renderQueryTab() {
    this._renderKeyValueSection(
      this.state.queryParams,
      this.queryScrollArea,
      this.renderQueryTab.bind(this)
    );
  }
  renderHeadersTab() {
    this._renderKeyValueSection(
      this.state.headers,
      this.headersScrollArea,
      this.renderHeadersTab.bind(this)
    );
  }
  renderCookiesTab() {
    this._renderKeyValueSection(
      this.state.requestCookies,
      this.cookiesScrollArea,
      this.renderCookiesTab.bind(this)
    );
  }
  renderFormTab() {
    this._renderKeyValueSection(
      this.state.body.formData,
      this.formScrollArea,
      this.renderFormTab.bind(this),
      { isForm: true, hasCheckbox: false }
    );
  }
  renderFormEncodeTab() {
    this._renderKeyValueSection(
      this.state.body.formEncodedData,
      this.formEncodeScrollArea,
      this.renderFormEncodeTab.bind(this),
      { hasCheckbox: false }
    );
  }

  // --- Session Management ---

  _loadSessions() {
    try {
      const allKeys = this.sessionStorage.getAllKeys();
      if (allKeys.length === 0) {
        this._initializeNewRequest();
        return;
      }

      const loadedSessions = allKeys.reduce((acc, key) => {
        const value = this.sessionStorage.getItem(key);
        if (value) acc[key] = value;
        return acc;
      }, {});

      this.sessions = loadedSessions;
      const lastActiveKey = this.sessionStorage.getItem(
        ASYNC_STORAGE_KEYS.LAST_ACTIVE
      );
      const keyToLoad =
        lastActiveKey && this.sessions[lastActiveKey]
          ? lastActiveKey
          : allKeys[0];
      this._switchActiveSession(keyToLoad);
      this._renderSessionPicker();
    } catch (e) {
      console.log(e);
    }
  }
  _first_time_load() {
    let allKeys =
      this.sessionStorage.getItem(ASYNC_STORAGE_KEYS.ALL_SESSIONS) || [];

    let orientation = this.sessionStorage.getItem(
      ASYNC_STORAGE_KEYS.ORIENTATION_STATE
    );
    if (allKeys.length == 0 && !orientation) {
      this._initializeNewRequest();
    }
  }

  _initializeNewRequest(importedState = null, reset = false) {
    try {
      const newKey = `${ASYNC_STORAGE_KEYS.SESSION_PREFIX}${Date.now()}`;
      const timestamp = Date.now();
      const newState =
        reset == true
          ? this._getInitialState()
          : importedState || this._getInitialState();
      // if (this?.state?.url && newState.url) {
      //   newState.url = this.state.url;
      // }
      const newSession = {
        state: newState,
        //  name: generateSessionName(newState, timestamp),
        timestamp: timestamp,
        save_key: newKey,
      };
      let allKeys =
        this.sessionStorage.getItem(ASYNC_STORAGE_KEYS.ALL_SESSIONS) || [];
      allKeys.unshift(newKey);

      this.sessionStorage.setItem(newKey, newSession);
      this.sessionStorage.setItem(ASYNC_STORAGE_KEYS.ALL_SESSIONS, allKeys);
      this.sessionStorage.setItem(ASYNC_STORAGE_KEYS.LAST_ACTIVE, newKey);

      if (!this.sessions) {
        // console.log("NO SESSIONS");
        return;
      }
      // console.log(this.sessions);
      this.sessions[newKey] = newSession;
      this.activeSessionKey = newKey;

      this.state = newState;

      this._renderSessionPicker();
      this._updateUIFromState();
      if (allKeys.length == 1) {
        // console.log("SET CURRENT INDEX");
        this._loadSessions();
        // this._renderSessionPicker();
      }
    } catch (e) {
      console.log(e);
    }
  }

  _update_picker_index() {
    // console.log("Update Index");
  }
  _renderSessionPicker() {
    try {
      this.isUpdatingDropdown = true;
      this.sessionDropdown.clear();
      if (!this.sessions) {
        return;
      }

      const sortedSessions = Object.keys(this.sessions)
        .filter((key) => key.startsWith(ASYNC_STORAGE_KEYS.SESSION_PREFIX))
        .map((key) => ({ session: this.sessions[key], key }))
        .sort((a, b) => b.session.timestamp - a.session.timestamp);

      sortedSessions.forEach(({ session, key }) => {
        if (
          !key ||
          key == "undefined" ||
          key == "_apicommander_all_keys" ||
          key == "_apicommander_last_active_key" ||
          !session.timestamp
          //  ||!session.name
        ) {
          return;
        }

        // FIX: Use the addItem(icon, text, userData) overload to prevent ambiguity.
        this.sessionDropdown.addItem(
          new QIcon(),
          generateSessionName(session.state, session.timestamp),
          new QVariant(key)
        );
      });

      const activeIndex = sortedSessions.findIndex(
        (s) => s.session.save_key === this.activeSessionKey
      );

      if (activeIndex !== -1) {
        this.sessionDropdown.setCurrentIndex(activeIndex);
      } else {
        this.sessionDropdown.setCurrentIndex(0);
      }

      this.isUpdatingDropdown = false;
    } catch (e) {
      console.log(e);
    }
  }

  _switchActiveSession(key) {
    if (key && this.sessions[key]) {
      this.activeSessionKey = key;
      this.state = this.sessions[key].state;
      this.sessionStorage.setItem(ASYNC_STORAGE_KEYS.LAST_ACTIVE, key);
      this._updateUIFromState();

      try {
      } catch (error) {
        console.log(error);
      }
    }
  }

  _deleteSession() {
    if (!this.activeSessionKey || !this.sessions[this.activeSessionKey]) return;

    const keyToDelete = this.activeSessionKey;
    let allKeys =
      this.sessionStorage.getItem(ASYNC_STORAGE_KEYS.ALL_SESSIONS) || [];
    const newAllKeys = allKeys.filter((k) => k !== keyToDelete);
    this.sessionStorage.removeItem(keyToDelete);

    this.sessionStorage.setItem(ASYNC_STORAGE_KEYS.ALL_SESSIONS, newAllKeys);
    delete this.sessions[keyToDelete];

    if (newAllKeys.length === 0) {
      this._initializeNewRequest(null, true);

      this.sessionDropdown.setCurrentIndex(0);

      this._switchActiveSession(newAllKeys[0]);
    } else {
      this._switchActiveSession(newAllKeys[0]);
    }
    this._renderSessionPicker();
  }

  _exportSession() {
    if (!this.activeSessionKey || !this.sessions[this.activeSessionKey]) return;
    const fileDialog = new QFileDialog();
    fileDialog.setFileMode(0); // AnyFile
    fileDialog.setAcceptMode(1); // Save
    fileDialog.setNameFilter("JSON files (*.json)");
    if (fileDialog.exec()) {
      const filePath = fileDialog.selectedFiles()[0];
      if (filePath) {
        const sessionJson = JSON.stringify(
          { state: this.sessions[this.activeSessionKey].state },
          null,
          2
        );
        fs.writeFileSync(filePath, sessionJson);
        this.toast_message("Export Successfull!!");
      }
    }
  }

  _importSession() {
    const fileDialog = new QFileDialog();
    fileDialog.setFileMode(1); // ExistingFile
    fileDialog.setNameFilter("JSON files (*.json)");
    if (fileDialog.exec()) {
      const filePath = fileDialog.selectedFiles()[0];
      if (filePath) {
        try {
          const fileContent = fs.readFileSync(filePath, "utf-8");
          const parsed = JSON.parse(fileContent);
          if (parsed.state && parsed.state.httpMethod) {
            this._initializeNewRequest(parsed.state);
            this._toast("Import Successfull!!");
          } else {
            this._toast("Import Failed!!", true);

            // Show error message
          }
        } catch (e) {
          // Show error message
        }
      }
    }
  }
  _loadAppChekedState() {
    try {
      let isDarkMode = this.sessionStorage.getItem(
        ASYNC_STORAGE_KEYS.DARKMODE_STATE
      );

      if (isDarkMode == true || isDarkMode == false) {
        this.globalColorTheme.setChecked(isDarkMode);
      }
    } catch (error) {
      console.error(error);
    }

    try {
      let orientationState = this.sessionStorage.getItem(
        ASYNC_STORAGE_KEYS.ORIENTATION_STATE
      );

      if (orientationState == 1 || orientationState == 2) {
        this.app_state.orientation = orientationState;
        this.splitter.setOrientation(orientationState);

        this.globalOrientationControl.setChecked(orientationState === 2);
      } else {
        console.error("Invalid Orientation", orientationState);
      }
    } catch (error) {
      console.error(error);
    }
  }
  _updateUIFromState() {
    if (!this.state) return;
    this.methodDropdown.setCurrentText(this.state.httpMethod);
    this.urlInput.setText(this.state.url);
    this.rawHeadersCheckbox.setChecked(this.state.isRawHeaders);
    this.jsonContent.setPlainText(this.state.body.jsonContent);
    this.textContent.setPlainText(this.state.body.textContent);
    this.xmlContent.setPlainText(this.state.body.xmlContent);
    // this.graphqlQuery.setPlainText(this.state.body.graphqlQuery);
    // this.graphqlVariables.setPlainText(this.state.body.graphqlVariables);
    this.selectedFileLabel.setText(
      this.state.body.binaryFilePath || "No file selected"
    );
    // Basic Auth fields
    this.basicUsername.setText(this.state.basicAuthUsername);
    this.basicPassword.setText(this.state.basicPassword);

    // Bearer Auth token field
    this.bearerToken.setText(this.state.bearerToken);

    // // OAuth 2.0 fields
    // this.oauth2TokenUrl.setText(this.state.oauth2TokenUrl);
    // this.oauth2ClientId.setText(this.state.oauth2ClientId);
    // this.oauth2ClientSecret.setText(this.state.oauth2ClientSecret);
    // this.oauth2Scope.setText(this.state.oauth2Scope);
    // this.oauth2AccessToken.setText(this.state.oauth2AccessToken);

    // // AWS v4 fields
    // this.awsAccessKeyId.setText(this.state.awsAccessKeyId);
    // this.awsSecretAccessKey.setText(this.state.awsSecretAccessKey);
    // this.awsRegion.setText(this.state.awsRegion);
    // this.awsService.setText(this.state.awsService);
    this.renderQueryTab();
    this.renderHeadersTab();
    this.renderCookiesTab();
    this.renderFormTab();
    this.renderFormEncodeTab();
    this._syncAndToggleRawHeaders(this.state.isRawHeaders);
    this._updateStyleSheet();
  }
  // --- Functionality Methods ---

  _sendRequest() {
    if (!this.state.url) {
      return this._toast("A valid url is needed!!", true, 5000);
    }
    if (!isValidUrl(this.state.url)) {
      return this._toast("A valid url is needed!!", true, 5000);
    }
    this.responseContent.setPlainText("");
    this.responseHeadersContent.setPlainText("");
    this.responseCookiesContent.setPlainText("");
    this.statusLabel.setText("Status: -");
    this.sizeLabel.setText("Size: -");
    this.timeLabel.setText("Time: -");
    this.new_object_name("emptyLabel");

    this.responseContent.hide();
    this.copyResponseButton.hide();
    this.progressBar.show();
    this.sendButton.setText("Sending...");
    this.sendButton.setEnabled(false);

    const startTime = Date.now();
    const method = this.state.httpMethod;
    const url = this.state.url;

    // Construct headers
    const headers = new Headers();
    this.state.headers.forEach((header) => {
      if (
        header.enabled &&
        header.key &&
        typeof header.key === "string" &&
        header.key.trim()
      ) {
        try {
          headers.append(header.key.trim(), header.value);
        } catch (error) {
          console.error(`Error setting header: ${header.key}`, error);
        }
      }
    });

    // Add auth headers
    switch (this.state.auth.type) {
      case "basic":
        if (this.state.basicAuthUsername && this.state.basicPassword) {
          const basicAuth = Buffer.from(
            `${this.state.basicAuthUsername}:${this.state.basicPassword}`
          ).toString("base64");
          headers.append("Authorization", `Basic ${basicAuth}`);
        }
        break;
      case "bearer":
        if (this.state.bearerToken) {
          headers.append("Authorization", `Bearer ${this.state.bearerToken}`);
        }
        break;
      case "oauth2":
        if (this.state.oauth2AccessToken) {
          headers.append(
            "Authorization",
            `Bearer ${this.state.oauth2AccessToken}`
          );
        }
        break;
      case "awsv4":
        // Implement AWS v4 signature logic here
        break;
      default:
        break;
    }

    // Construct query parameters
    const queryParams = {};
    this.state.queryParams.forEach((param) => {
      if (param.enabled) {
        queryParams[param.key] = param.value;
      }
    });

    // Construct body
    let body;
    if (method !== "GET" && method !== "HEAD") {
      switch (this.state.body.type) {
        case "json":
          headers.append("Content-Type", "application/json");
          body = this.state.body.jsonContent;
          break;
        case "text":
          headers.append("Content-Type", "text/plain");
          body = this.state.body.textContent;
          break;
        case "xml":
          headers.append("Content-Type", "application/xml");
          body = this.state.body.xmlContent;
          break;
        // case "form":
        //   body = new FormData();
        //   this.state.body.formData.forEach((field) => {
        //     if (field.enabled) {
        //       if (field.type === "file") {
        //         body.append(field.key, fs.createReadStream(field.file));
        //       } else {
        //         body.append(field.key, field.value);
        //       }
        //     }
        //   });
        //   break;
        case "form":
          const form = new FormData();
          this.state.body.formData.forEach((field) => {
            if (field.enabled) {
              if (field.type === "file") {
                form.append(field.key, fs.createReadStream(field.file));
              } else {
                form.append(field.key, field.value);
              }
            }
          });
          headers = { ...headers, ...form.getHeaders() };
          body = form;
          break;
        case "form-encoded":
          headers.append("Content-Type", "application/x-www-form-urlencoded");
          body = new URLSearchParams();
          this.state.body.formEncodedData.forEach((field) => {
            if (field.enabled) {
              body.append(field.key, field.value);
            }
          });
          body = body.toString();
          break;
        case "graphql":
          headers.append("Content-Type", "application/json");
          body = JSON.stringify({
            query: this.state.body.graphqlQuery,
            variables: JSON.parse(this.state.body.graphqlVariables || "{}"),
          });
          break;
        // case "binary":
        //   headers.append("Content-Type", "application/octet-stream");
        //   body = fs.createReadStream(this.state.body.binaryFilePath);
        //   break;
        case "binary":
          body = fs.readFileSync(this.state.body.binaryFilePath);
          headers.append("Content-Type", "application/octet-stream");
          break;
        default:
          break;
      }
    }

    // Add query parameters to URL
    const queryString = Object.keys(queryParams)
      .map((key) => `${key}=${queryParams[key]}`)
      .join("&");
    const finalUrl = `${url}${queryString ? `?${queryString}` : ""}`;

    const controller = new AbortController();
    const signal = controller.signal;

    const timeout = setTimeout(() => {
      controller.abort();
      this._toast("Request Timeout!", true);
    }, 15000);

    const options = {
      method,
      headers,
      signal,
    };

    if (method !== "GET" && method !== "HEAD") {
      options.body = body;
    }

    const response_status_text = (statusCode) => {
      if (statusCode >= 200 && statusCode < 300) {
        this.new_object_name("responseOk");
      } else if (statusCode >= 400 && statusCode < 500) {
        this.new_object_name("badRequest");
      } else if (statusCode >= 500 && statusCode < 600) {
        this.new_object_name("requestFailed");
      } else {
        this.new_object_name("unknown");
      }

      switch (statusCode) {
        case 100:
          return "Continue";
        case 101:
          return "Switching Protocols";
        case 200:
          return "OK";
        case 201:
          return "Created";
        case 202:
          return "Accepted";
        case 204:
          return "No Content";
        case 301:
          return "Moved Permanently";
        case 302:
          return "Found";
        case 304:
          return "Not Modified";
        case 400:
          return "Bad Request";
        case 401:
          return "Unauthorized";
        case 403:
          return "Forbidden";
        case 404:
          return "Not Found";
        case 405:
          return "Method Not Allowed";
        case 408:
          return "Request Timeout";
        case 500:
          return "Internal Server Error";
        case 501:
          return "Not Implemented";
        case 502:
          return "Bad Gateway";
        case 503:
          return "Service Unavailable";
        case 504:
          return "Gateway Timeout";
        default:
          return "Unknown Status";
      }
    };

    fetch(finalUrl, options)
      .then((response) => {
        clearTimeout(timeout);
        const endTime = Date.now();
        const responseTime = endTime - startTime;
        this.timeLabel.setText(`Time: ${responseTime}ms`);
        this.statusLabel.setText(
          `Status: ${response.status} ${response_status_text(response.status)}`
        );
        const headers = response.headers;
        const cookies = response.headers.get("Set-Cookie");
        return Promise.all([response.text(), headers, cookies]);
      })
      .then(([responseText, headers, cookies]) => {
        const responseSize = responseText.length;
        let headersDisplayText = ``;
        for (let [key, value] of headers) {
          headersDisplayText += `${key}: ${value}\n`;
        }
        this.responseHeadersContent.setPlainText(headersDisplayText);
        if (cookies) {
          this.responseCookiesContent.setPlainText(cookies);
        } else {
          this.responseCookiesContent.setPlainText("No cookies");
        }
        // this.responseContent.setPlainText(responseText);
        try {
          try {
            const jsonResponse = JSON.parse(responseText);
            const prettyJson = JSON.stringify(jsonResponse, null, 2);
            this.responseContent.setPlainText(prettyJson);
          } catch (e) {
            this.responseContent.setPlainText(responseText);
          }
        } catch (error) {
          console.error(error);
        }
        this.sizeLabel.setText(`Size: ${formatBytes(responseSize)}`);
        this.responseContent.show();
        this.copyResponseButton.show();
        this.progressBar.hide();
        this.sendButton.setText("Send");
        this.sendButton.setEnabled(true);
        this._toast("Request successful!");
      })
      .catch((error) => {
        clearTimeout(timeout);
        if (error.name === "AbortError") {
          this._toast("Request Aborted!", true, 3000);
        } else {
          console.error(error);
          this._toast(error.message, true, 5000);
        }
        this.progressBar.hide();
        this.sendButton.setText("Send");
        this.sendButton.setEnabled(true);
      });
  }

  /**
   * Handles the logic for toggling between raw and key-value headers.
   */
  _syncAndToggleRawHeaders(isRaw) {
    this.state.isRawHeaders = isRaw;
    if (isRaw) {
      const rawText = this.state.headers
        .filter((h) => h.key && h.enabled)
        .map((h) => `${h.key}: ${h.value}`)
        .join("\n");
      this.state.rawHeadersText = rawText;
      this.rawHeadersText.setPlainText(rawText);
      this.headersKeyValueTab.hide();
      this.rawHeadersText.show();
    } else {
      const newHeaders = this.state.rawHeadersText
        .split("\n")
        .filter((line) => line.includes(":"))
        .map((line, index) => {
          const parts = line.split(":");
          return {
            id: Date.now() + index,
            key: parts[0].trim(),
            value: parts.slice(1).join(":").trim(),
            enabled: true,
          };
        });
      if (newHeaders.length === 0 || newHeaders[newHeaders.length - 1].key) {
        newHeaders.push({
          ...this.emptyKeyValue,
          id: Date.now() + newHeaders.length,
        });
      }
      this.state.headers = newHeaders;
      this.renderHeadersTab();
      this.rawHeadersText.hide();
      this.headersKeyValueTab.show();
    }
  }

  /**
   * Applies the stylesheet to the main window.
   */
  _updateStyleSheet() {
    this.app_state.is_darkmode = this.globalColorTheme.isChecked();
    try {
      this.sessionStorage.setItem(
        ASYNC_STORAGE_KEYS.DARKMODE_STATE,
        this.globalColorTheme.isChecked()
      );
    } catch (error) {
      console.error(error);
    }

    this.win.setStyleSheet(globalStyleSheet(this.globalColorTheme.isChecked()));
  }

  /**
   * Performs the initial rendering of dynamic UI parts.
   */
  _performInitialRenders() {
    this.renderQueryTab();
    this.renderHeadersTab();
    this.renderCookiesTab();
    this.renderFormTab();
    this.renderFormEncodeTab();
    this._syncAndToggleRawHeaders(this.state.isRawHeaders);
    this._loadAppChekedState();

    this._updateStyleSheet();
  }
  _toast(toast_message, error = false, timer = 2000) {
    try {
      const toast = new Toast(
        this.win,
        toast_message ? toast_message : this.toast_message,
        !this.globalColorTheme.isChecked(),
        error,
        timer
      );
      toast.showToast();
    } catch (error) {
      console.log(error);
    }
  }

  /**
   * Shows the main window and starts the application event loop.
   */
  start() {
    this.win.show();
    global.win = this.win; // For NodeGui's hot-reloading
    // this.app.exec();
  }
}

// --- Application Entry Point ---
const appInstance = new ApiCommanderApp();
appInstance.start();
