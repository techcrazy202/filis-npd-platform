// scripts/data-migration.ts
// Fi-Lis NPD Platform - Data Migration Script for 275K+ Records

import { PrismaClient } from '@prisma/client';
import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';
import { Transform } from 'stream';
import { pipeline } from 'stream/promises';

interface RawProductData {
  'Continents'?: string;
  'Country'?: string;
  'Industry'?: string;
  'Sector'?: string;
  'Sub-Sector'?: string;
  'Segment'?: string;
  'Sub-Segment'?: string;
  'Product Id'?: string;
  'Product Name'?: string;
  'Company Name'?: string;
  'Standardized Company Name'?: string;
  'Brand'?: string;
  'Geo'?: string;
  'Country Of Origin'?: string;
  'Product Description'?: string;
  'Ingredients List'?: string;
  'Standardized Ingredients'?: string;
  'Product Link'?: string;
  'Source Name'?: string;
  'Website Address'?: string;
  'Volume Scale'?: string;
  'Volume Subscale'?: string;
  'Currency'?: string;
  'Price'?: string;
  'Manufacture Date'?: string;
  'Expiry Date'?: string;
  'Flavour'?: string;
  'Calories'?: string;
  'Claims'?: string;
  'Year'?: string;
  'Date Of Entry'?: string;
  'Remarks'?: string;
  // Additional fields from existing schema
  'id'?: number;
  'created_at'?: string;
  'updated_at'?: string;
  'product_name'?: string;
  'ingredients'?: string;
  'category'?: string;
}

interface ProcessedProductData {
  name: string;
  productId?: string;
  brand: string;
  description?: string;
  industry?: string;
  sector?: string;
  subSector?: string;
  segment?: string;
  subSegment?: string;
  category?: string;
  continents?: string;
  country?: string;
  geo?: string;
  countryOfOrigin?: string;
  ingredientsList?: string;
  standardizedIngredients?: any;
  calories?: string;
  claims?: string;
  flavour?: string;
  price?: string;
  volumeScale?: string;
  volumeSubscale?: string;
  currency?: string;
  companyName?: string;
  standardizedCompanyName?: string;
  productLink?: string;
  sourceName?: string;
  websiteAddress?: string;
  manufactureDate?: Date;
  expiryDate?: Date;
  year?: string;
  dateOfEntry?: Date;
  remarks?: string;
  verificationStatus: 'VERIFIED';
  aiConfidenceScore: number;
}

class DataMigrationService {
  private prisma: PrismaClient;
  private batchSize = 1000;
  private totalProcessed = 0;
  private errors: any[] = [];

  constructor() {
    this.prisma = new PrismaClient({
      log: ['query', 'info', 'warn', 'error'],
    });
  }

  async migrate(filePath: string): Promise<void> {
    console.log('🚀 Starting Fi-Lis data migration...');
    console.log(`📁 Source file: ${filePath}`);
    
    try {
      // Read and validate Excel file
      const workbook = await this.readExcelFile(filePath);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const rawData = XLSX.utils.sheet_to_json(worksheet) as RawProductData[];
      
      console.log(`📊 Total records found: ${rawData.length}`);
      
      // Process data in batches
      await this.processBatches(rawData);
      
      // Generate summary report
      await this.generateMigrationReport();
      
      console.log('✅ Migration completed successfully!');
      
    } catch (error) {
      console.error('❌ Migration failed:', error);
      throw error;
    } finally {
      await this.prisma.$disconnect();
    }
  }

  private async readExcelFile(filePath: string): Promise<XLSX.WorkBook> {
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    console.log('📖 Reading Excel file...');
    const workbook = XLSX.readFile(filePath, {
      cellStyles: false,
      cellFormulas: false,
      cellDates: true,
    });

    if (workbook.SheetNames.length === 0) {
      throw new Error('No sheets found in Excel file');
    }

    console.log(`📋 Sheets found: ${workbook.SheetNames.join(', ')}`);
    return workbook;
  }

