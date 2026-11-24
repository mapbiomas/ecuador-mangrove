/**
 * @name
 *      P05-temporal-filter.js
 * 
 * @description
 *      Script that applies temporal filtering to mangrove classification data,
 *      using multi-year window filters to remove temporal inconsistencies.
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

var country  = 'ECUADOR';
  
// Years to fix
var years = ee.List.sequence(1985, 2024).getInfo();
  
// Years for preview
var preview = [
    1985, 1986, 1988, 1990, 1991, 1992, 1993, 1994, 1995, 1996, 
    2004, 2005, 2015, 2021, 2023, 2024
];
  
// Versions
var input_version = '2';

var output_version = '3';
  
var mosaic_version = 4;

var mosaic_region_ids = [403];
  
// Examples:
// First year filter: X 3 3 => 3 3 3
// Middle years filters:
// - 3 years: 21 X 21 => 21 21 21
// - 4 years: 21 X 21 21 => 21 21 21 21
// - 5 years: 21 X 21 21 => 21 21 21 21 21
// Last year filter: 24 24 X => 24, 24, 24 
// Order: First, Last, 3, 4, 5, 3, 4, 3
var filterExecution = [
    { name: 'first3',  order: [5] },
    { name: 'last3',   order: [5, 27] },
    { name: 'middle3', order: [5, 27, 5] },
    { name: 'middle4', order: [5, 27, 5] },
    { name: 'middle3', order: [5, 27, 5] },
    { name: 'middle5', order: [5, 27, 5] },
    { name: 'middle4', order: [5, 27, 5] },
    { name: 'middle3', order: [5, 27, 5] }
];

/**
 * Global settings
 */
var scale_number = 30;

var mapType = 'SATELLITE';

var collection_field = 'id_regionc';

var mosaics_path = 'projects/mapbiomas-raisg/MOSAICOS/mangrove-5';

var functions = require('users/mapbiomasecuador/LULC:COLECCION3/api').functions;

var input_path = 'projects/mapbiomas-ecuador/assets/MAPBIOMAS-LULC/COLLECTION3/CROSS_CUTTING_THEMES/MANGROVE/STEP3-CLASSIFICATION/clasificacion-ft';
  
var output_path = 'projects/mapbiomas-ecuador/assets/MAPBIOMAS-LULC/COLLECTION3/CROSS_CUTTING_THEMES/MANGROVE/STEP3-CLASSIFICATION/clasificacion-ft';

var regions_path = 'projects/mapbiomas-raisg/MAPBIOMAS-ECUADOR/DATOS-AUXILIARES/VECTORES/ManglaresV3_buffer';

var palette = require("users/mapbiomas/modules:Palettes.js").get('classification6');

var input_name = country + '-' + region_id + '-' + input_version;

var output_name = country + '-' + region_id + '-' + output_version;

var mapLegend = functions.mapLegend;

var getMosaic = functions.getMosaic;

/**
 * Load data
 */
var region = ee.FeatureCollection(regions_path).filterMetadata('regionID', 'equals', region_id);

var region_raster = region.reduceToImage(['regionID'], ee.Reducer.first());

var mosaics = ee.ImageCollection(mosaics_path).filter(ee.Filter.eq('country', country));

var input = ee.Image(input_path + '/' + input_name);

var filtered = input;

/**
 * Temporal masks
 */
var masks = {
  
    middle3: function(value, year, image, prefix) {
        // get the images based on year
        var year1 = image.select(prefix + '_' + (year - 1));
        var year2 = image.select(prefix + '_' + year);
        var year3 = image.select(prefix + '_' + (year + 1));
    
        // define the filter rule
        var mask = year1.eq(value).and(year2.neq(value)).and(year3.eq(value));
        var remapped = year2.mask(mask.eq(1)).where(mask.eq(1), value);
        var output = year2.blend(remapped);
        
        return output;
    },
    
    middle4: function(value, year, image, prefix) {
        // select years
        var year1 = image.select(prefix + '_' + (year - 1));
        var year2 = image.select(prefix + '_' + year);
        var year3 = image.select(prefix + '_' + (year + 1));
        var year4 = image.select(prefix + '_' + (year + 2));
        
        // define the filter rule
        var mask = year1.eq(value)
            .and(year2.neq(value))
            .and(year3.neq(value))
            .and(year4.eq(value));
      
        // apply the rule
        var remapped0 = year2.mask(mask.eq(1)).where(mask.eq(1), value);
        var remapped1 = year3.mask(mask.eq(1)).where(mask.eq(1), value);
        var output = year2.blend(remapped0).blend(remapped1);
    
        return output;
    },
    
    middle5: function(value, year, image, prefix) {
        // select years
        var year1 = image.select(prefix + '_' + (year - 1));
        var year2 = image.select(prefix + '_' + year);
        var year3 = image.select(prefix + '_' + (year + 1));
        var year4 = image.select(prefix + '_' + (year + 2));
        var year5 = image.select(prefix + '_' + (year + 3));
        
        // define the filter rule
        var mask = year1.eq(value)
            .and(year2.neq(value))
            .and(year3.neq(value))
            .and(year4.neq(value))
            .and(year5.eq(value));
      
        var remapped0 = year2.mask(mask.eq(1)).where(mask.eq(1), value);
        var remapped1 = year3.mask(mask.eq(1)).where(mask.eq(1), value);
        var remapped2 = year4.mask(mask.eq(1)).where(mask.eq(1), value);
        var output = year2.blend(remapped0).blend(remapped1).blend(remapped2);
      
        return output;
    },
    
    first3: function(value, years, image, prefix) {
        // get first three images
        var baseYear = years[0];
        var year1 = image.select(prefix + '_' + baseYear);
        var year2 = image.select(prefix + '_' + (baseYear + 1));
        var year3 = image.select(prefix + '_' + (baseYear + 2));
      
        // define the filter rule
        var mask = year1.neq(value)
            .and(year2.eq(value))
            .and(year3.eq(value));
      
        // apply the rule
        var outputBands = image.bandNames().slice(1);
        var remapped = year1.mask(mask.eq(1)).where(mask.eq(1), value);
        var output = year1.blend(remapped);
        
        output = output.addBands(image.select(outputBands));
        return output;
    },
    
    last3: function(value, years, image, prefix) {
        // get last three images
        var baseYear = years.slice(-3)[0];
        var year1 = image.select(prefix + '_' + baseYear);
        var year2 = image.select(prefix + '_' + (baseYear + 1));
        var year3 = image.select(prefix + '_' + (baseYear + 2));
      
        // define the filter rule
        var mask = year1.eq(value)
            .and(year2.eq(value))
            .and(year3.neq(value));
      
        // apply the rule
        var bands = image.bandNames();
        var firstBand = ee.String(bands.get(0));
        var outputBands = bands.slice(1, years.length - 1);
        var remapped = year3.mask(mask.eq(1)).where(mask.eq(1), value);
        var output = image.select(firstBand).addBands(image.select(outputBands));
        output = output.addBands(year3.blend(remapped));
        
        return output;
    },
};

