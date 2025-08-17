const supabase = require('../supabaseClient');

async function checkDatabaseSchema() {
    console.log('Checking database schema...');

    try {
        const { data, error } = await supabase
            .from('website_analysis')
            .select('id, url, brand_name, description, raw_description, enhanced, created_at, updated_at')
            .limit(1);

        if (error) {
            console.error('Schema check failed:', error.message);
            if (error.message.includes('column')) {
                console.log('❌ Database schema needs updating');
                return false;
            }
        } else {
            console.log('✅ Database schema is up to date');
            return true;
        }

    } catch (error) {
        console.error('Error checking schema:', error);
        return false;
    }
}

module.exports = {
    checkDatabaseSchema
};
