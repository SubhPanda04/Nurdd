const puppeteer = require('puppeteer');
const cheerio = require('cheerio');
const logger = require('../utils/logger');

class WebsiteScrapingService {

    static async scrapeWebsite(url) {
        let browser = null;
        try {
            if (!this.isValidUrl(url)) {
                throw new Error('Invalid URL format');
            }

            logger.info(`Starting scrape for URL: ${url}`);

            browser = await puppeteer.launch({
                headless: true,
                timeout: 30000,
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-accelerated-2d-canvas',
                    '--no-first-run',
                    '--no-zygote',
                    '--disable-gpu'
                ]
            });

            const page = await browser.newPage();
            await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
            await page.setViewport({ width: 1920, height: 1080 });
            await page.setDefaultNavigationTimeout(30000);
            await page.setDefaultTimeout(30000);

            // Navigate to the website with retry logic
            let content;
            let retries = 2;

            while (retries > 0) {
                try {
                    await page.goto(url, {
                        waitUntil: 'networkidle0',
                        timeout: 30000
                    });
                    content = await page.content();
                    break;
                } catch (navError) {
                    retries--;
                    if (retries === 0) throw navError;

                    logger.warn(`Navigation failed for ${url}, retrying... (${retries} attempts left)`);
                    await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds before retry
                }
            }

            // Parse with Cheerio
            const $ = cheerio.load(content);
            const brandName = this.extractBrandName($);
            const description = this.extractDescription($);

            logger.info(`Successfully scraped ${url}: Brand="${brandName}", Description length=${description.length}`);

            return {
                url,
                brandName,
                description,
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
                success: false,
                error: userFriendlyMessage,
                errorCategory,
                originalError: error.message
            };
        } finally {
            if (browser) {
                try {
                    await browser.close();
                } catch (closeError) {
                    logger.error(`Failed to close browser: ${closeError.message}`);
                }
            }
        }
    }

    static extractBrandName($) {
        let brandName =
            $('meta[property="og:site_name"]').attr('content') ||
            $('meta[name="application-name"]').attr('content') ||
            $('title').text().split(' - ')[0].split(' | ')[0] ||
            $('h1').first().text() ||
            $('header .logo').text() ||
            'Unknown Brand';

        return brandName.trim().substring(0, 255);
    }

    static extractDescription($) {
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
