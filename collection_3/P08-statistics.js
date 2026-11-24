/**
 * @name
 *     P08-statistics.js
 * 
 * @description
 *      Script that generates graphs and calculates statistics for cross-cutting themes.
 * 
 * @authors
 *      Adrián Rodríguez
 * 
 * @theme
 *      Mangroves
 *
 * @version
 *      1.0.0
 *
 * @Date
 *      01/27/2025
 *      04/03/2025 Fabricio Garces
 */
var param = {
  country: 'ECUADOR',
  regionId: '40906',
  integrationType: 'Amazon', //National or Amazon
  transversal: 'MANGROVE',   //AGRICULTURE, FLOODABLE, MANGROVE, MINING ('401-402'), PASTURE, INFRASTRUCTURE, BANANA
  version: '7',
  //Select one:
  step: 'filters',        // classification or filters
  driveFolder: 'RAISG-EXPORT',
  years: [
    2021, 2022, 2023, 2024
  ],
  previousCollectionStats: false,   //Generate graphs from previous collection
  earlierCollectionStats: false,   //Generate graphs from collection before previous
  
  landCovers: {
    Ids: [
      5  // Mangrove class ID
    ],
    Colors: [  
      '#be83f7'  // Mangrove color
    ],
    falseYear: false,       //True if there is a false 2023
  },
  addMosaic: true,
  pacificOrAmazonMosaic: 'Amazon',
  //module where directories are located
  dirPath: require('users/mapbiomasecuador/LULC:COLECCION3/05-modules/CollectionDirectories.js').paths
};

/**
 * ----------------------------------------------------------------------------------------------
 * APPLICATION INITIALIZATION
 * ----------------------------------------------------------------------------------------------
 */
 
var assets = {
  regions: param.dirPath.regionVectorAct,
  mosaics: param.dirPath.mosaicRaisgAct,
  mapbiomasPrevious: param.dirPath.integratationEcuColAnt,
  mapbiomasEarlier: param.dirPath.integratationEcuColAntAnt,
  classification: 'projects/mapbiomas-ecuador/assets/MAPBIOMAS-LULC/COLLECTION3/CROSS_CUTTING_THEMES/' + param.transversal + '/STEP03-CLASSIFICATION/classification/',
  classification_ft: 'projects/mapbiomas-ecuador/assets/MAPBIOMAS-LULC/COLLECTION3/CROSS_CUTTING_THEMES/' + param.transversal + '/STEP03-CLASSIFICATION/classification-ft/'
};

if (param.pacificOrAmazonMosaic === 'Amazon') {
  param.mosaics = param.dirPath.mosaicRaisgAct;
}

//params
var regionId = param.regionId;
var driveFolder = param.driveFolder;
var years = param.years;
var assetName = 'Area_by_regionC';
var landCoverIds = param.landCovers.Ids;
var landCoverColors = param.landCovers.Colors;
var falseYear = param.landCovers.falseYear;

// Create mask based on region vector
var region = [];

