// Background service worker for Fiverr Brief Monitor
let monitoringInterval = null;
let isMonitoring = false;

// Initialize extension
chrome.runtime.onInstalled.addListener(() => {
  console.log('Fiverr Brief Monitor installed');
  
  // Set default settings
  chrome.storage.sync.set({
    isEnabled: true, // Enable by default
    checkInterval: 60000, // 1 minute in milliseconds
    apiKey: '',
    lastNotificationTime: 0,
    totalChecksToday: 0
  });
});

// Listen for messages from popup and content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.action) {
    case 'startMonitoring':
      startMonitoring();
      sendResponse({ success: true });
      break;
    
    case 'stopMonitoring':
      stopMonitoring();
      sendResponse({ success: true });
      break;
    
    case 'getMonitoringStatus':
      sendResponse({ isMonitoring });
      break;
    
    case 'checkBriefs':
      // Prevent multiple simultaneous checks
      if (!window.checkingInProgress) {
        window.checkingInProgress = true;
        checkForNewBriefs().finally(() => {
          window.checkingInProgress = false;
        });
      }
      sendResponse({ success: true });
      break;
    
    case 'briefsFound':
      handleBriefsFound(request.data);
      sendResponse({ success: true });
      break;
  }
});

async function startMonitoring() {
  if (isMonitoring) return;
  
  const settings = await chrome.storage.sync.get(['checkInterval']);
  const interval = settings.checkInterval || 60000;
  
  isMonitoring = true;
  
  // Persist the monitoring state
  await chrome.storage.sync.set({ isEnabled: true });
  
  console.log(`Started monitoring with ${interval}ms interval`);
  
  // Start checking immediately
  checkForNewBriefs();
  
  // Set up recurring checks
  monitoringInterval = setInterval(() => {
    // Double-check that monitoring is still enabled
    chrome.storage.sync.get(['isEnabled']).then(settings => {
      if (settings.isEnabled) {
        checkForNewBriefs();
      } else {
        // Stop monitoring if disabled elsewhere
        stopMonitoring();
      }
    });
  }, interval);
}

function stopMonitoring() {
  if (monitoringInterval) {
    clearInterval(monitoringInterval);
    monitoringInterval = null;
  }
  isMonitoring = false;
  
  // Persist the monitoring state
  chrome.storage.sync.set({ isEnabled: false });
  
  console.log('Stopped monitoring');
}

async function checkForNewBriefs() {
  try {
    // Get all tabs with Fiverr briefs page (including pinned and regular tabs)
    const tabs = await chrome.tabs.query({
      url: "https://www.fiverr.com/briefs/overview/matches*"
    });
    
    console.log(`Found ${tabs.length} existing Fiverr brief tabs`);
    
    let messagesSent = false;
    
    // Try to use existing tabs first (prioritize pinned tabs)
    const sortedTabs = tabs.sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return 0;
    });
    
    for (const tab of sortedTabs) {
      try {
        console.log(`Attempting to check tab ${tab.id} (pinned: ${tab.pinned})`);
        await chrome.tabs.sendMessage(tab.id, { action: 'checkPage' });
        messagesSent = true;
        console.log(`Successfully sent message to tab ${tab.id}`);
        break; // Use the first working tab
      } catch (error) {
        console.log(`Could not send message to tab ${tab.id}:`, error.message);
        continue; // Try next tab
      }
    }
    
    // Only create a new tab if no existing tabs worked
    if (!messagesSent) {
      console.log('No existing tabs responded, creating background tab');
      await createBackgroundTab();
    }
  } catch (error) {
    console.error('Error checking for briefs:', error);
  }
}

