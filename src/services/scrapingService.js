const puppeteer = require('puppeteer');
const cheerio = require('cheerio');
const logger = require('../utils/logger');
const AIEnhancementService = require('./aiEnhancementService');
const chromium = process.env.NODE_ENV === 'production'
    ? require('@sparticuz/chromium')
    : null;

class WebsiteScrapingService {

    constructor() {
        this.aiEnhancement = new AIEnhancementService();
    }

    static async scrapeWebsite(url, options = {}) {
        const instance = new WebsiteScrapingService();
        return await instance.scrapeWebsiteInstance(url, options);
    }

    async scrapeWebsiteInstance(url, options = {}) {
        let browser = null;
        try {
            if (!WebsiteScrapingService.isValidUrl(url)) {
                throw new Error('Invalid URL format');
            }

            logger.info(`Starting scrape for URL: ${url}`);

            // Configure browser launch options for production vs development
            const launchOptions = {
                headless: true,
                timeout: 20000, // Reduced timeout
                args: process.env.NODE_ENV === 'production'
                    ? [
                        ...chromium.args,
                        '--no-sandbox',
                        '--disable-setuid-sandbox',
                        '--disable-dev-shm-usage',
                        '--disable-accelerated-2d-canvas',
                        '--no-first-run',
                        '--single-process',
                        '--no-zygote',
                        '--disable-gpu',
                        '--memory-pressure-off',
                        '--max_old_space_size=100',
                        '--disable-background-timer-throttling',
                        '--disable-backgrounding-occluded-windows',
                        '--disable-renderer-backgrounding'
                    ]
                    : [
                        '--no-sandbox',
                        '--disable-setuid-sandbox',
                        '--disable-dev-shm-usage',
                        '--disable-accelerated-2d-canvas',
                        '--no-first-run',
                        '--no-zygote',
                        '--disable-gpu',
                        '--memory-pressure-off'
                    ]
            };

            // Set executable path for production (Render)
            if (process.env.NODE_ENV === 'production') {
                launchOptions.executablePath = await chromium.executablePath();
            }

            browser = await puppeteer.launch(launchOptions);

            const page = await browser.newPage();

            // Reduce memory usage
            await page.setViewport({ width: 1280, height: 720 }); // Smaller viewport
            await page.setDefaultNavigationTimeout(20000); // Reduced timeout
            await page.setDefaultTimeout(20000);            // Navigate to the website with retry logic
            let content;
            let retries = 1; // Reduced retries to save memory

            while (retries > 0) {
                try {
                    await page.goto(url, {
                        waitUntil: 'domcontentloaded', // Faster loading
                        timeout: 20000 // Reduced timeout
                    });
                    content = await page.content();
                    break;
                } catch (navError) {
                    retries--;
                    if (retries === 0) throw navError;

                    logger.warn(`Navigation failed for ${url}, retrying... (${retries} attempts left)`);
                    await new Promise(resolve => setTimeout(resolve, 1000)); // Reduced wait time
                }
            }

            // Parse with Cheerio
            const $ = cheerio.load(content);
            const brandName = this.extractBrandName($);
            const rawDescription = this.extractDescription($);

            // Enhanced AI processing for description
            const enhanceDescription = options.enhanceDescription !== false; // Default to true
            let description = rawDescription;

            if (enhanceDescription) {
                try {
                    description = await this.aiEnhancement.enhanceDescription(rawDescription, brandName, url);
                    logger.info(`Description enhanced using AI (${rawDescription.length} -> ${description.length} chars)`);
                } catch (enhanceError) {
                    logger.warn(`AI enhancement failed, using original description: ${enhanceError.message}`);
                    description = rawDescription;
                }
            }

            logger.info(`Successfully scraped ${url}: Brand="${brandName}", Description length=${description.length}`);

            return {
                url,
                brandName,
                description,
                rawDescription,
                enhanced: enhanceDescription && description !== rawDescription,
                aiStats: this.aiEnhancement.getStats(),
                success: true
            };

        } catch (error) {
            logger.error(`Scraping failed for ${url}: ${error.message}`);
            let errorCategory = 'UNKNOWN_ERROR';
            let userFriendlyMessage = error.message;

            if (error.message.includes('ERR_NAME_NOT_RESOLVED') || error.message.includes('ENOTFOUND')) {
                errorCategory = 'DOMAIN_NOT_FOUND';
                userFriendlyMessage = 'Website domain could not be found';
            } else if (error.message.includes('ERR_CONNECTION_REFUSED') || error.message.includes('ECONNREFUSED')) {
                errorCategory = 'CONNECTION_REFUSED';
                userFriendlyMessage = 'Website refused connection';
            } else if (error.message.includes('Navigation timeout') || error.message.includes('ETIMEDOUT')) {
                errorCategory = 'TIMEOUT';
                userFriendlyMessage = 'Website took too long to respond';
            } else if (error.message.includes('ERR_SSL_PROTOCOL_ERROR')) {
                errorCategory = 'SSL_ERROR';
                userFriendlyMessage = 'SSL certificate error';
            } else if (error.message.includes('ERR_TOO_MANY_REDIRECTS')) {
                errorCategory = 'REDIRECT_ERROR';
                userFriendlyMessage = 'Too many redirects';
            } else if (error.message.includes('Invalid URL format')) {
                errorCategory = 'INVALID_URL';
                userFriendlyMessage = 'Invalid URL format';
            }

            return {
                url,
                brandName: null,
                description: null,
                rawDescription: null,
                enhanced: false,
                success: false,
                error: userFriendlyMessage,
                errorCategory,
                originalError: error.message
            };
        } finally {
            if (browser) {
                try {
                    // Ensure all pages are closed
                    const pages = await browser.pages();
                    await Promise.all(pages.map(page => page.close()));

                    // Close browser
                    await browser.close();

                    // Force garbage collection if available
                    if (global.gc) {
                        global.gc();
                    }
                } catch (closeError) {
                    logger.error(`Failed to close browser: ${closeError.message}`);
                }
            }
        }
    }

    extractBrandName($) {
        let brandName =
            $('meta[property="og:site_name"]').attr('content') ||
            $('meta[name="application-name"]').attr('content') ||
            $('title').text().split(' - ')[0].split(' | ')[0] ||
            $('h1').first().text() ||
            $('header .logo').text() ||
            'Unknown Brand';

        return brandName.trim().substring(0, 255);
    }

    extractDescription($) {
        let description =
            $('meta[name="description"]').attr('content') ||
            $('meta[property="og:description"]').attr('content') ||
            $('meta[name="twitter:description"]').attr('content') ||
            $('p').first().text() ||
            'No description available';

        return description.trim().substring(0, 1000);
    }

    static isValidUrl(string) {
        try {
            const url = new URL(string);
            return url.protocol === 'http:' || url.protocol === 'https:';
        } catch (_) {
            return false;
        }
    }
}

module.exports = WebsiteScrapingService;
