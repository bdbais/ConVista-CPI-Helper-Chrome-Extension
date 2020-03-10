# ConVista-CPI-Helper-Chrome-Extension
This Chrome Plugin extends the SAP Cloud Platform Integration with some useful features. It includes a button to activate traces and a message sidebar directly in the Integration-Flow-Designer.
As SAP is not well known for it's usability it was time to integrate some features ourselves.
## Special Thanks
Many thanks to ConVista Consulting AG in Cologne, Germany. They supported this idea from the beginning and contributed time and ressources for me to start this project. Also many thanks to open this project to the public under GNU GPLv3. I hope there will be many more people to contribute in the future.
## Features
### Integration Flow Designer Improvements
- Sidebar with processed messages
- Button to switch on trace
- Directly go to traces of specific message
- Directly go to logs and attachements of specific message
- Popup with error-message when hovering message in sidebar
- Popup with deployment info
- Last visited iflows in browser-bar-popup
- Useful links in browser-bar-popup
## Changelog
### 0.5.0
- [Improvement] Improved design of plugin-popup in browser-bar
- [Feature] Added last visited iflows in browser-bar-popup
- [Feature] Added useful links in browser-bar-popup
- [Feature] Added undeploy button in info-popup
### 0.4.0
- [Feature] Added popup with deployment info
### 0.3.1
- [Bug] Fixed timezone offset in message sidebar
### 0.3.0
- [Improvement] A few design changes
- [Feature] Processed message error message on hovering over the message date (if exists)
### 0.2.2
- [Improvement] A few design changes
### 0.2.1
- [Improvement] Word-wrap when Integration-Flow name is very long
- [Improvement] Smaller Message-Sidebar
### 0.2
First public version.
- [Feature] Message Sidebar
- [Feature] Trace button 

## Installation
You need Google Chrome to install this plugin. I tested it with version 80. I assume that older versions will work too.
The plugin is not yet in the Chrome Store but I am applying for it. Until it is accepted, you have to add the plugin from the sources.
If you want to install the plugin from sources, clone the repo and add the folder directly to Google Chrome
>- Download or clone the repo from github. Unpack if necessary.
>- In Google Chrome, Navigate to Settings – > Extensions
>- Enable Developer Mode (slider on the top-right)
>- Click: "Load Unpacked Extension" and select the folder with the plugin data
## Update
Please replace the folder with the new version on your disk. After that you must delete and add the plugin in Chrome Browser.
If you have cloned the repository, pull new data. Than delete and add the plugin in Chrome. Restart Chrome.
## Usage
If you open an Integration Flow, the plugin will automatically add a "Messages" and a "Trace" button in the Integration-Flow-Designer. The "Message" button opens a small dragable sidebar with the last messages. You can jump directly to infos and traces of the message run. The "Trace buttons" sets the loglevel of the current Iflow to trace.
![Screenshot](https://raw.githubusercontent.com/dbeck121/ConVista-CPI-Helper-Chrome-Extension/master/images/screenshots/Full%20screen%20for%20Chrome.png)
See also the [SAP Community Blog](https://blogs.sap.com/2020/03/05/cpi-chrome-plugin-to-enhance-sap-cloud-platform-integration-usability/#)
## Contributing
See [Contribution guidelines for this project](docs/CONTRIBUTING.md) if you want to take part in this project. As I am a beginner myself, beginners are welcome.
## Todos
### New features:

- Add possibility to show errors, payloads, properties and headers from messages directly in the design screen

### Things to improve:

- Find a better way to get the X-CSRF-Token. Currently there is a background javascript for that.
- Find a better way to detect url changes
- Improve design

If you have any ideas, please write a message or comment at the [SAP Community](https://blogs.sap.com/2020/03/05/cpi-chrome-plugin-to-enhance-sap-cloud-platform-integration-usability/#)

## License

[GNU GPLv3](https://choosealicense.com/licenses/gpl-3.0/)