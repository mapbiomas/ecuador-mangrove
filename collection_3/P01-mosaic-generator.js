
/**
 * @name
 *      P01-mosaic-generator.js
 * 
 * @description
 *      Script that generates annual Landsat mosaics TOA for mangrove mapping,
 *      applying cloud masking and spectral indices calculation.
 * 
 * @authors
 *      MapBiomas Team
 * 
 * @theme
 *      Mangrove
 *    
 * @version
 *      1.0.0
 *
 * @Date
 *      2024
 */

var param = { 
  startDate : '2010-01-01',
  endDate   : '2010-12-31',
  cloudCover: 90,
  country   : 'ECUADOR',
  pathRows  : {
    ECUADOR: [
      [10, 58],
      [10, 59],
      [10, 60],
      [11, 59],
      [11, 60],
      [11, 61],
      [10, 62],
      [11, 62],
      [10, 63],
      [11, 63],
      [17, 60],
      [17, 61],
      [18, 60],
      [18, 61],
      [10, 64],
      [11, 64],
    ],
   
  },
  blacklist: {
    ECUADOR: [
      'LE07_010059_20180118',
      'LE07_010060_20181204',
      'LE07_010060_20181118',
      'LC08_010059_20181228'
    ],
  }
};

/**
 * Get grid layer for the specified country
 */
var getGrid = function(param) {
  var country = param.country;
  var region = param.studyArea;
  var path = 'projects/mapbiomas-raisg/DATOS_AUXILIARES/VECTORES/' + country;
  var countriesPath = 'projects/mapbiomas-raisg/DATOS_AUXILIARES/VECTORES/countries-4';
  
  var grids = {
    'ECUADOR'        : path + '/path-row-pacifico-grid',
  };
  
  var countries = {
    'ECUADOR'        : 'Ecuador',
  };
  
  var countryLayer = ee.FeatureCollection(countriesPath)
    .filter(ee.Filter.eq('name', countries[country]));
  
  var layer = grids[country] !== ''
    ? ee.FeatureCollection(grids[country])
    : ee.FeatureCollection(region.intersection(countryLayer));
  
  return grids[country] !== ''
    ? { grid: true, layer: layer }
    : { grid: false, layer: layer };
};

/**
 * Get Landsat collection for the specified parameters
 */
var getCollection = function(param) {
  var country      = param.country;
  var cloudCover   = param.cloudCover;
  var collectionId = param.collectionId;
  var start        = param.startDate;
  var finish       = param.endDate;
  var bands        = param.bands;
  var region       = param.region;
  var pathRows     = param.pathRows[country];
  var blacklist    = param.blacklist[country] || [];
  var satellite    = param.satellite;
  var bandNamesTOA = ee.List(['blue','green','red','nir','swir1','swir2','BQA']);
  
  var main = ee.ImageCollection(collectionId)
    .filter(ee.Filter.and(
      ee.Filter.lte('CLOUD_COVER', cloudCover),
      ee.Filter.date(start, finish)
    ))
    .select(bands.get(satellite), bandNamesTOA);
  
  var out = pathRows.map(function(pathRow) {
    var filtered = main.filter(ee.Filter.and(
      ee.Filter.eq('WRS_PATH', pathRow[0]),
      ee.Filter.eq('WRS_ROW',  pathRow[1]),
      ee.Filter.inList('system:index', blacklist).not()
    ));
    
    return ee.Algorithms.If(
      ee.Algorithms.IsEqual(filtered.size(), 0),
      0,
      filtered
    );
  });
  
  var output = ee.List(out).filter(ee.Filter.neq('item', 0));
  
  return ee.FeatureCollection(output).flatten();
};

/**
 * Apply getCollection for all Landsat satellites
 */
var applyGetCollection = function(param) {
  var startDate = param.startDate;
  var endDate = param.endDate;
  var toa = {};
  
  var collectionIds = {
    L5: 'LANDSAT/LT05/C02/T1_TOA',
    L7: 'LANDSAT/LE07/C02/T1_TOA',
    L8: 'LANDSAT/LC08/C02/T1_TOA',
    L9: 'LANDSAT/LC09/C02/T1_TOA'
  };
    
  param.bands = ee.Dictionary({
    L9: ee.List([1, 2, 3, 4, 5, 6, 'QA_PIXEL']),
    L8: ee.List([1, 2, 3, 4, 5, 6, 'QA_PIXEL']),
    L7: ee.List([0, 1, 2, 3, 4, 7, 'QA_PIXEL']),
    L5: ee.List([0, 1, 2, 3, 4, 6, 'QA_PIXEL'])
  });
  
  var satellites = Object.keys(collectionIds);
  var year = parseInt(param.startDate.split('-')[0]);
  
  satellites.forEach(function(satellite) {
    param.collectionId = collectionIds[satellite];
    param.satellite = satellite;
    toa[satellite] = getCollection(param);
  });
  
  var ls = year < 2014
    ? ee.ImageCollection(toa.L5.merge(toa.L7).merge(toa.L8))
    : ee.ImageCollection(toa.L8).merge(toa.L9);
  
  return ls;
};

/**
 * Apply cloud and shadow masks based on quality assessment band
 */
