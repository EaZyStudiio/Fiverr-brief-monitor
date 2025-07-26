// Configuration settings for Fiverr Brief Monitor Extension

const CONFIG = {
    // Extension settings
    EXTENSION: {
        NAME: 'Fiverr Brief Monitor',
        VERSION: '1.0.0',
        AUTHOR: 'Your Name',
        DESCRIPTION: 'Monitor Fiverr briefs and get notifications for new matches'
    },
    
    // Monitoring settings
    MONITORING: {
        DEFAULT_INTERVAL: 60000, // 1 minute
        MIN_INTERVAL: 30000,     // 30 seconds
        MAX_INTERVAL: 600000,    // 10 minutes
        NOTIFICATION_THROTTLE: 300000, // 5 minutes between notifications
        RETRY_ATTEMPTS: 3,
        RETRY_DELAY: 5000        // 5 seconds
    },
    
    // Fiverr page settings
    FIVERR: {
        BASE_URL: 'https://www.fiverr.com',
        BRIEFS_URL: 'https://www.fiverr.com/briefs/overview/matches',
        SELECTORS: {
            NO_BRIEFS_TEXT: 'h4',
            VIEW_BRIEF_BUTTON: 'button[aria-label="View brief"]',
            NOT_INTERESTED_BUTTON: 'button[aria-label="Not interested"]',
            PROJECT_TITLE: 'h1, h2, [class*="title"]',
            PROJECT_BUDGET: '*', // Will search for $ patterns
            PROJECT_DELIVERY: '*', // Will search for delivery patterns
            PROJECT_RESPONSES: '*' // Will search for response patterns
        },
        NO_BRIEFS_MESSAGES: [
            'No new brief matches...',
            'No briefs available',
            'No matches found'
        ]
    },
    
    // Notification settings
    NOTIFICATIONS: {
        TYPES: {
            CONFIRMED: {
                title: 'New Fiverr Briefs Available!',
                priority: 2,
                sound: true
            },
            POTENTIAL: {
                title: 'Possible New Briefs',
                priority: 1,
                sound: false
            }
        },
        MESSAGES: {
            CONFIRMED: 'Hurry! You have {count} new brief{s}!',
            POTENTIAL: 'You may have some new briefs!'
        }
    },
    
    // AI Integration settings
    AI: {
        SUPPORTED_PROVIDERS: [
            { id: 'openai', name: 'OpenAI', endpoint: 'https://api.openai.com/v1/chat/completions' },
            { id: 'anthropic', name: 'Anthropic', endpoint: 'https://api.anthropic.com/v1/messages' },
            { id: 'cohere', name: 'Cohere', endpoint: 'https://api.cohere.ai/v1/generate' }
        ],
        DEFAULT_PROVIDER: 'openai',
        DEFAULT_MODEL: 'gpt-3.5-turbo',
        MAX_TOKENS: 1000,
        TEMPERATURE: 0.7,
        ANALYSIS_CATEGORIES: [
            'complexity',
            'competitiveness', 
            'keyRequirements',
            'recommendedApproach',
            'challenges',
            'timeEstimate',
            'alignment'
        ]
    },
    
    // Debug settings
    DEBUG: {
        ENABLED: false, // Set to true for development
        LOG_LEVEL: 'info', // 'debug', 'info', 'warn', 'error'
        SHOW_VISUAL_INDICATORS: false,
        MOCK_DATA: false
    },
    
    // Storage keys
    STORAGE_KEYS: {
        IS_ENABLED: 'isEnabled',
        CHECK_INTERVAL: 'checkInterval',
        API_KEY: 'apiKey',
        AI_PROVIDER: 'aiProvider',
        AI_MODEL: 'aiModel',
        LAST_CHECK_TIME: 'lastCheckTime',
        LAST_NOTIFICATION_TIME: 'lastNotificationTime',
        TOTAL_CHECKS_TODAY: 'totalChecksToday',
        CURRENT_BRIEF_COUNT: 'currentBriefCount',
        USER_PROFILE: 'userProfile',
        NOTIFICATION_SETTINGS: 'notificationSettings'
    },
    
    // UI settings
    UI: {
        POPUP_WIDTH: 350,
        POPUP_HEIGHT: 400,
        THEME_COLORS: {
            PRIMARY: '#1DBF73',
            SECONDARY: '#667eea',
            SUCCESS: '#28a745',
            WARNING: '#ffc107',
            DANGER: '#dc3545',
            INFO: '#17a2b8'
        }
    }
};

// Utility functions for configuration
const ConfigUtils = {
    // Get interval options for UI
    getIntervalOptions() {
        return [
            { value: 30000, label: '30 seconds' },
            { value: 60000, label: '1 minute' },
            { value: 120000, label: '2 minutes' },
            { value: 300000, label: '5 minutes' },
            { value: 600000, label: '10 minutes' }
        ];
    },
    
    // Validate interval
    validateInterval(interval) {
        return interval >= CONFIG.MONITORING.MIN_INTERVAL && 
               interval <= CONFIG.MONITORING.MAX_INTERVAL;
    },
    
    // Format notification message
    formatNotificationMessage(type, count = 1) {
        const template = CONFIG.NOTIFICATIONS.MESSAGES[type.toUpperCase()];
        return template
            .replace('{count}', count)
            .replace('{s}', count !== 1 ? 's' : '');
    },
    
    // Get selector by name
    getSelector(name) {
        return CONFIG.FIVERR.SELECTORS[name.toUpperCase()];
    },
    
    // Check if debug mode is enabled
    isDebugMode() {
        return CONFIG.DEBUG.ENABLED;
    },
    
    // Log debug message
    debugLog(level, message, ...args) {
        if (!CONFIG.DEBUG.ENABLED) return;
        
        const levels = ['debug', 'info', 'warn', 'error'];
        const currentLevelIndex = levels.indexOf(CONFIG.DEBUG.LOG_LEVEL);
        const messageLevelIndex = levels.indexOf(level);
        
        if (messageLevelIndex >= currentLevelIndex) {
            console[level](`[Fiverr Monitor] ${message}`, ...args);
        }
    }
};

// Export configuration
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { CONFIG, ConfigUtils };
} else {
    window.CONFIG = CONFIG;
    window.ConfigUtils = ConfigUtils;
}