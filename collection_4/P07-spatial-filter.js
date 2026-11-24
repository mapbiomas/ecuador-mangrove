/**
 * @name
 *      P07-spatial-filter.js
 *
 * @description
 *      Mangrove cross-cutting theme - MapBiomas Ecuador Collection 4.
 *      Step 7: spatial filter, applied year by year to the output of the
 *      frequency filter (P06).
 *
 *      Patches smaller than `minConnectedPixels` pixels take the most
 *      frequent class of their neighborhood (11 x 11 window, radius 5).
 *      Larger patches are not changed.
 *
 *          minConnectedPixels = 10
 *          patch of 5 with 6 pixels inside 27  ->  becomes 27
 *          patch of 5 with 25 pixels           ->  unchanged
 *
 *      The result depends on the scale: the preview layers are reprojected
 *      to 30 m so they show what will be exported at any zoom level.
 *
 * @usage
 *      1. Set PARAMS (region, versions, patch size).
 *      2. Run and compare "Original <year>" and "Spatial filter <year>"
 *         over the mosaics, and the area charts in the console.
 *      3. Start the export task from the Tasks tab.
 *
 * @inputs
 *      <paths.pathMangrovesClasificationFilterAct><COUNTRY>-<regionId>-<inputVersion>  (P06)
 *
 * @outputs
 *      <paths.pathMangrovesClasificationFilterAct><COUNTRY>-<regionId>-<outputVersion>
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

  yearsPreview: [2022, 2023, 2025],

  inputVersion: 995,                // P06 frequency filter (outputVersion of P06)
  outputVersion: 994,               // same folder as the input: use a different version

  // Patches with fewer pixels than this are replaced by their neighborhood.
  minConnectedPixels: 10,
  // true: diagonal neighbors belong to the same patch (8 directions); false: 4 directions.
  eightConnected: true,

  // Area charts (ha) in the console: input, filtered and previous collection.
  charts: {
    show: true,
    classes: [5]
  },

  // *** CAUTION *** true deletes the existing asset with the same name before exporting.
  overwrite: false
};


// =============================================================================
// 2. MODULES, ASSETS AND CONSTANTS
// =============================================================================

var paths = require('users/mapbiomasecuador/LULC:COLECCION4/05-modules/CollectionDirectories.js').paths;
var palette = require('users/mapbiomasecuador/LULC:MODULES/Palettes.js').get('EcuadorCol4');

var MOSAICS_PATH = 'projects/mapbiomas-raisg/MOSAICOS/mangrove-5';

// General map of Collection 3, used only in the charts.
var PREVIOUS_COLLECTION_ASSET = 'projects/mapbiomas-ecuador/assets/MAPBIOMAS-LULC/COLLECTION3/INTEGRATION/ECUADOR-3';
var PREVIOUS_COLLECTION_YEARS = { first: 1985, last: 2024 };

// Maximum patch size counted by connectedPixelCount (must be >= minConnectedPixels).
var MAX_PATCH_SIZE = 500;

var YEARS = [];
for (var y = PARAMS.years.first; y <= PARAMS.years.last; y++) { YEARS.push(y); }

var BAND_NAMES = YEARS.map(function (year) { return 'classification_' + year; });

var MOSAIC_VIS = { bands: ['swir1', 'nir', 'red'], min: 0, max: 140 };


// =============================================================================
// 3. FUNCTIONS
// =============================================================================

/**
 * Year by year, replaces the patches smaller than `minConnectedPixels` with
 * the most frequent class of an 11 x 11 window (radius 5).
 */
function applySpatialFilter(image, minConnectedPixels, eightConnected) {
  return ee.Image.cat(BAND_NAMES.map(function (name) {
    var classification = image.select(name);
    var patchSize = classification.connectedPixelCount(MAX_PATCH_SIZE, eightConnected);

    var neighborhood = classification
      .focal_mode(5, 'square', 'pixels')
      .mask(patchSize.lt(minConnectedPixels));

    return classification.blend(neighborhood);
  }));
}

/**
 * Line chart of the area (ha) of one class per year, at 250 m
 * (one 250 m pixel = 6.25 ha). Reference only: values are approximate.
 */
