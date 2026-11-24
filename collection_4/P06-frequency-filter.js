/**
 * @name
 *      P06-frequency-filter.js
 *
 * @description
 *      Mangrove cross-cutting theme - MapBiomas Ecuador Collection 4.
 *      Step 6: frequency filter for class 5 (mangrove), applied to the output
 *      of the temporal filter (P05).
 *
 *      Pixels classified as mangrove in more than `majorityPercent` % of the
 *      years are set to mangrove in every year (persistent mangrove).
 *
 *          majorityPercent = 75, 41 years (75 % = 30.75 years):
 *          5 5 27 5 ... 5    (35 years of 5, 85.4 %)  ->  5 5 5 5 ... 5
 *          5 27 27 5 ... 27  (20 years of 5, 48.8 %)  ->  unchanged
 *
 *      Options (polygons drawn in the Code Editor):
 *        - applyArea:  apply the filter only inside these polygons.
 *        - remapAreas: change classes inside polygons (after the filter).
 *        - exclusion:  keep the input unchanged inside these polygons
 *                      (applied last).
 *
 * @usage
 *      1. Set PARAMS (region, versions, threshold and options).
 *      2. Run and compare "Original <year>" and "Frequency filter <year>"
 *         over the mosaics.
 *      3. Start the export task from the Tasks tab.
 *
 * @inputs
 *      <FOLDER><COUNTRY>-<regionId>-<inputVersion>  (P05)
 *
 * @outputs
 *      <FOLDER><COUNTRY>-<regionId>-<outputVersion>
 *      bands 'classification_<year>': 5 = mangrove, 27 = other.
 *
 * @author
 *      MapBiomas Ecuador team (EcoCiencia)
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
  regionId: 40906,                  // Mangrove region (field 'regionID')

  // Years of the series (the input must have one band per year).
  years: { first: 1985, last: 2025 },

  yearsPreview: [1985, 1986, 2024, 2025],

  inputVersion: 996,                // P05 temporal filter (outputVersion of P05)
  outputVersion: 995,               // same folder as the input: use a different version

  // Class filtered and frequency threshold (% of the years).
  classId: 5,
  majorityPercent: 75,

  // FeatureCollection drawn in the Code Editor: the filter is applied only
  // inside it. null = whole region.
  applyArea: null,

  // FeatureCollections whose features have the properties 'original' and
  // 'new' (comma-separated classes, e.g. original: '27', new: '5').
  // Classes are changed inside the polygons after the filter. [] = none.
  remapAreas: [],

  // FeatureCollections or Features: inside them the input is kept
  // unchanged. [] = none.
  exclusion: []
};


// =============================================================================
// 2. MODULES, ASSETS AND CONSTANTS
// =============================================================================

var paths = require('users/mapbiomasecuador/LULC:COLECCION4/05-modules/CollectionDirectories.js').paths;
var palette = require('users/mapbiomasecuador/LULC:MODULES/Palettes.js').get('EcuadorCol4');

// Input and output folder (output folder of P04 and P05).
var FOLDER = 'projects/mapbiomas-ecuador/assets/MAPBIOMAS-LULC/COLLECTION4/CROSS_CUTTING_THEMES/MANGROVE/STEP03-CLASSIFICATION/classification-ft/';

var MOSAICS_PATH = 'projects/mapbiomas-raisg/MOSAICOS/mangrove-5';

var YEARS = [];
for (var y = PARAMS.years.first; y <= PARAMS.years.last; y++) { YEARS.push(y); }

var BAND_NAMES = YEARS.map(function (year) { return 'classification_' + year; });

var MOSAIC_VIS = { bands: ['swir1', 'nir', 'red'], min: 0, max: 150 };


// =============================================================================
// 3. FUNCTIONS
// =============================================================================

/**
 * Sets `classId` in every year where the class appears in more than
 * `majorityPercent` % of the years.
 */
function frequencyFilter(image, classId, majorityPercent) {
  var frequency = image.eq(classId)
    .reduce('sum')
    .divide(BAND_NAMES.length)
    .multiply(100);

  // classId where the frequency is above the threshold, masked elsewhere.
  var majority = ee.Image(0).where(frequency.gt(majorityPercent), classId);
  majority = majority.updateMask(majority.neq(0));

  return image.where(majority, majority);
}

/**
 * Changes classes inside polygons ('original' -> 'new' properties).
 */