async function createBackgroundTab() {
  try {
    const tab = await chrome.tabs.create({
      url: 'https://www.fiverr.com/briefs/overview/matches',
      active: false
    });
    
    // Wait for the tab to load, then check
    chrome.tabs.onUpdated.addListener(function listener(tabId, changeInfo) {
      if (tabId === tab.id && changeInfo.status === 'complete') {
        chrome.tabs.onUpdated.removeListener(listener);
        setTimeout(async () => {
          try {
            // Inject content script manually if needed
            await chrome.scripting.executeScript({
              target: { tabId: tab.id },
              files: ['content.js']
            });
            
            // Wait a bit more for the script to load
            setTimeout(async () => {
              try {
                await chrome.tabs.sendMessage(tab.id, { action: 'checkPage' });
                // Close the background tab after checking
                chrome.tabs.remove(tab.id);
              } catch (err) {
                console.error('Error sending message to background tab:', err);
                chrome.tabs.remove(tab.id);
              }
            }, 1000);
          } catch (err) {
            console.error('Error injecting script:', err);
            chrome.tabs.remove(tab.id);
          }
        }, 3000); // Wait 3 seconds for page to fully load
      }
    });
  } catch (error) {
    console.error('Error creating background tab:', error);
  }
}

async function handleBriefsFound(data) {
  const { hasNoBriefText, hasViewBriefButton, hasNotInterestedButton, briefCount } = data;
  
  console.log('Processing brief check results:', data);
  
  // Update badge immediately
  if (briefCount > 0) {
    chrome.action.setBadgeText({ text: briefCount.toString() });
    chrome.action.setBadgeBackgroundColor({ color: '#1DBF73' }); // Fiverr green
  } else {
    chrome.action.setBadgeText({ text: '' });
  }
  
  // Update stored stats
  const settings = await chrome.storage.sync.get(['totalChecksToday']);
  const newCheckCount = (settings.totalChecksToday || 0) + 1;
  
  chrome.storage.sync.set({ 
    currentBriefCount: briefCount,
    totalChecksToday: newCheckCount,
    lastCheckTime: Date.now()
  });
  
  // Send update to popup if it's open
  try {
    chrome.runtime.sendMessage({
      action: 'statsUpdate',
      data: {
        briefCount,
        checkCount: newCheckCount,
        lastCheckTime: Date.now()
      }
    });
  } catch (error) {
    // Popup might not be open, that's fine
  }
  
  // Determine notification type based on checks
  let notificationType = 'none';
  let notificationMessage = '';
  
  const checksMetThreshold = [!hasNoBriefText, hasViewBriefButton, hasNotInterestedButton].filter(Boolean).length;
  
  if (checksMetThreshold >= 2) {
    notificationType = 'confirmed';
    notificationMessage = `Hurry! You have ${briefCount} new brief${briefCount !== 1 ? 's' : ''}!`;
  } else if (checksMetThreshold === 1) {
    notificationType = 'potential';
    notificationMessage = 'You may have some new briefs!';
  }
  
  if (notificationType !== 'none') {
    // Check if we should throttle notifications (don't spam)
    const settings = await chrome.storage.sync.get(['lastNotificationTime']);
    const now = Date.now();
    const lastNotification = settings.lastNotificationTime || 0;
    
    // Only send notification if last one was more than 5 minutes ago
    if (now - lastNotification > 300000) {
      showNotification(notificationMessage, notificationType);
      chrome.storage.sync.set({ lastNotificationTime: now });
    }
  }
}

function showNotification(message, type) {
  const iconPath = type === 'confirmed' ? 'icons/icon48.png' : 'icons/icon48.png';
  
  chrome.notifications.create({
    type: 'basic',
    iconUrl: iconPath,
    title: 'Fiverr Brief Monitor',
    message: message,
    priority: type === 'confirmed' ? 2 : 1
  });
}

// Handle notification clicks
chrome.notifications.onClicked.addListener(() => {
  chrome.tabs.create({
    url: 'https://www.fiverr.com/briefs/overview/matches'
  });
});

// Initialize on startup
chrome.runtime.onStartup.addListener(async () => {
  const settings = await chrome.storage.sync.get(['isEnabled']);
  if (settings.isEnabled) {
    startMonitoring();
  }
});

// Also check when service worker wakes up
chrome.runtime.onConnect.addListener(() => {
  chrome.storage.sync.get(['isEnabled']).then(settings => {
    if (settings.isEnabled && !isMonitoring) {
      startMonitoring();
    }
  });
});