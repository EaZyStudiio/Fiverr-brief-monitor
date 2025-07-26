// AI Integration Module for Fiverr Brief Monitor
// This module will handle AI-powered features like project analysis and response generation

class AIIntegration {
    constructor() {
        this.apiKey = null;
        this.apiEndpoint = 'https://api.openai.com/v1/chat/completions'; // Default to OpenAI
        this.model = 'gpt-3.5-turbo';
        this.initialized = false;
    }
    
    async initialize() {
        try {
            const settings = await chrome.storage.sync.get(['apiKey', 'aiProvider', 'aiModel']);
            this.apiKey = settings.apiKey;
            this.apiEndpoint = this.getApiEndpoint(settings.aiProvider || 'openai');
            this.model = settings.aiModel || 'gpt-3.5-turbo';
            this.initialized = !!this.apiKey;
            return this.initialized;
        } catch (error) {
            console.error('Failed to initialize AI integration:', error);
            return false;
        }
    }
    
    getApiEndpoint(provider) {
        const endpoints = {
            'openai': 'https://api.openai.com/v1/chat/completions',
            'anthropic': 'https://api.anthropic.com/v1/messages',
            'cohere': 'https://api.cohere.ai/v1/generate'
        };
        return endpoints[provider] || endpoints['openai'];
    }
    
    async analyzeProject(projectData) {
        if (!this.initialized) {
            throw new Error('AI integration not initialized');
        }
        
        const prompt = this.createAnalysisPrompt(projectData);
        
        try {
            const response = await this.makeAPICall(prompt);
            return this.parseAnalysisResponse(response);
        } catch (error) {
            console.error('Project analysis failed:', error);
            throw error;
        }
    }
    
    createAnalysisPrompt(projectData) {
        return `Analyze this Fiverr project brief and provide insights:

Project Title: ${projectData.title || 'Not provided'}
Budget: ${projectData.budget || 'Not specified'}
Delivery Time: ${projectData.deliveryTime || 'Not specified'}
Posted: ${projectData.timePosted || 'Not specified'}
Responses: ${projectData.responseCount || 'Not specified'}
Description: ${projectData.description || 'Not provided'}

Please provide:
1. Project complexity assessment (1-5 scale)
2. Competitiveness analysis (based on budget and response count)
3. Key requirements extracted
4. Recommended approach
5. Potential challenges
6. Time estimation for completion
7. Whether this project aligns with typical freelancer skills

Format your response as JSON with these fields:
{
    "complexity": number,
    "competitiveness": "low|medium|high",
    "keyRequirements": [array of strings],
    "recommendedApproach": "string",
    "challenges": [array of strings],
    "timeEstimate": "string",
    "alignment": "poor|fair|good|excellent",
    "summary": "brief summary"
}`;
    }
    
    async generateProposalResponse(projectData, userProfile = {}) {
        if (!this.initialized) {
            throw new Error('AI integration not initialized');
        }
        
        const prompt = this.createProposalPrompt(projectData, userProfile);
        
        try {
            const response = await this.makeAPICall(prompt);
            return this.parseProposalResponse(response);
        } catch (error) {
            console.error('Proposal generation failed:', error);
            throw error;
        }
    }
    
    createProposalPrompt(projectData, userProfile) {
        return `Generate a professional Fiverr proposal for this project:

Project Details:
- Title: ${projectData.title || 'Not provided'}
- Budget: ${projectData.budget || 'Not specified'}
- Delivery Time: ${projectData.deliveryTime || 'Not specified'}
- Description: ${projectData.description || 'Not provided'}

Freelancer Profile:
- Skills: ${userProfile.skills || 'General freelancer'}
- Experience: ${userProfile.experience || 'Experienced professional'}
- Specialties: ${userProfile.specialties || 'Various areas'}

Create a compelling proposal that:
1. Addresses the client's specific needs
2. Highlights relevant experience
3. Provides a clear approach
4. Includes reasonable timeline
5. Shows value proposition
6. Maintains professional tone
7. Keeps it concise (200-300 words)

Format as JSON:
{
    "proposal": "full proposal text",
    "keyPoints": [array of main selling points],
    "suggestedTimeline": "recommended delivery time",
    "additionalQuestions": [questions to ask client if needed]
}`;
    }
    
