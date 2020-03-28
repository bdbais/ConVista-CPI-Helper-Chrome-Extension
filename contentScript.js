//GNU GPL v3
//Please visit our github page: https://github.com/dbeck121/ConVista-CPI-Helper-Chrome-Extension

//cpiData stores data for this extension
var cpiData = {};

//initialize used elements
cpiData.lastMessageHashList = [];
cpiData.integrationFlowId = "";

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
      xhr.withCredentials = true;
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

//function to make http calls
async function makeCall(type, url, includeXcsrf, payload, callback, contentType) {

  var xhr = new XMLHttpRequest();
  xhr.withCredentials = true;
  xhr.open(type, url, true);

  if (contentType) {
    xhr.setRequestHeader('Content-type', contentType);
  }

  if (includeXcsrf) {
    var tenant = document.location.href.split("/")[2].split(".")[0];
    var name = 'xcsrf_' + tenant;
    var xcsrf = await storageGetPromise(name)
    xhr.setRequestHeader("X-CSRF-Token", xcsrf);
  }

  xhr.onreadystatechange = function () {
    if (xhr.readyState == 4) {
      callback(xhr);
    }
  }

  xhr.send(payload);
}

//opens a new window with the Trace for a MessageGuid
function openTrace(MessageGuid) {

  //we have to get the RunID first
  makeCall("GET", "/itspaces/odata/api/v1/MessageProcessingLogs('" + MessageGuid + "')/Runs?$format=json", false, "", (xhr) => {
    if (xhr.readyState == 4) {
      var resp = JSON.parse(xhr.responseText);
      var runId = resp.d.results[0].Id;

      let url = '/itspaces/shell/monitoring/MessageProcessingRun/%7B"parentContext":%7B"MessageMonitor":%7B"artifactKey":"__ALL__MESSAGE_PROVIDER","artifactName":"All%20Artifacts"%7D%7D,"messageProcessingLog":"' + MessageGuid + '","RunId":"' + runId + '"%7D';
      window.open(url, '_blank');
    }
  })
}

//open new window for infos
function openInfo(url) {
  window.open(url, '_blank');
}

//refresh the logs in message window
var getLogsTimer;
var activeInlineItem;
async function getLogs() {

  //check if iflowid exists
  iflowId = cpiData.integrationFlowId;
  if (!iflowId) {
    return;
  }

  //get the messagelogs for current iflow
  makeCall("GET", "/itspaces/odata/api/v1/MessageProcessingLogs?$filter=IntegrationFlowName eq '" + iflowId + "'&$top=10&$format=json&$orderby=LogStart desc", false, "", (xhr) => {

    if (xhr.readyState == 4) {

      var resp = JSON.parse(xhr.responseText);
      resp = resp.d.results;

      //    document.getElementById('iflowName').innerText = cpiData.integrationFlowId;

      let updatedText = document.getElementById('updatedText');

      updatedText.innerHTML = "<span>Last update:<br>" + new Date().toLocaleString("de-DE") + "</span>";

      let thisMessageHash = "";
      if (resp.length != 0) {
        thisMessageHash = resp[0].MessageGuid + resp[0].LogStart + resp[0].LogEnd + resp[0].Status;

        if (thisMessageHash != cpiData.lastMessageHashList[0]) {

          let thisMessageHashList = [];

          let messageList = document.getElementById('messageList');
          messageList.innerHTML = "";
          var lastDay;

          for (var i = 0; i < resp.length; i++) {
            thisMessageHashList.push(resp[i].MessageGuid + resp[i].LogStart + resp[i].LogEnd + resp[i].Status);

            //write date if necessary
            let date = new Date(parseInt(resp[i].LogEnd.match(/\d+/)[0]));
            //add offset to utc time. The offset is not correct anymore but isostring can be used to show local time
            date.setTime(date.getTime() - date.getTimezoneOffset() * 60 * 1000);
            date = date.toISOString();

            if (date.substr(0, 10) != lastDay) {
              let dateItem = document.createElement("div");
              dateItem.style["padding-top"] = "5px";
              dateItem.innerText = date.substr(0, 10);
              messageList.appendChild(dateItem)
              lastDay = date.substr(0, 10);
            }

            //flash animation for new elements
            let flash = "";
            if (cpiData.lastMessageHashList.length != 0 && !cpiData.lastMessageHashList.includes(thisMessageHashList[i])) {
              flash = "class='flash'";
            }

            let traceButton = createElementFromHTML("<button id='trace--" + i + "' class='" + resp[i].MessageGuid + "'>" + resp[i].LogLevel + "</button>");
            let infoButton = createElementFromHTML("<button id='info--" + i + "' class='" + resp[i].AlternateWebLink + "'>Log</button>");

            let listItem = document.createElement("div");
            let statusColor = "#008000";
            if (resp[i].Status == "PROCESSING") {
              statusColor = "#FFC300";
            }
            if (resp[i].Status == "FAILED") {
              statusColor = "#C70039";
            }
            listItem.style["color"] = statusColor;

            let timeButton = createElementFromHTML("<span class='" + resp[i].MessageGuid + "' style='cursor: pointer; color: " + statusColor + ";' " + flash + "' > " + date.substr(11, 8) + "</span >");

            timeButton.onmouseover = (e) => {
              e.target.style.backgroundColor = '#f0f0f0';
              infoPopupOpen(e.target.className);
              infoPopupSetTimeout(null);
            };
            timeButton.onmouseout = (e) => {
              e.target.style.backgroundColor = '#fbfbfb';
              infoPopupSetTimeout(2000);
            };

            timeButton.onmouseup = async (e) => {
              if (activeInlineItem == e.target.className) {
                hideInlineTrace();
                showSnackbar("Inline Debugging Deactivated");
                activeInlineItem = null;
              } else {
                hideInlineTrace();
                var inlineTrace = await showInlineTrace(e.target.className);
                if (inlineTrace) {
                  showSnackbar("Inline Debugging Activated");
                  e.target.classList.add("cpiHelper_inlineInfo-active");
                  activeInlineItem = e.target.className;
                } else {
                  activeInlineItem = null;
                  showSnackbar("Inline Debugging not Possible. No data found.");
                }

              }


              e.target.style.backgroundColor = 'red';

            };


            listItem.appendChild(timeButton);
            listItem.appendChild(infoButton);
            listItem.appendChild(traceButton);

            messageList.appendChild(listItem)

            document.getElementById("info--" + i).addEventListener("click", (a) => {
              openInfo(a.srcElement.className);
            });


            document.getElementById("trace--" + i).addEventListener("click", (a) => {

              openTrace(a.srcElement.className);

            });

          }
          cpiData.lastMessageHashList = thisMessageHashList;
        }

      }
      //new update in 3 seconds
      if (sidebar.active) {
        var getLogsTimer = setTimeout(getLogs, 3000);
      }
    }
  });
}

