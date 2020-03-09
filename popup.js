//GNU GPL v3
//Please visit our github page: https://github.com/dbeck121/ConVista-CPI-Helper-Chrome-Extension

'use strict';

function addTenantUrls() {
    var query = { active: true, currentWindow: true };

    function callback(tabs) {
        var currentTab = tabs[0]; // there will be only one in this array
        console.log(currentTab); // also has properties like currentTab.id

        var url = currentTab.url;
        var host = "https://" + url.split("/")[2];

        var tenantUrls = document.getElementById("tenantUrls");
        tenantUrls.innerHTML = `
        <div>Links on your current tenant:</div>
        <div>-<a href="${host + '/itspaces/shell/monitoring/Messages/'}" target="_blank">Processed Messages</a></div>
        <div>-<a href="${host + '/itspaces/shell/monitoring/Messages/%7B%22status%22%3A%22FAILED%22%2C%22time%22%3A%22PASTHOUR%22%2C%22type%22%3A%22INTEGRATION_FLOW%22%7D'}" target="_blank">Failed Messages</a></div>

        <div>-<a href="${host + '/itspaces/shell/monitoring/Artifacts/'}" target="_blank">Artifacts</a></div>
        
        <div>-<a href="${host + '/itspaces/shell/design'}" target="_blank">Design</a></div>   
        <div>-<a href="${host + '/itspaces/shell/monitoring/Overview'}" target="_blank">Monitoring</a></div>        
        `;
    }

    //run query
    chrome.tabs.query(query, callback);
}

addTenantUrls();