// AGRICULTURE, FLOODABLE, MANGROVE, MINING ('401-402'), PASTURE, INFRASTRUCTURE, BANANA
if (param.transversal == 'AGRICULTURE') {
  region = ee.FeatureCollection('projects/mapbiomas-raisg/DATOS_AUXILIARES/VECTORES/AGRICULTURA/class-regiones-agri-c4');
  assets.classification = 'projects/mapbiomas-ecuador/assets/MAPBIOMAS-LULC/COLLECTION2/TRANSVERSALES/AGRICULTURE/classification/';
  assets.classification_ft = 'projects/mapbiomas-ecuador/assets/MAPBIOMAS-LULC/COLLECTION2/TRANSVERSALES/AGRICULTURE/classification-ft/';
  region = region.filter(ee.Filter.eq('id_region', param.regionId.toString()));
} else if (param.transversal == 'PASTURE') {
  region = ee.FeatureCollection('projects/mapbiomas-raisg/DATOS_AUXILIARES/VECTORES/PASTO/class-regiones-pasto-c4-b250m');
  region = region.filter(ee.Filter.eq('id_regionC', Number(param.regionId)));
} else if (param.transversal == 'MANGROVE') {
  region = ee.FeatureCollection('projects/mapbiomas-raisg/MAPBIOMAS-ECUADOR/DATOS-AUXILIARES/VECTORES/ManglaresV3_buffer');
  assets.classification = 'projects/mapbiomas-ecuador/assets/MAPBIOMAS-LULC/COLLECTION3/CROSS_CUTTING_THEMES/MANGROVE/STEP3-CLASSIFICATION/clasificacion/';
  assets.classification_ft = 'projects/mapbiomas-ecuador/assets/MAPBIOMAS-LULC/COLLECTION3/CROSS_CUTTING_THEMES/MANGROVE/STEP3-CLASSIFICATION/clasificacion-ft/';
} else if (param.transversal == 'FLOODABLE') {
  region = ee.FeatureCollection('users/Mosaico_Clasification/MAPBIOMAS-ECUADOR/REGIONES/clasificacion-regiones-inundables-2');
  region = region.filter(ee.Filter.eq('id_regionC', Number(param.regionId)));
} else if (param.transversal == 'BANANA') {
  region = ee.FeatureCollection('projects/mapbiomas-ecuador/assets/AUXILIAR-DATA/VECTOR/COLLECTION-3/BANANO/Regiones_class_Banano_col_3');
  region = region.filter(ee.Filter.eq('id_regionC', Number(param.regionId)));
  assets.classification = 'projects/mapbiomas-ecuador/assets/MAPBIOMAS-LULC/COLLECTION3/CROSS_CUTTING_THEMES/BANANA/STEP3-CLASSIFICATION/classification/';
  assets.classification_ft = 'projects/mapbiomas-ecuador/assets/MAPBIOMAS-LULC/COLLECTION3/CROSS_CUTTING_THEMES/BANANA/STEP3-CLASSIFICATION/classification-ft/';
} else if (param.transversal == 'MINING') {
  region = ee.FeatureCollection(assets.regions);
  region = region.filter(
    ee.Filter.or(
      ee.Filter.inList('id_region', [401, 402]),
      ee.Filter.inList('id_regionc', [401, 402]),
      ee.Filter.inList('id_regionC', [401, 402])
    )
  );
} else if (param.transversal == 'INFRASTRUCTURE') {
  region = ee.FeatureCollection('projects/mapbiomas-ecuador/assets/AUXILIARY-DATA/VECTOR/regiones-infraestructura').filter(ee.Filter.eq('id_regionC', param.regionId));
}

// Convert region to raster and create mask
var regionRaster = region.reduceToImage({
  properties: ['id_regionC'],
  reducer: ee.Reducer.first()
}).multiply(0).add(1);

print('Region:', region);

// Add Region to Map
Map.addLayer(region, {color: '006600', strokeWidth: 5}, 'Region ' + param.transversal, 1, 0.25);
var country = param.country;
var fullRegion = country + '-' + regionId;

// Detect processing stage
var imageClassification;
if (param.step == 'classification') {
  imageClassification = assets.classification + fullRegion + '-' + param.version;
  if (param.transversal == 'FLOODABLE') {
    imageClassification = assets.classification + 'FLOODED-' + regionId + '-' + param.version;
  }
  if (param.transversal == 'AGRICULTURE') {
    imageClassification = assets.classification + 'ECUADOR-' + regionId + '-' + param.version;
  }
  if (param.transversal == 'MINING') {
    imageClassification = assets.classification + 'ECUADOR-' + regionId + '-' + param.version;
  }
  if (param.transversal == 'BANANA') {
    imageClassification = assets.classification + 'ECUADOR-' + regionId + '-' + param.version;
  }
} else if (param.step == 'filters') {
  imageClassification = assets.classification_ft + fullRegion + '-' + param.version;
  if (param.transversal == 'FLOODABLE') {
    imageClassification = assets.classification_ft + 'FLOODED-' + regionId + '-' + param.version;
  }
  if (param.transversal == 'AGRICULTURE') {
    imageClassification = assets.classification_ft + 'ECUADOR-' + regionId + '-' + param.version;
  }
  if (param.transversal == 'MINING') {
    imageClassification = assets.classification_ft + 'ECUADOR-' + regionId + '-' + param.version;
  }
  if (param.transversal == 'BANANA') {
    imageClassification = assets.classification_ft + 'ECUADOR-' + regionId + '-' + param.version;
  }
  if (param.transversal == 'PASTURE') {
    assets.classification_ft = 'projects/mapbiomas-ecuador/assets/MAPBIOMAS-LULC/COLLECTION3/CROSS_CUTTING_THEMES/PASTURE/STEP3-CLASSIFICATION/classification-ft/';
    assets.mapbiomasPrevious = 'projects/mapbiomas-public/assets/amazon/lulc/collection6/mapbiomas_collection60_integration_v1';
    imageClassification = assets.classification_ft + 'ECUADOR-' + regionId + '-' + param.version;
  }
}