async function showBigPopup(content) {
  //create traceInfo div element
  var x = document.getElementById("cpiHelper_bigPopup");
  if (!x) {
    x = document.createElement('div');
    x.id = "cpiHelper_bigPopup";
    document.body.appendChild(x);
  }
  x.style.display = "block";
  x.innerHTML = "";

  var textElement = `
   <div id="cpiHelper_bigPopup_outerFrame">
   <div id="cpiHelper_bigPopup_contentheader">ConVista CPI Helper<span id="cpiHelper_bigPopup_close">X</div>
     <div id="cpiHelper_bigPopup_content">
     Please Wait...
   </div> 
   </div>
   `;



  x.appendChild(createElementFromHTML(textElement));
  var span = document.getElementById("cpiHelper_bigPopup_close");
  span.onclick = (element) => {
    var x = document.getElementById("cpiHelper_bigPopup");
    x.remove();
  };

  var infocontent = document.getElementById("cpiHelper_bigPopup_content");
  infocontent.innerHTML = content;

}

async function clickTrace(e) {

  try {
    var id = this.id.replace(/BPMN[a-zA-Z-]+_/, "");

    var targetElements = inlineTraceElements.filter((element) => {
      return element.StepId == id || element.ModelStepId == id;
    })


    var childCount = targetElements[0].ChildCount;
    var runId = targetElements[0].RunId;



    var traceId = JSON.parse(await makeCallPromise("GET", "/itspaces/odata/api/v1/MessageProcessingLogRunSteps(RunId='" + runId + "',ChildCount=" + childCount + ")/TraceMessages?$format=json", true)).d.results[0].TraceId;

    var properties = JSON.parse(await makeCallPromise("GET", "/itspaces/odata/api/v1/TraceMessages(" + traceId + ")/ExchangeProperties?$format=json", true)).d.results;
    var headers = JSON.parse(await makeCallPromise("GET", "/itspaces/odata/api/v1/TraceMessages(" + traceId + ")/Properties?$format=json", true)).d.results;
    var trace = await makeCallPromise("GET", "/itspaces/odata/api/v1/TraceMessages(" + traceId + ")/$value", true);

  } catch (error) {
    console.log("error catching trace");
    showSnackbar("No Trace Found.");
    return;
  }



  //Trace
  //https://p0349-tmn.hci.eu1.hana.ondemand.com/itspaces/odata/api/v1/TraceMessages(7875L)/$value

  //Properties
  //https://p0349-tmn.hci.eu1.hana.ondemand.com/itspaces/odata/api/v1/TraceMessages(7875L)/ExchangeProperties?$format=json

  //Headers
  //https://p0349-tmn.hci.eu1.hana.ondemand.com/itspaces/odata/api/v1/TraceMessages(7875L)/Properties?$format=json

  //TraceID
  //https://p0349-tmn.hci.eu1.hana.ondemand.com/itspaces/odata/api/v1/MessageProcessingLogRunSteps(RunId='AF57ga2G45vKDTfn7zqO0zwJ9n93',ChildCount=17)/TraceMessages?$format=json

  var formatHeadersAndPropertiesToTable = function (inputList) {
    result = "<table><tr><th>Name</th><th>Value</th></tr>"
    var even = "";
    inputList.forEach(item => {
      result += "<tr class=\"" + even + "\"><td>" + item.Name + "</td><td style=\"word-break: break-all;\">" + item.Value + "</td></tr>"
      if (even == "even") {
        even = "";
      } else {
        even = "even";
      }
    });
    result += "</table>";
    return result;
  }

  var formatTrace = function (input) {
    result = "<div>";
    result += input;
    result += "</div>";
    return result;
  }



  let names = ["Properties", "Headers", "Trace"];
  let content = [formatHeadersAndPropertiesToTable(properties), formatHeadersAndPropertiesToTable(headers), formatTrace(trace)];

  showBigPopup(createTabHTML(names, content, "debugtabs", 0));

}

