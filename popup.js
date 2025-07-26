// Popup script for Fiverr Brief Monitor
document.addEventListener('DOMContentLoaded', async () => {
    // Get DOM elements
    const statusIndicator = document.getElementById('statusIndicator');
    const statusText = document.getElementById('statusText');
    const lastCheck = document.getElementById('lastCheck');
    const monitoringToggle = document.getElementById('monitoringToggle');
    const intervalSelect = document.getElementById('intervalSelect');
    const testCheckBtn = document.getElementById('testCheck');
    const apiKeyInput = document.getElementById('apiKeyInput');
    const apiStatus = document.getElementById('apiStatus');
    const briefCount = document.getElementById('briefCount');
    const checkCount = document.getElementById('checkCount');
    
    // Load saved settings
    await loadSettings();
    
    // Update status
    await updateStatus();
    
    // Auto-start monitoring if enabled
    const settings = await chrome.storage.sync.get(['isEnabled']);
    if (settings.isEnabled) {
        await chrome.runtime.sendMessage({ action: 'startMonitoring' });
    }
    
    // Event listeners
    monitoringToggle.addEventListener('click', toggleMonitoring);
    intervalSelect.addEventListener('change', updateInterval);
    testCheckBtn.addEventListener('click', performTestCheck);
    apiKeyInput.addEventListener('input', saveApiKey);
    
    // Update UI every few seconds
    setInterval(updateStatus, 3000);
    
    async function loadSettings() {
        const settings = await chrome.storage.sync.get([
            'isEnabled',
            'checkInterval',
            'apiKey',
            'lastCheckTime',
            'totalChecksToday',
            'currentBriefCount'
        ]);
        
        // Update toggle
        if (settings.isEnabled) {
            monitoringToggle.classList.add('active');
        }
        
        // Update interval
        intervalSelect.value = settings.checkInterval || 60000;
        
        // Update API key
        if (settings.apiKey) {
            apiKeyInput.value = settings.apiKey;
            apiStatus.textContent = 'API key configured';
            apiStatus.classList.add('connected');
        }
        
        // Update stats
        briefCount.textContent = settings.currentBriefCount || 0;
        checkCount.textContent = settings.totalChecksToday || 0;
        
        // Update last check time
        if (settings.lastCheckTime) {
            const time = new Date(settings.lastCheckTime);
            lastCheck.textContent = `Last checked: ${time.toLocaleTimeString()}`;
        }
    }
    
    async function updateStatus() {
        try {
            const response = await chrome.runtime.sendMessage({ action: 'getMonitoringStatus' });
            const isMonitoring = response.isMonitoring;
            
            if (isMonitoring) {
                statusIndicator.classList.add('active');
                statusText.textContent = 'Monitoring Active';
                monitoringToggle.classList.add('active');
            } else {
                statusIndicator.classList.remove('active');
                statusText.textContent = 'Monitoring Disabled';
                monitoringToggle.classList.remove('active');
            }
        } catch (error) {
            console.error('Error updating status:', error);
        }
    }
    
    async function toggleMonitoring() {
        const isCurrentlyActive = monitoringToggle.classList.contains('active');
        
        try {
            if (isCurrentlyActive) {
                await chrome.runtime.sendMessage({ action: 'stopMonitoring' });
                await chrome.storage.sync.set({ isEnabled: false });
            } else {
                await chrome.runtime.sendMessage({ action: 'startMonitoring' });
                await chrome.storage.sync.set({ isEnabled: true });
            }
            
            await updateStatus();
        } catch (error) {
            console.error('Error toggling monitoring:', error);
        }
    }
    
    async function updateInterval() {
        const newInterval = parseInt(intervalSelect.value);
        await chrome.storage.sync.set({ checkInterval: newInterval });
        
        // Restart monitoring with new interval if currently active
        const response = await chrome.runtime.sendMessage({ action: 'getMonitoringStatus' });
        if (response.isMonitoring) {
            await chrome.runtime.sendMessage({ action: 'stopMonitoring' });
            setTimeout(async () => {
                await chrome.runtime.sendMessage({ action: 'startMonitoring' });
            }, 500);
        }
    }
    
    async function performTestCheck() {
        // Prevent multiple simultaneous test checks
        if (testCheckBtn.disabled) return;
        
        testCheckBtn.textContent = 'Checking...';
        testCheckBtn.disabled = true;
        
        try {
            await chrome.runtime.sendMessage({ action: 'checkBriefs' });
            
            // Wait a moment for the check to complete
            setTimeout(async () => {
                // Update UI with latest data
                await loadSettings();
                
                const now = new Date();
                lastCheck.textContent = `Last checked: ${now.toLocaleTimeString()}`;
                
            }, 2000);
            
        } catch (error) {
            console.error('Error performing test check:', error);
        } finally {
            setTimeout(() => {
                testCheckBtn.textContent = 'Test Check Now';
                testCheckBtn.disabled = false;
            }, 3000); // Prevent rapid clicking
        }
    }
    
    async function saveApiKey() {
        const apiKey = apiKeyInput.value.trim();
        await chrome.storage.sync.set({ apiKey });
        
        if (apiKey) {
            apiStatus.textContent = 'API key configured';
            apiStatus.classList.add('connected');
        } else {
            apiStatus.textContent = 'API key not configured';
            apiStatus.classList.remove('connected');
        }
    }
    
    // Reset daily stats at midnight
    function resetDailyStats() {
        const now = new Date();
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);
        
        const msUntilMidnight = tomorrow.getTime() - now.getTime();
        
        setTimeout(() => {
            chrome.storage.sync.set({ totalChecksToday: 0 });
            checkCount.textContent = '0';
            
            // Set up daily reset for subsequent days
            setInterval(() => {
                chrome.storage.sync.set({ totalChecksToday: 0 });
                checkCount.textContent = '0';
            }, 24 * 60 * 60 * 1000); // 24 hours
        }, msUntilMidnight);
    }
    
    // Initialize daily stats reset
    resetDailyStats();
    
    // Listen for brief count updates from background script
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === 'statsUpdate') {
            briefCount.textContent = request.data.briefCount;
            checkCount.textContent = request.data.checkCount;
            
            const time = new Date(request.data.lastCheckTime);
            lastCheck.textContent = `Last checked: ${time.toLocaleTimeString()}`;
            
            // Update storage
            chrome.storage.sync.set({
                currentBriefCount: request.data.briefCount,
                totalChecksToday: request.data.checkCount,
                lastCheckTime: request.data.lastCheckTime
            });
        }
    });
});