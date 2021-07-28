
// function to display time
function totalTime(seconds) {
    let days = Math.floor(seconds/(60*60*24));
    let hours = Math.floor((seconds%(60*60*24))/60/60);
    let minutes = Math.floor((seconds%(3600))/60);
    seconds = Math.floor((seconds%(3600))%60);
    let showTime;
    if (days !== 0)
        showTime = `${days} d ` + `${hours} h ` + `${minutes} m ` + `${seconds} s`;
    else if (hours !== 0)
        showTime = `${hours} h ` + `${minutes} m ` + `${seconds} s`;
    else if (minutes !== 0)
        showTime = `${minutes} m ` + `${seconds} s`;  
    else 
        showTime = `${seconds} s`;

    return showTime;
}


let endTime = Date.now();
chrome.runtime.sendMessage({
    message: 'get_url'
}, response => {
    if (response.message === 'success') {
        tabUrl = response.bg_currentUrl;
        console.log("payload", tabUrl);
        observedTabs = response.bg_observedTabs;
        
        observedTabs = observedTabs.sort(sortFunction);
        console.log('From popup', observedTabs);

        for (i = 0; i < observedTabs.length; i++) {
            let url = observedTabs[i][0];
            let timeNow = observedTabs[i][1][1];
            if (tabUrl === url){
                timeNow = Math.floor(Date.now()/1000);
                appendToList(timeNow, observedTabs, url, 1);
            } 
        }

        for (i = 0; i < Math.min(observedTabs.length, 9); i++) {
            let url = observedTabs[i][0];
            if (url === 'www.xyz.com' || url === '' || tabUrl === url) {
                continue;
            }
            let timeNow = observedTabs[i][1][1];
            appendToList(timeNow, observedTabs, url);
        }
    //});
    } else {
        console.log("Message receive failed!");
    }
});




function sortFunction(a, b) {  
    return (- (a[1][1] - a[1][0]) + (b[1][1] - b[1][0]));
}


function appendToList(timeNow, observedTabs, url, first = 0) {
    let timeSpent = timeNow - observedTabs[i][1][0];
    let icon = observedTabs[i][1][2];
    let iconItem = document.createElement('img');
    iconItem.src = icon;

    console.log(observedTabs[i][0]);
    let item = document.createElement('li');
    if (first) {
        item.style.fontSize = "16px";
        item.style.color = "rgb(250, 250, 250)";        
    } else {
        item.style.color = "rgb(190, 180, 180)";
    }
    item.appendChild(iconItem);
    item.appendChild(document.createTextNode(' ' + url + ' : ' + totalTime(timeSpent)));
    
    let list = document.getElementById('tablist');
    list.appendChild(item);
}



