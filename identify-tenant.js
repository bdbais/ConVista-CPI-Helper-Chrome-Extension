{
  console.log('Initializing tentant identification')
  let host = window.location.host // global variable to hold host name
  let intervalId; // used by the interval to set document title
  let hostData = {
    title: 'Cloud Integration',
    color: '#354a5f',
    icon: 'default'
  }

  // Call the main functions
  monitorSyncStore()
  handleMessages()
  handleDOMChanges()
  getHostData(data => {
    setData(data);
  })

  ////////////////////////
  /////// FUNCTIONS //////
  ////////////////////////
  
  // Handles changes made to the storage, even if on a different tab.
  function monitorSyncStore () {
    chrome.storage.onChanged.addListener((changes, namespace) => {
      for (var key in changes) {
        if (key === host) {
          let storageChange = changes[key].newValue // Get the new values
          
          // update the global object
          hostData.title = storageChange.title
          hostData.color = storageChange.color
          hostData.icon = storageChange.icon

          // Update the page
          setData(hostData);
        }
      }
    });
  }

  // Handles messages sent from the popup
  function handleMessages() {
    chrome.runtime.onMessage.addListener((message, sender, res) => {
      if (message == 'get') {
        getHostData(res)
      }
      if (message.save) {
        hostData.title = message.save.title || hostData.title;
        hostData.color = message.save.color || hostData.color;
        hostData.icon = message.save.icon || hostData.icon;
        let saveObject = {}
        saveObject[host] = hostData
        saveHostData(saveObject)
        res(hostData);
      }
      return true;
    });
  }

  // Listen for changes to the DOM and update the UI5 header
  function handleDOMChanges() {
    let observer = new MutationObserver(mutations => {
      // Set the header background        
      for (let mutation of mutations) {
        if (mutation.type == 'childList') {
          for (let addedNode of mutation.addedNodes) {
            if (addedNode.id == 'shell--toolHeader') {
              console.log('Updating color')
              getHostData(data => {
                console.log(`Got this color for the host: ${data.color}`)
                addedNode.style.backgroundColor = data.color
              })
            }
          }
        }
      }
    });
    observer.observe(document.querySelector('#shellcontent'), { childList: true, subtree: true })
    console.log('Oberver is running')
  }

  ////////////////////////
  /// Helper functions ///
  ////////////////////////

  // Get the data for this host
  function getHostData(callback) {
    chrome.storage.sync.get([host], response => {
      if (response[host] == undefined) {
        saveHostData(hostData)
        return callback(hostData)
      }
      hostData = response[host]
      return callback(hostData)
    })
  }

  // Save the data for this host
  function saveHostData(newData, callback) {
    hostData.title = newData.title || hostData.title,
      hostData.color = newData.color || hostData.color,
      hostData.icon = newData.icon || hostData.icon
    let saveObj = {}
    saveObj[host] = hostData
    chrome.storage.sync.set(saveObj, callback)
  }

  // interval is used to overwrite SAPUI5 behaviour
  function setData({title, color, icon}) {
    clearInterval(intervalId)
    // Update element now
    setDocumentTitle(title);
    setHeaderColor(color)
    setFavIcon(icon)
    // prepare interval function to keep elements updated
    let intervalCount = 5; // Times to run the interval function
    let intervalDelay = 2000;
    // set title again aftet 2sec
    console.log('Initiate title update sequence')
    intervalId = setInterval(() => {
      intervalCount--;
      setDocumentTitle(title)
      setHeaderColor(color)
      setFavIcon(icon)
      if (intervalCount == 0) {
        console.log('Ending update sequence')
        clearInterval(intervalId);
      }
    }, intervalDelay)
  }

  function setDocumentTitle(title) {
    if (document.title !== title) {
      document.title = title;
      console.log('Updating document title')
    }
  }

  function setHeaderColor(color) {
    let header = document.querySelector('#shell--toolHeader')
    if (header && header.style && header.style.backgroundColor !== color) {
      header.style.backgroundColor = color
    }
  }

  function setFavIcon(icon) {
    update = false
    // icon will be 'red', 'green', etc
    let link = document.querySelector("link[rel*='icon']") || document.createElement('link');
    link.type = 'image/x-icon';
    link.rel = 'shortcut icon';
    link.href = chrome.extension.getURL(`/images/favicons/${icon}.png`);
    document.getElementsByTagName('head')[0].appendChild(link);
  }
}