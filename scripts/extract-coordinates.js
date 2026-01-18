/**
 * extract-coordinates.js
 * 
 * Pre-build script that extracts lat/lng coordinates from Google Maps CID links.
 * 
 * Usage: 
 *   node scripts/extract-coordinates.js           # Process all
 *   node scripts/extract-coordinates.js --test    # Process first 5 items only
 *   node scripts/extract-coordinates.js --debug   # Show HTML content for debugging
 * 
 * Output: src/data/coordinates.json
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CITIES_DIR = path.join(__dirname, '../src/data/cities');
const OUTPUT_FILE = path.join(__dirname, '../src/data/coordinates.json');
const LOCATIONS_FILE = path.join(__dirname, '../src/data/locations.json');

// Maximum distance (km) from city center for coordinates to be valid
const MAX_DISTANCE_KM = 100;

// Check for flags
const TEST_MODE = process.argv.includes('--test');
const DEBUG_MODE = process.argv.includes('--debug');
const TEST_LIMIT = 25;

// City filter
const cityArg = process.argv.find(arg => arg.startsWith('--city='));
const TARGET_CITY = cityArg ? cityArg.split('=')[1] : null;

// Rate limiting
const REQUEST_DELAY = 1500;
const REQUEST_TIMEOUT = 20000;

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Haversine distance between two points in km
 */
function getDistanceKm(lat1, lng1, lat2, lng2) {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

/**
 * Load city centers from locations.json
 */
function loadCityCenters() {
    const locations = JSON.parse(fs.readFileSync(LOCATIONS_FILE, 'utf8'));
    const centers = {};

    const processLocations = (locList) => {
        for (const loc of locList) {
            for (const city of loc.cities) {
                if (city.lat && city.lon) {
                    centers[city.slug] = { lat: city.lat, lng: city.lon };
                }
            }
        }
    };

    processLocations(locations.states || []);
    processLocations(locations.unionTerritories || []);

    return centers;
}

/**
 * Extract coordinates using multiple patterns
 */
function extractCoordinates(text) {
    const patterns = [
        // Pattern: APP_INITIALIZATION_STATE=[[[viewport, lng, lat]
        // Found in debug HTML: window.APP_INITIALIZATION_STATE=[[[3549.4,78.042,27.175]
        /APP_INITIALIZATION_STATE\s*=\s*\[\s*\[\s*\[\s*[^,]+\s*,\s*(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)\s*\]/,

        // Pattern: @lat,lng,zoom in URLs
        /@(-?\d+\.\d{4,}),(-?\d+\.\d{4,}),\d+z/,
        /@(-?\d+\.\d{4,}),(-?\d+\.\d{4,})/,

        // Pattern: !3dlat!4dlng format
        /!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/,

        // Pattern: center=lat%2Clng in og:image URL
        /center=(-?\d+\.\d+)%2C(-?\d+\.\d+)/,
        /center=(-?\d+\.\d+),(-?\d+\.\d+)/,

        // Pattern: ll=lat,lng
        /ll=(-?\d+\.\d+),(-?\d+\.\d+)/,

        // Pattern: coordinates in escaped JSON \\\"lat\\\":
        /\\"lat\\":(-?\d+\.\d+),\\"lng\\":(-?\d+\.\d+)/,
        /\\"lat\\":(-?\d+\.\d+).*?\\"lng\\":(-?\d+\.\d+)/s,

        // Pattern: coordinates in JSON "lat":
        /"lat":(-?\d+\.\d+),"lng":(-?\d+\.\d+)/,
        /"lat":\s*(-?\d+\.\d+).*?"lng":\s*(-?\d+\.\d+)/s,

        // Pattern: [null,null,lat,lng] format in JS
        /\[null,null,(-?\d+\.\d{4,}),(-?\d+\.\d{4,})\]/,

        // Pattern: coordinates in data attributes
        /data-lat="(-?\d+\.\d+)".*?data-lng="(-?\d+\.\d+)"/s,

        // Pattern: /place/ URL with coordinates
        /\/place\/[^/]+\/@(-?\d+\.\d+),(-?\d+\.\d+)/,
    ];

    for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match) {
            let lat, lng;

            // Special handling for APP_INITIALIZATION_STATE which is [lng, lat]
            if (pattern.toString().indexOf('APP_INITIALIZATION_STATE') !== -1) {
                lng = parseFloat(match[1]);
                lat = parseFloat(match[2]);
            } else {
                lat = parseFloat(match[1]);
                lng = parseFloat(match[2]);
            }

            // Validate coordinates are in valid range
            if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
                return { lat, lng, pattern: pattern.toString().substring(0, 30) };
            }
        }
    }

    return null;
}

