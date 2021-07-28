// loses all this as background script is cleared, so we need to store


console.log("In the background");

function Time(time) {
    return Math.floor(time/(1000));
}

function Url(url){
    let count = 0;
    let index = url.length;
    for(i = 0; i < url.length; i++) {
        if (url[i] === '/') count += 1;
        if (count == 3) {
            index = i;
            break;
        }
    }
    let Url = url.slice(0, index);
    if (Url.includes('https://')) {
        Url = Url.slice(8, index);
    }
    return Url;
}

let observedTabs = undefined;
let currentTime = undefined;
let chromeState = undefined;
let currentUrl = undefined;

function getObservedTabs(callback) {
    if (observedTabs === undefined) {
        chrome.storage.sync.get("observedTabs", (observedTabs_obj) => {
            callback(observedTabs_obj.observedTabs);
        });
    } else {
        callback(observedTabs);
    }
}


function getCurrentTime(callback) {
    if (currentTime === undefined) {
        chrome.storage.sync.get("currentTime", (currentTime_obj) => {
            callback(currentTime_obj.currentTime);
        });
    } else {
        callback(currentTime);
    }

}

function getChromeState(callback) {
    if (chromeState === undefined) {
        chrome.storage.sync.get("chromeState", (chromeState_obj) => {
            callback(chromeState_obj.chromeState);
        });
    } else {
        callback(chromeState);
    }

}

function getCurrentUrl(callback) {
    if (currentUrl === undefined) {
        chrome.storage.sync.get("currentUrl", (currentUrl_obj) => {
            callback(currentUrl_obj.currentUrl);
        });
    } else {
        callback(currentUrl);
    }

}

// set defaults
chrome.runtime.onInstalled.addListener(() => {
    let time = Time(Date.now());
    chrome.storage.sync.set({ "time": time });
    let observedTabs = [['chrome://extensions', [time, time, 'icons/sad.png']]];
    chrome.storage.sync.set({"observedTabs": observedTabs});
    let currentUrl = "chrome://extensions";
    chrome.storage.sync.set({"currentUrl": currentUrl});
    let chromeState = 'active';
    chrome.storage.sync.set({"chromeState": chromeState});

});

// runtime sends message to all foreground elements
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.message === 'get_url') {
        getObservedTabs((_observedTabs) => { 
            observedTabs = _observedTabs;
            getCurrentUrl((_currentUrl) => {
                currentUrl = _currentUrl;
                sendResponse({
                    message: 'success',
                    bg_currentUrl: _currentUrl,
                    bg_observedTabs: _observedTabs
                });
            });  
        });  
        return true;  
    }
});


// updates time when active tab changes
async function updateTime(tabUrl, time, identifier = 'startTime', iconUrl = '') {

    getObservedTabs((_observedTabs) => {
        observedTabs = _observedTabs;

        let localObservedTabs = new Map(_observedTabs);
        let url = Url(tabUrl);

        if (localObservedTabs.has(url)) {
            if (identifier === 'stopTime') {
                // console.log('Setting stop time', url);
                let startTime = localObservedTabs.get(url)[0];
                let newEndTime = time;
                let icon = localObservedTabs.get(url)[2];

                console.log("Time spent before stopping: ", Math.floor((newEndTime - startTime)));

                localObservedTabs.set(url, [startTime, newEndTime, icon]);
                observedTabs = Array.from(localObservedTabs);
            }
            else {
                // console.log("Setting start time of already present url", url);
                let prevStartTime = localObservedTabs.get(url)[0];
                let prevEndTime = localObservedTabs.get(url)[1];
                let icon = localObservedTabs.get(url)[2];
                let newStartTime = time - (prevEndTime - prevStartTime);

                console.log("Time spent after restarting: ", Math.floor((time - newStartTime)));

                localObservedTabs.set(url, [newStartTime, time, icon]);
                observedTabs = Array.from(localObservedTabs);
            }


        } else {
            // console.log("Setting start time of new url", url);
            let startTime = Time(Date.now());
            let endTime = Time(Date.now());
            if (iconUrl === '') {
                iconUrl = 'icons/sad.png';
            }

            localObservedTabs.set(url, [startTime, endTime, iconUrl]);
            observedTabs = Array.from(localObservedTabs);
        }
        save();

    });


}

// function to load current tab
function getCurrentTab(_tabId) {

    chrome.tabs.get((_tabId),(response) => {
        if (chrome.runtime.lastError) {
            getCurrentTab(_tabId);
        }
        else {
            getCurrentTime((_currentTime) => {
                currentTime = _currentTime;
                let url = Url(response.url);
                currentUrl = url;
                updateTime(url, _currentTime, 'startTime', response.favIconUrl);
            });
        }
    });
}