async function hideInlineTrace() {

  var classesToBedeleted = ["cpiHelper_onclick", "cpiHelper_inlineInfo", "cpiHelper_inlineInfo_error", "cpiHelper_inlineInfo-active"]

  classesToBedeleted.forEach((element) => {
    let elements = document.getElementsByClassName(element);
    for (let i = (elements.length - 1); i >= 0; i--) {
      if (elements[i].onclick) {
        elements[i].onclick = null;
        //elements[i].removeEventListener('onclick', clickTrace);
      }
      elements[i].classList.remove(element)

    }
  });
}

function createTabHTML(names, content, name, activateTab) {

  /*
    {name:"Hallo",
     content: "",
     active}
  }

  */

  html = `
  <div class="cpiHelper_tabs">
  `;

  let checked = 'checked=""';
  for (let i = 0; i < names.length; i++) {

    if (i == activateTab) {
      checked = 'checked="checked"';
    }
    html += `<input name="tabs" type="radio" id="tab-${name}-${i}" ${checked} class="cpiHelper_tabs_input"/>`;
    html += `<label for="tab-${name}-${i}" class="cpiHelper_tabs_label">${names[i]}</label>`;

    html += ` <div class="cpiHelper_tabs_panel">
      ${content[i]}
    </div>`;
  }



  html += "</div>";

  return html;


}

var inlineTraceElements;
async function createInlineTraceElements(MessageGuid) {
  return new Promise(async (resolve, reject) => {
    inlineTraceElements = [];

    var logRuns = await getMessageProcessingLogRuns(MessageGuid);

    if (logRuns == null || logRuns.length == 0) {
      return resolve(0);
    }

    logRuns.forEach((run) => {
      inlineTraceElements.push({
        StepId: run.StepId,
        ModelStepId: run.ModelStepId,
        ChildCount: run.ChildCount,
        RunId: run.RunId
      });
    });

    return resolve(logRuns.length);
  });
}



async function showInlineTrace(MessageGuid) {
  return new Promise(async (resolve, reject) => {
    var logRuns = await createInlineTraceElements(MessageGuid);

    if (logRuns == null || logRuns.length == 0) {
      return resolve(null);
    }

    inlineTraceElements.forEach((run) => {
      try {
        let target;
        let element;
        //    let target = element.children[getChild(element, ["g"])];
        //    target = target.children[getChild(target, ["rect", "circle", "path"])];



        if (/EndEvent/.test(run.StepId)) {
          element = document.getElementById("BPMNShape_" + run.StepId);
          target = element.children[0].children[0];
        }

        if (/CallActivity/.test(run.StepId)) {
          element = document.getElementById("BPMNShape_" + run.StepId);
          target = element.children[getChild(element, ["g"])].children[0];
        }

        if (/MessageFlow_\d+/.test(run.ModelStepId) && /#/.test(run.ModelStepId) != true) {
          element = document.getElementById("BPMNEdge_" + run.ModelStepId);
          target = element.children[getChild(element, ["path"])];
        }

        if (/ExclusiveGateway/.test(run.ModelStepId)) {
          element = document.getElementById("BPMNShape_" + run.ModelStepId);
          target = element.children[getChild(element, ["g"])].children[0];
        }

        if (/ParallelGateway/.test(run.ModelStepId)) {
          element = document.getElementById("BPMNShape_" + run.ModelStepId);
          target = element.children[getChild(element, ["g"])].children[0];
        }

        target.classList.add("cpiHelper_inlineInfo");
        //     target.addEventListener("onclick", function abc(event) { clickTrace(event); });
        element.classList.add("cpiHelper_onclick");
        element.onclick = clickTrace;


        if (run.Error) {
          target.classList.add("cpiHelper_inlineInfo_error");
        }
        //  console.log("element found for " + run.StepId)

      } catch (e) {
        console.log("no element found for " + run.StepId);
        console.log(run);
      }

      return resolve(true);

    })
  })
}

function getChild(node, childNames) {
  let index;
  for (var i = 0; i < node.children.length; i++) {
    if (childNames.indexOf(node.children[i].localName) > -1) {
      return i;
    }

  }
  return null;
}

//makes a http call to set the log level to trace
function setLogLevel(logLevel, iflowId) {
  makeCall("POST", "/itspaces/Operations/com.sap.it.op.tmn.commands.dashboard.webui.IntegrationComponentSetMplLogLevelCommand", true, '{"artifactSymbolicName":"' + iflowId + '","mplLogLevel":"' + logLevel.toUpperCase() + '","nodeType":"IFLMAP"}', (xhr) => {
    if (xhr.readyState == 4 && xhr.status == 200) {
      showSnackbar("Trace activated");
    }
    else {
      showSnackbar("Error activating Trace");
    }
  }, 'application/json');
}

