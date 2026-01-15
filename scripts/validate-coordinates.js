/**
 * validate-coordinates.js
 * 
 * Validates existing coordinates.json and removes entries that are too far
 * from their respective city centers.
 * 
 * Usage: node scripts/validate-coordinates.js
 * 
 * This script:
 * 1. Loads coordinates.json
 * 2. Checks each coordinate against city center from locations.json
 * 3. Removes coordinates that are >100km from city center
 * 4. Saves the cleaned data
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const COORDINATES_FILE = path.join(__dirname, '../src/data/coordinates.json');
const LOCATIONS_FILE = path.join(__dirname, '../src/data/locations.json');

// Maximum distance (km) from city center for coordinates to be valid
const MAX_DISTANCE_KM = 100;

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
                    centers[city.slug] = { lat: city.lat, lng: city.lon, name: city.name };
                }
            }
        }
    };

    processLocations(locations.states || []);
    processLocations(locations.unionTerritories || []);

    return centers;
}

/**
 * Main validation function
 */
function validateCoordinates() {
    console.log('\n🔍 Coordinate Validation Script');
    console.log('================================\n');

    // Load data
    const coordinates = JSON.parse(fs.readFileSync(COORDINATES_FILE, 'utf8'));
    const cityCenters = loadCityCenters();

    console.log(`📍 Loaded ${Object.keys(cityCenters).length} city centers`);
    console.log(`📂 Loaded coordinates for ${Object.keys(coordinates).length} cities\n`);

    let totalItems = 0;
    let removedItems = 0;
    let keptItems = 0;
    let noCenterItems = 0;

    const removedList = [];

    // Process each city
    for (const citySlug of Object.keys(coordinates)) {
        const cityCenter = cityCenters[citySlug];

        if (!cityCenter) {
            console.log(`⚠️  No center found for: ${citySlug}`);
            // Count items but can't validate
            for (const cat of Object.keys(coordinates[citySlug])) {
                noCenterItems += coordinates[citySlug][cat].length;
            }
            continue;
        }

        // Process each category
        for (const categorySlug of Object.keys(coordinates[citySlug])) {
            const items = coordinates[citySlug][categorySlug];
            const validItems = [];

            for (const item of items) {
                totalItems++;

                if (!item.lat || !item.lng) {
                    removedItems++;
                    continue;
                }

                const distance = getDistanceKm(item.lat, item.lng, cityCenter.lat, cityCenter.lng);

                if (distance > MAX_DISTANCE_KM) {
                    removedItems++;
                    removedList.push({
                        city: citySlug,
                        name: item.name,
                        distance: Math.round(distance)
                    });
                } else {
                    validItems.push(item);
                    keptItems++;
                }
            }

            // Replace with valid items only
            coordinates[citySlug][categorySlug] = validItems;
        }
    }

    // Save cleaned data
    fs.writeFileSync(COORDINATES_FILE, JSON.stringify(coordinates, null, 2));

    // Print summary
    console.log('================================');
    console.log('📊 Validation Summary:');
    console.log(`   Total items checked: ${totalItems}`);
    console.log(`   ✓ Kept: ${keptItems}`);
    console.log(`   ✗ Removed (too far): ${removedItems}`);
    if (noCenterItems > 0) {
        console.log(`   ⚠️ Unchecked (no city center): ${noCenterItems}`);
    }

    if (removedList.length > 0) {
        console.log('\n🗑️  Removed items:');
        for (const item of removedList) {
            console.log(`   - ${item.city}: "${item.name}" (${item.distance}km away)`);
        }
    }

    console.log(`\n💾 Cleaned data saved to: ${COORDINATES_FILE}\n`);
}

validateCoordinates();
