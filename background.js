//GNU GPL v3
//Please visit our github page: https://github.com/dbeck121/ConVista-CPI-Helper-Chrome-Extension

'use strict';

//activate on this site
chrome.runtime.onInstalled.addListener(function () {
  chrome.declarativeContent.onPageChanged.removeRules(undefined, function () {
    chrome.declarativeContent.onPageChanged.addRules([{
      conditions: [new chrome.declarativeContent.PageStateMatcher({
        pageUrl: { urlMatches: '.*?hana\.ondemand\.com\/itspaces\/.*?' },
      })],
      actions: [new chrome.declarativeContent.ShowPageAction()]
    }]);
  });

  //scan Headers for X-CSRF Token
  chrome.webRequest.onBeforeSendHeaders.addListener(
    function (details) {

      for (var i = 0; i < details.requestHeaders.length; ++i) {
        if (details.requestHeaders[i].name == "X-CSRF-Token") {
          var xcsrftoken = details.requestHeaders[i].value;
          chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
            //send token to contentPage
            chrome.tabs.sendMessage(tabs[0].id, { cpiData: { xcsrftoken: xcsrftoken } }, function (response) {
              console.log("xcsrf token is send to contentPage");
            });
          });
        }
      }
      return { requestHeaders: details.requestHeaders };

    },
    { urls: ["https://*.hana.ondemand.com/itspaces/api/1.0/workspace*/artifacts/*/iflows/*?lockinfo=true&webdav=LOCK"] },
    ["requestHeaders"]);
});
