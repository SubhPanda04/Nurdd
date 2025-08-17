const express = require('express');
const router = express.Router();
const supabase = require('../supabaseClient');
const WebsiteScrapingService = require('../services/scrapingService');
const { asyncHandler } = require('../middleware/errorHandler');
const { analysisRateLimit } = require('../middleware/security');
const {
    validateUrl,
    validateId,
    validateUpdateFields,
    checkValidationResult
} = require('../middleware/validation');
const logger = require('../utils/logger');

router.post('/analyze',
    analysisRateLimit,
    validateUrl,
    checkValidationResult,
    asyncHandler(async (req, res) => {
        const { url } = req.body;

        const { url } = req.body;

        logger.info(`Analysis request for URL: ${url}`);

        // Scrape the website
        const scrapingResult = await WebsiteScrapingService.scrapeWebsite(url);

        if (!scrapingResult.success) {
            return res.status(422).json({
                error: 'Failed to scrape website',
                details: scrapingResult.error,
                errorCategory: scrapingResult.errorCategory
            });
        }

        // Store in database
        const { data, error } = await supabase
            .from('website_analysis')
            .insert({
                url: scrapingResult.url,
                brand_name: scrapingResult.brandName,
                description: scrapingResult.description
            })
            .select();

        if (error) {
            logger.error('Database error during analysis:', error);
            return res.status(500).json({ error: 'Failed to store analysis result' });
        }

        logger.info(`Analysis completed successfully for URL: ${url}`);
        res.status(201).json({
            message: 'Website analyzed successfully',
            data: data[0]
        });
    })
);

// GET all website records
router.get('/', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('website_analysis')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Database error:', error);
            return res.status(500).json({ error: 'Failed to retrieve website records' });
        }

        res.json({
            message: 'Website records retrieved successfully',
            count: data.length,
            data: data
        });

    } catch (error) {
        console.error('Get websites error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET single website record by ID
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        if (!id || isNaN(id)) {
            return res.status(400).json({ error: 'Valid ID is required' });
        }

        const { data, error } = await supabase
            .from('website_analysis')
            .select('*')
            .eq('id', id)
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                return res.status(404).json({ error: 'Website record not found' });
            }
            console.error('Database error:', error);
            return res.status(500).json({ error: 'Failed to retrieve website record' });
        }

        res.json({
            message: 'Website record retrieved successfully',
            data: data
        });

    } catch (error) {
        console.error('Get website error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// PUT update website record by ID
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { brand_name, description, enhanced_description } = req.body;

        if (!id || isNaN(id)) {
            return res.status(400).json({ error: 'Valid ID is required' });
        }

        if (!brand_name && !description && !enhanced_description) {
            return res.status(400).json({
                error: 'At least one field (brand_name, description, enhanced_description) is required for update'
            });
        }

        // Prepare update object with only provided fields
        const updateFields = {};
        if (brand_name !== undefined) updateFields.brand_name = brand_name;
        if (description !== undefined) updateFields.description = description;
        if (enhanced_description !== undefined) updateFields.enhanced_description = enhanced_description;
        updateFields.updated_at = new Date().toISOString();

        const { data, error } = await supabase
            .from('website_analysis')
            .update(updateFields)
            .eq('id', id)
            .select();

        if (error) {
            console.error('Database error:', error);
            return res.status(500).json({ error: 'Failed to update website record' });
        }

        if (data.length === 0) {
            return res.status(404).json({ error: 'Website record not found' });
        }

        res.json({
            message: 'Website record updated successfully',
            data: data[0]
        });

    } catch (error) {
        console.error('Update website error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// DELETE website record by ID
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        if (!id || isNaN(id)) {
            return res.status(400).json({ error: 'Valid ID is required' });
        }

        const { data, error } = await supabase
            .from('website_analysis')
            .delete()
            .eq('id', id)
            .select();

        if (error) {
            console.error('Database error:', error);
            return res.status(500).json({ error: 'Failed to delete website record' });
        }

        if (data.length === 0) {
            return res.status(404).json({ error: 'Website record not found' });
        }

        res.json({
            message: 'Website record deleted successfully',
            data: data[0]
        });

    } catch (error) {
        console.error('Delete website error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