  private async processBatches(rawData: RawProductData[]): Promise<void> {
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
      } catch (error) {
        console.error(`❌ Batch ${i + 1} failed:`, error);
        this.errors.push({
          batch: i + 1,
          error: error.message,
          records: `${startIndex + 1}-${endIndex}`,
        });
      }

      // Progress indicator
      const progress = Math.round(((i + 1) / totalBatches) * 100);
      console.log(`📈 Progress: ${progress}% (${this.totalProcessed}/${rawData.length} records processed)`);
    }
  }

  private async processBatch(batch: RawProductData[], batchNumber: number): Promise<void> {
    const processedData: ProcessedProductData[] = [];

    // Transform raw data to processed format
    for (const rawRecord of batch) {
      try {
        const processed = this.transformRecord(rawRecord);
        if (processed) {
          processedData.push(processed);
        }
      } catch (error) {
        console.error(`Error processing record in batch ${batchNumber}:`, error);
        this.errors.push({
          batch: batchNumber,
          record: rawRecord,
          error: error.message,
        });
      }
    }

    // Bulk insert processed data
    if (processedData.length > 0) {
      await this.bulkInsertProducts(processedData);
      this.totalProcessed += processedData.length;
    }
  }

  private transformRecord(raw: RawProductData): ProcessedProductData | null {
    // Skip records without essential data
    const productName = raw['Product Name'] || raw['product_name'];
    const brand = raw['Brand'];

    if (!productName || !brand) {
      return null;
    }

    // Parse dates safely
    const parseDate = (dateStr?: string): Date | undefined => {
      if (!dateStr) return undefined;
      try {
        const date = new Date(dateStr);
        return isNaN(date.getTime()) ? undefined : date;
      } catch {
        return undefined;
      }
    };

    // Parse standardized ingredients
    const parseIngredients = (ingredientsStr?: string): any => {
      if (!ingredientsStr) return null;
      try {
        return JSON.parse(ingredientsStr);
      } catch {
        // If not JSON, convert to simple array
        return ingredientsStr.split(',').map(ing => ing.trim()).filter(Boolean);
      }
    };

    // Calculate AI confidence score based on data completeness
    const calculateConfidence = (record: RawProductData): number => {
      const fields = [
        record['Product Name'] || record['product_name'],
        record['Brand'],
        record['Product Description'],
        record['Ingredients List'] || record['ingredients'],
        record['Category'] || record['category'],
        record['Company Name'],
        record['Country'],
      ];
      
      const filledFields = fields.filter(field => field && field.trim().length > 0).length;
      return Math.min(0.95, filledFields / fields.length);
    };

    return {
      name: productName.trim(),
      productId: raw['Product Id']?.trim(),
      brand: brand.trim(),
      description: raw['Product Description']?.trim(),
      industry: raw['Industry']?.trim(),
      sector: raw['Sector']?.trim(),
      subSector: raw['Sub-Sector']?.trim(),
      segment: raw['Segment']?.trim(),
      subSegment: raw['Sub-Segment']?.trim(),
      category: raw['category']?.trim(),
      continents: raw['Continents']?.trim(),
      country: raw['Country']?.trim(),
      geo: raw['Geo']?.trim(),
      countryOfOrigin: raw['Country Of Origin']?.trim(),
      ingredientsList: raw['Ingredients List'] || raw['ingredients'],
      standardizedIngredients: parseIngredients(raw['Standardized Ingredients']),
      calories: raw['Calories']?.trim(),
      claims: raw['Claims']?.trim(),
      flavour: raw['Flavour']?.trim(),
      price: raw['Price']?.trim(),
      volumeScale: raw['Volume Scale']?.trim(),
      volumeSubscale: raw['Volume Subscale']?.trim(),
      currency: raw['Currency']?.trim() || 'INR',
      companyName: raw['Company Name']?.trim(),
      standardizedCompanyName: raw['Standardized Company Name']?.trim(),
      productLink: raw['Product Link']?.trim(),
      sourceName: raw['Source Name']?.trim(),
      websiteAddress: raw['Website Address']?.trim(),
      manufactureDate: parseDate(raw['Manufacture Date']),
      expiryDate: parseDate(raw['Expiry Date']),
      year: raw['Year']?.trim(),
      dateOfEntry: parseDate(raw['Date Of Entry']),
      remarks: raw['Remarks']?.trim(),
      verificationStatus: 'VERIFIED' as const,
      aiConfidenceScore: calculateConfidence(raw),
    };
  }

  private async bulkInsertProducts(products: ProcessedProductData[]): Promise<void> {
    try {
      // Use Prisma's createMany for bulk insert
      const result = await this.prisma.product.createMany({
        data: products,
        skipDuplicates: true, // Skip records that would violate unique constraints
      });

      console.log(`✅ Inserted ${result.count} products in this batch`);
    } catch (error) {
      console.error('Error during bulk insert:', error);
      throw error;
    }
  }

  private async generateMigrationReport(): Promise<void> {
    console.log('\n📊 Generating migration report...');

    // Get database statistics
    const totalProducts = await this.prisma.product.count();
    const verifiedProducts = await this.prisma.product.count({
      where: { verificationStatus: 'VERIFIED' }
    });

    // Get category breakdown
    const categoryStats = await this.prisma.product.groupBy({
      by: ['category'],
      _count: { category: true },
      orderBy: { _count: { category: 'desc' } },
      take: 10,
    });

    // Get country breakdown
    const countryStats = await this.prisma.product.groupBy({
      by: ['country'],
      _count: { country: true },
      orderBy: { _count: { country: 'desc' } },
      take: 10,
    });

    // Generate report
    const report = {
      summary: {
        totalRecordsProcessed: this.totalProcessed,
        totalProductsInDB: totalProducts,
        verifiedProducts: verifiedProducts,
        errorCount: this.errors.length,
        migrationDate: new Date().toISOString(),
      },
      topCategories: categoryStats.map(stat => ({
        category: stat.category || 'Unknown',
        count: stat._count.category,
      })),
      topCountries: countryStats.map(stat => ({
        country: stat.country || 'Unknown',
        count: stat._count.country,
      })),
      errors: this.errors,
    };

    // Save report to file
    const reportPath = path.join(__dirname, '..', 'migration-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    console.log('\n📋 Migration Report');
    console.log('==================');
    console.log(`✅ Total records processed: ${report.summary.totalRecordsProcessed}`);
    console.log(`📦 Total products in database: ${report.summary.totalProductsInDB}`);
    console.log(`✔️  Verified products: ${report.summary.verifiedProducts}`);
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

    if (this.errors.length > 0) {
      console.log(`\n⚠️  ${this.errors.length} errors occurred during migration. Check the report file for details.`);
    }
  }

  // Method to validate data integrity after migration
  async validateMigration(): Promise<void> {
    console.log('\n🔍 Validating migration...');

    // Check for duplicates
    const duplicates = await this.prisma.$queryRaw`
      SELECT name, brand, COUNT(*) as count
      FROM products 
      GROUP BY name, brand 
      HAVING COUNT(*) > 1
      LIMIT 10
    `;

    // Check for missing essential data
    const missingData = await this.prisma.product.count({
      where: {
        OR: [
          { name: { equals: '' } },
          { brand: { equals: '' } },
          { name: null },
          { brand: null },
        ],
      },
    });

    console.log(`🔍 Validation Results:`);
    console.log(`   Potential duplicates: ${Array.isArray(duplicates) ? duplicates.length : 0}`);
    console.log(`   Records with missing essential data: ${missingData}`);
  }
}

// CLI execution
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('Usage: npm run migrate <excel-file-path>');
    console.log('Example: npm run migrate ./data/fi-lis-data.xlsx');
    process.exit(1);
  }

  const filePath = args[0];
  const migrationService = new DataMigrationService();

  try {
    await migrationService.migrate(filePath);
    await migrationService.validateMigration();
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

export { DataMigrationService };