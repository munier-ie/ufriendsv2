const fs = require('fs');
const path = require('path');

const SEOPagesDir = path.join(__dirname, '..', 'src', 'pages', 'seo');
const files = fs.readdirSync(SEOPagesDir).filter(f => f.endsWith('.jsx'));

for (const file of files) {
    const filePath = path.join(SEOPagesDir, file);
    let content = fs.readFileSync(filePath, 'utf8');

    if (!content.includes('"@type": "Service"')) {
        // Find the title from the metadata to use in the service name
        const matchTitle = content.match(/title="([^"]+)"/);
        const serviceName = matchTitle ? matchTitle[1].split(' | ')[0] : 'Ufriends Service';

        // Extract the existing schema which starts at "const schema = {" and ends matching brace
        const schemaStartIdx = content.indexOf('const schema = {');
        if (schemaStartIdx > -1) {
            // Find where the schema object ends. Since it's a simple top-level object, we can just look for the semicolon.
            const schemaEndMatch = content.match(/const schema = {[\s\S]*?};\n/);
            if (schemaEndMatch) {
                const oldSchemaStr = schemaEndMatch[0];
                
                // We're converting the single schema object to an array of schemas (valid JSON-LD)
                // The old schema is an FAQPage. We'll wrap it and add the Service schema.
                
                // Old schema without "const schema = " and ";"
                let rawOldSchema = oldSchemaStr.replace('const schema = ', '').replace(/;\n$/, '');
                
                const newSchemaBlock = `const schema = [
    ${rawOldSchema},
    {
        "@context": "https://schema.org",
        "@type": "Service",
        "serviceType": "${serviceName}",
        "provider": { "@id": "https://ufriends.com.ng/#organization" },
        "areaServed": { "@type": "Country", "name": "Nigeria" },
        "offers": {
            "@type": "Offer",
            "priceCurrency": "NGN",
            "description": "Available instantly on the Ufriends IT platform with transparent pricing."
        }
    }
];\n`;
                
                content = content.replace(oldSchemaStr, newSchemaBlock);
                fs.writeFileSync(filePath, content, 'utf8');
                console.log('Added Service schema to ' + file);
            }
        }
    }
}