function remapWithPolygons(image, polygons) {
  polygons.forEach(function (polygon) {
    var remapped = polygon.map(function (feature) {
      var toNumber = function (item) { return ee.Number.parse(item); };
      var from = ee.String(feature.get('original')).split(',').map(toNumber);
      var to = ee.String(feature.get('new')).split(',').map(toNumber);
      return image.clip(feature).remap(from, to);
    });

    image = ee.ImageCollection(remapped).mosaic().unmask(image);
  });

  return image;
}

/**
 * Merges a list of FeatureCollections (or Features) into one collection.
 */
function mergeAll(list) {
  return list.reduce(function (merged, item) {
    return merged.merge(ee.FeatureCollection(item));
  }, ee.FeatureCollection([]));
}

/**
 * 1 inside the polygons, masked elsewhere (within the bounds of `bounds`).
 */
function polygonsMask(polygons, bounds) {
  return polygons
    .map(function (f) { return f.set('id', 1); })
    .reduceToImage(['id'], ee.Reducer.first())
    .clipToBoundsAndScale({ geometry: bounds, scale: 30 });
}


// =============================================================================
// 4. INPUTS
// =============================================================================

var region = ee.FeatureCollection(paths.pathMangrovesRegionAct)
  .filter(ee.Filter.eq('regionID', PARAMS.regionId));

var regionMask = region
  .map(function (f) { return f.set('version', 1); })
  .reduceToImage(['version'], ee.Reducer.first());

var mosaics = ee.ImageCollection(MOSAICS_PATH).select(['swir1', 'nir', 'red']);

var inputName = PARAMS.country + '-' + PARAMS.regionId + '-' + PARAMS.inputVersion;
var input = ee.Image(FOLDER + inputName).select(BAND_NAMES);

var original = input.updateMask(regionMask);

print('Input: ' + inputName, input);


// =============================================================================
// 5. FREQUENCY FILTER
// =============================================================================

var filtered = frequencyFilter(input, PARAMS.classId, PARAMS.majorityPercent).updateMask(regionMask);

// Keep only pixels with a class in the input.
filtered = input.where(input.gte(1), filtered);

// Outside `applyArea`, the input is kept.
if (PARAMS.applyArea) {
  var outsideApplyArea = polygonsMask(PARAMS.applyArea, PARAMS.applyArea.geometry())
    .unmask()
    .eq(0)
    .selfMask();

  filtered = filtered.blend(original.updateMask(outsideApplyArea));
}

if (PARAMS.remapAreas.length > 0) {
  filtered = ee.Image.cat(BAND_NAMES.map(function (name) {
    return remapWithPolygons(filtered.select([name]), PARAMS.remapAreas).rename([name]);
  }));
}

// Inside the exclusion polygons, the input is kept.
if (PARAMS.exclusion.length > 0) {
  var exclusionMask = polygonsMask(mergeAll(PARAMS.exclusion), region.geometry());
  filtered = filtered.where(exclusionMask.eq(1), original);
}

filtered = filtered.select(BAND_NAMES).set({
  region: PARAMS.regionId,
  country: PARAMS.country,
  version: PARAMS.outputVersion,
  step: 'Frequency Filter',
  theme: 'Mangroves'
});

print('Output image', filtered);


// =============================================================================
// 6. MAP
// =============================================================================

Map.setOptions('SATELLITE');

PARAMS.yearsPreview.forEach(function (year) {
  var bandName = 'classification_' + year;
  // The mosaics store 'year' as text (see P01).
  var yearMosaic = mosaics.filter(ee.Filter.eq('year', String(year))).mosaic().updateMask(regionMask);
  Map.addLayer(yearMosaic, MOSAIC_VIS, 'Mosaic ' + year, false);
  // Whole image with the year in `bands`: the Inspector shows every year.
  var vis = { bands: bandName, min: 0, max: palette.length - 1, palette: palette };
  Map.addLayer(original, vis, 'Original ' + year, false);
  Map.addLayer(filtered, vis, 'Frequency filter ' + year, false);
});

Map.addLayer(region.style({ color: 'cyan', fillColor: 'ff000000' }), {}, 'Region ' + PARAMS.regionId);


// =============================================================================
// 7. EXPORT
// =============================================================================

var fileName = PARAMS.country + '-' + PARAMS.regionId + '-' + PARAMS.outputVersion;

Export.image.toAsset({
  image: filtered.byte(),
  description: fileName,
  assetId: FOLDER + fileName,
  pyramidingPolicy: { '.default': 'mode' },
  region: region.geometry().bounds(),
  crs: 'EPSG:4326',
  scale: 30,
  maxPixels: 1e13
});
