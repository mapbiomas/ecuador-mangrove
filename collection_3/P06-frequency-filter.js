
/**
 * @name
 *      P06-frequency-filter.js
 * 
 * @description
 *      Script that applies frequency-based filtering for mangrove classification,
 *      identifying persistent mangrove pixels based on temporal frequency analysis.
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
var apply_area = 
    /* color: #d63000 */
    /* shown: false */
    ee.FeatureCollection(
        [ee.Feature(
            ee.Geometry.Polygon(
                [[[-79.78967745146191, -2.6324983600378933],
                  [-79.77920610746777, -2.6307835566672257],
                  [-79.7754295571748, -2.6239243196182374],
                  [-79.77903444609082, -2.6168935625883125],
                  [-79.78452761015332, -2.6131209449924118],
                  [-79.79328234037793, -2.601974508654072],
                  [-79.79826052030957, -2.5961440257497563],
                  [-79.80135042509472, -2.6057471596988617],
                  [-79.80323870024121, -2.6131209449924118],
                  [-79.8028953774873, -2.6220380228281464],
                  [-79.79894716581738, -2.628039866369809],
                  [-79.79259569487012, -2.631812438972706]]]),
            {
              "system:index": "0"
            }),
        ee.Feature(
            ee.Geometry.Polygon(
                [[[-79.75191194853222, -2.6352420405221415],
                  [-79.74384386381543, -2.6252961700417807],
                  [-79.7340591653291, -2.6151787378148277],
                  [-79.72753603300488, -2.6100342494351896],
                  [-79.72719271025097, -2.605404191888968],
                  [-79.73199922880566, -2.5846544660485837],
                  [-79.73886568388379, -2.5832825713632324],
                  [-79.74401552519238, -2.5820821622977825],
                  [-79.75534517607129, -2.5777949778091824],
                  [-79.75792009672558, -2.572307360592543],
                  [-79.75328523954785, -2.5687060989587134],
                  [-79.74865038237012, -2.565619295189644],
                  [-79.74950868925488, -2.5692205655284486],
                  [-79.75397188505566, -2.57333629062077],
                  [-79.75105364164746, -2.5755656361659223],
                  [-79.74676210722363, -2.5755656361659223],
                  [-79.73972399076855, -2.5796813407648993],
                  [-79.73320085844433, -2.5795098533390655],
                  [-79.72976763090527, -2.571278429734191],
                  [-79.723416159958, -2.5620180147082294],
                  [-79.72478945097363, -2.5558443674695686],
                  [-79.73079759916699, -2.548470249913891],
                  [-79.73251421293652, -2.54366847623105],
                  [-79.73354418119824, -2.5398956415084006],
                  [-79.73423082670605, -2.5284055770354397],
                  [-79.73749239286816, -2.523603728873906],
                  [-79.74916536650097, -2.530463506523848],
                  [-79.76718981108105, -2.5333789010399648],
                  [-79.77731783232129, -2.5357798092429635],
                  [-79.7838409646455, -2.5443544449953466],
                  [-79.78916246733105, -2.5597886455240753],
                  [-79.7941406472627, -2.5729933140369603],
                  [-79.79297839193755, -2.580078041167187],
                  [-79.79400836019927, -2.5884808940494417],
                  [-79.79435168295318, -2.594997353856903],
                  [-79.79040347128326, -2.602714170707186],
                  [-79.7843953230899, -2.610430940312683],
                  [-79.77684222250396, -2.6136891177049346],
                  [-79.77220736532622, -2.618319144710477],
                  [-79.76980410604888, -2.6272361855240582],
                  [-79.7627659895938, -2.6332380040762304]]]),
            {
              "system:index": "1"
            }),
        ee.Feature(
            ee.Geometry.Polygon(
                [[[-79.89076650999422, -2.652455810140088],
                  [-79.85712088011141, -2.6692604870461243],
                  [-79.83823812864657, -2.6637732708026873],
                  [-79.83034170530672, -2.645596692639893],
                  [-79.81111563108797, -2.5448957708803244],
                  [-79.7960094299161, -2.537007111389187],
                  [-79.74839280967038, -2.5266899149464326],
                  [-79.73500322226803, -2.5153712295603508],
                  [-79.72882341269772, -2.5033664559141924],
                  [-79.72985338095944, -2.5109123265050846],
                  [-79.72899507407467, -2.528919341359617],
                  [-79.72865175132077, -2.542467311669147],
                  [-79.7245318782739, -2.5491554977787394],
                  [-79.71955369834225, -2.5558436491305305],
                  [-79.71818040732663, -2.5580730251747847],
                  [-79.71835206870358, -2.562874745026],
                  [-79.72127031211178, -2.567161979673513],
                  [-79.72384523276608, -2.573335572291554],
                  [-79.72504686240475, -2.5765938452358603],
                  [-79.72144197348874, -2.5858541543597586],
                  [-79.71869539145749, -2.594428454396885],
                  [-79.71673179046219, -2.601844281976266],
                  [-79.71759009734696, -2.6092180901442887],
                  [-79.72016501800125, -2.6152199951049684],
                  [-79.72308326140946, -2.61813519572834],
                  [-79.72720313445633, -2.626194832720146],
                  [-79.72943473235672, -2.6328825771361735],
                  [-79.73029303924149, -2.637855492026688],
                  [-79.7323724289987, -2.6406437831471004],
                  [-79.73323073588347, -2.6430444881777806],
                  [-79.73486151896452, -2.6452737101199744],
                  [-79.73743643961882, -2.6461311021078355],
                  [-79.74292960368132, -2.648446057512661],
                  [-79.74490370951628, -2.6509324862763757],
                  [-79.7488519211862, -2.651275441575952],
                  [-79.75211348734831, -2.653247432703437],
                  [-79.75631919108366, -2.6535903873611386],
                  [-79.76112570963835, -2.6535903873611386],
                  [-79.76327147685026, -2.6550479435947705],
                  [-79.7635289689157, -2.6589919106620576],
                  [-79.76627555094694, -2.659420601975223],
                  [-79.77786269389128, -2.66285012711505],
                  [-79.77863517008757, -2.6661939049342136],
                  [-79.78026595316862, -2.6733958570500005],
                  [-79.78138175211882, -2.679568925224446],
                  [-79.78261527199152, -2.6864518806949533],
                  [-79.78175696510675, -2.6909101632368886],
                  [-79.7819286264837, -2.698626382936847],
                  [-79.78124198097589, -2.7046278532918544],
                  [-79.77798041481378, -2.7065140235590976],
                  [-79.77540549415949, -2.704456383122069],
                  [-79.77454718727472, -2.7013699159225277],
                  [-79.77265891212824, -2.704970793558678],
                  [-79.77368888038995, -2.7096004776640155],
                  [-79.77712210792902, -2.712858392904708],
                  [-79.77763709205988, -2.716630704848121],
                  [-79.78433188576105, -2.7198886011341337],
                  [-79.78845175880792, -2.719374197042196],
                  [-79.7899967112005, -2.7233179561381013],
                  [-79.78995622457039, -2.736973805055803],
                  [-79.78772462667, -2.7410889713653392],
                  [-79.79115785420906, -2.739545785656422],
                  [-79.7935611134864, -2.744518265814511],
                  [-79.79459108174812, -2.748804870038098],
                  [-79.79338945210945, -2.754463164032294],
                  [-79.79253114522469, -2.7565207188221508],
                  [-79.79510606587898, -2.7565207188221508],
                  [-79.79716600240242, -2.7592641196741683],
                  [-79.79733766377937, -2.7664655167735837],
                  [-79.79802430928719, -2.7686945117790533],
                  [-79.7961360341407, -2.7697232772904563],
                  [-79.79785264791023, -2.7724666476177364],
                  [-79.8012858754493, -2.773666870136033],
                  [-79.80114081998776, -2.7768594497194425],
                  [-79.80217078824948, -2.7810602075825126],
                  [-79.80294326444577, -2.786289701565212],
                  [-79.80011085172605, -2.7893759494119093],
                  [-79.80251411100339, -2.7897188653395006],
                  [-79.80646232267331, -2.790233239043388],
                  [-79.8098097195239, -2.7928051041860553],
                  [-79.81401542325925, -2.79546269225041],
                  [-79.81744865079831, -2.7956341493382553],
                  [-79.81907943387937, -2.7993204706642825],
                  [-79.8193040302392, -2.817632280364741],
                  [-79.81906290193778, -2.8232894510308517],
                  [-79.8197495474456, -2.8265470537302932],
                  [-79.82249612947685, -2.8282615777945335],
                  [-79.82386942049247, -2.8306619072259416],
                  [-79.82438440462333, -2.835976904695465],
                  [-79.82404108186942, -2.8402631751888814],
                  [-79.8252427115081, -2.843006379957425],
                  [-79.8281609549163, -2.8466068263169766],
                  [-79.82970590730888, -2.8508930573136033],
                  [-79.82713098665458, -2.853636236773087],
                  [-79.83176584383231, -2.854493479011884],
                  [-79.83348245760185, -2.8591225760457686],
                  [-79.83485574861747, -2.8628944190793564],
                  [-79.83863229891044, -2.8719810808201416],
                  [-79.84258051058036, -2.875409991003399],
                  [-79.84481210848075, -2.8793532249714064],
                  [-79.84309549471122, -2.882953557108842],
                  [-79.85373850008231, -2.885868103352311],
                  [-79.85439833891279, -2.8966728108637967],
                  [-79.85165175688154, -2.9033590308275743],
                  [-79.8525100637663, -2.9112452906839037],
                  [-79.85611495268232, -2.9160455957533173],
                  [-79.85148009550458, -2.9218745100787875],
                  [-79.85302504789716, -2.931303572086048],
                  [-79.85388335478193, -2.9373038429187743],
                  [-79.85285338652021, -2.954104429512817],
                  [-79.85491332304365, -2.967476143344394],
                  [-79.85422667753583, -2.97588918707474],
                  [-79.85319670927412, -2.9813749297800034],
                  [-79.85045012724287, -2.9800034966662383],
                  [-79.84461364042646, -3.0005748135008874],
                  [-79.83706053984052, -3.000231961385387],
                  [-79.8121458169368, -2.9876939948162136],
                  [-79.78985187668704, -2.8943482699967302],
                  [-79.67561351135869, -2.699514005673089],
                  [-79.64368449524541, -2.642927307000748],
                  [-79.60317241028447, -2.6021146895737113],
                  [-79.604889024054, -2.5316551791277964],
                  [-79.62068187073369, -2.491868002911078],
                  [-79.61822324246512, -2.431428140440368],
                  [-79.64912229031668, -2.4108471640969715],
                  [-79.68997769803153, -2.404329789907214],
                  [-79.72568326443778, -2.3906089004926523],
                  [-79.74113278836356, -2.3796320901551757],
                  [-79.76688199490653, -2.3662539844380444],
                  [-79.77958493680106, -2.363166710915247],
                  [-79.8259335085784, -2.356649110944477],
                  [-79.83829312771903, -2.359393367287539],
                  [-79.85075264307216, -2.4509361830507554],
                  [-79.87771336354758, -2.537914744793699],
                  [-79.88217655934837, -2.5807872800382854],
                  [-79.89281956471946, -2.623315406448165],
                  [-79.89453617848899, -2.6404634366730844]]]),
            {
              "system:index": "2"
            })]),
    remap_to_27 = 
    /* color: #98ff00 */
    /* shown: false */
    ee.FeatureCollection(
        [ee.Feature(
            ee.Geometry.Polygon(
                [[[-75.21345351621503, -0.7689444326799495],
                  [-75.20727370664471, -0.755899323094888],
                  [-75.21963332578534, -0.753152979218857]]]),
            {
              "original": "5,",
              "new": "27,",
              "system:index": "0"
            })]);
