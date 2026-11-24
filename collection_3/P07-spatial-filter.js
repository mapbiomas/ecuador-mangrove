/**
 * @name
 *      P07-spatial-filter.js
 * 
 * @description
 *      Script that applies spatial filtering to mangrove classification data,
 *      removing isolated pixels based on connected component analysis.
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

var param = {
    // Classification region and country
    regionId: 40906,
    country: 'ECUADOR',
    regionsAsset: 'ManglaresV3_buffer',
    
    // Years to fix
    years: ee.List.sequence(1985, 2024).getInfo(),
    
    // Years for preview
    yearsPreview: [
        1995, 2015, 2024
    ],
    
    eightConnected: true,
    minConnectedPixels: 5,
    
    // Versions
    inputVersion: 6,
    outputVersion: 7,
    
    mosaicVersion: 4,
    mosaicRegionId: 403
};

var SpatialFilter = function(param) {
  
    var _this = this;
  
    this.init = function(param) {
    
        var config = {
            scaleNumber: 30,
            years: param.years,
            mapType: 'SATELLITE',
            collectionField: 'regionID',
            country: param.country,
            regionId: param.regionId,
            inputVersion: param.inputVersion,
            yearsPreview: param.yearsPreview,
            mosaicVersion: param.mosaicVersion,
            outputVersion: param.outputVersion,
            mosaicRegionId: param.mosaicRegionId,
            eightConnected: param.eightConnected,
            variables: param.variables || [],
            minConnectedPx: param.minConnectedPixels,
            legendTitle: 'Land Cover',
            legendPosition: 'bottom-right',
            legendColors: [ 
                '006400', 
                '00ff00', 
                '45c2a5', 
                'f1c232', 
                'ffffb2', 
                'dd7e6b', 
                '0000ff'
            ],
            legendLabels: [
                '3. Forest Formation', 
                '4. Open Forest',
                '11. Floodable Non-Forest Natural Formation',
                '13. Other Non-Forest Natural Formations',
                '14. Agriculture and Livestock',
                '22. Non-Vegetated Area',
                '33. Rivers, Lakes or Oceans'
            ],
            mosaicPath: 'projects/mapbiomas-raisg/MOSAICOS/mangrove-5',
            functions: require('users/mapbiomasecuador/LULC:COLECCION3/api').functions,
            inputPath: 'projects/mapbiomas-ecuador/assets/MAPBIOMAS-LULC/COLLECTION3/CROSS_CUTTING_THEMES/MANGROVE/STEP3-CLASSIFICATION/clasificacion-ft/',
            outputPath: 'projects/mapbiomas-ecuador/assets/MAPBIOMAS-LULC/COLLECTION3/CROSS_CUTTING_THEMES/MANGROVE/STEP3-CLASSIFICATION/clasificacion-ft/',
            regionPath: 'projects/mapbiomas-raisg/MAPBIOMAS-' + param.country + '/DATOS-AUXILIARES/VECTORES/' + param.regionsAsset,
            palette: require("users/mapbiomas/modules:Palettes.js").get('classification6'),
            eePalette: require('users/gena/packages:palettes')
        };

        // functions
        var mapLegend = config.functions.mapLegend;
        var getRegion = config.functions.getRegion;
    
        // get region vector and raster based on region id
        var region = getRegion(config);
        var vector = region.vector;
        var regionsRaster = region.rasterMask;
    
        // get mosaics
        var mosaic = _this.getMosaics(config);
    
        // get classification and apply spatial filter
        var input = _this.getImage(config).updateMask(regionsRaster);
        var inputImage = _this.connectPixels(input, config);
        var filtered = _this.applySpatialFilter(inputImage, config).updateMask(regionsRaster);
    
        // display to map
        config.yearsPreview.map(function(year) {
            _this.addMosaic(mosaic, year, regionsRaster);
            _this.addClassification(inputImage, year, config.palette, 'CLASSIFICATION');
            _this.addClassification(filtered, year, config.palette, 'FILTERED');
        });
        
        mapLegend(Map, config.legendTitle, config.legendColors, config.legendLabels, config.legendPosition);
    
        // Export asset
        var filename = config.country + '-' + config.regionId + '-' + config.outputVersion;
        var imageId = config.outputPath + filename;
    
        Export.image.toAsset({
            image: filtered
                .byte()
                .set({
                    step: 'spatial-filter'
                }),
            description: filename,
            assetId: imageId,
            scale: config.scaleNumber,
            pyramidingPolicy: {
                '.default': 'mode'
            },
            maxPixels: 1e13,
            region: input.geometry().bounds()
        });
    };
  
    /**
     * Get mosaics collection
     */
    this.getMosaics = function(param) {
        var path = param.mosaicPath;
        var country = param.country;
    
        return ee.ImageCollection(path)
            .filter(ee.Filter.and(ee.Filter.eq('country', country)));
    };
  
    /**
     * Add mosaics to map
     */
    this.addMosaic = function(mosaic, year, regionMask) {
        var yearMosaic = mosaic.filterMetadata('year', 'equals', year);
    
        yearMosaic.size().evaluate(function(number) {
            if (number > 0) {
                yearMosaic = yearMosaic
                    .median()
                    .updateMask(regionMask);
          
                Map.addLayer(
                    yearMosaic,
                    {
                        bands: ['swir1_median', 'nir_median', 'red_median'],
                        gain: [0.08, 0.06, 0.2]
                    },
                    'MOSAIC ' + year.toString(),
                    false
                );
            }
        });
    };
  
    /**
     * Add classification to map
     */
    this.addClassification = function(image, year, palette, title) {
        ee.Number(year).evaluate(function(year) {
            Map.addLayer(
                image.select('classification_' + year),
                {
                    min: 0,
                    max: 49,
                    palette: palette
                },
                title + ' ' + year,
                false
            );
        });
    };
  
    /**
     * Get main image
     */
    this.getImage = function(config) {
        var inputPath = config.inputPath;
        var country = config.country;
        var regionId = config.regionId;
        var inputVersion = config.inputVersion;
    
        return ee.Image(inputPath + country + '-' + regionId + '-' + inputVersion);
    };
  
    /**
     * Calculate connected pixel count for each band
     */
    this.connectPixels = function(image, config) {
        var bandNames = image.bandNames();
        var connected = image.addBands(
            image
                .connectedPixelCount(100, config.eightConnected)
                .rename(bandNames.map(function(band) {
                    return ee.String(band).cat('_connected');
                }))
        );
    
        return connected;
    };
  
    /**
     * Apply spatial filter to remove isolated pixels
     */
    this.applySpatialFilter = function(image, config) {
        var bandNames = image.bandNames();
        var output = ee.Image(0);
        var bands = [];
    
        config.years.forEach(function(year) {
            var inputImage = image.select('classification_' + year);
            var connected = image.select('classification_' + year + '_connected');
        
            // Calculate mode filter and mask pixels below threshold
            var mode = inputImage
                .focal_mode(1, 'square', 'pixels')
                .mask(connected.lte(config.minConnectedPx));
          
            var classification = inputImage.blend(mode);
        
            output = output.addBands(classification);
            bands.push('classification_' + year);
        });
    
        return output.select(bands);
    };

    return this.init(param);
};

new SpatialFilter(param);