function areaChart(image, classId, region, xLabels, title) {
  return ui.Chart.image.regions({
    image: image.eq(classId).multiply(6.25).selfMask(),
    regions: region.geometry().bounds(),
    reducer: ee.Reducer.sum(),
    scale: 250,
    seriesProperty: 'system:id',
    xLabels: xLabels
  })
    .setChartType('LineChart')
    .setOptions({
      title: 'Class ' + classId + ' - ' + title + ' (250 m)',
      hAxis: { title: 'Year', titleTextStyle: { italic: false, bold: true } },
      vAxis: { title: 'Area (ha)', titleTextStyle: { italic: false, bold: true } },
      colors: ['#' + palette[classId]],
      lineSize: 2
    });
}


// =============================================================================
// 4. INPUTS
// =============================================================================

var region = ee.FeatureCollection(paths.pathMangrovesRegionAct)
  .filter(ee.Filter.eq('regionID', PARAMS.regionId));

var regionMask = region
  .map(function (f) { return f.set('version', 1); })
  .reduceToImage(['version'], ee.Reducer.first());

var mosaics = ee.ImageCollection(MOSAICS_PATH)
  .filter(ee.Filter.eq('country', PARAMS.country));

var input = ee.Image(paths.pathMangrovesClasificationFilterAct +
  PARAMS.country + '-' + PARAMS.regionId + '-' + PARAMS.inputVersion)
  .select(BAND_NAMES)
  .updateMask(regionMask);

print('Input image', input);


// =============================================================================
// 5. SPATIAL FILTER
// =============================================================================

var filtered = applySpatialFilter(input, PARAMS.minConnectedPixels, PARAMS.eightConnected)
  .updateMask(regionMask)
  .set({
    region: PARAMS.regionId,
    country: PARAMS.country,
    version: PARAMS.outputVersion,
    step: 'spatial filter',
    theme: 'Mangroves'
  });

print('Output image', filtered);


// =============================================================================
// 6. MAP
// =============================================================================

Map.addLayer(region.style({ fillColor: 'FF000000', color: 'FF0000' }), {}, 'Region ' + PARAMS.regionId, false);

PARAMS.yearsPreview.forEach(function (year) {
  // The mosaics store 'year' as text (see P01).
  var yearMosaic = mosaics.filter(ee.Filter.eq('year', String(year))).median();
  // Whole image with the year in `bands`: the Inspector shows every year.
  var vis = { bands: 'classification_' + year, min: 0, max: palette.length - 1, palette: palette };

  Map.addLayer(yearMosaic, MOSAIC_VIS, 'Mosaic ' + year, false);
  Map.addLayer(input.reproject('EPSG:4326', null, 30), vis, 'Original ' + year, false);
  Map.addLayer(filtered.reproject('EPSG:4326', null, 30), vis, 'Spatial filter ' + year, false);
});


// =============================================================================
// 7. CHARTS
// =============================================================================

if (PARAMS.charts.show) {
  var previousCollection = ee.Image(PREVIOUS_COLLECTION_ASSET);

  var previousYears = [];
  for (var py = PREVIOUS_COLLECTION_YEARS.first; py <= PREVIOUS_COLLECTION_YEARS.last; py++) {
    previousYears.push(py);
  }

  print('Note: the charts are a reference only. Classifications are resampled ' +
        'from 30 m to 250 m to compute them, so use them with caution.');

  PARAMS.charts.classes.forEach(function (classId) {
    print(areaChart(input, classId, region, YEARS, 'Original'));
    print(areaChart(filtered, classId, region, YEARS, 'Spatial filter'));
    print(areaChart(previousCollection, classId, region, previousYears, 'Collection 3 (general map)'));
  });
}


// =============================================================================
// 8. EXPORT
// =============================================================================

var fileName = PARAMS.country + '-' + PARAMS.regionId + '-' + PARAMS.outputVersion;
var assetId = paths.pathMangrovesClasificationFilterAct + fileName;   // path ends with '/'

if (PARAMS.overwrite) {
  try {
    ee.data.deleteAsset(assetId);
  } catch (error) {
    print('Nothing to delete: ' + assetId);
  }
}

Export.image.toAsset({
  image: filtered.byte().reproject('EPSG:4326', null, 30),
  description: fileName,
  assetId: assetId,
  scale: 30,
  pyramidingPolicy: { '.default': 'mode' },
  maxPixels: 1e13,
  region: region.geometry().bounds()
});
