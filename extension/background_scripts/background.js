/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

let wechatPort;
let wechatTabId;
let wechatWinId;

function handleBrowserActionClick(tab) {
  if (wechatPort) {
    switchToWeChatTab();
  } else {
    chrome.windows.update(tab.windowId, {
      focused: true
    }, function(win) {
      chrome.tabs.create({
        windowId: win.id,
        url: "https://wx.qq.com/",
        pinned: true
      });
    });
  }
}

function handlePortMessage(message) {
  // console.log("got message: " + JSON.stringify(message));
  if (message.status) {
    chrome.browserAction.setIcon({
      path: {
        "16": ("icons/" + message.status + "-16.png"),
        "32": ("icons/" + message.status + "-32.png")
      }
    });
  }
  if (message.unread) {
    chrome.tabs.get(wechatTabId, function(tab) {
      if (tab.active) {
        return;
      }

      chrome.browserAction.setBadgeText({
        text: message.unread
      });
    });
  }
}

function handleRuntimeConnect(port) {
  // console.log("got runtime.connect");

  if (wechatPort) {
    switchToWeChatTab(function(/** tab */) {
      chrome.tabs.remove(port.sender.tab.id);
    });
    return;
  }

  setupWeChatPort(port);
}

function handleTabActivated(activeInfo) {
  if (!wechatTabId || activeInfo.tabId !== wechatTabId) {
    return;
  }

  chrome.browserAction.setBadgeText({
    text: ""
  });
}

function handleWRHeadersReceived(details) {
  return {
    responseHeaders: contentDispositionHack(details.responseHeaders)
  };
}

function contentDispositionHack(headers) {
  for (let header of headers) {
    if (header.name.toLowerCase() !== "content-disposition") {
      continue;
    }

    let parts = header.value.split(/;\s*/);
    if (parts.length !== 2 ||
        parts[0] !== "attachment" ||
        !parts[1].startsWith("filename=%")) {
      continue;
    }

    let filename = parts[1].split("=")[1];
    try {
      decodeURIComponent(filename);
      parts.push(`filename*=UTF-8''${filename}`);
      header.value = parts.join("; ");
    } catch (ex) {}
  }

  return headers;
}

function setupWeChatPort(port) {
  wechatPort = port;
  wechatTabId = port.sender.tab.id;
  wechatWinId = port.sender.tab.windowId;

  port.onMessage.addListener(handlePortMessage);
  port.onDisconnect.addListener(function(evt) {
    // console.log("got port.disconnect");

    wechatPort = undefined;
    wechatTabId = undefined;
    wechatWinId = undefined;
  });
}

function switchToWeChatTab(callback) {
  chrome.windows.update(wechatWinId, {
    focused: true
  }, function(win) {
    chrome.tabs.update(wechatTabId, {
      active: true,
      pinned: true
    }, callback);
  });
}

chrome.browserAction.onClicked.addListener(handleBrowserActionClick);
chrome.runtime.onConnect.addListener(handleRuntimeConnect);
chrome.tabs.onActivated.addListener(handleTabActivated);
chrome.webRequest.onHeadersReceived.addListener(handleWRHeadersReceived,
  { urls: ["https://file.wx.qq.com/*"], types: ["main_frame"] },
  ["blocking", "responseHeaders"]);
// console.log("background.js loaded");
