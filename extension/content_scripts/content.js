/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

let port = chrome.runtime.connect();

function reportStatus(statusText) {
  // console.log("report status based on text: " + statusText);
  let unlogin = (statusText || "unlogin").split(/\s/).includes("unlogin");
  port.postMessage({
    "status": (unlogin ? "loggedout" : "loggedin")
  });
}

let attributeName = "class";
let statusObserver = new MutationObserver(function(mutations) {
  mutations.forEach(function(mutation) {
    if (mutation.type !== "attributes" ||
        mutation.attributeName !== attributeName) {
      return;      
    }
    reportStatus(mutation.target.getAttribute(mutation.attributeName));
  });
});
let statusObserverConfig = {
  attributeFilter: [attributeName]
};

let titleObserver = new MutationObserver(function(mutations) {
  mutations.forEach(function(mutation) {
    if (mutation.type !== "childList") {
      return;      
    }
    let unreadCount = /\((\d+)\)$/.exec(mutation.target.textContent);
    if (unreadCount) {
      port.postMessage({
        "status": "loggedin",
        "unread": unreadCount[1]
      });
    }
  });
});
let titleObserverConfig = {
  childList: true
};

function init() {
  statusObserver.observe(document.body, statusObserverConfig);
  reportStatus(document.body.getAttribute(attributeName));
  titleObserver.observe(document.querySelector("title"), titleObserverConfig);

  window.addEventListener("unload", function(evt) {
    // console.log("got unload event");
    port.postMessage({
      "status": "loggedout"
    });
    port.disconnect();
    port = undefined;
  }, false);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", function(evt) {
    // console.log("init after got DOMContentLoaded event");
    init();
  }, false);
} else {
  // console.log("init as already interactive or later");
  init();
}
// console.log("content.js loaded");
