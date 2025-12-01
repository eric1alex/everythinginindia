import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read the locations.json file
const locationsPath = path.join(__dirname, '../src/data/locations.json');
const locationsData = JSON.parse(fs.readFileSync(locationsPath, 'utf-8'));

// Function to sort an array of objects alphabetically by name
function sortByName(array) {
    return array.sort((a, b) => a.name.localeCompare(b.name));
}

// Sort states alphabetically
if (locationsData.states) {
    locationsData.states = sortByName(locationsData.states);

    // Sort cities within each state
    locationsData.states.forEach(state => {
        if (state.cities) {
            state.cities = sortByName(state.cities);
        }
    });
}

// Sort union territories alphabetically
if (locationsData.unionTerritories) {
    locationsData.unionTerritories = sortByName(locationsData.unionTerritories);

    // Sort cities within each union territory
    locationsData.unionTerritories.forEach(territory => {
        if (territory.cities) {
            territory.cities = sortByName(territory.cities);
        }
    });
}

// Write the sorted data back to the file
fs.writeFileSync(locationsPath, JSON.stringify(locationsData, null, 2), 'utf-8');

console.log('✅ locations.json has been sorted alphabetically!');
console.log(`   - ${locationsData.states?.length || 0} states sorted`);
console.log(`   - ${locationsData.unionTerritories?.length || 0} union territories sorted`);

// Count total cities
let totalCities = 0;
if (locationsData.states) {
    locationsData.states.forEach(state => {
        totalCities += state.cities?.length || 0;
    });
}
if (locationsData.unionTerritories) {
    locationsData.unionTerritories.forEach(territory => {
        totalCities += territory.cities?.length || 0;
    });
}
console.log(`   - ${totalCities} cities sorted`);
