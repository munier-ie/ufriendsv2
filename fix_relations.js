const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, 'prisma/schema.prisma');
let schema = fs.readFileSync(schemaPath, 'utf8');

// The regex matches any line with: `  ModelName   ModelName? @relation(...)` or similar inside a model block
// We want to lower-case the first character of the field name IF it matches the model name (which is standard Prisma db pull behavior).

const lines = schema.split('\n');
const fixedLines = lines.map(line => {
    // e.g. "  ApiProvider   ApiProvider? @relation(fields: [apiProviderId], references: [id])"
    // matches: (spaces) (CapitalizedWord) (spaces) (CapitalizedWord|CapitalizedWord?) (spaces) @relation
    const relationMatch = line.match(/^(\s+)([A-Z][a-zA-Z0-9]+)(\s+)([A-Z][a-zA-Z0-9]+)(\[\]|\?)?\s+@relation/);
    if (relationMatch) {
        const fieldName = relationMatch[2]; // ApiProvider
        const typeName = relationMatch[4]; // ApiProvider

        // Only fix if the fieldName exactly matches typeName (or typeName with 's' or 'es' on the end for arrays but prisma pull usually just makes it CapitalizedWord or CapitalizedWord[])
        // and usually field names should be camelCase.
        const fixedFieldName = fieldName.charAt(0).toLowerCase() + fieldName.slice(1);

        // replace just the fieldName part
        return line.replace(/^(\s+)([A-Z][a-zA-Z0-9]+)/, `$1${fixedFieldName}`);
    }

    // Also look for inverse relations like: `  Service Service[]`
    const inverseRelationMatch = line.match(/^(\s+)([A-Z][a-zA-Z0-9]+)(\s+)([A-Z][a-zA-Z0-9]+)\[\]$/);
    if (inverseRelationMatch) {
        const fieldName = inverseRelationMatch[2];
        const fixedFieldName = fieldName.charAt(0).toLowerCase() + fieldName.slice(1);
        return line.replace(/^(\s+)([A-Z][a-zA-Z0-9]+)/, `$1${fixedFieldName}`);
    }

    // Also look for simple inverse relations like: `  User User?`
    const inverseRelationMatchOptional = line.match(/^(\s+)([A-Z][a-zA-Z0-9]+)(\s+)([A-Z][a-zA-Z0-9]+)\?$/);
    if (inverseRelationMatchOptional) {
        const fieldName = inverseRelationMatchOptional[2];
        const fixedFieldName = fieldName.charAt(0).toLowerCase() + fieldName.slice(1);
        return line.replace(/^(\s+)([A-Z][a-zA-Z0-9]+)/, `$1${fixedFieldName}`);
    }

    return line;
});

fs.writeFileSync(schemaPath, fixedLines.join('\n'));
console.log('Relations fixed.');
