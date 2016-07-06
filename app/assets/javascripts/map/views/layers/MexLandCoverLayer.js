/**
 * The tileserver layer module for use on canvas.
 *
 * @return UsaLandCoverLayer class (extends ImageLayerClass)
 */
define([
  'abstract/layer/ImageLayerClass',
], function(ImageLayerClass) {

  'use strict';

  var MexLandCoverLayer = ImageLayerClass.extend({

    options: {
      urlTemplate: 'http://gis-gfw.wri.org/arcgis/rest/services/cached/mex_land_cover/MapServer/tile/{z}/{y}/{x}',
      dataMaxZoom: 12
    }

  });

  return MexLandCoverLayer;

});