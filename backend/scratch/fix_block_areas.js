const db = require('../config/db');

function calculateAreaHectares(polyData) {
  if (!polyData) return 0;
  let latLngs = [];
  try {
    if (typeof polyData === 'string') polyData = JSON.parse(polyData);
    let rawCoords = null;
    if (polyData && polyData.type === 'Feature' && polyData.geometry?.type === 'Polygon') {
      rawCoords = polyData.geometry.coordinates[0];
    } else if (polyData && polyData.type === 'Polygon') {
      rawCoords = polyData.coordinates[0];
    } else if (Array.isArray(polyData)) {
      rawCoords = polyData;
    }
    if (rawCoords && rawCoords.length > 0) {
      latLngs = rawCoords.map(c => {
        if (c && typeof c === 'object' && 'lat' in c && ('lng' in c || 'lon' in c)) return [c.lat, c.lng || c.lon];
        if (Array.isArray(c) && c.length >= 2) return typeof c[0] === 'number' ? [c[1], c[0]] : null;
        return null;
      }).filter(Boolean);
    }
  } catch(e) { return 0; }

  if (latLngs.length < 3) return 0;
  
  let area = 0;
  const R = 6378137;
  for (let i = 0; i < latLngs.length; i++) {
    const p1 = latLngs[i];
    const p2 = latLngs[(i + 1) % latLngs.length];
    const lat1 = p1[0] * Math.PI / 180;
    const lng1 = p1[1] * Math.PI / 180;
    const lat2 = p2[0] * Math.PI / 180;
    const lng2 = p2[1] * Math.PI / 180;
    area += (lng2 - lng1) * (2 + Math.sin(lat1) + Math.sin(lat2));
  }
  return Math.abs(area * R * R / 2) / 10000;
}

async function fixAreas() {
  try {
    const [blocks] = await db.query('SELECT id, name, area_hectares, polygon_coordinates FROM blocks');
    console.log(`Found ${blocks.length} blocks to check.`);
    
    for (const block of blocks) {
      if (parseFloat(block.area_hectares) === 0 && block.polygon_coordinates) {
        const ha = calculateAreaHectares(block.polygon_coordinates);
        if (ha > 0) {
          const ac = ha * 2.47105;
          console.log(`Updating ${block.name}: ${ha.toFixed(4)} ha / ${ac.toFixed(4)} ac`);
          await db.query('UPDATE blocks SET area_hectares = ?, area_acres = ? WHERE id = ?', [ha, ac, block.id]);
        }
      } else if (parseFloat(block.area_hectares) > 0) {
        // Just sync acres if hectares exist
        const ac = parseFloat(block.area_hectares) * 2.47105;
        await db.query('UPDATE blocks SET area_acres = ? WHERE id = ?', [ac, block.id]);
      }
    }
    console.log('Area fix complete.');
    process.exit(0);
  } catch (error) {
    console.error('Fix failed:', error);
    process.exit(1);
  }
}

fixAreas();