/**
 * Temporal windows to apply filters
 */
var windows = {
    
    middle3: function(image, value, years, prefix) {
        var start = years[0];
        var finish = years.slice(-1)[0];
        var output = image.select(prefix + '_' + start);
        
        years.slice(1).forEach(function(year) {
            output = year < finish
                ? output.addBands(masks.middle3(value, year, image, prefix))
                : output.addBands(image.select(prefix + '_' + year));
        });
        
        return output;
    },
    
    middle4: function(image, value, years, prefix) {
        var start = years[0];
        var finish = years.slice(-2)[0];
        var output = image.select(prefix + '_' + start);
        
        years.slice(1).forEach(function(year) {
            output = year < finish
                ? output.addBands(masks.middle4(value, year, image, prefix))
                : output.addBands(image.select(prefix + '_' + year));
        });
        
        return output;
    },
    
    middle5: function(image, value, years, prefix) {
        var start = years[0];
        var finish = years.slice(-3)[0];
        var output = image.select(prefix + '_' + start);
        
        years.slice(1).forEach(function(year) {
            output = year < finish
                ? output.addBands(masks.middle5(value, year, image, prefix))
                : output.addBands(image.select(prefix + '_' + year));
        });
        
        return output;
    },
  
    last3: function(image, value, years, prefix) {
        return masks.last3(value, years, image, prefix);
    },
  
    first3: function(image, value, years, prefix) {
        return masks.first3(value, years, image, prefix);
    }
};

/**
 * Apply temporal filters
 */
filterExecution.forEach(function(filter) {
    var filter_settings = {
        image: filtered,
        years: years,
        ids_order: filter.order, 
        filter_name: filter.name,
        bands_prefix: 'classification'
    };
    
    filtered = apply_filter(filter_settings);
});

/**
 * Display and export
 */
preview.forEach(function(year) {
    add_mosaic(mosaics, year, region_raster);
    add_classification(input, year, palette, 'CLASSIFICATION');
    add_classification(filtered, year, palette, 'FILTER');
});

Export.image.toAsset({
    image: filtered
        .byte()
        .set({ step: 'temporal-filter' }),
    description: output_name,
    assetId: output_path + '/' + output_name,
    scale: scale_number,
    pyramidingPolicy: { '.default': 'mode' },
    maxPixels: 1e13,
    region: input.geometry().bounds()
});

/**
 * Add mosaics to map
 */
function add_mosaic(mosaic, year, region_mask) {
    var year_mosaic = mosaics
        .filterMetadata('year', 'equals', year.toString())
        .median()
        .updateMask(region_mask);
    
    try {
        Map.addLayer(
            year_mosaic,
            { bands: ['swir1', 'nir', 'red'], min: 0, max: 140 },
            'MOSAIC ' + year.toString(),
            false
        );
    } catch(error) { 
        print(error.message); 
    }
}

/**
 * Add classification to map
 */
function add_classification(image, year, palette, title) {
    Map.addLayer(
        image,
        {
            bands: ['classification_' + year],
            min: 0,
            max: palette.length - 1,
            palette: palette
        },
        title + ' ' + year, false
    );
}

/**
 * Apply filter to image
 */
function apply_filter(param) {
    var image = param.image;
    var ids_order = param.ids_order;
    var filter_name = param.filter_name;
    var years = param.years;
    var prefix = param.bands_prefix;
    
    ids_order.forEach(function(class_id) {
        image = windows[filter_name](image, class_id, years, prefix);
    });
    
    return image;
}