// Import and filter mosaics
if (param.addMosaic) {
  var mosaics = ee.ImageCollection(assets.mosaics)
    .filterBounds(region);
}

// Function to mask specific land cover classes
function maskClasses(image, classList) {
  var outputImage = ee.Image();
  for (var pC in classList) {
    var mask = image.eq(classList[pC]);
    var maskedImage = image.updateMask(mask);
    outputImage = maskedImage.blend(outputImage);
  }
  return outputImage;
}

var currentCollection = ee.Image(imageClassification);
currentCollection = maskClasses(currentCollection, param.landCovers.Ids);

if (param.previousCollectionStats) {
  var previousCollection = ee.Image(assets.mapbiomasPrevious).updateMask(regionRaster);
  if (param.integrationType === 'Amazon') {
    previousCollection = previousCollection.set('collection', '6.0');
  }
  previousCollection = maskClasses(previousCollection, param.landCovers.Ids);
  var previousCollectionName = ee.String(previousCollection.get('collection'));
}

if (param.earlierCollectionStats) {
  var earlierCollection = ee.Image(assets.mapbiomasEarlier).updateMask(regionRaster);
  earlierCollection = maskClasses(earlierCollection, param.landCovers.Ids);
  var earlierCollectionName = ee.String(earlierCollection.get('description')).slice(-3);
}

// Generate coverage statistics
getAreas(currentCollection, previousCollection, previousCollectionName, earlierCollection, earlierCollectionName, region, regionId + '-STATISTICS', landCoverIds, landCoverColors, falseYear);

// Display data on map
var palette = require('users/mapbiomas/modules:Palettes.js').get('classification7');

years.forEach(function(year) {
  var filteredMosaic = mosaics.filter(ee.Filter.eq('year', year))
    .mosaic();

  var yearImage = currentCollection.select('classification_' + year);

  Map.addLayer(filteredMosaic,
    {
      bands: ['swir1_median', 'nir_median', 'red_median'],
      gain: [0.085, 0.05, 0.25]
    },
    'MOSAIC ' + year, false
  );

  if (year < 2024 && param.previousCollectionStats) {
    var yearReferencePrevious = previousCollection.select('classification_' + year);
    Map.addLayer(yearReferencePrevious,
      {
        min: 0,
        max: 62,
        palette: palette
      },
      'CLASSIFICATION ' + previousCollectionName.getInfo() + ' ' + year, false
    );
  }

  if (year < 2023 && param.earlierCollectionStats) {
    var yearImageEarlier = earlierCollection.select('classification_' + year);
    Map.addLayer(yearImageEarlier,
      {
        min: 0,
        max: 62,
        palette: palette
      },
      'CLASSIFICATION ' + earlierCollectionName.getInfo() + ' ' + year, false
    );
  }

  Map.addLayer(yearImage,
    {
      min: 0,
      max: 62,
      palette: palette
    },
    'CLASSIFICATION CURRENT EC ' + year.toString(), false
  );
});

/**
 * ----------------------------------------------------------------------------------------------
 * FUNCTIONS
 * The functionalities used in the application are defined below.
 * ----------------------------------------------------------------------------------------------
 */