// Helper to log to file
function logToFile(message) {
    const logPath = path.join(__dirname, 'extraction.log');
    fs.appendFileSync(logPath, message + '\n');
    console.log(message);
}

/**
 * Fetch Google Maps page and extract coordinates
 */
async function fetchCoordinates(url, name) {
    try {
        logToFile(`  → Processing: ${name}`);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

        const response = await fetch(url, {
            method: 'GET',
            redirect: 'follow',
            signal: controller.signal,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5',
                'Cache-Control': 'no-cache'
            }
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            logToFile(`    ✗ HTTP Error: ${response.status}`);
            return null;
        }

        const html = await response.text();
        const finalUrl = response.url;

        if (DEBUG_MODE) {
            logToFile(`    📍 Final URL: ${finalUrl}`);
            logToFile(`    📄 HTML length: ${html.length} chars`);
            // Save first HTML for debugging
            const debugFile = path.join(__dirname, `debug_${name.replace(/[^a-z0-9]/gi, '_')}.html`);
            fs.writeFileSync(debugFile, html);
            logToFile(`    💾 Saved HTML to: ${debugFile}`);

            // DEEP DEBUG: Check for the specific pattern string
            const searchStr = 'APP_INITIALIZATION_STATE';
            const index = html.indexOf(searchStr);
            if (index !== -1) {
                logToFile(`    🔎 Found "${searchStr}" at index ${index}`);
                logToFile(`    📝 Context: ${html.substring(index, index + 100)}...`);
            } else {
                logToFile(`    ⚠️ "${searchStr}" NOT FOUND in HTML content!`);
                logToFile(`    📝 Start of HTML: ${html.substring(0, 500)}...`);
            }
        }

        // Try URL first
        let coords = extractCoordinates(finalUrl);
        if (coords) {
            logToFile(`    ✓ Found in URL: ${coords.lat}, ${coords.lng}`);
            return { lat: coords.lat, lng: coords.lng };
        }

        // Try HTML content
        coords = extractCoordinates(html);
        if (coords) {
            logToFile(`    ✓ Found in HTML: ${coords.lat}, ${coords.lng} (via ${coords.pattern})`);
            return { lat: coords.lat, lng: coords.lng };
        } else if (DEBUG_MODE) {
            logToFile(`    ❌ Regex match failed despite content check.`);
        }

        logToFile(`    ✗ No coordinates found`);
        return null;

    } catch (error) {
        if (error.name === 'AbortError') {
            logToFile(`    ✗ Timeout`);
        } else {
            logToFile(`    ✗ Error: ${error.message}`);
        }
        return null;
    }
}

/**
 * Process cities
 */
