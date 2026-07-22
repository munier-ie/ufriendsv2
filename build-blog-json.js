const fs = require('fs');
const path = require('path');

const contentDir = path.join(__dirname, 'src/pages/blog/content');
const publicDir = path.join(__dirname, 'public');
const bundledFile = path.join(contentDir, 'all-posts.json');
const publicFile = path.join(publicDir, 'blog-posts.json');

console.log('Compiling blog JSON files...');

if (!fs.existsSync(contentDir)) {
    console.error(`Content directory missing: ${contentDir}`);
    process.exit(1);
}

const files = fs.readdirSync(contentDir);
const allPosts = {};
let count = 0;

for (const file of files) {
    if (file.endsWith('.json') && file !== 'all-posts.json') {
        const filePath = path.join(contentDir, file);
        try {
            const fileData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            const slug = fileData.slug || file.replace('.json', '');
            allPosts[slug] = fileData;
            count++;
        } catch (err) {
            console.error(`Error reading ${file}:`, err.message);
        }
    }
}

const jsonOutput = JSON.stringify(allPosts, null, 2);

fs.writeFileSync(bundledFile, jsonOutput, 'utf8');
console.log(`Saved compiled blog database to ${bundledFile} (${count} posts)`);

if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
}
fs.writeFileSync(publicFile, jsonOutput, 'utf8');
console.log(`Saved public static blog database to ${publicFile} (${count} posts)`);

console.log('Blog JSON compilation complete!');
