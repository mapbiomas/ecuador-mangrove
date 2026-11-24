/**
 * @name
 *      P04-gapfill-filter.js
 * 
 * @description
 *      Script that performs gap filling for mangrove classification time series,
 *      applying forward and backward filling based on defined temporal ranges.
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

var region_id = 40906;

var country = 'ECUADOR';

var years = ee.List.sequence(1985, 2024).getInfo();

var preview = [
   1985, 1986, 1987, 1988, 1989, 1990, 1991, 1992, 1993, 1994,
   1995, 1996, 1997, 1998, 1999, 2000, 2001, 2002, 2003, 2004,
   2005, 2006, 2007, 2008, 2009, 2010, 2011, 2012, 2013, 2014,
   2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024
];

var t0_tn = [2002, 2024];   // forward then backward

var tn_t0 = [1985, 2001];   // backward then forward

var input_version = 1;

var output_version = 2;

/**
 * Assets paths and modules
 */
var input_name   = country + '-' + region_id + '-' + input_version;

var output_name  = country + '-' + region_id + '-' + output_version;

var mosaics_path = 'projects/mapbiomas-raisg/MOSAICOS/mangrove-5';

var regions_path = 'projects/mapbiomas-raisg/MAPBIOMAS-ECUADOR/DATOS-AUXILIARES/VECTORES/ManglaresV3_buffer';

var input_path   = 'projects/mapbiomas-ecuador/assets/MAPBIOMAS-LULC/COLLECTION3/CROSS_CUTTING_THEMES/MANGROVE/STEP3-CLASSIFICATION/clasificacion';

var output_path  = 'projects/mapbiomas-ecuador/assets/MAPBIOMAS-LULC/COLLECTION3/CROSS_CUTTING_THEMES/MANGROVE/STEP3-CLASSIFICATION/clasificacion-ft';

var palette      = require("users/mapbiomas/modules:Palettes.js").get('classification6');

/**
 * Loading data
 */
var region = ee.FeatureCollection(regions_path).filterMetadata('regionID', 'equals', region_id);

var region_raster = region.reduceToImage(['regionID'], ee.Reducer.first());

var mosaics = ee.ImageCollection(mosaics_path).filter(ee.Filter.eq('country', country));

var years_index = ee.List.sequence(0, years.length - 1);

var input = ee.Image(input_path + '/' + input_name);

input = input.where(input.eq(1), 5).unmask(27);

/**
 * Update input based on missing data in source mosaics
 */
var mosaics_vis_params = { bands: ['swir1', 'nir', 'red'], min: 0, max: 140 };

var updated_images = years.map(function(year) {
    var selector = 'classification_' + year;
    var year_mosaic = mosaics.filterMetadata('year', 'equals', year.toString());
    var region_mosaic_swir_2 = getMosaicBand(year_mosaic, 'swir2');
    region_mosaic_swir_2 = region_mosaic_swir_2.updateMask(region_raster);
    var original_selected = input.select(selector).updateMask(region_mosaic_swir_2);
    return original_selected;
});

/**
 * Apply forward/backward gap fill by parameterized ranges
 */
var bands = years.map(setBandNames);

var updated_input = ee.ImageCollection(updated_images).toBands().rename(bands);

// Get ranges bandnames
// Select images by ranges
// Apply gapfill to image ranges
var bands1 = ee.List.sequence(t0_tn[0], t0_tn[1]).getInfo().map(setBandNames);

var bands2 = ee.List.sequence(tn_t0[0], tn_t0[1]).getInfo().map(setBandNames);

var img_range1 = updated_input.select(bands1);

var img_range2 = updated_input.select(bands2);

var filled1 = backwardFill(forwardFill(img_range1));

var filled2 = forwardFill(backwardFill(img_range2));

var fully_filled = filled1.addBands(filled2).select(bands);

print('RESULT:', fully_filled);

/**
 * Show results and exports
 */
preview.forEach(function(year) {
    var selector = 'classification_' + year;
    var mangrove_vis_params = { bands: selector, min: 0, max: palette.length - 1, palette: palette };
  
    var year_mosaic = mosaics.filterMetadata('year', 'equals', year.toString()).median();
    var region_mosaic = year_mosaic.updateMask(region_raster);
    var region_mosaic_swir_2 = region_mosaic.select('swir2');
    var original_selected = updated_input.updateMask(region_mosaic_swir_2);
    
    Map.addLayer(region_mosaic, mosaics_vis_params, 'MOSAIC ' + year, false);
    Map.addLayer(updated_input, mangrove_vis_params, 'ORIGINAL ' + year, false);
    Map.addLayer(fully_filled, mangrove_vis_params, 'FILLED ' + year, false);
});

Export.image.toAsset({
    image: fully_filled
        .byte()
        .set({
            step: 'gapfill'
        }),
    description: output_name,
    assetId: output_path + '/' + output_name,
    scale: 30,
    pyramidingPolicy: { '.default': 'mode' },
    maxPixels: 1e13,
    region: region.geometry().bounds()
});

/**
 * Helper function to set band names
 */
function setBandNames(year) { 
    return 'classification_' + year; 
}

/**
 * Get a specific band from a mosaic collection
 */
function getMosaicBand(image, band_name) {
    return ee.Image(ee.Algorithms.If(
        image.size().gt(0),
        image.select(band_name).mosaic().mask(),
        ee.Image(0)
    ));
}

/**
 * Gap fill helper function
 */
function gapFill(current_year_index, obj) {
    obj = ee.Dictionary(obj);
  
    var previous_year_index = ee.Number(current_year_index).subtract(1);
    var image_filled = ee.Image(obj.get('image_filled'));
    var image_base = ee.Image(obj.get('image_base'));
    var current_image = image_base.select([ee.Number(current_year_index)]);
    var previous_image_filled = image_filled.select([previous_year_index]);
    var current_filled = current_image.unmask(previous_image_filled);
  
    obj = obj.set('image_filled', image_filled.addBands(current_filled));
  
    return obj;
}

/**
 * Forward fill function (from earliest to latest year)
 */
function forwardFill(image) {
    var bandNames = image.bandNames();
    var first = image.select([0]);
    var idx = ee.List.sequence(1, bandNames.size().subtract(1));
    var result = idx.iterate(gapFill, {
        image_filled: first,
        image_base: image
    });
  
    return ee.Image(ee.Dictionary(result).get('image_filled')).rename(bandNames);
}

/**
 * Backward fill function (from latest to earliest year)
 */
function backwardFill(image) {
    var bandNames = image.bandNames();
    var reversedIdx = ee.List.sequence(bandNames.size().subtract(1), 0, -1);
    image = image.select(reversedIdx);
    var last = image.select([0]);
    var idx = ee.List.sequence(1, bandNames.size().subtract(1));
    var result = idx.iterate(gapFill, {
        image_filled: last,
        image_base: image
    });
  
    return ee.Image(ee.Dictionary(result).get('image_filled'))
        .select(reversedIdx)
        .rename(bandNames);
}