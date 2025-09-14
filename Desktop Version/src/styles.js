const globalStyleSheet = (darkmode) => {
  const allStyles = `
#newRequestBtn {
    background-color: #28a745;
     min-width: 80px;
}

#importRequestBtn {
    background-color: #fd7e14;
     min-width: 80px;
}

#exportRequestBtn {
    background-color: #007bff;
     min-width: 80px;
}

#deleteRequestBtn {
    min-width: 80px;
}
#sendBtn {
     min-width: 80px;

}
#deleteRequestBtn,  #removeButton {
    background-color: #dc3545;
}
#addButton {
    background-color: lightgreen;
}

#requestFailed {
    color: #dc3545;
}

#badRequest {
    color:  #fd7e14;
}

#responseOk {
    color: #28a745;
}
#responseWaiting {
    color: #28a745;
}

#defaultLabel{
 color: ${darkmode ? "#ffffffff" : "#000000ff"}
  }


#headerLabel {
    font-size: 25px;
    font-weight: bold;
    font-family: "Segoe UI", "Helvetica Neue", Arial, sans-serif;
}
#headerCheckBox {
    font-size: 20px;
    margin-left: 10px;
}

#kvContainer {
      flex-direction: row;
      justify-content: flex-start;
      margin-left: 20px;
}
`;
  const tabStyles = `
    QTabBar::tab {
      background-color: ${darkmode ? "#3c3c3c" : "#e0e0e0"};
      color: ${darkmode ? "#f0f0f0" : "#333333"};
      border: 1px solid ${darkmode ? "#444444" : "#cccccc"};
      border-bottom: none;
      border-top-left-radius: 4px;
      border-top-right-radius: 4px;

    }

    QTabBar::tab:hover {
      background-color: ${darkmode ? "#4a4a4a" : "#d0d0d0"};
      border-bottom: 2px solid #007acc;
    }

    QTabBar::tab:selected {
      background-color: ${darkmode ? "#2b2b2b" : "#f0f0f0"};
      border: 1px solid ${darkmode ? "#444444" : "#cccccc"};
      border-bottom: 2px solid #007acc;
      font-weight: bold;
      color: ${darkmode ? "#ffffff" : "#333333"};
    }
  `;

  return darkmode
    ? `/* General Dark Mode Styling */
QMainWindow, QWidget {
    background-color: #2b2b2b; /* Dark charcoal grey */
    color: #f0f0f0; /* Light grey for text */
    font-family: "Segoe UI", "Helvetica Neue", Arial, sans-serif;
    font-size: 10pt;
}

/* Labels */
QLabel {
    color: #f0f0f0;
    background-color: transparent;
}

/* Line Edits (Single Line Input) */
QLineEdit {
    background-color: #3c3c3c; /* Slightly lighter dark grey */
    border: 1px solid #555555; /* Darker border */
    border-radius: 4px;
    padding: 5px;
    color: #f0f0f0;
    selection-background-color: #007acc; /* Accent blue for selection */
    selection-color: #ffffff;
}
QLineEdit:focus {
    border: 1px solid #007acc; /* Accent blue on focus */
}
QLineEdit::placeholder {
    color: #aaaaaa; /* Lighter grey for placeholder */
}

/* Push Buttons */
QPushButton {
    background-color: #007acc; /* Accent blue */
    color: #ffffff;
    border: none;
    border-radius: 4px;
    padding: 8px 15px;
}
QPushButton:hover {
    background-color: #008fcc; /* Slightly lighter blue on hover */
}
QPushButton:pressed {
    background-color: #006bb3; /* Darker blue when pressed */
    padding-top: 9px; /* Simulates a slight 'push' effect */
    padding-bottom: 7px;
}
QPushButton:disabled {
    background-color: #4a4a4a; /* Darker grey when disabled */
    color: #aaaaaa;
}

/* Tab Widget */
QTabWidget::pane { /* The tab content area */
    border: 1px solid #444444;
    background-color: #2b2b2b;
}

QTabWidget::tab-bar {
    left: 5px; /* Move entire bar to the right */
}

QTabBar::tab {
    background-color: #3c3c3c; /* Dark grey for inactive tabs */
    color: #f0f0f0;
    border: 1px solid #444444;
    border-bottom: none; /* No border at the bottom to blend with pane */
    border-top-left-radius: 4px;
    border-top-right-radius: 4px;
    padding: 8px 15px;
    margin-right: 2px; /* Space between tabs */
}

QTabBar::tab:selected {
    background-color: #2b2b2b; /* Match pane background for selected tab */
    border: 1px solid #444444;
    border-bottom-color: #2b2b2b; /* Hide the bottom border for selected tab */
    color: #ffffff;
}

QTabBar::tab:hover {
    background-color: #4a4a4a; /* Slightly lighter on hover */
}

/* Combo Box (Dropdown) */
QComboBox {
    background-color: #3c3c3c;
    border: 1px solid #555555;
    border-radius: 4px;
    padding: 5px;
    color: #f0f0f0;
    selection-background-color: #007acc;
    selection-color: #ffffff;
}
QComboBox:focus {
    border: 1px solid #007acc;
}
QComboBox::drop-down {
    subcontrol-origin: padding;
    subcontrol-position: top right;
    width: 20px;
    border-left: 1px solid #555555;
    border-top-right-radius: 3px;
    border-bottom-right-radius: 3px;
}
QComboBox::down-arrow {
    image: url(::/qt-project.org/images/down_arrow.png); /* You might need to embed this or provide a path */
    /* Alternatively, for a simple triangle: */
    /* width: 0; height: 0;
    border-left: 4px solid transparent;
    border-right: 4px solid transparent;
    border-top: 6px solid #f0f0f0; */
}
QComboBox QAbstractItemView {
    background-color: #3c3c3c;
    selection-background-color: #007acc;
    selection-color: #ffffff;
    color: #f0f0f0;
}

/* Check Box */
QCheckBox {
    spacing: 5px;
    color: #f0f0f0;
}
QCheckBox::indicator {
    width: 16px;
    height: 16px;
    border: 1px solid #555555;
    background-color: #3c3c3c;
    border-radius: 3px;
}
QCheckBox::indicator:checked {
    background-color: #007acc;
    border: 1px solid #007acc;
    image: url(::/qt-project.org/images/checkbox_checked.png); /* You might need to embed this or provide a path */
    /* For a simple checkmark using font icon or custom painting: */
    /* This is complex to do purely with QSS, typically an icon is used. */
}
QCheckBox::indicator:unchecked:hover {
    border: 1px solid #007acc;
}
QCheckBox::indicator:disabled {
    background-color: #4a4a4a;
    border: 1px solid #777777;
}

/* Plain Text Edit (Multi-line Input) */
QPlainTextEdit {
    background-color: #3c3c3c;
    border: 1px solid #555555;
    border-radius: 4px;
    padding: 5px;
    color: #f0f0f0;
    selection-background-color: #007acc;
    selection-color: #ffffff;
}
QPlainTextEdit:focus {
    border: 1px solid #007acc;
}

/* QFileDialog (System Dialog - limited QSS control) */
/* QFileDialog itself is often a native dialog, but its internal QWidgets might respond to styles. */
/* Direct styling of the QFileDialog window is often not possible or consistent across OS. */
/* Its internal components like QLineEdit, QPushButton, etc., will inherit general styles. */

/* QMessageBox (System Dialog - limited QSS control) */
/* Similar to QFileDialog, QMessageBox is often native. Its internal buttons and labels will inherit. */
QMessageBox {
    background-color: #2b2b2b;
    color: #f0f0f0;
}
QMessageBox QPushButton {
    /* Style for buttons within QMessageBox - overrides the general QPushButton if needed */
    background-color: #007acc;
    color: #ffffff;
    border: none;
    border-radius: 4px;
    padding: 5px 10px;
}
QMessageBox QPushButton:hover {
    background-color: #008fcc;
}
QMessageBox QPushButton:pressed {
    background-color: #006bb3;
}
QMessageBox QLabel {
    color: #f0f0f0;
}

/* Progress Bar */
QProgressBar {
    border: 1px solid #555555;
    border-radius: 5px;
    background-color: #3c3c3c;
    text-align: center; /* Center the text inside the bar */
    color: #f0f0f0;
}
QProgressBar::chunk {
    background-color: #00aaff; /* Lighter accent blue for the progress */
    border-radius: 4px;
}

/* Splitter */
QSplitter::handle {
    background-color: #4a4a4a;
    width: 3px; /* For vertical splitter */
    height: 3px; /* For horizontal splitter */
}
QSplitter::handle:hover {
    background-color: #007acc; /* Accent color on hover */
}
QSplitter::handle:pressed {
    background-color: #006bb3;
}

/* Radio Button */
QRadioButton {
    spacing: 5px;
    color: #f0f0f0;
}
QRadioButton::indicator {
    width: 13px;
    height: 13px;
    border: 1px solid #555555;
    background-color: #3c3c3c;
    border-radius: 7px; /* Make it circular */
}
QRadioButton::indicator:checked {
    background-color: #007acc;
    border: 1px solid #007acc;
    image: url(::/qt-project.org/images/radio_button_checked.png); /* You might need to embed this or provide a path */
    /* Pure QSS dot is hard, usually an image or custom painting. */
    /* You can try a larger border-radius on a smaller inner element if you want to fake a dot: */
    /* padding: 3px; /* Adjust to size the inner dot */
}
QRadioButton::indicator:unchecked:hover {
    border: 1px solid #007acc;
}
QRadioButton::indicator:disabled {
    background-color: #4a4a4a;
    border: 1px solid #777777;
}

/* Scroll Area */
QScrollArea {
    background-color: #2b2b2b;
    border: 1px solid #444444;
}

/* Scroll Bars */
QScrollBar:vertical {
    border: 1px solid #3c3c3c;
    background: #3c3c3c;
    width: 10px;
    margin: 15px 0 15px 0;
    border-radius: 0px;
}
QScrollBar::handle:vertical {
    background: #555555;
    min-height: 20px;
    border-radius: 4px;
}
QScrollBar::add-line:vertical {
    border: 1px solid #3c3c3c;
    background: #3c3c3c;
    height: 15px;
    subcontrol-origin: margin;
    subcontrol-position: bottom;
}
QScrollBar::sub-line:vertical {
    border: 1px solid #3c3c3c;
    background: #3c3c3c;
    height: 15px;
    subcontrol-origin: margin;
    subcontrol-position: top;
}
QScrollBar::up-arrow:vertical, QScrollBar::down-arrow:vertical {
    border: 1px solid #3c3c3c; /* Invisible border to occupy space */
    width: 7px;
    height: 7px;
    background-color: #f0f0f0; /* Color of the arrows, if they are rendered as solid */
    /* To use images: */
    /* image: url(::/qt-project.org/images/up_arrow.png); */
}
QScrollBar::add-page:vertical, QScrollBar::sub-page:vertical {
    background: none;
}
QScrollBar:horizontal {
    border: 1px solid #3c3c3c;
    background: #3c3c3c;
    height: 10px;
    margin: 0 15px 0 15px;
    border-radius: 0px;
}
QScrollBar::handle:horizontal {
    background: #555555;
    min-width: 20px;
    border-radius: 4px;
}
QScrollBar::add-line:horizontal {
    border: 1px solid #3c3c3c;
    background: #3c3c3c;
    width: 15px;
    subcontrol-origin: margin;
    subcontrol-position: right;
}
QScrollBar::sub-line:horizontal {
    border: 1px solid #3c3c3c;
    background: #3c3c3c;
    width: 15px;
    subcontrol-origin: margin;
    subcontrol-position: left;
}
QScrollBar::left-arrow:horizontal, QScrollBar::right-arrow:horizontal {
    border: 1px solid #3c3c3c; /* Invisible border to occupy space */
    width: 7px;
    height: 7px;
    background-color: #f0f0f0;
    /* To use images: */
    /* image: url(::/qt-project.org/images/left_arrow.png); */
}
QScrollBar::add-page:horizontal, QScrollBar::sub-page:horizontal {
    background: none;
}
`
        .concat(allStyles)
        .concat(tabStyles)
    : `/* General Light Mode Styling */
QMainWindow, QWidget {
    background-color: #f0f0f0; /* Light grey */
    color: #333333; /* Dark grey for text */
    font-family: "Segoe UI", "Helvetica Neue", Arial, sans-serif;
    font-size: 10pt;
}

/* Labels */
QLabel {
    color: #333333;
    background-color: transparent;
}

/* Line Edits (Single Line Input) */
QLineEdit {
    background-color: #ffffff; /* White */
    border: 1px solid #cccccc; /* Light grey border */
    border-radius: 4px;
    padding: 5px;
    color: #333333;
    selection-background-color: #007acc; /* Accent blue for selection */
    selection-color: #ffffff;
}
QLineEdit:focus {
    border: 1px solid #007acc; /* Accent blue on focus */
}
QLineEdit::placeholder {
    color: #888888; /* Medium grey for placeholder */
}

/* Push Buttons */
QPushButton {
    background-color: #007acc; /* Accent blue */
    color: #ffffff;
    border: none;
    border-radius: 4px;
    padding: 8px 15px;
    min-width: 80px;
}
QPushButton:hover {
    background-color: #008fcc; /* Slightly lighter blue on hover */
}
QPushButton:pressed {
    background-color: #006bb3; /* Darker blue when pressed */
    padding-top: 9px; /* Simulates a slight 'push' effect */
    padding-bottom: 7px;
}
QPushButton:disabled {
    background-color: #cccccc; /* Light grey when disabled */
    color: #888888;
}

/* Tab Widget */
QTabWidget::pane { /* The tab content area */
    border: 1px solid #cccccc;
    background-color: #f0f0f0;
}

QTabWidget::tab-bar {
    left: 5px; /* Move entire bar to the right */
}

QTabBar::tab {
    background-color: #e0e0e0; /* Slightly darker light grey for inactive tabs */
    color: #333333;
    border: 1px solid #cccccc;
    border-bottom: none; /* No border at the bottom to blend with pane */
    border-top-left-radius: 4px;
    border-top-right-radius: 4px;
    padding: 8px 15px;
    margin-right: 2px; /* Space between tabs */
}

QTabBar::tab:selected {
    background-color: #f0f0f0; /* Match pane background for selected tab */
    border: 1px solid #cccccc;
    border-bottom-color: #f0f0f0; /* Hide the bottom border for selected tab */
    color: #333333;
}

QTabBar::tab:hover {
    background-color: #d0d0d0; /* Slightly darker on hover */
}

/* Combo Box (Dropdown) */
QComboBox {
    background-color: #ffffff;
    border: 1px solid #cccccc;
    border-radius: 4px;
    padding: 5px;
    color: #333333;
    selection-background-color: #007acc;
    selection-color: #ffffff;
}
QComboBox:focus {
    border: 1px solid #007acc;
}
QComboBox::drop-down {
    subcontrol-origin: padding;
    subcontrol-position: top right;
    width: 20px;
    border-left: 1px solid #cccccc;
    border-top-right-radius: 3px;
    border-bottom-right-radius: 3px;
}
QComboBox::down-arrow {
    image: url(::/qt-project.org/images/down_arrow_dark.png); /* Use a dark arrow image for light background */
    /* Alternatively, for a simple triangle: */
    /* width: 0; height: 0;
    border-left: 4px solid transparent;
    border-right: 4px solid transparent;
    border-top: 6px solid #333333; */
}
QComboBox QAbstractItemView {
    background-color: #ffffff; /* Corrected to white */
    selection-background-color: #007acc; /* Added missing selection background color */
    selection-color: #ffffff;
    color: #333333;
}

/* Check Box */
QCheckBox {
    spacing: 5px;
    color: #333333;
}
QCheckBox::indicator {
    width: 16px;
    height: 16px;
    border: 1px solid #888888; /* Medium grey border */
    background-color: #ffffff;
    border-radius: 3px;
}
QCheckBox::indicator:checked {
    background-color: #007acc;
    border: 1px solid #007acc;
    image: url(::/qt-project.org/images/checkbox_checked_light.png); /* Use a light checkmark for dark background */
}
QCheckBox::indicator:unchecked:hover {
    border: 1px solid #007acc;
}
QCheckBox::indicator:disabled {
    background-color: #e0e0e0;
    border: 1px solid #bbbbbb;
}

/* Plain Text Edit (Multi-line Input) */
QPlainTextEdit {
    background-color: #ffffff;
    border: 1px solid #cccccc;
    border-radius: 4px;
    padding: 5px;
    color: #333333;
    selection-background-color: #007acc;
    selection-color: #ffffff;
}
QPlainTextEdit:focus {
    border: 1px solid #007acc;
}

/* QMessageBox (System Dialog - limited QSS control) */
QMessageBox {
    background-color: #f0f0f0;
    color: #333333;
}
QMessageBox QPushButton {
    background-color: #007acc;
    color: #ffffff;
    border: none;
    border-radius: 4px;
    padding: 5px 10px;
}
QMessageBox QPushButton:hover {
    background-color: #008fcc;
}
QMessageBox QPushButton:pressed {
    background-color: #006bb3;
}
QMessageBox QLabel {
    color: #333333;
}

/* Progress Bar */
QProgressBar {
    border: 1px solid #cccccc;
    border-radius: 5px;
    background-color: #e0e0e0;
    text-align: center;
    color: #333333;
}
QProgressBar::chunk {
    background-color: #00aaff; /* Lighter accent blue for the progress */
    border-radius: 4px;
}

/* Splitter */
QSplitter::handle {
    background-color: #bbbbbb;
    width: 3px; /* For vertical splitter */
    height: 3px; /* For horizontal splitter */
}
QSplitter::handle:hover {
    background-color: #007acc; /* Accent color on hover */
}
QSplitter::handle:pressed {
    background-color: #006bb3;
}

/* Radio Button */
QRadioButton {
    spacing: 5px;
    color: #333333;
}
QRadioButton::indicator {
    width: 16px;
    height: 16px;
    border: 1px solid #888888;
    background-color: #ffffff;
    border-radius: 7px; /* Make it circular */
}
QRadioButton::indicator:checked {
    background-color: #007acc;
    border: 1px solid #007acc;
    image: url(::/qt-project.org/images/radio_button_checked_light.png); /* Use a light dot for dark background */
}
QRadioButton::indicator:unchecked:hover {
    border: 1px solid #007acc;
}
QRadioButton::indicator:disabled {
    background-color: #e0e0e0;
    border: 1px solid #bbbbbb;
}

/* Scroll Area */
QScrollArea {
    background-color: #f0f0f0;
    border: 1px solid #cccccc;
}

/* Scroll Bars */
QScrollBar:vertical {
    border: 1px solid #e0e0e0;
    background: #e0e0e0;
    width: 10px;
    margin: 15px 0 15px 0;
    border-radius: 0px;
}
QScrollBar::handle:vertical {
    background: #aaaaaa; /* Darker thumb */
    min-height: 20px;
    border-radius: 4px;
}
QScrollBar::add-line:vertical {
    border: 1px solid #e0e0e0;
    background: #e0e0e0;
    height: 15px;
    subcontrol-origin: margin;
    subcontrol-position: bottom;
}
QScrollBar::sub-line:vertical {
    border: 1px solid #e0e0e0;
    background: #e0e0e0;
    height: 15px;
    subcontrol-origin: margin;
    subcontrol-position: top;
}
QScrollBar::up-arrow:vertical, QScrollBar::down-arrow:vertical {
    border: 1px solid #e0e0e0;
    width: 7px;
    height: 7px;
    background-color: #333333; /* Dark arrows for light background */
}
QScrollBar::add-page:vertical, QScrollBar::sub-page:vertical {
    background: none;
}
QScrollBar:horizontal {
    border: 1px solid #e0e0e0;
    background: #e0e0e0;
    height: 10px;
    margin: 0 15px 0 15px;
    border-radius: 0px;
}
QScrollBar::handle:horizontal {
    background: #aaaaaa;
    min-width: 20px;
    border-radius: 4px;
}
QScrollBar::add-line:horizontal {
    border: 1px solid #e0e0e0;
    background: #e0e0e0;
    width: 15px;
    subcontrol-origin: margin;
    subcontrol-position: right;
}
QScrollBar::sub-line:horizontal {
    border: 1px solid #e0e0e0;
    background: #e0e0e0;
    width: 15px;
    subcontrol-origin: margin;
    subcontrol-position: left;
}
QScrollBar::left-arrow:horizontal, QScrollBar::right-arrow:horizontal {
    border: 1px solid #e0e0e0;
    width: 7px;
    height: 7px;
    background-color: #333333;
}
QScrollBar::add-page:horizontal, QScrollBar::sub-page:horizontal {
    background: none;
}
`
        .concat(allStyles)
        .concat(tabStyles);
};

module.exports = { globalStyleSheet };
