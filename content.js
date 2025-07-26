// Content script for Fiverr Brief Monitor
console.log('Fiverr Brief Monitor content script loaded on:', window.location.href);

// Add debug mode check
function isDebugMode() {
  return window.location.search.includes('debug=true') || 
         localStorage.getItem('fiverrMonitorDebug') === 'true';
}

// Enhanced logging
function debugLog(message, data = null) {
  if (isDebugMode()) {
    console.log(`[Fiverr Monitor] ${message}`, data || '');
  }
}

// Listen for messages from background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'checkPage') {
    checkForBriefs();
    sendResponse({ success: true });
  }
  return true; // Keep message channel open for async response
});

function checkForBriefs() {
  try {
    debugLog('Checking page for briefs...');
    
    // Wait a moment for page to be fully ready
    setTimeout(() => {
      performBriefCheck();
    }, 500);
    
  } catch (error) {
    console.error('Error in checkForBriefs:', error);
  }
}

function performBriefCheck() {
  try {
    debugLog('Performing brief check on URL:', window.location.href);
    
    // Check 1: Look for "No new brief matches..." text
    const noBriefElements = document.querySelectorAll('h4, h3, h2, [class*="no-brief"], [class*="empty"]');
    let hasNoBriefText = false;
    
    for (let element of noBriefElements) {
      if (element.textContent.includes('No new brief matches')) {
        hasNoBriefText = true;
        debugLog('Found "no brief" text:', element.textContent);
        break;
      }
    }
    
    // Check 2: Count "View brief" buttons
    const viewBriefButtons = document.querySelectorAll('button[aria-label="View brief"], button:contains("View brief")');
    const hasViewBriefButton = viewBriefButtons.length > 0;
    debugLog('View brief buttons found:', viewBriefButtons.length);
    
    // Check 3: Count "Not interested" buttons  
    const notInterestedButtons = document.querySelectorAll('button[aria-label="Not interested"], button:contains("Not interested")');
    const hasNotInterestedButton = notInterestedButtons.length > 0;
    debugLog('Not interested buttons found:', notInterestedButtons.length);
    
    // Count total briefs (should match view brief buttons)
    const briefCount = viewBriefButtons.length;
    
    const results = {
      hasNoBriefText: !hasNoBriefText, // Invert because we want to know if there ARE briefs
      hasViewBriefButton,
      hasNotInterestedButton,
      briefCount
    };
    
    debugLog('Brief check results:', results);
    
    // Send results to background script
    chrome.runtime.sendMessage({
      action: 'briefsFound',
      data: results
    }).catch(error => {
      console.error('Error sending message to background:', error);
    });
    
    // Add visual indicators for debugging
    if (isDebugMode()) {
      addDebugIndicators(results);
    }
    
  } catch (error) {
    console.error('Error in performBriefCheck:', error);
  }
}

function addDebugIndicators(data) {
  // Remove existing debug indicators
  const existingIndicator = document.getElementById('fiverr-monitor-debug');
  if (existingIndicator) {
    existingIndicator.remove();
  }
  
  // Create debug indicator
  const debugDiv = document.createElement('div');
  debugDiv.id = 'fiverr-monitor-debug';
  debugDiv.style.cssText = `
    position: fixed;
    top: 10px;
    right: 10px;
    background: #000;
    color: #fff;
    padding: 10px;
    border-radius: 5px;
    font-size: 12px;
    z-index: 10000;
    max-width: 200px;
  `;
  
  debugDiv.innerHTML = `
    <strong>Brief Monitor Debug</strong><br>
    No Brief Text: ${data.hasNoBriefText ? '✅' : '❌'}<br>
    View Brief Buttons: ${data.hasViewBriefButton ? '✅' : '❌'} (${data.briefCount})<br>
    Not Interested Buttons: ${data.hasNotInterestedButton ? '✅' : '❌'}<br>
    Total Briefs: ${data.briefCount}
  `;
  
  document.body.appendChild(debugDiv);
  
  // Remove after 5 seconds
  setTimeout(() => {
    if (debugDiv.parentNode) {
      debugDiv.parentNode.removeChild(debugDiv);
    }
  }, 5000);
}

// Enhanced brief detection with more robust selectors
function enhancedBriefCheck() {
  const results = {
    hasNoBriefText: false,
    hasViewBriefButton: false,
    hasNotInterestedButton: false,
    briefCount: 0
  };
  
  // Multiple ways to detect "no briefs" message
  const noBriefSelectors = [
    'h4:contains("No new brief matches")',
    '[class*="no-brief"]',
    'h4',
    '.empty-state h4'
  ];
  
  for (const selector of noBriefSelectors) {
    const elements = document.querySelectorAll(selector);
    for (const element of elements) {
      if (element.textContent.includes('No new brief matches')) {
        results.hasNoBriefText = false; // No briefs available
        break;
      }
    }
  }
  
  // If no "no briefs" message found, assume there are briefs
  if (!results.hasNoBriefText) {
    results.hasNoBriefText = true; // There are briefs
  }
  
  // Count action buttons
  const viewButtons = document.querySelectorAll('button[aria-label="View brief"], button:contains("View brief")');
  const notInterestedButtons = document.querySelectorAll('button[aria-label="Not interested"], button:contains("Not interested")');
  
  results.hasViewBriefButton = viewButtons.length > 0;
  results.hasNotInterestedButton = notInterestedButtons.length > 0;
  results.briefCount = viewButtons.length;
  
  return results;
}

// Initialize content script
document.addEventListener('DOMContentLoaded', () => {
  debugLog('Fiverr briefs page loaded, ready for monitoring');
});

// Add debug mode toggle (type in console: enableFiverrDebug() or disableFiverrDebug())
window.enableFiverrDebug = () => {
  localStorage.setItem('fiverrMonitorDebug', 'true');
  console.log('Fiverr Monitor debug mode enabled');
};

window.disableFiverrDebug = () => {
  localStorage.removeItem('fiverrMonitorDebug');
  console.log('Fiverr Monitor debug mode disabled');
};

// Also check when page content changes (for dynamic loading)
const observer = new MutationObserver((mutations) => {
  let shouldCheck = false;
  mutations.forEach((mutation) => {
    if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
      shouldCheck = true;
    }
  });
  
  if (shouldCheck) {
    // Debounce the check to avoid too many calls
    clearTimeout(window.briefCheckTimeout);
    window.briefCheckTimeout = setTimeout(() => {
      checkForBriefs();
    }, 1000);
  }
});

// Start observing
observer.observe(document.body, {
  childList: true,
  subtree: true
});

// Utility function to enhance button detection
function findButtonsByText(text) {
  const buttons = Array.from(document.querySelectorAll('button'));
  return buttons.filter(button => 
    button.textContent.includes(text) || 
    button.getAttribute('aria-label')?.includes(text)
  );
}

// AI Integration placeholder functions
window.fiverrMonitor = {
  // Future AI integration functions will go here
  analyzeProject: async function(projectData) {
    // This will use the stored API key to analyze projects
    console.log('AI analysis placeholder');
  },
  
  generateResponse: async function(projectDetails) {
    // This will generate custom responses to briefs
    console.log('AI response generation placeholder');
  }
};