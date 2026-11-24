/**
 * @name
 *      P02-classification.js
 *
 * @description
 *      Mangrove cross-cutting theme - MapBiomas Ecuador Collection 4.
 *      Step 2: Random Forest classification of mangrove (5) vs. other (27),
 *      year by year, for one mangrove region, using the mangrove mosaics (P01).
 *
 *      For each year:
 *        1. Takes the mangrove mosaic of the year and keeps the bands of
 *           `variables`.
 *        2. Samples the mosaic at the training points: stable points (the
 *           same points every year) plus, optionally, points of that year.
 *        3. Trains a Random Forest and classifies the mosaic.
 *        4. Optionally forces class 27 inside exclusion polygons.
 *        5. Exports the classification and the samples.
 *
 * @usage
 *      1. Draw or import the training points in the Code Editor (property
 *         'reference': 5 = mangrove, 27 = other) and list them in PARAMS.
 *      2. Set the region, years and versions, run, review the layers and
 *         start the export tasks.
 *
 * @inputs
 *      - Mangrove mosaics (P01): MOSAICS_PATH
 *      - Training points: PARAMS.stablePoints, PARAMS.additionalSamples
 *
 * @outputs
 *      Per year:
 *      - Image  <paths.pathMangrovesClasificationPre><COUNTRY>-<regionId>-<year>-<outputVersion>
 *        band 'classification_<year>': 5 = mangrove, 27 = other; masked outside the region.
 *      - Table  <paths.pathMangrovesSamplesAct>sample-mangroves-<regionId>-<year>-<samplesOutputVersion>
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

  years: [2024],

  // Mosaic bands used by the classifier. [] = all bands of the mosaic.
  variables: ['swir1', 'swir2', 'nir', 'red', 'green', 'NDVI', 'MNDWI', 'MMRI', 'NDSI', 'NDWI'],

  // Random Forest
  trees: 100,
  variablesPerSplit: 1,

  // Training points (FeatureCollections drawn or imported in the Code
  // Editor) with the property 'reference' (5 = mangrove, 27 = other).
  // Stable points are used in every year, e.g. [stable_mangrove, non_mangrove_stable].
  stablePoints: [],
  // Points used only in their year: they also need a numeric property
  // 'year', e.g. [partial_mangrove, partial_no_mangrove].
  additionalSamples: [],

  // Polygons forced to class 27: FeatureCollections with the property
  // 'id' = 27, e.g. [exclusion]. [] = none.
  exclusion: [],

  samplesOutputVersion: 999,
  outputVersion: 999
};


// =============================================================================
// 2. MODULES, ASSETS AND CONSTANTS
// =============================================================================

var paths = require('users/mapbiomasecuador/LULC:COLECCION4/05-modules/CollectionDirectories.js').paths;
var palette = require('users/mapbiomasecuador/LULC:MODULES/Palettes.js').get('EcuadorCol4');

var MOSAICS_PATH = 'projects/mapbiomas-raisg/MOSAICOS/mangrove-5';

var MANGROVE = 5;
var OTHER = 27;

var CLASS_VIS = { min: 0, max: palette.length - 1, palette: palette };
var MOSAIC_VIS = { bands: ['swir1', 'nir', 'red'], min: 0, max: 140 };


// =============================================================================
// 3. INPUTS
// =============================================================================

var region = ee.FeatureCollection(paths.pathMangrovesRegionAct)
  .filter(ee.Filter.eq('regionID', PARAMS.regionId));

var regionMask = region
  .map(function (f) { return f.set('version', 1); })
  .reduceToImage(['version'], ee.Reducer.first());

var mosaics = ee.ImageCollection(MOSAICS_PATH)
  .filter(ee.Filter.eq('country', PARAMS.country))
  .filterBounds(region);

/**
 * Merges a list of FeatureCollections (or Features) into one collection.
 */
function mergeAll(list) {
  return list.reduce(function (merged, item) {
    return merged.merge(ee.FeatureCollection(item));
  }, ee.FeatureCollection([]));
}

var stablePoints = mergeAll(PARAMS.stablePoints);

// 27 inside the exclusion polygons, masked elsewhere.
var exclusionMask = null;
if (PARAMS.exclusion.length > 0) {
  var exclusionAreas = mergeAll(PARAMS.exclusion);
  exclusionMask = exclusionAreas
    .reduceToImage(['id'], ee.Reducer.first())
    .clipToBoundsAndScale({ geometry: exclusionAreas.geometry(), scale: 30 });
}

Map.addLayer(region.style({ fillColor: 'FF000000', color: 'FF0000' }), {}, 'Region ' + PARAMS.regionId, false);


// =============================================================================
// 4. CLASSIFICATION
// =============================================================================

PARAMS.years.forEach(function (year) {

  // The mosaics store 'year' as text (see P01).
  var yearMosaic = mosaics.filter(ee.Filter.eq('year', String(year))).mosaic();

  var featureSpace = PARAMS.variables.length > 0
    ? yearMosaic.select(PARAMS.variables)
    : yearMosaic;

  var points = stablePoints;
  if (PARAMS.additionalSamples.length > 0) {
    points = points.merge(
      mergeAll(PARAMS.additionalSamples).filter(ee.Filter.eq('year', year))
    );
  }

  var samples = featureSpace.sampleRegions({
    collection: points,
    properties: ['reference'],
    scale: 30,
    projection: 'EPSG:4326',
    geometries: true
  });

  var classifier = ee.Classifier.smileRandomForest({
    numberOfTrees: PARAMS.trees,
    variablesPerSplit: PARAMS.variablesPerSplit
  }).train(samples, 'reference', featureSpace.bandNames());

  var classification = featureSpace.classify(classifier);

  if (exclusionMask) {
    classification = classification.where(exclusionMask.eq(OTHER), OTHER);
  }

  classification = classification
    .updateMask(regionMask)
    .rename('classification_' + year)
    .set({
      region: PARAMS.regionId,
      country: PARAMS.country,
      version: PARAMS.outputVersion,
      trees: PARAMS.trees,
      samplesVersion: PARAMS.samplesOutputVersion,
      description: 'Classification'
    });

  print('Samples ' + year, samples);
  print('Output image ' + year, classification);

  // Map
  var styledSamples = samples.map(function (feature) {
    var color = ee.Algorithms.If(feature.getNumber('reference').eq(MANGROVE), 'green', 'gray');
    return feature.set('style', { color: color, pointSize: 2 });
  });

  Map.addLayer(yearMosaic, MOSAIC_VIS, 'Mosaic ' + year, false);
  Map.addLayer(classification, CLASS_VIS, 'Classification ' + year, false);
  Map.addLayer(styledSamples.style({ styleProperty: 'style' }), {}, 'Samples ' + year, false);

  // Exports (the paths of CollectionDirectories.js end with '/')
  var samplesName = 'sample-mangroves-' + PARAMS.regionId + '-' + year + '-' + PARAMS.samplesOutputVersion;

  Export.table.toAsset({
    collection: samples,
    description: samplesName,
    assetId: paths.pathMangrovesSamplesAct + samplesName
  });

  var fileName = PARAMS.country + '-' + PARAMS.regionId + '-' + year + '-' + PARAMS.outputVersion;

  Export.image.toAsset({
    image: classification.byte().reproject('EPSG:4326', null, 30),
    description: fileName,
    assetId: paths.pathMangrovesClasificationPre + fileName,
    scale: 30,
    maxPixels: 1e13,
    region: region.geometry().bounds(),
    pyramidingPolicy: { '.default': 'mode' }
  });
});
