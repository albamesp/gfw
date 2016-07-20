define([
  'backbone', 'moment',
  'connect/models/StoryConnectModel'
], function(Backbone, moment, StoryConnectModel) {

  'use strict';

  var StoriesCollection = Backbone.Collection.extend({
    model: StoryConnectModel,

    url: window.gfw.config.GFW_API_HOST_NEW_API + '/user/stories',

    comparator: function(subscription) {
      return -moment(subscription.get('created')).unix();
    },

    sync: function(method, model, options) {
      options || (options = {});

      if (!options.crossDomain) {
        options.crossDomain = true;
      }

      if (!options.xhrFields) {
        options.xhrFields = {withCredentials:true};
      }

      return Backbone.sync.call(this, method, model, options);
    },

    parse: function(response) {
      return response.data;
    }

  });

  return StoriesCollection;

});
