//GNU GPL v3
//Please visit our github page: https://github.com/dbeck121/ConVista-CPI-Helper-Chrome-Extension

'use strict';

var host = "";

//List a history of visited iflows
function addLastVisitedIflows() {
    let name = 'visitedIflows_' + host.split("/")[2].split(".")[0];
    chrome.storage.sync.get([name], function (result) {
        var visitedIflows = result[name];
        if (!visitedIflows || visitedIflows.length == 0) {
            return;
        }


        var html = `
        <h3>Last Visited Integration Flows on Tenant ${name.split("_")[1]}</h3>
        `;

        for (var i = visitedIflows.length - 1; i > -1; i--) {
            html += `<div>-<a href="${visitedIflows[i].url}" target="_blank">${visitedIflows[i].name}</a></div>`;
        }
        html += `<br>`;
        var lastVisitedIflows = document.getElementById("lastVisitedIflows");
        lastVisitedIflows.innerHTML = html;
    });
}

function addTenantUrls() {

    var tenantUrls = document.getElementById("tenantUrls");
    tenantUrls.innerHTML = `
        <h3>This Tenant</h3>
        <div>-<a href="${host + '/itspaces/shell/monitoring/Messages/'}" target="_blank">Processed Messages</a></div>
        <div>-<a href="${host + '/itspaces/shell/monitoring/Messages/%7B%22status%22%3A%22FAILED%22%2C%22time%22%3A%22PASTHOUR%22%2C%22type%22%3A%22INTEGRATION_FLOW%22%7D'}" target="_blank">Failed Messages</a></div>

        <div>-<a href="${host + '/itspaces/shell/monitoring/Artifacts/'}" target="_blank">Artifacts</a></div>
        
        <div>-<a href="${host + '/itspaces/shell/design'}" target="_blank">Design</a></div>   
        <div>-<a href="${host + '/itspaces/shell/monitoring/Overview'}" target="_blank">Monitoring</a></div>        
        `;

}

async function getHost() {
    return new Promise((resolve, reject) => {

        var query = { active: true, currentWindow: true };

        function callback(tabs) {
            var currentTab = tabs[0]; // there will be only one in this array
            console.log(currentTab); // also has properties like currentTab.id

            var url = currentTab.url;
            var tempHost = "https://" + url.split("/")[2];
            resolve(tempHost);
        };

        chrome.tabs.query(query, callback);

    });
}

var callCache = new Map();
function makeCallPromise(method, url, useCache, accept) {
    return new Promise(function (resolve, reject) {
        var cache;
        if (useCache) {
            cache = callCache.get(method + url);
        }
        if (cache) {
            resolve(cache);
        } else {

            var xhr = new XMLHttpRequest();
            xhr.withCredentials = false;
            xhr.open(method, url);
            if (accept) {
                //Example for accept: 'application/json' 
                xhr.setRequestHeader('Accept', accept);
            }
            xhr.onload = function () {
                if (this.status >= 200 && this.status < 300) {
                    if (useCache) {
                        callCache.set(method + url, xhr.responseText);
                    }
                    resolve(xhr.responseText);
                } else {
                    reject({
                        status: this.status,
                        statusText: xhr.statusText
                    });
                }
            };
            xhr.onerror = function () {
                reject({
                    status: this.status,
                    statusText: xhr.statusText
                });
            };
            xhr.send();
        }
    }
    );

}

//has to be changed when plugin is in chrome store
function checkUpdate() {
    var manifestVersion = chrome.runtime.getManifest().version;
    var cpihelper_version = document.getElementById("cpihelper_version");
    var html = "<span>You are running version " + manifestVersion + "</span>";
    cpihelper_version.innerHTML = html;

    makeCallPromise("GET", "https://raw.githubusercontent.com/dbeck121/ConVista-CPI-Helper-Chrome-Extension/master/manifest.json").then((response) => {
        var serverVersion = JSON.parse(response).version;
        var manifestVersion = chrome.runtime.getManifest().version;
        var html = "<span>You are running version " + manifestVersion + "</span>";
        if (serverVersion != manifestVersion) {
            html += "<br><span style=\"color: red;\">Please update to version " + serverVersion + "</span>";
        }
        var cpihelper_version = document.getElementById("cpihelper_version");
        cpihelper_version.innerHTML = html;
    }).catch(console.log);
}

async function main() {
    checkUpdate();
    host = await getHost();
    addLastVisitedIflows();
    addTenantUrls();
}

main();