//makes a http call to set the log level to trace
function undeploy(tenant, artifactId) {
  makeCall("POST", "/itspaces/Operations/com.sap.it.nm.commands.deploy.DeleteContentCommand", true, 'artifactIds=' + artifactId + '&tenantId=' + tenant, (xhr) => {
    if (xhr.readyState == 4 && xhr.status == 200) {
      showSnackbar("Undeploy triggered");
    }
    else {
      showSnackbar("Error triggering undeploy");
    }
  }, "application/x-www-form-urlencoded; charset=UTF-8");
}

function createElementFromHTML(htmlString) {
  var div = document.createElement('div');
  div.innerHTML = htmlString.trim();
  return div.firstChild;
}

//Wait until side is loaded to inject new buttons
function waitForElementToDisplay(selector, time) {
  var elements = document.querySelectorAll(selector);
  var element;
  if (elements.length > 0) {
    for (var i = 0; i < elements.length; i++) {
      if (elements[i].innerHTML == "Deploy") {
        element = elements[i];
      }
    }
    if (element) {

      //create Trace Button
      var tracebutton = createElementFromHTML('<button id="__buttonxx" data-sap-ui="__buttonxx" title="Enable traces" class="sapMBtn sapMBtnBase spcHeaderActionButton" style="display: inline-block; margin-left: 0px;"><span id="__buttonxx-inner" class="sapMBtnHoverable sapMBtnInner sapMBtnText sapMBtnTransparent sapMFocusable"><span class="sapMBtnContent" id="__button12-content"><bdi id="__button12-BDI-content">Trace</bdi></span></span></button>');
      //Create Toggle Message Bar Button
      var messagebutton = createElementFromHTML(' <button id="__buttonxy" data-sap-ui="__buttonxy" title="Messages" class="sapMBtn sapMBtnBase spcHeaderActionButton" style="display: inline-block;"><span id="__buttonxy-inner" class="sapMBtnHoverable sapMBtnInner sapMBtnText sapMBtnTransparent sapMFocusable"><span class="sapMBtnContent" id="__button13-content"><bdi id="__button13-BDI-content">Messages</bdi></span></span></button>');
      var infobutton = createElementFromHTML(' <button id="__buttoninfo" data-sap-ui="__buttoninfo" title="Info" class="sapMBtn sapMBtnBase spcHeaderActionButton" style="display: inline-block;"><span id="__buttonxy-inner" class="sapMBtnHoverable sapMBtnInner sapMBtnText sapMBtnTransparent sapMFocusable"><span class="sapMBtnContent" id="__button13-content"><bdi id="__button13-BDI-content">Info</bdi></span></span></button>');

      //append buttons
      area = document.querySelector("[id*='--iflowObjectPageHeader-actions']")
      area.appendChild(createElementFromHTML("<br />"));
      area.appendChild(tracebutton);
      area.appendChild(messagebutton);
      area.appendChild(infobutton);


      tracebutton.addEventListener("click", (btn) => {
        setLogLevel("TRACE", cpiData.integrationFlowId);
      })

      messagebutton.addEventListener("click", (btn) => {
        if (sidebar.active) {
          sidebar.deactivate();
        } else {
          sidebar.init();
        }
      });

      infobutton.addEventListener("click", (btn) => {
        getIflowInfo(openIflowInfoPopup);
      })
      return;
    } else {
      setTimeout(function () {
        waitForElementToDisplay(selector, time);
      }, time);
    }
  }
  else {
    setTimeout(function () {
      waitForElementToDisplay(selector, time);
    }, time);
  }
}

//Collect Infos to Iflow
function getIflowInfo(callback) {

  makeCallPromise("GET", "/itspaces/Operations/com.sap.it.op.tmn.commands.dashboard.webui.IntegrationComponentsListCommand", false, 'application/json').then((response) => {
    var resp = JSON.parse(response).artifactInformations;
    resp = resp.find((element) => {
      return element.symbolicName == cpiData.integrationFlowId;
    });
    if (!resp) {
      throw "Integration Flow was not found. Probably it is not deployed.";
    }
    return makeCallPromise("GET", "/itspaces/Operations/com.sap.it.op.tmn.commands.dashboard.webui.IntegrationComponentDetailCommand?artifactId=" + resp.id, false, 'application/json');
  }).then((response) => {
    var resp = JSON.parse(response);
    cpiData.flowData = resp;
    cpiData.flowData.lastUpdate = new Date().toISOString();
    callback();
    return;
  }).catch((error) => {
    showSnackbar(JSON.stringify(error));
  });
}

