/**
 * @name
 *      P01-mangrove-mosaic.js
 *
 * @description
 *      Mangrove cross-cutting theme - MapBiomas Ecuador Collection 4.
 *      Step 1: builds the annual Landsat mosaic used to map mangroves, for the
 *      Landsat scenes (path/row) of the Ecuadorian coast.
 *
 *      1. Selects the Landsat Collection 2 TOA scenes of the year with cloud
 *         cover <= `cloudCover`, for the path/rows of PATH_ROWS, except the
 *         scenes in BLACKLIST.
 *           - before 2014: Landsat 5, 7 and 8
 *           - from 2014:   Landsat 8 and 9
 *      2. Masks clouds, dilated clouds and cloud shadows (QA_PIXEL).
 *      3. Computes NDVI, MNDWI, NDSI, NDWI, MMRI and two water-quality
 *         indices (IM1: total nitrate, IM2: total phosphorus).
 *      4. Takes the median of all scenes and scales every band to 0-255:
 *           - reflectance bands:  value x 255
 *           - normalized indices: (value + 1) x 127
 *           - IM1, IM2:           stretched between fixed min / max values
 *      5. Clips the mosaic to the path/row grid and exports it (byte).
 *
 * @usage
 *      1. Set the dates of the year in PARAMS (one mosaic per year).
 *      2. Run and review the scenes (one layer per scene, hidden) and the
 *         mosaic. Add bad scenes to BLACKLIST and run again.
 *      3. Start the export task from the Tasks tab.
 *
 * @inputs
 *      - Landsat Collection 2 Tier 1 TOA (L5, L7, L8, L9)
 *      - Path/row grid: PATH_ROW_GRID
 *
 * @outputs
 *      <PARAMS.outputPath>/<country>-<year>
 *      bands (byte): swir2, swir1, nir, red, green, BQA, NDVI, MNDWI, MMRI,
 *      NDSI, NDWI, IM1, IM2
 *
 * @author
 *      MapBiomas Ecuador team (EcoCiencia); MapBiomas Amazonía / RAISG development team
 *
 * @version
 *      1.0.0 (2026)
 *
 * @theme
 *      Mangrove
 *
 * @collection
 *      4
 */


// =============================================================================
// 1. PARAMETERS
// =============================================================================

var PARAMS = {
  country: 'ECUADOR',

  // One mosaic per year: dates within the same year.
  startDate: '2010-01-01',
  endDate: '2010-12-31',

  // Maximum cloud cover (%) of the scenes.
  cloudCover: 90,

  // true: one hidden layer per scene, to find scenes for the blacklist.
  showScenes: true,

  outputVersion: 5,
  outputPath: 'projects/mapbiomas-raisg/MOSAICOS/mangrove-5'
};

// Landsat scenes [path, row] of the Ecuadorian coast.
var PATH_ROWS = [
  [10, 58], [10, 59], [10, 60], [11, 59], [11, 60], [11, 61],
  [10, 62], [11, 62], [10, 63], [11, 63], [17, 60], [17, 61],
  [18, 60], [18, 61], [10, 64], [11, 64]
];

// Scenes excluded from the mosaic (system:index of the TOA collection).
var BLACKLIST = [
  'LE07_010059_20180118',
  'LE07_010060_20181204',
  'LE07_010060_20181118',
  'LC08_010059_20181228'
];


// =============================================================================
// 2. ASSETS AND CONSTANTS
// =============================================================================

var PATH_ROW_GRID = 'projects/mapbiomas-raisg/DATOS_AUXILIARES/VECTORES/ECUADOR/path-row-pacifico-grid';

var COLLECTIONS = {
  L5: 'LANDSAT/LT05/C02/T1_TOA',
  L7: 'LANDSAT/LE07/C02/T1_TOA',
  L8: 'LANDSAT/LC08/C02/T1_TOA',
  L9: 'LANDSAT/LC09/C02/T1_TOA'
};

// Bands of each satellite (index or name) renamed to BAND_NAMES.
var BANDS = {
  L5: [0, 1, 2, 3, 4, 6, 'QA_PIXEL'],
  L7: [0, 1, 2, 3, 4, 7, 'QA_PIXEL'],
  L8: [1, 2, 3, 4, 5, 6, 'QA_PIXEL'],
  L9: [1, 2, 3, 4, 5, 6, 'QA_PIXEL']
};
var BAND_NAMES = ['blue', 'green', 'red', 'nir', 'swir1', 'swir2', 'BQA'];

// Fixed stretch (min, max) of the water-quality indices to 0-255.
var IM1_RANGE = [5.04893968546401e-7, 0.004990332819056622];
var IM2_RANGE = [8.53118346494392e-9, 27.249109247040032];

var MMRI_VIS = { min: 10, max: 220, palette: ['b3260f', 'ff9c08', '2dff34', '1f64ff'] };
var SCENE_VIS = { bands: ['swir1', 'nir', 'red'], min: 0, max: 1, gamma: 1.8 };


// =============================================================================
// 3. FUNCTIONS
// =============================================================================

/**
 * TOA scenes of one satellite for the path/rows, dates and cloud cover of
 * PARAMS, without the blacklisted scenes.
 */
