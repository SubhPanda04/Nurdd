const supabase = require('./supabaseClient');

async function createWebsiteAnalysisTable() {
    const { data, error } = await supabase.rpc('execute_sql', {
        sql: `
      CREATE TABLE IF NOT EXISTS website_analysis (
        id SERIAL PRIMARY KEY,
        url VARCHAR(500) NOT NULL,
        brand_name VARCHAR(255),
        description TEXT,
        enhanced_description TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `
    });

    if (error) {
        console.error('Error creating table:', error);
    } else {
        console.log('Table created successfully');
    }
}

module.exports = {
    createWebsiteAnalysisTable
};