//opens the popup that is triggered bei the info button
function openIflowInfoPopup() {
  //create iflowInfo div element
  var x = document.getElementById("iflowInfo");
  if (!x) {
    x = document.createElement('div');
    x.id = "iflowInfo";
    document.body.appendChild(x);
  }
  x.style.display = "block";
  x.innerHTML = "";

  var deployedOn = cpiData?.flowData?.artifactInformation?.deployedOn;
  if (deployedOn) {
    let date = new Date(deployedOn);
    //handle time zone differences
    date.setTime(date.getTime() - date.getTimezoneOffset() * 60 * 1000);
    deployedOn = date.toLocaleString();
  }

  var textElement = `
  <div id="iflowInfo_outerFrame">
  <div id="iflowInfo_contentheader">ConVista CPI Helper<span id="modal_close">X</div>
    <div id="iflowInfo_content">
    
  <div>Name: ${cpiData?.flowData?.artifactInformation?.name}</div>
  <div>SymbolicName: ${cpiData?.flowData?.artifactInformation?.symbolicName}</div>
  <div>Trace: ${cpiData?.flowData?.logConfiguration?.traceActive}</div>
  <div>DeployedOn: ${deployedOn}</div>
  <div>DeploymentState: ${cpiData?.flowData?.artifactInformation?.deployState}</div>
  <div>SemanticState: ${cpiData?.flowData?.artifactInformation?.semanticState}</div>
  <div>DeployedBy: ${cpiData?.flowData?.artifactInformation?.deployedBy}</div>
  </div> 
  </div>
  `;

  x.appendChild(createElementFromHTML(textElement));
  var span = document.getElementById("modal_close");
  span.onclick = (element) => {
    var x = document.getElementById("iflowInfo");
    x.style.display = "none";
  };


  var root = document.getElementById("iflowInfo_content");

  if (cpiData.flowData.endpointInformation && cpiData.flowData.endpointInformation.length > 0) {
    cpiData.flowData.endpointInformation.forEach(element => {
      if (element.endpointInstances && element.endpointInstances.length > 0) {
        var e = document.createElement('div');
        e.innerHTML = `<div>${element?.protocol}:</div>`;
        root.appendChild(e);
        for (var i = 0; i < element.endpointInstances.length; i++) {
          let f = document.createElement('div');
          f.className = "contentText";
          f.innerText = `${element.endpointInstances[i]?.endpointCategory}: ${element.endpointInstances[i]?.endpointUrl}`;
          e.appendChild(f);
        }
      }
    });
  }

  if (deployedOn) {
    var undeploybutton = document.createElement('button');
    undeploybutton.innerText = "Undeploy";
    undeploybutton.id = "undeploybutton";
    undeploybutton.addEventListener("click", (a) => {
      undeploy(cpiData?.flowData?.artifactInformation?.tenantId, cpiData?.flowData?.artifactInformation?.id);
    });
    root.appendChild(undeploybutton);
  }
}

//snackbar for messages (e.g. trace is on)
function showSnackbar(message) {
  //css for snackbar is already there. see initIflowPage()

  //create snackbar div element
  var x = document.getElementById("snackbar");
  if (!x) {
    x = document.createElement('div');
    x.id = "snackbar";
    document.body.appendChild(x);
  }
  x.innerHTML = message;
  x.className = "show";
  setTimeout(function () { x.className = x.className.replace("show", ""); }, 3000);
}

//the sidebar that shows messages
var sidebar = {

  //indicator if active or not
  active: false,

  //function to deactivate the sidebar
  deactivate: function () {
    this.active = false;
    clearTimeout(getLogsTimer);
    document.getElementById("cpiHelper_content").remove();
  },

  //function to create and initialise the message sidebar
  init: function () {
    this.active = true;

    //create sidebar div
    var elem = document.createElement('div');
    elem.innerHTML = `
    <div id="cpiHelper_contentheader">ConVista CPI Helper</div> 
    <div id="outerFrame">
    <div id="iflowName" class="contentText"></div>
    <div id="updatedText" class="contentText"></div>
    
    <ul id="messageList"></ul>
    <div><button id="closeButton" >Close Sidebar</button></div>
    
    </div>
    `;
    elem.id = "cpiHelper_content";
    document.body.appendChild(elem);

    //activate dragging for message bar
    dragElement(document.getElementById("cpiHelper_content"));

    //fill close button with life
    document.getElementById("closeButton").addEventListener("click", (btn) => {
      sidebar.deactivate();
    });

    //lastMessageHashList must be empty when message sidebar is created
    cpiData.lastMessageHashList = [];

    //refresh messages
    getLogs();
  }
};

function injectCss(cssStyle) {
  var style = document.createElement('style');
  style.type = 'text/css';
  if (style.styleSheet) {
    style.styleSheet.cssText = cssStyle;
  } else {
    style.appendChild(document.createTextNode(cssStyle));
  }
  document.getElementsByTagName('head')[0].appendChild(style);
}

