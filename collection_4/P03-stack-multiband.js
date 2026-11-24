/**
 * @name
 *      P03-stack-multiband.js
 *
 * @description
 *      Mangrove cross-cutting theme - MapBiomas Ecuador Collection 4.
 *      Step 3: stacks the annual mangrove classifications of one region (P02)
 *      into a single multiband image, one band per year
 *      ('classification_<year>'), from `years.first` to `years.last`.
 *
 *      The stack combines three sources, in this order (later ones replace
 *      earlier ones):
 *        1. class 27 (other) in every year, inside the region,
 *        2. years taken from the previous collection (one multiband image),
 *        3. new years classified with P02 (one image per year).
 *      Years that come from neither source stay 27 in the whole region.
 *
 * @usage
 *      1. Set PARAMS: region, years from each source and versions.
 *      2. Run, review the preview years and start the export task.
 *
 * @inputs
 *      - New years: <CURRENT_COLLECTION_PATH><COUNTRY>-<regionId>-<year>-<currentCollectionVersion>
 *      - Previous collection (optional): <PARAMS.previousCollectionPath><COUNTRY>-<regionId>-<previousCollectionVersion>
 *
 * @outputs
 *      <paths.pathMangrovesClasificationAct><COUNTRY>-<regionId>-<outputVersion>
 *      bands 'classification_<year>': 5 = mangrove, 27 = other.
 *
 * @author
 *      Fabricio Garcés - EcoCiencia
 *
 * @version
 *      1.0.0 (2026-05-27)
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

  // Years of the output stack.
  years: { first: 1985, last: 2025 },

  // New years, classified with P02 (version currentCollectionVersion).
  newYears: [2024, 2025],
  currentCollectionVersion: 999,

  // Years taken from the previous collection. [] = none.
  previousCollectionYears: [
    1985, 1986, 1987, 1988, 1989, 1990, 1991, 1992,
    1993, 1994, 1995, 1996, 1997, 1998, 1999, 2000,
    2001, 2002, 2003, 2004, 2005, 2006, 2007, 2008,
    2009, 2010, 2011, 2012, 2013, 2014, 2015, 2016,
    2017, 2018, 2019, 2020, 2021, 2022, 2023
  ],
  previousCollectionVersion: 2,
  previousCollectionPath: 'projects/mapbiomas-ecuador/assets/MAPBIOMAS-LULC/COLLECTION3/CROSS_CUTTING_THEMES/MANGROVE/STEP3-CLASSIFICATION/clasificacion-ft/',   // must end with '/'

  yearsPreview: [2023, 2024, 2025],

  outputVersion: 998,               // read by P04 (inputVersion)

  // *** CAUTION *** true deletes the existing asset with the same name before exporting.
  overwrite: false
};


// =============================================================================
// 2. MODULES, ASSETS AND CONSTANTS
// =============================================================================

var paths = require('users/mapbiomasecuador/LULC:COLECCION4/05-modules/CollectionDirectories.js').paths;
var palette = require('users/mapbiomasecuador/LULC:MODULES/Palettes.js').get('EcuadorCol4');

// Folder of the P02 classifications.

var CURRENT_COLLECTION_PATH = 'projects/mapbiomas-ecuador/assets/MAPBIOMAS-LULC/COLLECTION4/CROSS_CUTTING_THEMES/MANGROVE/STEP03-CLASSIFICATION/preliminar/';

var MOSAICS_PATH = 'projects/mapbiomas-raisg/MOSAICOS/mangrove-5';

var OTHER = 27;

var CLASS_VIS = { min: 0, max: palette.length - 1, palette: palette };
var MOSAIC_VIS = { bands: ['swir1', 'nir', 'red'], min: 0, max: 140 };

var YEARS = [];
for (var y = PARAMS.years.first; y <= PARAMS.years.last; y++) { YEARS.push(y); }

function bandNames(years) {
  return years.map(function (year) { return 'classification_' + year; });
}


// =============================================================================
// 3. STACK
// =============================================================================

var region = ee.FeatureCollection(paths.pathMangrovesRegionAct)
  .filter(ee.Filter.eq('regionID', PARAMS.regionId));

var regionMask = region
  .map(function (f) { return f.set('version', 1); })
  .reduceToImage(['version'], ee.Reducer.first());

var mosaics = ee.ImageCollection(MOSAICS_PATH)
  .filter(ee.Filter.eq('country', PARAMS.country))
  .filterBounds(region);

// 1. Class 27 in every year.
var stack = ee.Image.constant(YEARS.map(function () { return OTHER; }))
  .rename(bandNames(YEARS))
  .byte()
  .updateMask(regionMask);

// 2. Previous collection.
if (PARAMS.previousCollectionYears.length > 0) {
  var previousImage = ee.Image(PARAMS.previousCollectionPath + PARAMS.country + '-' + PARAMS.regionId + '-' +
    PARAMS.previousCollectionVersion)
    .select(bandNames(PARAMS.previousCollectionYears))
    .updateMask(regionMask)
    .byte();

  stack = stack.addBands(previousImage, null, true);
}

// 3. New years (band 'classification_<year>' in each image).
if (PARAMS.newYears.length > 0) {
  var newYearsImage = ee.Image.cat(PARAMS.newYears.map(function (year) {
    return ee.Image(CURRENT_COLLECTION_PATH + PARAMS.country + '-' + PARAMS.regionId + '-' +
      year + '-' + PARAMS.currentCollectionVersion).updateMask(regionMask);
  })).byte();

  stack = stack.addBands(newYearsImage, null, true);
}

stack = stack.set({
  region: PARAMS.regionId,
  country: PARAMS.country,
  version: PARAMS.outputVersion,
  step: 'stack multiband',
  theme: 'Mangroves'
});

print('Stack', stack);


// =============================================================================
// 4. MAP
// =============================================================================

Map.addLayer(region.style({ fillColor: 'FF000000', color: 'FF0000' }), {}, 'Region ' + PARAMS.regionId, false);

PARAMS.yearsPreview.forEach(function (year) {
  // The mosaics store 'year' as text (see P01).
  var yearMosaic = mosaics.filter(ee.Filter.eq('year', String(year))).mosaic();
  Map.addLayer(yearMosaic, MOSAIC_VIS, 'Mosaic ' + year);
  Map.addLayer(stack.select('classification_' + year), CLASS_VIS, 'Stack ' + year);
});


// =============================================================================
// 5. EXPORT
// =============================================================================

var fileName = PARAMS.country + '-' + PARAMS.regionId + '-' + PARAMS.outputVersion;
var assetId = paths.pathMangrovesClasificationAct + fileName;   // path ends with '/'

if (PARAMS.overwrite) {
  try {
    ee.data.deleteAsset(assetId);
  } catch (error) {
    print('Nothing to delete: ' + assetId);
  }
}

Export.image.toAsset({
  image: stack.byte().reproject('EPSG:4326', null, 30),
  description: fileName,
  assetId: assetId,
  scale: 30,
  pyramidingPolicy: { '.default': 'mode' },
  maxPixels: 1e13,
  region: region.geometry().bounds()
});
