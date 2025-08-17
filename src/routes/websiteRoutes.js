const express = require('express');
const router = express.Router();
const supabase = require('../supabaseClient');
const WebsiteScrapingService = require('../services/scrapingService');
const { asyncHandler } = require('../middleware/errorHandler');
const { analysisRateLimit } = require('../middleware/RateLimit');
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
        const { url, enhanceDescription = true } = req.body;

        logger.info(`Analysis request for URL: ${url} (AI enhancement: ${enhanceDescription})`);
        const scrapingResult = await WebsiteScrapingService.scrapeWebsite(url, {
            enhanceDescription
        });

        if (!scrapingResult.success) {
            return res.status(422).json({
                error: 'Failed to scrape website',
                details: scrapingResult.error,
                errorCategory: scrapingResult.errorCategory
            });
        }

        const { data, error } = await supabase
            .from('website_analysis')
            .insert({
                url: scrapingResult.url,
                brand_name: scrapingResult.brandName,
                description: scrapingResult.description,
                raw_description: scrapingResult.rawDescription,
                enhanced: scrapingResult.enhanced
            })
            .select();

        if (error) {
            logger.error('Database error during analysis:', error);
            return res.status(500).json({ error: 'Failed to store analysis result' });
        }

        logger.info(`Analysis completed successfully for URL: ${url}`);
        res.status(201).json({
            message: 'Website analyzed successfully',
            data: {
                ...data[0],
                aiStats: scrapingResult.aiStats,
                enhanced: scrapingResult.enhanced
            }
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

// POST enhance description for existing record
router.post('/:id/enhance',
    validateId,
    checkValidationResult,
    asyncHandler(async (req, res) => {
        const { id } = req.params;

        logger.info(`Enhancement request for record ID: ${id}`);

        // Get the existing record
        const { data: existingData, error: fetchError } = await supabase
            .from('website_analysis')
            .select('*')
            .eq('id', id)
            .single();

        if (fetchError) {
            if (fetchError.code === 'PGRST116') {
                return res.status(404).json({ error: 'Website record not found' });
            }
            return res.status(500).json({ error: 'Failed to fetch website record' });
        }

        // Check if already enhanced
        if (existingData.enhanced) {
            return res.status(400).json({
                error: 'Description is already enhanced',
                data: existingData
            });
        }

        // Use raw description if available, otherwise current description
        const descriptionToEnhance = existingData.raw_description || existingData.description;

        if (!descriptionToEnhance || descriptionToEnhance.trim().length < 10) {
            return res.status(400).json({
                error: 'Description too short or empty for enhancement'
            });
        }

        try {
            // Create AI enhancement service instance
            const WebsiteScrapingService = require('../services/scrapingService');
            const aiEnhancement = new (require('../services/aiEnhancementService'))();

            const enhancedDescription = await aiEnhancement.enhanceDescription(
                descriptionToEnhance,
                existingData.brand_name,
                existingData.url
            );

            // Update the record
            const { data, error } = await supabase
                .from('website_analysis')
                .update({
                    description: enhancedDescription,
                    raw_description: existingData.raw_description || existingData.description,
                    enhanced: true,
                    updated_at: new Date().toISOString()
                })
                .eq('id', id)
                .select();

            if (error) {
                logger.error('Database error during enhancement update:', error);
                return res.status(500).json({ error: 'Failed to update enhanced description' });
            }

            logger.info(`Description enhanced successfully for record ID: ${id}`);

            res.json({
                message: 'Description enhanced successfully',
                data: {
                    ...data[0],
                    aiStats: aiEnhancement.getStats()
                }
            });

        } catch (enhanceError) {
            logger.error(`Enhancement failed for record ID ${id}: ${enhanceError.message}`);
            return res.status(500).json({
                error: 'AI enhancement failed',
                details: enhanceError.message
            });
        }
    })
);

// GET AI enhancement status and capabilities
router.get('/ai/status', (req, res) => {
    const AIEnhancementService = require('../services/aiEnhancementService');
    const aiService = new AIEnhancementService();

    res.json({
        message: 'AI enhancement status',
        ...aiService.getStats(),
        features: {
            enhanceDescription: true,
            fallbackMode: !aiService.isAvailable(),
            supportedLanguages: ['en'],
            maxDescriptionLength: 1000
        }
    });
});

module.exports = router;