async function infoPopupOpen(MessageGuid) {
  var x = document.getElementById("cpiHelper_sidebar_popup");
  if (!x) {
    x = document.createElement('div');
    x.id = "cpiHelper_sidebar_popup";
    x.onmouseover = (e) => {
      infoPopupSetTimeout(null);
    };
    x.onmouseout = (e) => {
      infoPopupSetTimeout(3000);
    };
    document.body.appendChild(x);
  }

  x.innerText = "Please wait...";
  x.className = "show";

  ///MessageProcessingLogRuns('AF5eUbNwAc1SeL_vdh09y4njOvwO')/RunSteps?$inlinecount=allpages&$format=json&$top=500
  var resp = await getMessageProcessingLogRuns(MessageGuid)

  var y = document.getElementById("cpiHelper_sidebar_popup");
  y.innerText = "";


  if (resp == null || resp.length == 0) {
    y.innerText = "No data available.";
    return;
  }


  let error = false;
  for (var i = 0; i < resp.length; i++) {
    if (resp[i].Error) {
      error = true;
      let errorText = createErrorMessageElement(resp[i].Error);
      y.appendChild(errorText);
    }
  }
  if (!error || resp.length == 0) {
    let errorText = document.createElement("span");
    errorText.className = "contentText";
    y.appendChild(errorText);
    y.innerText = "No errors found in processed message";
  }

};

function lookupError(message) {
  if (/unable to find valid certification path to requested target/.test(message)) {
    return "Probably you did not add a certificate for the https host that you are caling to the keystore";
  }

  return null;
}

function createErrorMessageElement(message) {
  let errorElement = document.createElement("div");
  errorElement.style.color = "red";
  errorElement.className = "contentText";
  errorElement.innerText = message;

  let errorContainer = document.createElement("div");
  errorContainer.appendChild(errorElement);

  let explain = lookupError(message);
  if (explain) {
    errorContainer.appendChild(createElementFromHTML("<div>Possible explanation: " + explain + "</div>"));
  }
  return errorContainer;
}

async function getMessageProcessingLogRuns(MessageGuid) {
  return makeCallPromise("GET", "/itspaces/odata/api/v1/MessageProcessingLogs('" + MessageGuid + "')/Runs?$inlinecount=allpages&$format=json&$top=500", true).then((responseText) => {
    var resp = JSON.parse(responseText);
    console.log(resp);
    return resp.d.results[0].Id;
  }).then((runId) => {
    return makeCallPromise("GET", "/itspaces/odata/api/v1/MessageProcessingLogRuns('" + runId + "')/RunSteps?$inlinecount=allpages&$format=json&$top=500", true);
  }).then((response) => {
    return JSON.parse(response).d.results;
  }).catch((e) => {
    console.log(e);
    return null;
  });
}

var timeOutTimer;
function infoPopupSetTimeout(milliseconds) {
  if (milliseconds) {
    timeOutTimer = setTimeout(() => {
      infoPopupClose();
    }, milliseconds);
  } else {
    clearTimeout(timeOutTimer);
  }
}

function infoPopupClose() {
  var x = document.getElementById("cpiHelper_sidebar_popup");
  if (x) {
    x.className = "hide_popup";
  }
}

//function to get the iFlow name from the URL
function getIflowName() {
  var url = window.location.href;
  let dateRegexp = /\/integrationflows\/(?<integrationFlowId>[0-9a-zA-Z_\-.]+)/;
  var result;

  try {
    let groups = url.match(dateRegexp).groups;

    result = groups.integrationFlowId;
    console.log("Found iFlow:" + result);

  } catch (e) {
    console.log(e);
    console.log("no integrationflow found");
  }

  cpiData.integrationFlowId = result;
  return result;
}

//we have to check for url changes to deactivate sidebar and to inject buttons, when on iflow site.
var oldURL = "";
function checkURLchange() {
  var currentURL = window.location.href;
  var urlChanged = false;
  if (currentURL != oldURL) {
    urlChanged = true;
    console.log("url changed! to " + currentURL);
    oldURL = currentURL;
    handleUrlChange();
  }
  oldURL = window.location.href;
  return urlChanged;
}

//function that handles the dragging 
function dragElement(elmnt) {
  var pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
  if (document.getElementById(elmnt.id + "header")) {
    /* if present, the header is where you move the DIV from:*/
    document.getElementById(elmnt.id + "header").onmousedown = dragMouseDown;
  } else {
    /* otherwise, move the DIV from anywhere inside the DIV:*/
    elmnt.onmousedown = dragMouseDown;
  }

  function dragMouseDown(e) {
    e = e || window.event;
    e.preventDefault();
    // get the mouse cursor position at startup:
    pos3 = e.clientX;
    pos4 = e.clientY;
    document.onmouseup = closeDragElement;
    // call a function whenever the cursor moves:
    document.onmousemove = elementDrag;
  }

  function elementDrag(e) {
    e = e || window.event;
    e.preventDefault();
    // calculate the new cursor position:
    pos1 = pos3 - e.clientX;
    pos2 = pos4 - e.clientY;
    pos3 = e.clientX;
    pos4 = e.clientY;
    // set the element's new position:
    elmnt.style.top = (elmnt.offsetTop - pos2) + "px";
    elmnt.style.left = (elmnt.offsetLeft - pos1) + "px";
  }

  function closeDragElement() {
    /* stop moving when mouse button is released:*/
    document.onmouseup = null;
    document.onmousemove = null;
  }
}

//this function is fired when the url changes
function handleUrlChange() {
  if (getIflowName()) {
    //if iflow found, inject buttons and add css
    //css
    initIflowPage();
    storeVisitedIflowsForPopup();
    //buttons
    waitForElementToDisplay("[id*='-BDI-content']", 1000);
  } else {
    //deactivate sidebar if not on iflow page
    if (sidebar.active) {
      sidebar.deactivate();
    }
  }
}

