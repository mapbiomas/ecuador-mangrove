/**
 * @name
 *      P02-classification.js
 * 
 * @description
 *      Script that performs annual classification for mangroves using Random Forest classifier.
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

/**
 * Geometries Import
 */
var exclusion = /* color: #d63000 */ee.Feature(
        ee.Geometry.MultiPolygon(
            [[[[-79.73894091675906, -2.3872637029691686],
               [-79.73722430298953, -2.3879497523756914],
               [-79.73104449341922, -2.3867491656895448],
               [-79.72606631348758, -2.3867491656895448],
               [-79.7216031176868, -2.388807313652099],
               [-79.72675295899539, -2.3918945298122565],
               [-79.72864123414188, -2.394467204638334],
               [-79.73567935059695, -2.4014991578350915],
               [-79.73207446168094, -2.4063014465423405],
               [-79.72503634522586, -2.4105891900246346],
               [-79.71885653565555, -2.4167635169021455],
               [-79.71628161500125, -2.4220802758804303],
               [-79.71473666260867, -2.4297981146708194],
               [-79.7131917102161, -2.433056744478705],
               [-79.70752688477664, -2.4184786027208642],
               [-79.70134707520633, -2.420193686371259],
               [-79.69877215113893, -2.417363800112824],
               [-79.69233485291629, -2.416334745108835],
               [-79.68194933961063, -2.4148769199989477],
               [-79.6699330432239, -2.413847866038334],
               [-79.66044875816814, -2.4225948060913605],
               [-79.64248869529284, -2.4237095881075104],
               [-79.64003184116393, -2.410031786684487],
               [-79.65989087864197, -2.4100746581453256],
               [-79.68109103272586, -2.4002985830193606],
               [-79.70031710694461, -2.4008131152123995],
               [-79.71199008057742, -2.396010807215697],
               [-79.71542330811648, -2.3862346282173066],
               [-79.72143145630984, -2.370455385771943],
               [-79.71748324463992, -2.356734159116502],
               [-79.72211810181766, -2.345242527700098],
               [-79.72881289551883, -2.3454140452819923],
               [-79.75147219727664, -2.316084234389916],
               [-79.76074191163211, -2.31368293632502],
               [-79.77584811280398, -2.3129968504165817],
               [-79.79764910767703, -2.3090518500064032],
               [-79.80228396485477, -2.323974185064502],
               [-79.82186991125187, -2.343219440242901],
               [-79.82204157262882, -2.3528244063126444],
               [-79.81826502233585, -2.357798380614906],
               [-79.82118326574405, -2.359856571679472],
               [-79.82221323400577, -2.3656880964739875],
               [-79.81347735193071, -2.375445589282099],
               [-79.80118479777991, -2.388139332667953],
               [-79.79346003581702, -2.398258520171536],
               [-79.78487696696936, -2.4015172256528197],
               [-79.78522028972327, -2.388139332667953],
               [-79.78316035319983, -2.3816218503869937],
               [-79.78453364421546, -2.3733891971265897],
               [-79.79277339030921, -2.356409195122773],
               [-79.78779521037757, -2.3541794824766638],
               [-79.77818217326819, -2.353664932897759],
               [-79.75964274455725, -2.3624122498744784],
               [-79.76273264934241, -2.3732176829950506],
               [-79.75809779216468, -2.3836800060214016],
               [-79.75071635295569, -2.385223620727696],
               [-79.74625315715491, -2.3843660572157654]]],
             [[[-79.82114043285071, -2.3362987734977563],
               [-79.8195525651139, -2.3368562091193],
               [-79.81869425822913, -2.3359128563993727],
               [-79.81796469737708, -2.3350123827574834],
               [-79.81646266032874, -2.334969503045853],
               [-79.8135015015763, -2.3333829527959127],
               [-79.80942454387366, -2.3299525677590185],
               [-79.81356802872726, -2.3260429670668423],
               [-79.81485123711403, -2.3217379683370414],
               [-79.81420750695045, -2.318436195633356],
               [-79.80601067620094, -2.3170211478300926],
               [-79.80858559685524, -2.3067298485950176],
               [-79.80729813652809, -2.291550046404198],
               [-79.81304879265602, -2.278947160156953],
               [-79.81760856579034, -2.2829990734528867],
               [-79.81722232769219, -2.287115670488829],
               [-79.81833812664239, -2.290717683205888],
               [-79.81932517955987, -2.295005781771452],
               [-79.81485670519181, -2.299783474227602],
               [-79.8164016575844, -2.302527841374879],
               [-79.81846159410783, -2.3036856196802677],
               [-79.82451265764543, -2.3006839702800237],
               [-79.82637127736834, -2.3025115571398014],
               [-79.82774456838396, -2.308257558794578],
               [-79.82761582235125, -2.3195990465324314],
               [-79.826671684778, -2.3277891371323176],
               [-79.82572754720476, -2.332677440790829],
               [-79.82366761068133, -2.3327203205723808],
               [-79.82242306569842, -2.3337923146859394],
               [-79.82190808156756, -2.3349500674104577]]]]),
        {
          "id": 27,
          "system:index": "0"
        }),
    stable_mangrove = /* color: #d63ed3 */ee.FeatureCollection(
        [ee.Feature(
            ee.Geometry.Point([-79.98977895852379, -2.6032300403072735]),
            {
              "reference": 5,
              "system:index": "0"
            }),
        ee.Feature(
            ee.Geometry.Point([-80.01713959999839, -2.5983126255742253]),
            {
              "reference": 5,
              "system:index": "1"
            })]),
    non_mangrove_stable = /* color: #5ad0d6 */ee.FeatureCollection(
        [ee.Feature(
            ee.Geometry.Point([-80.07196745136702, -2.850244646249322]),
            {
              "reference": 27,
              "system:index": "0"
            }),
        ee.Feature(
            ee.Geometry.Point([-80.06587347248518, -2.848873053293843]),
            {
              "reference": 27,
              "system:index": "1"
            })]);