/**
 * Parameters
 */
var regionId = 40906;

var country = 'ECUADOR';

var cover = 'ECUADOR';

var year = 1986;
  
var inputCollection = 'clasificacion-ft';
    
var outputCollection = 'clasificacion-ft';
    
var exclusions = [];

var remaps = [];

var applyArea = apply_area;  // provide geometry name to apply only within that geometry

var majorityPercent = 75;

var inputVersion = '4';

var outputVersion = 5;

var classId = 5;

var t0 = 1985;

var t1 = 2024;

var years = ee.List.sequence(t0, t1).getInfo();

/**
 * Imports
 */
var regionsAsset = 'projects/mapbiomas-raisg/MAPBIOMAS-ECUADOR/DATOS-AUXILIARES/VECTORES/ManglaresV3_buffer';

var inputDir = 'projects/mapbiomas-ecuador/assets/MAPBIOMAS-LULC/COLLECTION3/CROSS_CUTTING_THEMES/MANGROVE/STEP3-CLASSIFICATION/' + inputCollection;

var outputDir = 'projects/mapbiomas-ecuador/assets/MAPBIOMAS-LULC/COLLECTION3/CROSS_CUTTING_THEMES/MANGROVE/STEP3-CLASSIFICATION/' + outputCollection;

var mosaicPath = 'projects/mapbiomas-raisg/MOSAICOS/mangrove-5';