async function storageGetPromise(name) {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get([name], function (result) {
      resolve(result[name]);
    });
  })
}

//Visited IFlows are stored to show in the popup that appears when pressing the button in browser bar
function storeVisitedIflowsForPopup() {
  var tenant = document.location.href.split("/")[2].split(".")[0];
  var name = 'visitedIflows_' + tenant;
  chrome.storage.sync.get([name], function (result) {
    var visitedIflows = result[name];

    if (!visitedIflows) {
      visitedIflows = [];
    }

    //filter out the current flow
    if (visitedIflows.length > 0) {
      visitedIflows = visitedIflows.filter((element) => {
        return element.name != cpiData.integrationFlowId;
      });
    }

    //put the current flow to the last element. last position indicates last visited element
    visitedIflows.push({ name: cpiData.integrationFlowId, "url": document.location.href, "favorit": false });

    //delete the first one when there are more than 10 iflows in visited list
    if (visitedIflows.length > 10) {
      visitedIflows.shift();
    }

    var obj = {};
    obj[name] = visitedIflows;

    chrome.storage.sync.set(obj, function () {
    });

  });
}

function initIflowPage() {
  //inject css that is used for the snackbar
  var cssStyle = `

    /* start snackbar */
  
    #snackbar {
      visibility: hidden;
      min-width: 250px;
      margin-left: -125px;
      background-color: #333;
      color: #fff;
      text-align: center;
      border-radius: 2px;
      padding: 16px;
      position: fixed;
      z-index: 500;
      left: 50%;
      bottom: 30px;
      font-size: 17px;
    }
    
    #snackbar.show {
      visibility: visible;
      -webkit-animation: fadein 0.5s, fadeout 0.5s 2.5s;
      animation: fadein 0.5s, fadeout 0.5s 2.5s;
    }
    
    @-webkit-keyframes fadein {
      from {bottom: 0; opacity: 0;} 
      to {bottom: 30px; opacity: 1;}
    }
    
    @keyframes fadein {
      from {bottom: 0; opacity: 0;}
      to {bottom: 30px; opacity: 1;}
    }
    
    @-webkit-keyframes fadeout {
      from {bottom: 30px; opacity: 1;} 
      to {bottom: 0; opacity: 0;}
    }
    
    @keyframes fadeout {
      from {bottom: 30px; opacity: 1;}
      to {bottom: 0; opacity: 0;}
    }
  
  /* end snackbar */  `;

  injectCss(cssStyle);

  //inject needed css for sidebar
  cssStyle = `

      button
      {
        cursor: pointer;
      }

      #cpiHelper_sidebar_popup
      {
        position:fixed;
        z-index:460;
        background:#fbfbfb;
        bottom:50px;
        right:100px;
        width:700px;
        min-height: 1rem;
        padding: 13px;
        border: solid 1px #e1e1e1;
      }
      #cpiHelper_sidebar_popup.show {
        visibility: visible;
        animation: cpiHelper_sidebar_popup_fadein 0.5s;
      }
  
      #cpiHelper_sidebar_popup.hide_popup {
        visibility: hidden;
        animation: visibility 0s linear 0.5s, cpiHelper_sidebar_popup_fadeout 0.5s;
      }
  
      @keyframes cpiHelper_sidebar_popup_fadein {
        from {bottom: 0; opacity: 0;}
        to {bottom: 50px; opacity: 1;}
      }
  
      @keyframes cpiHelper_sidebar_popup_fadeout {
        from {bottom: 50px; opacity: 1;}
        to {bottom: 0; opacity: 0; }
      }
  
      #outerFrame {
        border: solid 1px #e1e1e1;
      }
  
      #cpiHelper_content{
        position:fixed;
        z-index:700;
        background:#fbfbfb;
        top:100px;
        right:0px;
        width:220px;
        opacity: 0.9;
      }   
  
      #cpiHelper_contentheader {
        padding: 10px;
        cursor: move;
        z-index: 10;
        background-color: #009fe3;
        color: #fff;
      }
  
      button {
        border: none;
      }
  
      .contentText {
        padding: 5px;
        overflow-wrap: break-word;
      }
  
      .flash {
        animation-name: flash;
        animation-duration: 3s;
        animation-timing-function: linear;
        animation-iteration-count: infinite;
        animation-direction: alternate;
        animation-play-state: running;
      animation-iteration-count: 1;
      }
  
      @keyframes flash {
        from {background: orange;}
        to {background: none;}
      }
  
      li {
         position: relative;    /* It is required for setting position to absolute in the next rule. */
      }
  
      li::before {
        "content: '•';
        position: absolute;
        left: -1.2em;          /* Adjust this value so that it appears where you want. */
        font-size: 1em;      /* Adjust this value so that it appears what size you want. */
      }
      
      `;

  injectCss(cssStyle);

  //infoPopup
  cssStyle = `
  /* Modal Content */

  #iflowInfo {
    display: none; /* Hidden by default */
    position: fixed; /* Stay in place */
    z-index: 400; /* Sit on top */
    width: 100%; /* Full width */
    height: 100%; /* Full height */
    left: 0;
    top: 0;
    overflow: auto; /* Enable scroll if needed */
    background-color: rgb(0,0,0); /* Fallback color */
    background-color: rgba(0,0,0,0.4); /* Black w/ opacity */
  }

  #iflowInfo_outerFrame {
    background:#fbfbfb;
    margin: auto;
    margin-top: 100px;
      width: 80%;
    min-height: 1rem;
  }
  #iflowInfo_content {
    border: solid 1px #e1e1e1;
    padding: 13px;
   
  }
  #iflowInfo_contentheader {
    padding: 10px;
  
    z-index: 10;
    background-color: #009fe3;
    color: #fff;
  }

  
  /* The Close Button */
  #modal_close {
    float: right;
    font-size: 1.2rem;
    font-weight: bold;
  }
  
  #modal_close:hover,
  #modal_close:focus {
    color: #000;
    text-decoration: none;
    cursor: pointer;
  }
  `;

  injectCss(cssStyle);

  injectCss(cssStyle);


  cssStyle = `
  /* Modal Content */

  .cpiHelper_inlineInfo {
    fill:#a2ffa2 !important;
    stroke:#00ff00 !important;
  }

  .cpiHelper_inlineInfo.cpiHelper_inlineInfo_error {
    fill:#ff6b6b !important;
    stroke:#ff6b6b !important;
  }


  #cpiHelper_bigPopup {
    display: none; /* Hidden by default */
    position: fixed; /* Stay in place */
    z-index: 450; /* Sit on top */
    width: 100%; /* Full width */
    height: 100%; /* Full height */
    left: 0;
    top: 0;
    overflow: auto; /* Enable scroll if needed */
    background-color: rgb(0,0,0); /* Fallback color */
    background-color: rgba(0,0,0,0.4); /* Black w/ opacity */
  }

  #cpiHelper_bigPopup_outerFrame {
    background:#fbfbfb;
    margin: auto;
    margin-top: 100px;
      width: 80%;
    min-height: 1rem;
  }
  #cpiHelper_bigPopup_content {
    border: solid 1px #e1e1e1;
  }
  
  #cpiHelper_bigPopup_contentheader {
    padding: 10px;
  
    z-index: 10;
    background-color: #009fe3;
    color: #fff;
  }

  /* The Close Button */
  #cpiHelper_bigPopup_close {
    float: right;
    font-size: 1.2rem;
    font-weight: bold;
  }
  
  #cpiHelper_bigPopup_close:hover,
  #cpiHelper_bigPopup_close:focus {
    color: #000;
    text-decoration: none;
    cursor: pointer;
  }

/*tabs  */

  .cpiHelper_tabs {
    box-sizing: border-box;
    display: flex;
    flex-wrap: wrap;
    background: #efefef;
    box-shadow: 0 48px 80px -32px rgba(0,0,0,0.3);
  }

  .cpiHelper_tabs_input {
    position: absolute;
    opacity: 0;
  }

  .cpiHelper_tabs_label {
    width: 100%;
    padding: 20px 30px;
    background: #e5e5e5;
    cursor: pointer;
    font-weight: bold;
    font-size: 18px;
    color: #7f7f7f;
    transition: background 0.1s, color 0.1s;
  }
  
  .cpiHelper_tabs_label:hover {
    background: #d8d8d8;
  }
  
  .cpiHelper_tabs_label:active {
    background: #ccc;
  }
  
  .cpiHelper_tabs_input:focus + .cpiHelper_tabs_label {
    box-shadow: inset 0px 0px 0px 3px #2aa1c0;
    z-index: 1;
  }

  .cpiHelper_tabs_input:checked + .cpiHelper_tabs_label {
    background: #fff;
    color: #000;
  }
  
  @media (min-width: 600px) {
    .cpiHelper_tabs_label {
      width: auto;
    }
  }

  .cpiHelper_tabs_panel {
    display: none;
    padding: 20px 30px 30px;
    background: #fff;
  }
  
  @media (min-width: 600px) {
    .cpiHelper_tabs_panel {
      order: 99;
    }
  }
  
  .cpiHelper_tabs_input:checked + .cpiHelper_tabs_label + .cpiHelper_tabs_panel {
    display: block;
  }

table {
  background:#eaebec;
  table-layout:fixed;
	border:#ccc 0px solid;
}

table th {
  text-align: left;
	padding:2px;
	border-top:0px solid #ccc;
	border-bottom:0px solid #ccc;
	background: #f1f1f1;
}
table tr {
	padding-left:5px;
}
table td:first-child {
	text-align: left;
	padding-left:5px;
	border-left: 0;
}
table td {
	padding:4px;
	border-top: 0px solid #ffffff;
	border-bottom:0px solid #e0e0e0;
	border-left: 0px solid #e0e0e0;

	background: #f1f1f1;
}
table tr.even td {
	background: #e8e8e8;

}
table tr:hover td {

}
  `;

  injectCss(cssStyle);

}

//start
checkURLchange();
setInterval(function () {
  checkURLchange(window.location.href);
}, 4000);