/**
 * Parameters
 */
var param = {
    country: 'ECUADOR',
    regionId: 40906,
    years: ee.List.sequence(1985, 2024).getInfo(),
    yearsPreview: [
        2023, 2024
    ],
    variables: [
        'swir1', 'swir2', 'nir', 'red', 'green', 'NDVI', 'MNDWI', 'MMRI', 'NDSI', 'NDWI'
    ],
    regionsAsset: 'ManglaresV3_buffer',
    samplesVersion: 1,
    additionalSamples: [
       // partial_mangrove, partial_no_mangrove
    ],
    outputVersion: 1,
    exclusion: [exclusion]
};

var Mangroves = function(param) {
  
  var _this = this;
  
  /**
   * Initializes the application based on the provided parameters.
   * @param {Object} param - The initialization parameters.
   */
  this.init = function(param) {
    
    /**
     * Config object
     */
    var config = {
        years            : param.years,
        mapType          : 'SATELLITE',
        collectionField  : 'regionID',
        country          : param.country,
        regionId         : param.regionId,
        variables        : param.variables,
        trees            : param.trees || 100,
        yearsPreview     : param.yearsPreview,
        version          : param.outputVersion,
        exclusionAreas   : param.exclusion,
        mosaicVersion    : param.mosaicVersion,
        outputVersion    : param.outputVersion,
        samplesVersion   : param.samplesVersion,
        mosaicRegionId   : param.mosaicRegionId,
        additionalPoints : param.additionalSamples,
        mosaicPath       : 'projects/mapbiomas-raisg/MOSAICOS/mangrove-5',
        palette          : require("users/mapbiomas/modules:Palettes.js").get('classification7'),
        regionPath       : 'projects/mapbiomas-raisg/MAPBIOMAS-' + param.country + '/DATOS-AUXILIARES/VECTORES/' + param.regionsAsset,
        pointsPath       : null,
        outputPath       : 'projects/mapbiomas-ecuador/assets/MAPBIOMAS-LULC/COLLECTION3/CROSS_CUTTING_THEMES/MANGROVE/STEP3-CLASSIFICATION/classification/'
    };
    
    /**
     * Get points and regions
     */
    config.region = _this.getRegion(config);

    var points = typeof config.pointsPath === 'string'
      ? ee.FeatureCollection(config.pointsPath)
      : stable_mangrove.merge(non_mangrove_stable);
      
    // Exclusion areas
    var allExclusionAreas, exclusionMask;
    if (config.exclusionAreas && config.exclusionAreas.length > 0) {
      allExclusionAreas = ee.FeatureCollection(config.exclusionAreas);
      exclusionMask = allExclusionAreas
        .reduceToImage(['id'], ee.Reducer.first())
        .clipToBoundsAndScale({
          geometry: allExclusionAreas.geometry(),
          scale: 30
        });
    }
    
    /**
     * Iterate over years
     */
    config.years.forEach(function(year) {
      
      // Get mosaics
      config.year = year;
      config.mosaic = _this.getMosaics(config)
        .filterMetadata('year', 'equals', year.toString())
        .mosaic();
      config.bands = config.mosaic.bandNames();
      
      // Get samples and classifications from mosaics
      if (config.additionalPoints.length > 0) {
        var additionalPoints = ee
          .FeatureCollection(config.additionalPoints)
          .filterMetadata('year', 'equals', year);
          
        config.points = points.merge(additionalPoints);
      } else {
        config.points = points;
      }
      
      config.samples = _this.getSamples(config);
      config.exclusionMask = exclusionMask;
      config.image = _this.applyClassifier(config);
      
      // Display to map
      if (config.yearsPreview.indexOf(year) > -1) {
        Map.addLayer(
          config.mosaic,
          { min: 0, max: 140, bands: ['swir1', 'nir', 'red'] },
          'MOSAIC -' + year,
          false
        );
        config.palette[1] = '#d66c6c';
        Map.addLayer(
          config.image,
          { min: 0, max: 49, bands: ['classification_' + year], palette: config.palette },
          'CLASSIFICATION-' + year,
          false
        );
        _this.addStyledPoints(config);
      }
      
      // Export to asset
      _this.exportImageToAsset(config);
    });
    
    Map.addLayer(
      config.region.vector.style({ color: 'red', fillColor: '00000000'}),
      {},
      'REGION'
    );
  };
  
  /**
   * Retrieves a region based on the provided parameters.
   * @param {Object} param - The function parameters.
   * @param {string} param.regionPath - The path to the region feature collection.
   * @param {string} param.collectionField - The field in the collection to filter by.
   * @param {string} param.regionId - The ID of the region to retrieve.
   * @returns {Object} An object containing the vector representation of the region and its raster mask.
   */
  this.getRegion = function(param) {
    var path = param.regionPath;
    var collectionField = param.collectionField;
    var regionId = param.regionId;
    
    var region = ee.FeatureCollection(path)
      .filterMetadata(collectionField, "equals", regionId);
    
    var regionMask = region
      .map(function(item) { return item.set('version', 1); })
      .reduceToImage(['version'], ee.Reducer.first());
      
    return {
      vector: region,
      rasterMask: regionMask
    };
  };
  
  /**
   * Retrieves mosaics based on the provided parameters.
   * @param {Object} param - The function parameters.
   * @param {string} param.mosaicPath - The path to the mosaic image collection.
   * @param {string} param.country - The country to filter the mosaics by.
   * @param {Array} param.variables - An array of variables to select from the mosaics.
   * @returns {ee.ImageCollection} An Earth Engine ImageCollection filtered by country and selected variables.
   */
  this.getMosaics = function(param) {
    var path = param.mosaicPath;
    var country = param.country;
    var variables = param.variables;
    
    return ee.ImageCollection(path)
      .filter(ee.Filter.and(ee.Filter.eq('country', country)))
      .select(variables);
  };
  
  /**
   * Retrieves data samples using the provided parameters.
   * @param {Object} param - The function parameters.
   * @param {ee.FeatureCollection} param.points - A collection of Earth Engine features.
   * @param {ee.Image} param.mosaic - An Earth Engine mosaic image.
   * @param {Array} param.variables - An array of variables.
   * @returns {Object} An object containing the sample data and the original points.
   */
  this.getSamples = function(param) {
    var points = param.points;
    var mosaic = param.mosaic;
    var variables = param.variables;
  
    var training = points
      .map(function(feature) {
        return feature
          .set(
            mosaic.reduceRegion({
              reducer: 'mean',
              geometry: feature.geometry(),
              crs: 'EPSG:4326',
              scale: 30
            })
          );
      });
    
    return training.filter(ee.Filter.notNull(variables));
  };
  
  /**
   * Styles points based on the provided parameters.
   * @param {Object} param - The function parameters.
   * @param {ee.FeatureCollection} param.points - A collection of points to style.
   * @param {Array} param.palette - An array of colors for styling.
   * @param {string} param.field - The field in the points collection to use for styling.
   * @returns {ee.FeatureCollection} The styled points collection.
   */
  this.stylePoints = function(param) {
    var training = param.points;
    var palette = param.palette;
    var fieldName = param.field;
  
    var styledPoints = ee.FeatureCollection(training)
      .map(function(point) {
        var classId = point.get(fieldName);
        var color = ee.List(palette).get(classId);
        
        return point.set({ style: { color: color, width: 0.05 } });
      });
      
    return styledPoints;
  };
  
  /**
   * Applies a classifier to a mosaic based on the provided parameters.
   * @param {Object} param - The function parameters.
   * @param {number} param.trees - The number of trees for the random forest classifier.
   * @param {number} param.bands - The number of bands for the classifier.
   * @param {number} param.year - The year for the classification result.
   * @param {ee.Image} param.mosaic - The mosaic image to classify.
   * @param {Object} param.region - The region object containing the raster mask.
   * @param {ee.FeatureCollection} param.samples - The training samples.
   * @returns {ee.Image} The classified image.
   */
  this.applyClassifier = function(param) {
    var varSplit = 1;
    var trees = param.trees;
    var bands = param.bands;
    var year = param.year;
    var mosaic = param.mosaic;
    var region = param.region;
    var samples = param.samples;
    var exclusionMask = param.exclusionMask;
    
    var classifier = ee.Classifier.smileRandomForest({
      numberOfTrees: trees, 
      variablesPerSplit: varSplit
    });
        
    classifier = ee.Classifier(
      classifier.train(samples, 'reference', bands)
    );
    
    return mosaic.classify(classifier)
      .select(['classification'], ['classification_' + year])
      .where(exclusionMask.eq(27), 27)
      .unmask(27)
      .updateMask(region.rasterMask)
      .neq(27)
      .selfMask()
      .byte();
  };
  
  /**
   * Exports an image to a Google Earth Engine asset based on the provided parameters.
   * @param {Object} param - The function parameters.
   * @param {string} param.outputPath - The output path for the exported asset.
   * @param {Object} param.region - The region object containing the vector geometry bounds.
   * @param {ee.Image} param.image - The image to export.
   * @param {string} param.country - The country associated with the image.
   * @param {string} param.regionId - The region ID associated with the image.
   * @param {number} param.year - The year associated with the image.
   * @param {number} param.outputVersion - The output version of the image.
   */
  this.exportImageToAsset = function(param) {
    var outputPath = param.outputPath;
    var region = param.region.vector.geometry().bounds();
    var image = param.image;
    var country = param.country;
    var regionId = param.regionId;
    var year = param.year;
    var outputVersion = param.outputVersion;
    var filename = country + '-' + regionId + '-' + year + '-' + outputVersion;
    
    Export.image.toAsset({
      image: image.set({
        version: outputVersion,
        year: year,
        country: country
      }),
      description: filename,
      pyramidingPolicy: 'MODE',
      assetId: outputPath + filename,
      region: region,
      scale: 30,
      crs: 'EPSG:4326', 
      maxPixels: 1e13
    });
  };
  
  /**
   * Adds styled points to the map.
   * @param {Object} param - The function parameters.
   * @param {number} param.year - The year for the points.
   * @param {string} param.title - The title for the layer (optional).
   * @param {ee.FeatureCollection} param.points - The points to style.
   * @param {Array} param.palette - The color palette.
   */
  this.addStyledPoints = function(param) {
    var year = param.year;
    var title = param.title || 'TRAINING SAMPLES ' + year;
    var styledPoints = _this.stylePoints({
      points: param.points,
      palette: param.palette,
      field: 'reference'
    });
    
    Map.addLayer(
      styledPoints.style({ styleProperty: "style", width: 1.5 }),
      {}, 
      title,
      false
    );
  };
  
  return this.init(param);
};

new Mangroves(param);