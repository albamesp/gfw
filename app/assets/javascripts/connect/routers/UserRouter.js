define([
  'jquery', 'backbone', 'underscore',
  'map/models/UserModel',
  'connect/views/UserFormView', 'connect/views/StoriesListView', 'connect/views/SubscriptionListView', 'connect/views/LoginView',
  'views/NotificationsView'
], function(
  $, Backbone, _,
  UserModel,
  UserFormView, StoriesListView, SubscriptionListView, LoginView,
  NotificationsView) {

  'use strict';

  var UserRouter = Backbone.Router.extend({

    el: $('.my-gfw-container'),

    routes: {
      '*path': 'showView'
    },

    initialize: function() {
      this.setupNavbar();
      new NotificationsView();
    },

    execute: function(callback, args) {
      if (!this.alreadyLoggedIn) {
        this.checkLoggedIn().then(function() {
          if (callback) { callback.apply(this, args); }
        }.bind(this)).fail(function() {
          this.showView('login_modal');
        }.bind(this));
      } else {
        if (callback) { callback.apply(this, args); }
      }
    },

    checkLoggedIn: function() {
      this.user = new UserModel();
      return this.user.fetch();
    },

    setupNavbar: function() {
      // Force nav links to navigate, rather than doing a browser page
      // reload
      var context = this;
      $('.my-gfw-nav').on('click', 'a', function(event) {
        event.preventDefault();
        var root = location.protocol + '//' + location.host + '/',
            href = _.last($(this).prop('href').split(root));

        context.navigate(href, {trigger: true});
      });
    },

    availableViews: {
      'my_gfw': UserFormView,
      'subscriptions': SubscriptionListView,
      'stories': StoriesListView,
      'login_modal': LoginView
    },

    showView: function(routeName) {
      var viewName = _.last(_.compact(routeName.split('/')));

      this.subViews = this.subViews || {};
      if (this.subViews[viewName] === undefined) {
        var View = this.availableViews[viewName];
        if (View === undefined) { this.show404(); }

        this.subViews[viewName] = new View();
        this.subViews[viewName].render();
      }

      this.el.html(this.subViews[viewName].el);
      this.subViews[viewName].delegateEvents();

      if (this.subViews[viewName].show !== undefined) {
        this.subViews[viewName].show();
      }

      var $nav = $('.my-gfw-nav');
      $nav.find('a').removeClass('current');
      $nav.find('#my-gfw-nav-'+viewName).addClass('current');
    },

    show404: function() {
      window.location = '/404';
    }

  });

  return UserRouter;

});
