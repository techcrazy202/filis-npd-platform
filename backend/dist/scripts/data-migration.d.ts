declare class DataMigrationService {
    private batchSize;
    private totalProcessed;
    private errors;
    migrate(filePath: string): Promise<void>;
    private readExcelFile;
    private processBatches;
    private processBatch;
    private transformRecord;
    private generateMigrationReport;
}
export { DataMigrationService };
//# sourceMappingURL=data-migration.d.ts.map