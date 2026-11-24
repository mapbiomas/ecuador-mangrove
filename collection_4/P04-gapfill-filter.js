/**
 * @name
 *      P04-gapfill-filter.js
 *
 * @description
 *      Mangrove cross-cutting theme - MapBiomas Ecuador Collection 4.
 *      Step 4: gap fill filter. Fills the years with no mosaic data using the
 *      classification of the neighboring years.
 *
 *      1. Reads the stack of one region (P03). In each year, pixels where the
 *         mangrove mosaic (P01) has no data become a gap (years with no
 *         mosaic at all are a gap everywhere).
 *      2. Fills the gaps separately in two periods, each one with its own
 *         order:
 *           - forwardThenBackward (default 1985-2000): a gap takes the class
 *             of the previous year; gaps at the start of the period take the
 *             class of the next year.
 *           - backwardThenForward (default 2001-2025): a gap takes the class
 *             of the next year; gaps at the end of the period take the class
 *             of the previous year.
 *         Gaps are never filled with years of the other period.
 *
 *      Example of one pixel (- = no mosaic data):
 *          forward then backward:   -  5  - 27  -   ->   5  5  5 27 27
 *          backward then forward:   -  5  - 27  -   ->   5  5 27 27 27
 *
 * @usage
 *      1. Set PARAMS: region, versions and periods (together they must cover
 *         every year of the stack).
 *      2. Run, compare "Original <year>" and "Gap fill <year>" over the
 *         mosaic, and start the export task.
 *
 * @inputs
 *      - <INPUT_PATH><COUNTRY>-<regionId>-<inputVersion>  (P03)
 *      - Mangrove mosaics (P01): MOSAICS_PATH
 *
 * @outputs
 *      <OUTPUT_PATH><COUNTRY>-<regionId>-<outputVersion>
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

  inputVersion: 998,                // P03 stack (outputVersion of P03)
  outputVersion: 997,

  // Periods [first year, last year] and fill order of each one.
  forwardThenBackward: [1985, 2000],
  backwardThenForward: [2001, 2025],

  yearsPreview: [1993, 2024, 2025]
};


// =============================================================================
// 2. MODULES, ASSETS AND CONSTANTS
// =============================================================================

var paths = require('users/mapbiomasecuador/LULC:COLECCION4/05-modules/CollectionDirectories.js').paths;
var palette = require('users/mapbiomasecuador/LULC:MODULES/Palettes.js').get('EcuadorCol4');

var MOSAICS_PATH = 'projects/mapbiomas-raisg/MOSAICOS/mangrove-5';

// TODO: confirm that INPUT_PATH is paths.pathMangrovesClasificationAct (output of P03).
var INPUT_PATH = 'projects/mapbiomas-ecuador/assets/MAPBIOMAS-LULC/COLLECTION4/CROSS_CUTTING_THEMES/MANGROVE/STEP03-CLASSIFICATION/classification/';
var OUTPUT_PATH = 'projects/mapbiomas-ecuador/assets/MAPBIOMAS-LULC/COLLECTION4/CROSS_CUTTING_THEMES/MANGROVE/STEP03-CLASSIFICATION/classification-ft/';

var CLASS_VIS = { min: 0, max: palette.length - 1, palette: palette };
var MOSAIC_VIS = { bands: ['swir1', 'nir', 'red'], min: 0, max: 140 };


// =============================================================================
// 3. FUNCTIONS
// =============================================================================

function range(first, last) {
  var years = [];
  for (var year = first; year <= last; year++) { years.push(year); }
  return years;
}

function bandNames(years) {
  return years.map(function (year) { return 'classification_' + year; });
}

/**
 * Mask of the mosaic of the year: 1 where it has data, 0 elsewhere
 * (0 everywhere if there is no mosaic for the year).
 * The mosaics store 'year' as text (see P01).
 */
function getMosaicMask(mosaics, year) {
  var yearMosaics = mosaics.filter(ee.Filter.eq('year', String(year)));
  return ee.Image(ee.Algorithms.If(
    yearMosaics.size().gt(0),
    yearMosaics.select('swir2').mosaic().mask(),
    ee.Image(0)
  ));
}

/**
 * Forward fill: each gap takes the (already filled) value of the previous band.
 */
function forwardFill(image, names) {
  var filled = [image.select(names[0])];
  for (var i = 1; i < names.length; i++) {
    filled.push(image.select(names[i]).unmask(filled[i - 1]));
  }
  return ee.Image.cat(filled);
}

/**
 * Backward fill: each gap takes the (already filled) value of the next band.
 */
function backwardFill(image, names) {
  var reversed = names.slice().reverse();
  return forwardFill(image, reversed).select(names);
}


// =============================================================================
// 4. INPUTS
// =============================================================================

var region = ee.FeatureCollection(paths.pathMangrovesRegionAct)
  .filter(ee.Filter.eq('regionID', PARAMS.regionId));

var regionMask = region.reduceToImage(['regionID'], ee.Reducer.first());

var mosaics = ee.ImageCollection(MOSAICS_PATH)
  .filter(ee.Filter.eq('country', PARAMS.country));

var years1 = range(PARAMS.forwardThenBackward[0], PARAMS.forwardThenBackward[1]);
var years2 = range(PARAMS.backwardThenForward[0], PARAMS.backwardThenForward[1]);
var years = years1.concat(years2);

var inputName = PARAMS.country + '-' + PARAMS.regionId + '-' + PARAMS.inputVersion;
var input = ee.Image(INPUT_PATH + inputName);


// =============================================================================
// 5. GAP FILL
// =============================================================================

// No mosaic data -> gap.
var classification = ee.Image.cat(years.map(function (year) {
  var mosaicMask = getMosaicMask(mosaics, year).updateMask(regionMask);
  return input.select('classification_' + year).updateMask(mosaicMask);
}));

var names1 = bandNames(years1);
var names2 = bandNames(years2);

var filled1 = backwardFill(forwardFill(classification.select(names1), names1), names1);
var filled2 = forwardFill(backwardFill(classification.select(names2), names2), names2);

var gapfilled = filled1.addBands(filled2).set({
  region: PARAMS.regionId,
  country: PARAMS.country,
  version: PARAMS.outputVersion,
  step: 'GapFill',
  theme: 'Mangroves'
});

print('Input: ' + inputName, input);
print('Output image', gapfilled);


// =============================================================================
// 6. MAP
// =============================================================================

PARAMS.yearsPreview.forEach(function (year) {
  var bandName = 'classification_' + year;
  var yearMosaic = mosaics.filter(ee.Filter.eq('year', String(year))).median().updateMask(regionMask);
  Map.addLayer(yearMosaic, MOSAIC_VIS, 'Mosaic ' + year, false);
  Map.addLayer(classification.select(bandName), CLASS_VIS, 'Original ' + year, false);
  Map.addLayer(gapfilled.select(bandName), CLASS_VIS, 'Gap fill ' + year, false);
});


// =============================================================================
// 7. EXPORT
// =============================================================================

var fileName = PARAMS.country + '-' + PARAMS.regionId + '-' + PARAMS.outputVersion;

Export.image.toAsset({
  image: gapfilled.byte().reproject('EPSG:4326', null, 30),
  description: fileName,
  assetId: OUTPUT_PATH + fileName,
  scale: 30,
  pyramidingPolicy: { '.default': 'mode' },
  maxPixels: 1e13,
  region: region.geometry().bounds()
});