var bqaFunction = function(image) {
  var imageId = ee.String(image.get('SPACECRAFT_ID'));
  var landsat8Id = ee.String('LANDSAT_8');
  var val = ee.Algorithms.If(imageId.compareTo(landsat8Id), 672, 2720);
  
  var dilatedCloud = 1 << 1;
  var cloud = 1 << 3;
  var shadow = 1 << 4;
  var qa = image.select('BQA');
  var mask = qa.bitwiseAnd(dilatedCloud)
    .or(qa.bitwiseAnd(cloud))
    .or(qa.bitwiseAnd(shadow));
  
  return image.updateMask(mask.not());
};

/**
 * Compute spectral indices
 */
var createIndices = function(image) {
  var totalNitrate = null;
  var totalPhosphorus = null;
  var MNDWI = null;
  var NDVI = null;
  var NDWI = null;
  var MMRI = null;
  var NDSI = null;
  
  NDVI = image.expression(
    '(((nir - red)/(nir + red)))', {
      'nir': image.select('nir'),
      'red': image.select('red')
    });
  
  NDSI = image.expression(
    '(((swir1 - nir)/(nir + swir1)))', {
      'swir1': image.select('swir1'),
      'nir': image.select('nir')
    });
  
  NDWI = image.expression(
    '((green - nir)/(nir + green))', {
      'green': image.select('green'),
      'nir': image.select('nir')
    });
  
  MNDWI = image.expression(
    '(((green - swir1)/(green + swir1)))', {
      'green': image.select('green'),
      'swir1': image.select('swir1'),
    });
  
  MMRI = image.expression(
    '(abs(MNDWI)-abs(NDVI))/(abs(MNDWI) + abs(NDVI))', {
      'MNDWI': MNDWI,
      'NDVI': NDVI,
    });
  
  // Calculate total Phosphorus
  totalPhosphorus = image.expression(
    '2.71828**(-0.4081 - 8.659*(1/(red/green)))', {
      'green': image.select('green'),
      'red': image.select('red')
    });
  
  // Calculate total Nitrate
  totalNitrate = image.expression(
    '2.71828**(8.228 - 2.713*(1/(red+green)))', {
      'green': image.select('green'),
      'red': image.select('red')
    });
  
  // Recalculate MNDWI
  MNDWI = image.expression(
    '(((green - swir1)/(green + swir1)))', {
      'green': image.select('green'),
      'swir1': image.select('swir1'),
    });
  
  var maskedImage = image
    .addBands(NDVI.rename('NDVI'))
    .addBands(MNDWI.rename('MNDWI'))
    .addBands(NDSI.rename('NDSI'))
    .addBands(NDWI.rename('NDWI'))
    .addBands(MMRI.rename('MMRI'))
    .addBands(totalNitrate.rename('IM1'))
    .addBands(totalPhosphorus.rename('IM2'));
  
  return maskedImage;
};

/**
 * Implementation
 */
var year = param.startDate.split('-')[0];
var startDate = param.startDate;
var endDate = param.endDate;
param.region = getGrid(param).layer;
param.grid = getGrid(param).grid;

var mosaicMerge = applyGetCollection(param)
  .map(createIndices)
  .map(bqaFunction);

var mosaic = mosaicMerge.median();

var selected = mosaic
  .select(['NDVI', 'MNDWI', 'MMRI', 'NDSI', 'NDWI']);

var im1 = mosaic
  .visualize(['IM1'], null, null, 5.04893968546401e-7, 0.004990332819056622)
  .rename('IM1');

var im2 = mosaic
  .visualize(['IM2'], null, null, 8.53118346494392e-9, 27.249109247040032)
  .rename('IM2');

var mosaicNew = mosaic
  .select(['swir2', 'swir1', 'nir', 'red', 'green', 'BQA'])
  .multiply(255)
  .addBands(selected.add(1).multiply(127));

mosaicNew = mosaicNew
  .addBands(im1)
  .addBands(im2);

var clipMosaic = mosaicNew.byte();

if (param.grid) {
  clipMosaic = ee.ImageCollection(
    param.region.map(function(feature) {
      return mosaicNew.clip(feature);
    })
  )
  .mosaic()
  .byte();
}

/**
 * Display images
 */
mosaicMerge
  .reduceColumns(ee.Reducer.toList(), ['system:index'])
  .get('list')
  .evaluate(function(ids) {
    ids.forEach(function(imageid) {
      var image = mosaicMerge.filterMetadata('system:index', 'equals', imageid).mosaic();
      var imgid = imageid.substr(imageid.length - 20);
      Map.addLayer(image,
        {
          bands: 'swir1,nir,red',
          min: 0, max: 1,
          gamma: 1.8
        },
        imgid,
        false
      );
      print(imgid);
    });
  });

Map.addLayer(
  clipMosaic.select('MMRI'),
  {
    min: 10,
    max: 220,
    palette: 'b3260f,ff9c08,2dff34,1f64ff'
  },
  'Mosaic clip'
);

Map.addLayer(
  mosaicNew.select('MMRI'),
  {
    min: 10,
    max: 220,
    palette: 'b3260f,ff9c08,2dff34,1f64ff'
  },
  'Mosaic raw',
  false
);

Map.addLayer(
  param.region,
  {},
  'STUDY AREA',
  false
);

/**
 * Export images
 */
var fileName = param.country + '-' + year;

Export.image.toAsset({
  image: clipMosaic
    .toByte()
    .set({
      year: year,
      version: 5,
      country: param.country
    }),
  description: fileName,
  assetId: 'projects/mapbiomas-raisg/MOSAICOS/mangrove-5/' + fileName,
  region: param.region.geometry().bounds(),
  scale: 30,
  maxPixels: 1e13
});