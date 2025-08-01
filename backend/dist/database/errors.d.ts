export declare class DatabaseError extends Error {
    code?: string;
    severity?: string;
    detail?: string;
    constructor(message: string, code?: string, severity?: string, detail?: string);
}
export declare class ValidationError extends Error {
    constructor(message: string);
}
export declare class NotFoundError extends Error {
    constructor(resource: string, id?: string);
}
export declare class DuplicateError extends Error {
    constructor(resource: string, field?: string);
}
//# sourceMappingURL=errors.d.ts.map