async function processAllCities() {
    console.log('\n🗺️  Coordinate Extraction Script');
    console.log('================================');
    if (TEST_MODE) console.log(`⚡ TEST MODE: First ${TEST_LIMIT} items only`);
    if (DEBUG_MODE) console.log('🔍 DEBUG MODE: Saving HTML files');
    console.log('');

    let existingCoords = {};
    if (fs.existsSync(OUTPUT_FILE)) {
        try {
            const content = fs.readFileSync(OUTPUT_FILE, 'utf8');
            if (content.trim() !== '{}') {
                existingCoords = JSON.parse(content);
                console.log(`📂 Loaded existing coordinates\n`);
            }
        } catch (e) {
            // Start fresh
        }
    }

    const coordinates = { ...existingCoords };
    const allCityFiles = fs.readdirSync(CITIES_DIR).filter(f => f.endsWith('.json'));
    const cityFiles = TARGET_CITY
        ? allCityFiles.filter(f => f.replace('.json', '') === TARGET_CITY)
        : allCityFiles;

    if (TARGET_CITY) {
        if (cityFiles.length === 0) {
            console.error(`\n❌ City "${TARGET_CITY}" not found in ${CITIES_DIR}`);
            console.log('Available cities:');
            allCityFiles.forEach(f => console.log(` - ${f.replace('.json', '')}`));
            return;
        }
        console.log(`\n🎯 Target City: ${TARGET_CITY}`);
    }

    let successCount = 0, skipCount = 0, failCount = 0, processedCount = 0, tooFarCount = 0;

    // Load city centers for validation
    const cityCenters = loadCityCenters();
    console.log(`📍 Loaded ${Object.keys(cityCenters).length} city centers for validation\n`);

    outerLoop:
    for (const cityFile of cityFiles) {
        const citySlug = cityFile.replace('.json', '');
        console.log(`\n📍 Processing: ${citySlug}`);

        const cityData = JSON.parse(fs.readFileSync(path.join(CITIES_DIR, cityFile), 'utf8'));
        if (!coordinates[citySlug]) coordinates[citySlug] = {};

        for (const category of cityData) {
            const categorySlug = category.title.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '');
            if (!coordinates[citySlug][categorySlug]) coordinates[citySlug][categorySlug] = [];

            for (const item of category.items) {
                if (TEST_MODE && processedCount >= TEST_LIMIT) {
                    console.log(`\n⚡ TEST MODE: Reached ${TEST_LIMIT} items limit`);
                    break outerLoop;
                }

                const existingItem = coordinates[citySlug][categorySlug].find(i => i.name === item.name && i.lat && i.lng);
                if (existingItem) {
                    console.log(`  → Skipping (cached): ${item.name}`);
                    skipCount++;
                    continue;
                }

                processedCount++;
                const coords = await fetchCoordinates(item.url, item.name);

                if (coords) {
                    // Validate distance from city center
                    const cityCenter = cityCenters[citySlug];
                    if (cityCenter) {
                        const distance = getDistanceKm(coords.lat, coords.lng, cityCenter.lat, cityCenter.lng);
                        if (distance > MAX_DISTANCE_KM) {
                            console.log(`  ⚠️ TOO FAR (${Math.round(distance)}km): ${item.name}`);
                            tooFarCount++;
                            continue;
                        }
                    }

                    coordinates[citySlug][categorySlug].push({
                        name: item.name,
                        lat: coords.lat,
                        lng: coords.lng,
                        url: item.url
                    });
                    successCount++;

                    // Save immediately to prevent data loss
                    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(coordinates, null, 2));
                } else {
                    failCount++;
                }

                await sleep(REQUEST_DELAY);
            }
        }

        // Redundant save after city
        fs.writeFileSync(OUTPUT_FILE, JSON.stringify(coordinates, null, 2));
    }

    console.log('\n================================');
    console.log('📊 Summary:');
    console.log(`   Processed: ${processedCount}`);
    console.log(`   ✓ Success: ${successCount}`);
    console.log(`   → Cached: ${skipCount}`);
    console.log(`   ⚠️ Too far: ${tooFarCount}`);
    console.log(`   ✗ Failed: ${failCount}`);
    console.log(`\n💾 Saved to: ${OUTPUT_FILE}\n`);

    if (failCount > 0 && successCount === 0) {
        console.log('⚠️  All requests failed. Google may be blocking the requests.');
        console.log('   Try running with --debug to see the HTML content.\n');
    }
}

processAllCities().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});