    async makeAPICall(prompt) {
        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`
        };
        
        const payload = {
            model: this.model,
            messages: [
                {
                    role: 'system',
                    content: 'You are an AI assistant helping freelancers analyze Fiverr projects and create proposals. Provide practical, actionable insights.'
                },
                {
                    role: 'user',
                    content: prompt
                }
            ],
            max_tokens: 1000,
            temperature: 0.7
        };
        
        const response = await fetch(this.apiEndpoint, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(payload)
        });
        
        if (!response.ok) {
            throw new Error(`API call failed: ${response.status} ${response.statusText}`);
        }
        
        return await response.json();
    }
    
    parseAnalysisResponse(response) {
        try {
            const content = response.choices[0].message.content;
            return JSON.parse(content);
        } catch (error) {
            // Fallback if JSON parsing fails
            return {
                complexity: 3,
                competitiveness: 'medium',
                keyRequirements: ['Analysis failed - manual review needed'],
                recommendedApproach: 'Please review project manually',
                challenges: ['Could not analyze automatically'],
                timeEstimate: 'Unknown',
                alignment: 'fair',
                summary: 'Automatic analysis failed, manual review recommended'
            };
        }
    }
    
    parseProposalResponse(response) {
        try {
            const content = response.choices[0].message.content;
            return JSON.parse(content);
        } catch (error) {
            // Fallback if JSON parsing fails
            return {
                proposal: response.choices[0].message.content,
                keyPoints: ['Professional service delivery', 'Quality work', 'Timely completion'],
                suggestedTimeline: 'As specified',
                additionalQuestions: []
            };
        }
    }
    
    async testConnection() {
        if (!this.apiKey) {
            return { success: false, error: 'No API key provided' };
        }
        
        try {
            const testPrompt = 'Respond with "Connection successful" if you can read this message.';
            const response = await this.makeAPICall(testPrompt);
            return { 
                success: true, 
                message: 'AI integration working correctly',
                model: this.model 
            };
        } catch (error) {
            return { 
                success: false, 
                error: error.message 
            };
        }
    }
    
    // Helper method to extract project data from DOM
    static extractProjectDataFromDOM() {
        const projectData = {};
        
        try {
            // Extract title
            const titleElement = document.querySelector('h1, h2, [class*="title"]');
            if (titleElement) {
                projectData.title = titleElement.textContent.trim();
            }
            
            // Extract budget
            const budgetElements = document.querySelectorAll('*');
            for (const element of budgetElements) {
                const text = element.textContent;
                if (text.includes('$') && /\$\d+/.test(text)) {
                    const match = text.match(/\$(\d+(?:,\d{3})*(?:\.\d{2})?)/);
                    if (match) {
                        projectData.budget = match[0];
                        break;
                    }
                }
            }
            
            // Extract delivery time
            const deliveryElements = document.querySelectorAll('*');
            for (const element of deliveryElements) {
                const text = element.textContent.toLowerCase();
                if (text.includes('delivery') || text.includes('immediate')) {
                    projectData.deliveryTime = element.textContent.trim();
                    break;
                }
            }
            
            // Extract time posted
            const timeElements = document.querySelectorAll('*');
            for (const element of timeElements) {
                const text = element.textContent.toLowerCase();
                if (text.includes('posted') || text.includes('ago')) {
                    projectData.timePosted = element.textContent.trim();
                    break;
                }
            }
            
            // Extract responses count
            const responseElements = document.querySelectorAll('*');
            for (const element of responseElements) {
                const text = element.textContent.toLowerCase();
                if (text.includes('response')) {
                    projectData.responseCount = element.textContent.trim();
                    break;
                }
            }
            
            // Extract description (this would need more specific selectors)
            const descriptionElement = document.querySelector('[class*="description"], p');
            if (descriptionElement && descriptionElement.textContent.length > 50) {
                projectData.description = descriptionElement.textContent.trim();
            }
            
        } catch (error) {
            console.error('Error extracting project data:', error);
        }
        
        return projectData;
    }
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AIIntegration;
} else {
    window.AIIntegration = AIIntegration;
}