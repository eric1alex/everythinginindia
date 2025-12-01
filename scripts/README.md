# Auto-Sort Locations Script

This script automatically sorts all states, union territories, and cities in `src/data/locations.json` alphabetically by name.

## Why Use This?

Whenever you add new cities or states to your data, the sorting script ensures everything remains in alphabetical order automatically. This makes the data:
- **Easier to navigate** - Find locations quickly
- **More consistent** - No manual sorting needed
- **Better organized** - Professional data structure

## How to Use

### Method 1: NPM Script (Recommended)
```bash
npm run sort-locations
```

### Method 2: Direct Node Execution
```bash
node scripts/sort-locations.js
```

## What Gets Sorted?

1. **States** - Alphabetically by state name
2. **Cities within each state** - Alphabetically by city name  
3. **Union Territories** - Alphabetically by territory name
4. **Cities within each territory** - Alphabetically by city name

## When to Run?

Run this script **after** adding or modifying:
- New states
- New union territories
- New cities
- Updating existing location data

The script will automatically sort everything and save the file back with proper formatting.

## Output

The script will show you:
```
✅ locations.json has been sorted alphabetically!
   - X states sorted
   - X union territories sorted
   - X cities sorted
```

## Important Notes

- The script preserves all your data - it only reorders entries
- The JSON file is formatted with 2-space indentation
- All URLs, coordinates, and metadata remain intact
- The original file is overwritten with the sorted version