// Function to assign an arbitrary version
function setVersion(item) { return item.set('version', 1); }

// Function to generate region of interest (ROI) based on
function getRegion(regionPath, regionId) {
  var region = ee.FeatureCollection(regionPath)
    .filterMetadata("id_regionC", "equals", regionId);
  
  var regionMask = region
    .map(setVersion)
    .reduceToImage(['version'], ee.Reducer.first());
    
  return {
    vector: region,
    rasterMask: regionMask
  };
}

// Function to generate coverage statistics by year and class
function getAreas(currentCollection, previousCollection, previousColName, earlierCollection, earlierColName, region, description, landCovers, colors, falseYear) {
  var pixelArea = ee.Image.pixelArea();
  
  var reducer = {
    reducer: ee.Reducer.sum(),
    geometry: region.geometry(),
    scale: 30,
    maxPixels: 1e13
  };
  
  var classIds = ee.List(landCovers);
  var bandNames = currentCollection.bandNames();

  if (previousCollection) {
    var bandNamesPrevious = previousCollection.bandNames();
  }
  
  if (earlierCollection) {
    var bandNamesEarlier = earlierCollection.bandNames();
  }

  print('Class IDs:', classIds);
  
  classIds.evaluate(function(classIds, error) {
    if (error) print(error.message);
    
    var yearsAreas = [], referenceAreasPrevious = [], referenceAreasEarlier = [];
    
    classIds.forEach(function(classId) {
      var area = bandNames.map(function(band) {
        var year = ee.String(band).split('_').get(1);
        classId = ee.Number(classId).int8();
        var yearImage = currentCollection.select([band]);
        
        var yearCoverImage = yearImage.eq(classId);
        var coverArea = yearCoverImage.multiply(pixelArea).divide(1e4);
        return coverArea.reduceRegion(reducer).get(band);
      }).add(classId);
      
      // Generate keys list for dictionary
      var keys = bandNames.map(function(item) {
        var year = ee.String(item).split('_').get(1);
        return ee.String(year);
      }).add('ClassID');
      
      var dict = ee.Dictionary.fromLists(keys, area);
      yearsAreas.push(ee.Feature(null, dict));
    });
    
    yearsAreas = ee.FeatureCollection(yearsAreas);
    
    // Define a dictionary that associates property names with values and labels
    var yearsInfo;
    if (falseYear) {
      yearsInfo = {
        '1985': {v: 1985, f: '1985'}, '1986': {v: 1986, f: '1986'}, '1987': {v: 1987, f: '1987'},
        '1988': {v: 1988, f: '1988'}, '1989': {v: 1989, f: '1989'}, '1990': {v: 1990, f: '1990'},
        '1991': {v: 1991, f: '1991'}, '1992': {v: 1992, f: '1992'}, '1993': {v: 1993, f: '1993'},
        '1994': {v: 1994, f: '1994'}, '1995': {v: 1995, f: '1995'}, '1996': {v: 1996, f: '1996'},
        '1997': {v: 1997, f: '1997'}, '1998': {v: 1998, f: '1998'}, '1999': {v: 1999, f: '1999'},
        '2000': {v: 2000, f: '2000'}, '2001': {v: 2001, f: '2001'}, '2002': {v: 2002, f: '2002'},
        '2003': {v: 2003, f: '2003'}, '2004': {v: 2004, f: '2004'}, '2005': {v: 2005, f: '2005'},
        '2006': {v: 2006, f: '2006'}, '2007': {v: 2007, f: '2007'}, '2008': {v: 2008, f: '2008'},
        '2009': {v: 2009, f: '2009'}, '2010': {v: 2010, f: '2010'}, '2011': {v: 2011, f: '2011'},
        '2012': {v: 2012, f: '2012'}, '2013': {v: 2013, f: '2013'}, '2014': {v: 2014, f: '2014'},
        '2015': {v: 2015, f: '2015'}, '2016': {v: 2016, f: '2016'}, '2017': {v: 2017, f: '2017'},
        '2018': {v: 2018, f: '2018'}, '2019': {v: 2019, f: '2019'}, '2020': {v: 2020, f: '2020'},
        '2021': {v: 2021, f: '2021'}, '2022': {v: 2022, f: '2022'}, '2023': {v: 2023, f: '2023'},
        '2024': {v: 2024, f: '2024'}, '2025': {v: 2025, f: '2025'}
      };
    } else {
      yearsInfo = {
        '1985': {v: 1985, f: '1985'}, '1986': {v: 1986, f: '1986'}, '1987': {v: 1987, f: '1987'},
        '1988': {v: 1988, f: '1988'}, '1989': {v: 1989, f: '1989'}, '1990': {v: 1990, f: '1990'},
        '1991': {v: 1991, f: '1991'}, '1992': {v: 1992, f: '1992'}, '1993': {v: 1993, f: '1993'},
        '1994': {v: 1994, f: '1994'}, '1995': {v: 1995, f: '1995'}, '1996': {v: 1996, f: '1996'},
        '1997': {v: 1997, f: '1997'}, '1998': {v: 1998, f: '1998'}, '1999': {v: 1999, f: '1999'},
        '2000': {v: 2000, f: '2000'}, '2001': {v: 2001, f: '2001'}, '2002': {v: 2002, f: '2002'},
        '2003': {v: 2003, f: '2003'}, '2004': {v: 2004, f: '2004'}, '2005': {v: 2005, f: '2005'},
        '2006': {v: 2006, f: '2006'}, '2007': {v: 2007, f: '2007'}, '2008': {v: 2008, f: '2008'},
        '2009': {v: 2009, f: '2009'}, '2010': {v: 2010, f: '2010'}, '2011': {v: 2011, f: '2011'},
        '2012': {v: 2012, f: '2012'}, '2013': {v: 2013, f: '2013'}, '2014': {v: 2014, f: '2014'},
        '2015': {v: 2015, f: '2015'}, '2016': {v: 2016, f: '2016'}, '2017': {v: 2017, f: '2017'},
        '2018': {v: 2018, f: '2018'}, '2019': {v: 2019, f: '2019'}, '2020': {v: 2020, f: '2020'},
        '2021': {v: 2021, f: '2021'}, '2022': {v: 2022, f: '2022'}, '2023': {v: 2023, f: '2023'},
        '2024': {v: 2024, f: '2024'}
      };
    }
    
    // Organize property information into objects for defining x properties and their tick labels
    var xPropValDict = {};
    var xPropLabels = [];
    for (var key in yearsInfo) {
      xPropValDict[key] = yearsInfo[key].v;
      xPropLabels.push(yearsInfo[key]);
    }
    
    // Define the chart and print it to the console
    var chart = ui.Chart.feature
      .byProperty({
        features: yearsAreas,
        xProperties: xPropValDict,
        seriesProperty: 'ClassID'
      })
      .setChartType('AreaChart')
      .setOptions({
        title: 'Areas by Year Current Collection',
        hAxis: {
          title: 'Year',
          titleTextStyle: {italic: false, bold: true},
          ticks: xPropLabels
        },
        vAxis: {
          title: 'Hectares (ha)',
          titleTextStyle: {italic: false, bold: true}
        },
        colors: colors,
        lineSize: 5,
        pointSize: 1,
        curveType: 'function'
      });
    print('Histogram Current Collection', chart);
    
    if (previousCollection) {
      classIds.forEach(function(classId) {
        var areaPrevious = bandNamesPrevious.map(function(band) {
          var year = ee.String(band).split('_').get(1);
          classId = ee.Number(classId).int8();
          var yearImage = previousCollection.select([band]);
          
          var yearCoverImage = yearImage.eq(classId);
          var coverAreaPrevious = yearCoverImage.multiply(pixelArea).divide(1e4);
          return coverAreaPrevious.reduceRegion(reducer).get(band);
        }).add(classId);
        
        var keysPrevious = bandNamesPrevious.map(function(item) {
          var year = ee.String(item).split('_').get(1);
          return ee.String(year);
        }).add('ClassID');
        
        var dict = ee.Dictionary.fromLists(keysPrevious, areaPrevious);
        referenceAreasPrevious.push(ee.Feature(null, dict));
      });
      
      referenceAreasPrevious = ee.FeatureCollection(referenceAreasPrevious);
      
      var yearsInfoPrevious = {
        '1985': {v: 1985, f: '1985'}, '1986': {v: 1986, f: '1986'}, '1987': {v: 1987, f: '1987'},
        '1988': {v: 1988, f: '1988'}, '1989': {v: 1989, f: '1989'}, '1990': {v: 1990, f: '1990'},
        '1991': {v: 1991, f: '1991'}, '1992': {v: 1992, f: '1992'}, '1993': {v: 1993, f: '1993'},
        '1994': {v: 1994, f: '1994'}, '1995': {v: 1995, f: '1995'}, '1996': {v: 1996, f: '1996'},
        '1997': {v: 1997, f: '1997'}, '1998': {v: 1998, f: '1998'}, '1999': {v: 1999, f: '1999'},
        '2000': {v: 2000, f: '2000'}, '2001': {v: 2001, f: '2001'}, '2002': {v: 2002, f: '2002'},
        '2003': {v: 2003, f: '2003'}, '2004': {v: 2004, f: '2004'}, '2005': {v: 2005, f: '2005'},
        '2006': {v: 2006, f: '2006'}, '2007': {v: 2007, f: '2007'}, '2008': {v: 2008, f: '2008'},
        '2009': {v: 2009, f: '2009'}, '2010': {v: 2010, f: '2010'}, '2011': {v: 2011, f: '2011'},
        '2012': {v: 2012, f: '2012'}, '2013': {v: 2013, f: '2013'}, '2014': {v: 2014, f: '2014'},
        '2015': {v: 2015, f: '2015'}, '2016': {v: 2016, f: '2016'}, '2017': {v: 2017, f: '2017'},
        '2018': {v: 2018, f: '2018'}, '2019': {v: 2019, f: '2019'}, '2020': {v: 2020, f: '2020'},
        '2021': {v: 2021, f: '2021'}, '2022': {v: 2022, f: '2022'}, '2023': {v: 2023, f: '2023'}
      };
      
      var xPropValDictPrevious = {};
      var xPropLabelsPrevious = [];
      for (var keyPrevious in yearsInfoPrevious) {
        xPropValDictPrevious[keyPrevious] = yearsInfoPrevious[keyPrevious].v;
        xPropLabelsPrevious.push(yearsInfoPrevious[keyPrevious]);
      }
      
      var chartPrevious = ui.Chart.feature
        .byProperty({
          features: referenceAreasPrevious,
          xProperties: xPropValDictPrevious,
          seriesProperty: 'ClassID'
        })
        .setChartType('AreaChart')
        .setOptions({
          title: 'Areas by Year Col ' + previousColName.getInfo() + ' Ecuador',
          hAxis: {
            title: 'Year',
            titleTextStyle: {italic: false, bold: true},
            ticks: xPropLabelsPrevious
          },
          vAxis: {
            title: 'Hectares (ha)',
            titleTextStyle: {italic: false, bold: true}
          },
          colors: colors,
          lineSize: 5,
          pointSize: 1,
          curveType: 'function'
        });
      print('Histogram Col ' + previousColName.getInfo() + ' Ecuador', chartPrevious);
    }
    
    if (earlierCollection) {
      classIds.forEach(function(classId) {
        var areaEarlier = bandNamesEarlier.map(function(band) {
          var year = ee.String(band).split('_').get(1);
          classId = ee.Number(classId).int8();
          var yearImage = earlierCollection.select([band]);
          
          var yearCoverImage = yearImage.eq(classId);
          var coverAreaEarlier = yearCoverImage.multiply(pixelArea).divide(1e4);
          return coverAreaEarlier.reduceRegion(reducer).get(band);
        }).add(classId);
        
        var keysEarlier = bandNamesEarlier.map(function(item) {
          var year = ee.String(item).split('_').get(1);
          return ee.String(year);
        }).add('ClassID');
        
        var dict = ee.Dictionary.fromLists(keysEarlier, areaEarlier);
        referenceAreasEarlier.push(ee.Feature(null, dict));
      });
      
      referenceAreasEarlier = ee.FeatureCollection(referenceAreasEarlier);
      
      var yearsInfoEarlier = {
        '1985': {v: 1985, f: '1985'}, '1986': {v: 1986, f: '1986'}, '1987': {v: 1987, f: '1987'},
        '1988': {v: 1988, f: '1988'}, '1989': {v: 1989, f: '1989'}, '1990': {v: 1990, f: '1990'},
        '1991': {v: 1991, f: '1991'}, '1992': {v: 1992, f: '1992'}, '1993': {v: 1993, f: '1993'},
        '1994': {v: 1994, f: '1994'}, '1995': {v: 1995, f: '1995'}, '1996': {v: 1996, f: '1996'},
        '1997': {v: 1997, f: '1997'}, '1998': {v: 1998, f: '1998'}, '1999': {v: 1999, f: '1999'},
        '2000': {v: 2000, f: '2000'}, '2001': {v: 2001, f: '2001'}, '2002': {v: 2002, f: '2002'},
        '2003': {v: 2003, f: '2003'}, '2004': {v: 2004, f: '2004'}, '2005': {v: 2005, f: '2005'},
        '2006': {v: 2006, f: '2006'}, '2007': {v: 2007, f: '2007'}, '2008': {v: 2008, f: '2008'},
        '2009': {v: 2009, f: '2009'}, '2010': {v: 2010, f: '2010'}, '2011': {v: 2011, f: '2011'},
        '2012': {v: 2012, f: '2012'}, '2013': {v: 2013, f: '2013'}, '2014': {v: 2014, f: '2014'},
        '2015': {v: 2015, f: '2015'}, '2016': {v: 2016, f: '2016'}, '2017': {v: 2017, f: '2017'},
        '2018': {v: 2018, f: '2018'}, '2019': {v: 2019, f: '2019'}, '2020': {v: 2020, f: '2020'},
        '2021': {v: 2021, f: '2021'}, '2022': {v: 2022, f: '2022'}
      };
      
      var xPropValDictEarlier = {};
      var xPropLabelsEarlier = [];
      for (var keyEarlier in yearsInfoEarlier) {
        xPropValDictEarlier[keyEarlier] = yearsInfoEarlier[keyEarlier].v;
        xPropLabelsEarlier.push(yearsInfoEarlier[keyEarlier]);
      }
      
      var chartEarlier = ui.Chart.feature
        .byProperty({
          features: referenceAreasEarlier,
          xProperties: xPropValDictEarlier,
          seriesProperty: 'ClassID'
        })
        .setChartType('AreaChart')
        .setOptions({
          title: 'Areas by Year Col ' + earlierColName.getInfo() + ' Ecuador',
          hAxis: {
            title: 'Year',
            titleTextStyle: {italic: false, bold: true},
            ticks: xPropLabelsEarlier
          },
          vAxis: {
            title: 'Hectares (ha)',
            titleTextStyle: {italic: false, bold: true}
          },
          colors: colors,
          lineSize: 5,
          pointSize: 1,
          curveType: 'function'
        });
      print('Histogram Col ' + earlierColName.getInfo() + ' Ecuador', chartEarlier);
    }
    
    // Export statistics to Google Drive
    Export.table.toDrive({
      collection: yearsAreas,
      description: "CurrentCol-" + assetName + '-' + param.regionId + '-version' + param.version,
      fileFormat: 'CSV',
      folder: driveFolder
    });
    
    if (previousCollection) {
      Export.table.toDrive({
        collection: referenceAreasPrevious,
        description: "Col-" + previousColName.getInfo() + assetName + '-' + param.regionId + '-version' + param.version,
        fileFormat: 'CSV',
        folder: driveFolder
      });
    }
    
    if (earlierCollection) {
      Export.table.toDrive({
        collection: referenceAreasEarlier,
        description: "Col-" + earlierColName.getInfo() + assetName + '-' + param.regionId + '-version' + param.version,
        fileFormat: 'CSV',
        folder: driveFolder
      });
    }
  });
}