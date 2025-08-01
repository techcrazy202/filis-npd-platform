import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';
import { getDatabase } from '../database/connection';
class DataMigrationService {
    batchSize = 1000;
    totalProcessed = 0;
    errors = [];
    async migrate(filePath) {
        console.log('🚀 Starting Fi-Lis data migration...');
        console.log(`📁 Source file: ${filePath}`);
        try {
            const workbook = await this.readExcelFile(filePath);
            const sheetName = workbook.SheetNames[0];
            if (!sheetName)
                throw new Error('No sheet found');
            const worksheet = workbook.Sheets[sheetName];
            if (!worksheet) {
                throw new Error(`Sheet not found: ${sheetName}`);
            }
            const rawData = XLSX.utils.sheet_to_json(worksheet);
            console.log(`📊 Total records found: ${rawData.length}`);
            await this.processBatches(rawData);
            await this.generateMigrationReport();
            console.log('✅ Migration completed successfully!');
        }
        catch (error) {
            console.error('❌ Migration failed:', error);
            throw error;
        }
    }
    async readExcelFile(filePath) {
        if (!fs.existsSync(filePath)) {
            throw new Error(`File not found: ${filePath}`);
        }
        console.log('📖 Reading Excel file...');
        const workbook = XLSX.readFile(filePath, {
            cellStyles: false,
            cellFormula: false,
            cellDates: true,
        });
        if (workbook.SheetNames.length === 0) {
            throw new Error('No sheets found in Excel file');
        }
        console.log(`📋 Sheets found: ${workbook.SheetNames.join(', ')}`);
        return workbook;
    }
    async processBatches(rawData) {
        const totalBatches = Math.ceil(rawData.length / this.batchSize);
        console.log(`🔄 Processing ${totalBatches} batches of ${this.batchSize} records each...`);
        for (let i = 0; i < totalBatches; i++) {
            const startIndex = i * this.batchSize;
            const endIndex = Math.min(startIndex + this.batchSize, rawData.length);
            const batch = rawData.slice(startIndex, endIndex);
            console.log(`📦 Processing batch ${i + 1}/${totalBatches} (records ${startIndex + 1}-${endIndex})...`);
            try {
                await this.processBatch(batch, i + 1);
                console.log(`✅ Batch ${i + 1} completed successfully`);
            }
            catch (error) {
                const errorMsg = error instanceof Error ? error.message : String(error);
                console.error(`❌ Batch ${i + 1} failed:`, error);
                this.errors.push({
                    batch: i + 1,
                    error: errorMsg,
                    records: `${startIndex + 1}-${endIndex}`,
                });
            }
            const progress = Math.round(((i + 1) / totalBatches) * 100);
            console.log(`📈 Progress: ${progress}% (${this.totalProcessed}/${rawData.length} records processed)`);
        }
    }
    async processBatch(batch, batchNumber) {
        const db = getDatabase();
        const values = [];
        const params = [];
        let paramIndex = 1;
        for (const rawRecord of batch) {
            try {
                const processed = this.transformRecord(rawRecord);
                if (processed) {
                    const valueClause = `($${paramIndex}, $${paramIndex + 1}, $${paramIndex + 2}, $${paramIndex + 3}, $${paramIndex + 4}, $${paramIndex + 5}, $${paramIndex + 6}, $${paramIndex + 7}, $${paramIndex + 8}, $${paramIndex + 9}, $${paramIndex + 10}, $${paramIndex + 11}, $${paramIndex + 12}, $${paramIndex + 13}, $${paramIndex + 14}, $${paramIndex + 15}, $${paramIndex + 16}, $${paramIndex + 17}, $${paramIndex + 18}, $${paramIndex + 19}, $${paramIndex + 20}, $${paramIndex + 21}, $${paramIndex + 22}, $${paramIndex + 23}, $${paramIndex + 24}, $${paramIndex + 25}, $${paramIndex + 26})`;
                    values.push(valueClause);
                    params.push(processed.name, processed.product_id, processed.brand, processed.description, processed.industry, processed.sector, processed.sub_sector, processed.segment, processed.sub_segment, processed.category, processed.continents, processed.country, processed.geo, processed.country_of_origin, processed.ingredients_list, processed.calories, processed.claims, processed.flavour, processed.price, processed.volume_scale, processed.volume_subscale, processed.currency, processed.company_name, processed.standardized_company_name, processed.product_link, processed.source_name, processed.website_address);
                    paramIndex += 27;
                }
            }
            catch (error) {
                const errorMsg = error instanceof Error ? error.message : String(error);
                console.error(`Error processing record in batch ${batchNumber}:`, error);
                this.errors.push({
                    batch: batchNumber,
                    record: rawRecord,
                    error: errorMsg,
                });
            }
        }
        if (values.length > 0) {
            const query = `
        INSERT INTO products (
          name, product_id, brand, description, industry, sector, sub_sector, 
          segment, sub_segment, category, continents, country, geo, 
          country_of_origin, ingredients_list, calories, claims, flavour, 
          price, volume_scale, volume_subscale, currency, company_name, 
          standardized_company_name, product_link, source_name, website_address
        ) VALUES ${values.join(', ')}
        ON CONFLICT (name, brand) DO NOTHING
      `;
            await db.query(query, params);
            this.totalProcessed += values.length;
        }
    }
    transformRecord(raw) {
        const productName = raw['Product Name'];
        const brand = raw['Brand'];
        if (!productName || !brand) {
            return null;
        }
        return {
            name: productName.trim(),
            product_id: raw['Product Id']?.trim() || null,
            brand: brand.trim(),
            description: raw['Product Description']?.trim() || null,
            industry: raw['Industry']?.trim() || null,
            sector: raw['Sector']?.trim() || null,
            sub_sector: raw['Sub-Sector']?.trim() || null,
            segment: raw['Segment']?.trim() || null,
            sub_segment: raw['Sub-Segment']?.trim() || null,
            category: raw['Segment']?.trim() || null,
            continents: raw['Continents']?.trim() || null,
            country: raw['Country']?.trim() || null,
            geo: raw['Geo']?.trim() || null,
            country_of_origin: raw['Country Of Origin']?.trim() || null,
            ingredients_list: raw['Ingredients List']?.trim() || null,
            calories: raw['Calories']?.trim() || null,
            claims: raw['Claims']?.trim() || null,
            flavour: raw['Flavour']?.trim() || null,
            price: raw['Price']?.trim() || null,
            volume_scale: raw['Volume Scale']?.trim() || null,
            volume_subscale: raw['Volume Subscale']?.trim() || null,
            currency: raw['Currency']?.trim() || 'INR',
            company_name: raw['Company Name']?.trim() || null,
            standardized_company_name: raw['Standardized Company Name']?.trim() || null,
            product_link: raw['Product Link']?.trim() || null,
            source_name: raw['Source Name']?.trim() || null,
            website_address: raw['Website Address']?.trim() || null,
        };
    }
    async generateMigrationReport() {
        console.log('\n📊 Generating migration report...');
        const db = getDatabase();
        const totalResult = await db.query('SELECT COUNT(*) as total FROM products');
        const totalProducts = parseInt(totalResult.rows[0]?.total || '0');
        const categoryResult = await db.query(`
      SELECT category, COUNT(*) as count 
      FROM products 
      WHERE category IS NOT NULL 
      GROUP BY category 
      ORDER BY count DESC 
      LIMIT 10
    `);
        const countryResult = await db.query(`
      SELECT country, COUNT(*) as count 
      FROM products 
      WHERE country IS NOT NULL 
      GROUP BY country 
      ORDER BY count DESC 
      LIMIT 10
    `);
        const report = {
            summary: {
                totalRecordsProcessed: this.totalProcessed,
                totalProductsInDB: totalProducts,
                errorCount: this.errors.length,
                migrationDate: new Date().toISOString(),
            },
            topCategories: categoryResult.rows,
            topCountries: countryResult.rows,
            errors: this.errors,
        };
        const reportPath = path.join(__dirname, '..', '..', 'migration-report.json');
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
        console.log('\n📋 Migration Report');
        console.log('==================');
        console.log(`✅ Total records processed: ${report.summary.totalRecordsProcessed}`);
        console.log(`📦 Total products in database: ${report.summary.totalProductsInDB}`);
        console.log(`❌ Errors encountered: ${report.summary.errorCount}`);
        console.log(`📁 Full report saved to: ${reportPath}`);
        if (report.topCategories.length > 0) {
            console.log('\n🏷️  Top Categories:');
            report.topCategories.forEach((cat, index) => {
                console.log(`   ${index + 1}. ${cat.category}: ${cat.count} products`);
            });
        }
        if (report.topCountries.length > 0) {
            console.log('\n🌍 Top Countries:');
            report.topCountries.forEach((country, index) => {
                console.log(`   ${index + 1}. ${country.country}: ${country.count} products`);
            });
        }
    }
}
async function main() {
    const args = process.argv.slice(2);
    if (args.length === 0) {
        console.log('Usage: npm run data:import <excel-file-path>');
        console.log('Example: npm run data:import ./data/fi-lis-data.xlsx');
        process.exit(1);
    }
    const filePath = args[0];
    if (!filePath) {
        console.error('File path is required');
        process.exit(1);
    }
    const migrationService = new DataMigrationService();
    try {
        await migrationService.migrate(filePath);
    }
    catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}
if (require.main === module) {
    main().catch(console.error);
}
export { DataMigrationService };
//# sourceMappingURL=data-migration.js.map