// active tab changed
chrome.tabs.onActivated.addListener((activeInfo) => {
    console.log('Active Tab');
    let tabId = activeInfo.tabId;
    let m_currentTime = Time(Date.now());
    console.log(observedTabs);
    currentTime = m_currentTime;

    getCurrentUrl((_currentUrl) => {
        currentUrl = _currentUrl;
        updateTime(_currentUrl, m_currentTime, 'stopTime')
        .then(getCurrentTab(tabId));
    });
});

// url of current tab changed
chrome.tabs.onUpdated.addListener((id, changeInfo, tab) => {
    console.log("Updated");

    if (changeInfo.hasOwnProperty('url')) {
        // console.log(changeInfo.url, 'On url of tab changed');
        let m_currentTime = Time(Date.now());
        currentTime = m_currentTime;

        getCurrentUrl((_currentUrl) => {
            currentUrl = _currentUrl;
            updateTime(_currentUrl, m_currentTime, 'stopTime').
            then(getCurrentTab(tab.id));
        });
    }
});

// // an existing window is closed

// chrome.windows.onRemoved.addListener((id) => {
// console.log("on window closed");

// });

// window switched
chrome.windows.onFocusChanged.addListener((id) => {
    console.log("Window changed", id, new Date());
    let m_currentTime = Time(Date.now());

    currentTime = m_currentTime
    getCurrentUrl((_currentUrl) => {
        currentUrl = _currentUrl;

        getCurrentTime((_currentTime) => {
            currentTime = _currentTime;
    
            if (id !== chrome.windows.WINDOW_ID_NONE) {
                //chrome.tabs.query({windowId: id, active: true}, (tab) => {
                    //let id = tab[0].id;
                    // console.log("WINDOW CHANGE!");

                    getChromeState((_chromeState) => {
                        chromeState = _chromeState;
                        if (_chromeState === 'inactive') {

                            chromeState = 'active';
                        } else {
                            updateTime(_currentUrl, _currentTime, 'stopTime');
                        }
                        currentTab();
                    });
                // });
            } else {

                getChromeState((_chromeState) => {
                    chromeState = _chromeState;
                    if (_chromeState === 'active') {
                        updateTime(_currentUrl, _currentTime, 'stopTime');
                    } 
                });
            }
        });    
    });
});

// get currently focussed tab after state becomes active
function currentTab() {
    chrome.tabs.getCurrent((tab) => {
        if (tab === undefined) {
            currentTab();
        } else {
            let id = tab.id;
            getCurrentTab(id);
            //updateTime(currentUrl, currentTime, 'startTime');
            console.log(newState, currentUrl, new Date());
        }
    });
}

// when all chrome windows lose focus/ different application gains focus
chrome.idle.onStateChanged.addListener(newState => {
    console.log('Inside idle', newState, new Date());
    if (newState === "idle" || newState === "locked") {
        let m_currentTime = Time(Date.now());

        getChromeState((_chromeState) => {
            chromeState = _chromeState;
            if (_chromeState === 'active') {

                chromeState = 'inactive';

                currentTime = m_currentTime;

                    getCurrentUrl((_currentUrl) => {
                        currentUrl = _currentUrl;
                        updateTime(_currentUrl, currentTime, 'stopTime');
                        console.log(newState, _currentUrl, new Date());              
                    });
                //});
            }
        });

    } else if (newState === 'active') {
        let m_currentTime = Time(Date.now());
        currentTime = m_currentTime;
        currentTab();
    } 
});

chrome.runtime.onSuspend.addListener(() => {
    getObservedTabs((_observedTabs) => {
        observedTabs = _observedTabs;
        chrome.storage.sync.set({"observedTabs": _observedTabs});
    });
    getCurrentTime((_currentTime) => {
        currentTime = _currentTime;
        chrome.storage.sync.set({"currentTime": _currentTime});
    });
    getCurrentUrl((_currentUrl) => {
        currentUrl = _currentUrl;
        chrome.storage.sync.set({"currentUrl": _currentUrl});
    });
    getChromeState((_chromeState) => {
        chromeState = _chromeState;
        chrome.storage.sync.set({"chromeState": _chromeState})
    })
});

function save() {
    getObservedTabs((_observedTabs) => {
        observedTabs = _observedTabs;
        chrome.storage.sync.set({"observedTabs": _observedTabs});
    });
    getCurrentTime((_currentTime) => {
        currentTime = _currentTime;
        chrome.storage.sync.set({"currentTime": _currentTime});
    });
    getCurrentUrl((_currentUrl) => {
        currentUrl = _currentUrl;
        chrome.storage.sync.set({"currentUrl": _currentUrl});
    });
    getChromeState((_chromeState) => {
        chromeState = _chromeState;
        chrome.storage.sync.set({"chromeState": _chromeState})
    })

}