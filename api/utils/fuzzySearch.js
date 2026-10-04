const prisma = require('../../prisma/client');

let pgTrgmReady = false;

/**
 * Ensures the PostgreSQL pg_trgm extension is installed and indexes exist.
 * Runs once per server lifecycle.
 */
async function ensurePgTrgm(db = prisma) {
    if (pgTrgmReady) return true;
    try {
        await db.$executeRawUnsafe('CREATE EXTENSION IF NOT EXISTS pg_trgm;');
        pgTrgmReady = true;
        return true;
    } catch (err) {
        console.warn('[FuzzySearch] Notice: pg_trgm check failed, using fallback:', err.message);
        return false;
    }
}

/**
 * Finds user IDs matching a query using:
 * 1. Exact & Substring ILIKE (highest score: 1.0)
 * 2. Fuzzy Trigram Similarity (handles typos like 'bilisu' -> 'Bilkisu')
 * 3. Word Similarity (handles partial and compound names like 'ibraim' -> 'Ibrahim')
 * 4. Multi-column matching (firstName, lastName, full name, email, phone)
 *
 * @param {string} search The user search string
 * @param {number} [limit=150] Max user IDs to return
 * @param {object} [db=prisma] Prisma database client
 * @returns {Promise<number[]>} Array of matched user IDs ordered by similarity relevance
 */
async function findFuzzyUserIds(search, limit = 150, db = prisma) {
    if (!search || typeof search !== 'string') return [];
    const term = search.trim();
    if (!term) return [];

    const isTrgmAvailable = await ensurePgTrgm(db);

    if (isTrgmAvailable) {
        try {
            const matched = await db.$queryRawUnsafe(`
                SELECT id,
                       GREATEST(
                           CASE 
                               WHEN "firstName" ILIKE '%' || $1 || '%' 
                                 OR "lastName" ILIKE '%' || $1 || '%' 
                                 OR "email" ILIKE '%' || $1 || '%' 
                                 OR "phone" ILIKE '%' || $1 || '%' 
                                 OR concat("firstName", ' ', "lastName") ILIKE '%' || $1 || '%' 
                               THEN 1.0 
                               ELSE 0.0 
                           END,
                           similarity("firstName", $1),
                           similarity("lastName", $1),
                           similarity(concat("firstName", ' ', "lastName"), $1),
                           word_similarity($1, concat("firstName", ' ', "lastName")),
                           similarity("email", $1)
                       ) AS score
                FROM "User"
                WHERE "firstName" ILIKE '%' || $1 || '%'
                   OR "lastName" ILIKE '%' || $1 || '%'
                   OR "email" ILIKE '%' || $1 || '%'
                   OR "phone" ILIKE '%' || $1 || '%'
                   OR concat("firstName", ' ', "lastName") ILIKE '%' || $1 || '%'
                   OR similarity("firstName", $1) > 0.25
                   OR similarity("lastName", $1) > 0.25
                   OR similarity(concat("firstName", ' ', "lastName"), $1) > 0.25
                   OR word_similarity($1, concat("firstName", ' ', "lastName")) > 0.3
                   OR similarity("email", $1) > 0.3
                ORDER BY score DESC
                LIMIT $2;
            `, term, limit);

            return matched.map(m => m.id);
        } catch (err) {
            console.error('[FuzzySearch] Query execution error, falling back to ILIKE:', err.message);
        }
    }

    // Fallback: standard Prisma ILIKE
    try {
        const fallback = await db.user.findMany({
            where: {
                OR: [
                    { firstName: { contains: term, mode: 'insensitive' } },
                    { lastName: { contains: term, mode: 'insensitive' } },
                    { email: { contains: term, mode: 'insensitive' } },
                    { phone: { contains: term, mode: 'insensitive' } }
                ]
            },
            select: { id: true },
            take: limit
        });
        return fallback.map(u => u.id);
    } catch {
        return [];
    }
}

module.exports = {
    findFuzzyUserIds,
    ensurePgTrgm
};