function getScenes(satellite) {
  var pathRowFilter = ee.Filter.or.apply(null, PATH_ROWS.map(function (pathRow) {
    return ee.Filter.and(
      ee.Filter.eq('WRS_PATH', pathRow[0]),
      ee.Filter.eq('WRS_ROW', pathRow[1])
    );
  }));

  return ee.ImageCollection(COLLECTIONS[satellite])
    .filter(ee.Filter.date(PARAMS.startDate, PARAMS.endDate))
    .filter(ee.Filter.lte('CLOUD_COVER', PARAMS.cloudCover))
    .filter(pathRowFilter)
    .filter(ee.Filter.inList('system:index', BLACKLIST).not())
    .select(BANDS[satellite], BAND_NAMES);
}

/**
 * Masks dilated clouds (bit 1), clouds (bit 3) and cloud shadows (bit 4).
 */
function maskClouds(image) {
  var qa = image.select('BQA');
  var mask = qa.bitwiseAnd(1 << 1)
    .or(qa.bitwiseAnd(1 << 3))
    .or(qa.bitwiseAnd(1 << 4));
  return image.updateMask(mask.not());
}

/**
 * Adds the spectral and water-quality indices.
 */
function addIndices(image) {
  var green = image.select('green');
  var red = image.select('red');
  var nir = image.select('nir');
  var swir1 = image.select('swir1');

  var ndvi = nir.subtract(red).divide(nir.add(red)).rename('NDVI');
  var ndsi = swir1.subtract(nir).divide(nir.add(swir1)).rename('NDSI');
  var ndwi = green.subtract(nir).divide(nir.add(green)).rename('NDWI');
  var mndwi = green.subtract(swir1).divide(green.add(swir1)).rename('MNDWI');

  // Modular Mangrove Recognition Index
  var mmri = image.expression(
    '(abs(MNDWI) - abs(NDVI)) / (abs(MNDWI) + abs(NDVI))',
    { MNDWI: mndwi, NDVI: ndvi }
  ).rename('MMRI');

  // Water-quality indices
  var totalNitrate = image.expression(
    '2.71828 ** (8.228 - 2.713 * (1 / (RED + GREEN)))',
    { GREEN: green, RED: red }
  ).rename('IM1');

  var totalPhosphorus = image.expression(
    '2.71828 ** (-0.4081 - 8.659 * (1 / (RED / GREEN)))',
    { GREEN: green, RED: red }
  ).rename('IM2');

  return image.addBands([ndvi, mndwi, ndsi, ndwi, mmri, totalNitrate, totalPhosphorus]);
}


// =============================================================================
// 4. MOSAIC
// =============================================================================

var year = Number(PARAMS.startDate.split('-')[0]);

var grid = ee.FeatureCollection(PATH_ROW_GRID);

var scenes = year < 2014
  ? getScenes('L5').merge(getScenes('L7')).merge(getScenes('L8'))
  : getScenes('L8').merge(getScenes('L9'));

scenes = scenes
  .map(addIndices)
  .map(maskClouds);

var median = scenes.median();

var im1 = median
  .visualize(['IM1'], null, null, IM1_RANGE[0], IM1_RANGE[1])
  .rename('IM1');

var im2 = median
  .visualize(['IM2'], null, null, IM2_RANGE[0], IM2_RANGE[1])
  .rename('IM2');

var mosaic = median
  .select(['swir2', 'swir1', 'nir', 'red', 'green', 'BQA'])
  .multiply(255)
  .addBands(median.select(['NDVI', 'MNDWI', 'MMRI', 'NDSI', 'NDWI']).add(1).multiply(127))
  .addBands(im1)
  .addBands(im2);

// Clip to the path/row grid.
var clippedMosaic = ee.ImageCollection(grid.map(function (feature) {
  return mosaic.clip(feature);
})).mosaic().byte();

print('Scenes', scenes.size());
print('Mosaic', clippedMosaic);


// =============================================================================
// 5. MAP
// =============================================================================

Map.addLayer(grid, {}, 'Path/row grid', false);
Map.addLayer(mosaic.select('MMRI'), MMRI_VIS, 'Mosaic (not clipped) - MMRI', false);
Map.addLayer(clippedMosaic.select('MMRI'), MMRI_VIS, 'Mosaic - MMRI');

// One hidden layer per scene. These layers are added when the list of
// scenes arrives from the server, so they appear above the mosaic.
if (PARAMS.showScenes) {
  scenes.aggregate_array('system:index').evaluate(function (ids) {
    ids.forEach(function (id) {
      var sceneId = id.substr(id.length - 20);   // remove the prefixes added by merge
      print(sceneId);
      Map.addLayer(scenes.filter(ee.Filter.eq('system:index', id)).mosaic(), SCENE_VIS, sceneId, false);
    });
  });
}


// =============================================================================
// 6. EXPORT
// =============================================================================

var fileName = PARAMS.country + '-' + year;

Export.image.toAsset({
  image: clippedMosaic.set({
    year: String(year),
    version: PARAMS.outputVersion,
    country: PARAMS.country
  }),
  description: fileName,
  assetId: PARAMS.outputPath + '/' + fileName,
  region: grid.geometry().bounds(),
  crs: 'EPSG:4326',
  scale: 30,
  maxPixels: 1e13
});
