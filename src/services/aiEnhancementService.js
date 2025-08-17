const { GoogleGenerativeAI } = require('@google/generative-ai');
const logger = require('../utils/logger');

class AIEnhancementService {
    constructor() {
        this.gemini = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        this.model = this.gemini.getGenerativeModel({ model: 'gemini-1.5-flash' });
        this.enabled = !!process.env.GEMINI_API_KEY;

        if (!this.enabled) {
            logger.warn('Gemini API key not provided. AI enhancement features will be disabled.');
        }
    }

    async enhanceDescription(rawDescription, brandName = '', url = '') {
        if (!this.enabled) {
            logger.info('AI enhancement disabled - returning original description');
            return this.fallbackEnhancement(rawDescription);
        }
        if (!rawDescription || rawDescription.trim().length < 10) {
            logger.info('Description too short for AI enhancement');
            return rawDescription || 'No description available';
        }

        try {
            logger.info(`Enhancing description for ${brandName || url}`);

            const prompt = this.buildEnhancementPrompt(rawDescription, brandName, url);

            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            const enhancedDescription = response.text().trim();

            if (enhancedDescription && enhancedDescription.length > 0) {
                logger.info(`Successfully enhanced description (${rawDescription.length} -> ${enhancedDescription.length} chars)`);
                return this.sanitizeEnhancedDescription(enhancedDescription);
            } else {
                logger.warn('AI enhancement returned empty result, using fallback');
                return this.fallbackEnhancement(rawDescription);
            }

        } catch (error) {
            logger.error(`AI enhancement failed: ${error.message}`);
            if (error.message.includes('API key')) {
                logger.error('Invalid Gemini API key');
            } else if (error.message.includes('quota') || error.message.includes('limit')) {
                logger.warn('Gemini API quota/rate limit exceeded, using fallback');
            }
            return this.fallbackEnhancement(rawDescription);
        }
    }

    buildEnhancementPrompt(rawDescription, brandName, url) {
        let prompt = `You are an expert content editor specializing in making website descriptions clear, engaging, and professional. Focus on clarity, proper grammar, and readability while maintaining the original meaning.
                      Please enhance the following website description to improve its readability and professionalism:
                      Original Description: "${rawDescription}"`;

        if (brandName) {
            prompt += `Brand/Company: ${brandName}\n`;
        }

        if (url) {
            prompt += `Website: ${url}\n`;
        }

        prompt += `
Instructions:
1. Improve grammar, punctuation, and sentence structure
2. Make the description more engaging and professional
3. Keep the core meaning and key information intact
4. Ensure it's concise (maximum 200 words)
5. Remove any technical jargon or HTML artifacts
6. Make it suitable for a business directory or search results
7. Do not add information that wasn't in the original description
8. Return only the enhanced description without quotes or additional text

Enhanced Description:`;

        return prompt;
    }

    sanitizeEnhancedDescription(description) {
        // Remove quotes if the AI wrapped the response in them
        description = description.replace(/^["']|["']$/g, '');

        // Remove any "Enhanced Description:" prefixes
        description = description.replace(/^Enhanced Description:\s*/i, '');

        // Clean up any HTML artifacts
        description = description.replace(/<[^>]*>/g, '');

        // Normalize whitespace
        description = description.replace(/\s+/g, ' ').trim();

        // Limit length
        if (description.length > 1000) {
            description = description.substring(0, 997) + '...';
        }

        return description;
    }

    fallbackEnhancement(rawDescription) {
        if (!rawDescription || rawDescription.trim().length === 0) {
            return 'No description available';
        }

        let enhanced = rawDescription.trim();

        enhanced = enhanced.replace(/<[^>]*>/g, ''); // Remove HTML tags
        enhanced = enhanced.replace(/\s+/g, ' '); // Normalize whitespace
        enhanced = enhanced.replace(/([.!?])\s*([a-z])/g, '$1 $2'); // Fix spacing after punctuation

        // Capitalize first letter
        enhanced = enhanced.charAt(0).toUpperCase() + enhanced.slice(1);

        // Ensure it ends with proper punctuation
        if (!/[.!?]$/.test(enhanced)) {
            enhanced += '.';
        }

        // Limit length
        if (enhanced.length > 1000) {
            enhanced = enhanced.substring(0, 997) + '...';
        }

        return enhanced;
    }

    isAvailable() {
        return this.enabled;
    }
    getStats() {
        return {
            enabled: this.enabled,
            model: 'gemini-1.5-flash',
            fallbackMode: !this.enabled
        };
    }
}

module.exports = AIEnhancementService;