var palette = require('users/mapbiomas/modules:Palettes.js').get('classification9');

palette[5] = 'olive';

palette[27] = 'lightgrey';

var regionsLayer = ee.FeatureCollection(regionsAsset).map(function(item) { return item.set('version', 1); });

var regionsRaster = regionsLayer.reduceToImage(['version'], ee.Reducer.first());

var bandNames = years.map(function(year) { return 'classification_' + year; });

var fullRegion = cover + '-' + regionId;

var classification = ee.Image(inputDir + '/' + country + '-' + regionId + '-' + inputVersion);

var image = classification;

var mosaics = ee.ImageCollection(mosaicPath).select(['swir1', 'nir', 'red']);

/**
 * Main implementation
 */
var bands = image.bandNames().getInfo();

var inputImage = image;

var filtered = frequencyFilter(classification).updateMask(regionsRaster);
    
var original = classification.updateMask(regionsRaster);

filtered = inputImage.select(bandNames).where(inputImage.gte(1), filtered);

/**
 * Setting up the unique area to apply, if declared
 */
if (applyArea) {
    var applyImage = applyArea
        .map(function(item) { return item.set('id', 1); })
        .reduceToImage(['id'], ee.Reducer.first())
        .clipToBoundsAndScale({
            geometry: apply_area.geometry(),
            scale: 30
        });
  
    var noApplyImage = ee.Image(0)
        .where(applyImage.unmask().eq(1), 1)
        .eq(0)
        .selfMask();
  
    var noAppliedArea = original.updateMask(noApplyImage);
    
    filtered = filtered.blend(noAppliedArea);
}

