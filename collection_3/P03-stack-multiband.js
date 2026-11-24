/**
 * @name
 *      P03-stack-multiband.js
 * 
 * @description
 *      Script that stacks annual mangrove classification images into a single multiband image,
 *      filling missing years with no-data values (27).
 * 
 * @authors
 *      MapBiomas Team
 * 
 * @theme
 *      Mangroves
 *    
 * @version
 *      1.0.0
 *
 * @Date
 *      2024
 */

var country = 'ECUADOR';

var regionsAsset = 'ManglaresV3_buffer';

var basePath = 'projects/mapbiomas-ecuador/assets/MAPBIOMAS-LULC/COLLECTION3/CROSS_CUTTING_THEMES/MANGROVE/STEP3-CLASSIFICATION/clasificacion';

var regionsPath = 'projects/mapbiomas-raisg/MAPBIOMAS-' + country + '/DATOS-AUXILIARES/VECTORES/' + regionsAsset;

var outputVersion = 1;

var regionId = '40906';

var version = 1;

var start = 1985;

var finish = 2024;

var preview = 2020;

/**
 * Region vector
 */
var region = ee.FeatureCollection(regionsPath)
    .filterMetadata('regionID', 'equals', Number(regionId))
    .map(function(feature) { return feature.set('version', 1); });

/**
 * No data image
 */
var years = ee.List.sequence(start, finish).getInfo();

var bands = years.map(function(year) { return 'classification_' + year; });

var noDataImages = years.map(function(year) { return ee.Image(27); });
    
var noDataImage = ee.ImageCollection(noDataImages).toBands().rename(bands);

/**
 * Input data
 */
var collection = ee.ImageCollection(basePath)
    .filter(
        ee.Filter.and(
            ee.Filter.eq('version', version),
            ee.Filter.stringContains('system:index', regionId)
        )
    )
    .toBands();

var originalBands = collection.bandNames();

var updatedBands = originalBands
    .map(function(band) { 
        return ee.String(band).replace('ECUADOR-' + regionId + '-\\d{4}-1_', ''); 
    });

var input = collection.select(originalBands, updatedBands);

/**
 * Output
 */
var output = noDataImage.addBands(input, null, true)
    .clip(region)
    .byte()
    .set('step', 'stack');

print('INPUT:', input);
print('OUTPUT:', output);

/**
 * Visualize and export
 */
var outputBand = output.select('classification_' + preview);

Map.addLayer(outputBand, {min: 5, max: 27, palette: 'olive,lightgrey'}, '_' + preview);
 
Export.image.toAsset({
    image: output,
    description: country + '-' + regionId + '-' + outputVersion,
    assetId: basePath + '/' + country + '-' + regionId + '-' + outputVersion,
    region: region.geometry().bounds(),
    scale: 30,
    crs: 'EPSG:4326',
    maxPixels: 1e13
});