/**
 * Remap by geometries
 */
if (remaps && remaps.length > 0) {
    var bands = filtered.bandNames();
  
    var remapped = bands.map(function(band) {
        var selected = filtered.select([band]);
        return remapWithPolygons(selected, remaps).rename([band]);
    });
  
    filtered = ee.ImageCollection(remapped).toBands().rename(bands);
}

/**
 * Exclusion areas
 */
if (exclusions && exclusions.length > 0) {
    var exclusionImage = ee.FeatureCollection(exclusions)
        .map(function(item) { return item.set('id', 1); })
        .reduceToImage(['id'], ee.Reducer.first())
        .clipToBoundsAndScale({
            geometry: regionsLayer.geometry(),
            scale: 30
        });

    filtered = filtered.where(exclusionImage.eq(1), original);
}

/**
 * Visualizations
 */
Map.setOptions('SATELLITE');

years.forEach(function(year) {
    var vis = {
        'bands': ['classification_' + year],
        'min': 0,
        'max': palette.length - 1,
        'palette': palette,
        'format': 'png'
    };

    Map.addLayer(
        mosaics
            .filterMetadata('year', 'equals', year.toString())
            .mosaic()
            .updateMask(regionsRaster), 
        {
            'bands': ['swir1', 'nir', 'red'],
            'min': 0,
            'max': 150
        },
        'MOSAIC ' + year,
        false
    );

    Map.addLayer(original, vis, 'ORIGINAL ' + year, 0);
    Map.addLayer(filtered, vis, 'FILTERED ' + year, 0);
});

Map.addLayer(
    regionsLayer.style({
        "color": "cyan",
        "fillColor": "ff000000"
    }),
    {},
    'EXPORT REGION'
);

/**
 * Export images to asset
 */
var fileName = cover + '-' + regionId;

var imageName = fileName + '-' + outputVersion;

filtered = filtered.select(bandNames)
    .set({
        code_region: regionId,
        country: country,
        version: outputVersion,
        description: 'frequency filter',
        cover: cover
    });

print('INPUT: ' + fileName + '-' + inputVersion, classification);
print('OUTPUT: ' + imageName, filtered);

Export.image.toAsset({
    image: filtered,
    description: imageName,
    assetId: outputDir + '/' + imageName,
    pyramidingPolicy: { '.default': 'mode' },
    region: regionsLayer.geometry().bounds(),
    scale: 30,
    maxPixels: 1e13
});

/**
 * Apply frequency filter
 * Calculates the temporal frequency of mangrove class and filters based on majority threshold
 */
function frequencyFilter(inputImage) {
    var bands = inputImage.bandNames();
    var mainImage = inputImage;

    // Get frequency percentage
    var usedBands = bands.size().getInfo();

    var frequency = inputImage.eq(classId)
        .reduce('sum')
        .divide(bands.size())
        .multiply(100);

    // Mangrove image based on frequency > majorityPercent
    var mangroveMap = ee.Image(0).where(frequency.gt(majorityPercent), classId);
    mangroveMap = mangroveMap.updateMask(mangroveMap.neq(0));
  
    // Apply frequency mask over the multiband input image
    var filtered = inputImage.where(mangroveMap, mangroveMap);
  
    return filtered;
}

/**
 * Remap image using polygons
 */
function remapWithPolygons(image, polygons) {
    if (polygons.length > 0) {
        polygons.forEach(function(polygon) {
            var excluded = polygon.map(function(layer) {
                var area = image.clip(layer);
                var from = ee.String(layer.get('original')).split(',');
                var to = ee.String(layer.get('new')).split(',');
                
                from = from.map(function(item) { return ee.Number.parse(item); });
                to = to.map(function(item) { return ee.Number.parse(item); });
                
                return area.remap(from, to);
            });
              
            excluded = ee.ImageCollection(excluded).mosaic();
            image = excluded.unmask(image).rename('reference');
        });
    }
    
    return image;
}