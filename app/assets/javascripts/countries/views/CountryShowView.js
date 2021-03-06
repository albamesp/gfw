/**
 * The Feed view.
 */
define([
  'jquery',
  'backbone',
  'underscore',
  'd3',
  'mps',
  'scrollit',
  'views/SourceWindowView',
  'views/DownloadView',
  'countries/views/CountryHeaderView',
  'views/ShareView',
  'countries/models/CountryShowModel',
  'countries/helpers/CountryHelper',
  'views/NotificationsView',
  'countries/abstract/ForestTenureGraph'
], function($, Backbone, _, d3, mps, scrollit, SourceWindowView, DownloadView, CountryHeaderView, ShareView, CountryShowModel, CountryHelper, NotificationsView, ForestTenureGraph) {

  'use strict';

  var CountryShowView = Backbone.View.extend({
    el: '#countryShowView',

    events: {
      'click .forma_dropdown-link': '_openDropdown',
      'click .share-link': '_openShareModal'
    },

    initialize: function() {
      this.embed = $('body').hasClass('embed');
      if (!this.$el.length) {
        return
      }
      var self = this;
      _.bindAll(this, '_positionScroll');

      self.helper = CountryHelper;

      // Cache
      this.$nav = this.$('.country-nav');
      this.$indepth = this.$('.country-indepth');

      // Models
      this.country = new CountryShowModel({ iso: this.$el.data('iso') });

      // Initialize modules
      this.headerView = new CountryHeaderView({country: this.country});
      new NotificationsView();

      // if (!this.embed) {
        this._stickynav();
        this._drawTenure();
        this._drawForestsType();
        this._drawForestCertification();
        this._drawFormaAlerts();
        this._drawBurnedForests();
        this._initFormaDropdown();
      // }
    },

    _openShareModal: function(event) {
      var shareView = new ShareView().share(event);
      this.$el.append(shareView.el);
    },

    _initFormaDropdown: function() {
      $('.forma_dropdown-link').qtip({
        show: 'click',
        hide: {
          event: 'click unfocus'
        },
        content: {
          text: $('.forma_dropdown-menu')
        },
        position: {
          my: 'bottom right',
          at: 'top right',
          target: $('.forma_dropdown-link'),
          adjust: {
            x: -10
          }
        },
        style: {
          tip: {
            corner: 'bottom right',
            mimic: 'bottom center',
            border: 1,
            width: 10,
            height: 6
          }
        }
      });
    },

    _positionScroll: function() {
      if ($('.country-alerts-section').length < 1 || $('.country-conventions-section').length < 1 ) return;

      var h_min = $('.country-alerts-section').offset().top - 48,
          h_max = $('.country-conventions-section').offset().top - 46;

      if ($(window).scrollTop() > (h_min) && $(window).scrollTop() < h_max) {
        // fixed
        this.$nav.css({
          position: 'fixed',
          top: 0
        });
        this.$nav.addClass('fixed');
      } else if ($(window).scrollTop() >= h_max) {
        // dissapear
        this.$nav.css({
          position: 'absolute',
          top: h_max - h_min
        });
      } else {
        // default
        this.$nav.css({
          position: 'absolute',
          top: 0
        });
        this.$nav.removeClass('fixed');
      }
    },

    _stickynav: function() {
      this._positionScroll();

      $.scrollIt({
        upKey: null,
        downKey: null,
        easing: 'linear',
        scrollTime: 400,
        activeClass: 'active',
        onPageChange: null,
        topOffset: - 48
      });

      $(window).scroll(this._positionScroll);
    },

    _drawTenure: function() {
      var sql = ['SELECT tenure_government,',
                   'tenure_owned, tenure_owned_individuals, tenure_reserved',
                 'FROM gfw2_countries',
                 'WHERE iso = \'' + this.country.get('iso') + '\''
                ].join(' ');

      d3.json('https://wri-01.cartodb.com/api/v2/sql?q='+ sql, function(json) {
        var data = json.rows[0];
        var tenures = [{
          name: 'Public lands administered by the government',
          percent: data.tenure_government
        }, {
          name: 'Public lands reserved for communities and indigenous groups',
          percent: data.tenure_reserved
        }, {
          name: 'Private lands owned by communities and indigenous groups',
          percent: data.tenure_owned
        }, {
          name: 'Private lands owned by firms and individuals',
          percent: data.tenure_owned_individuals
        }];

        tenures = _.filter(tenures, function(tenure) {
          return tenure['percent'] > 0;
        });

        if (tenures.length === 0) {
          $('.country-tenure .coming-soon').show();
          return;
        }

        new ForestTenureGraph({
          data: tenures,
          el: $('.country-tenure .line-graph'),
          valueFormatter: function(d) {
            return d['percent']/1000000 + 'Mha';
          }
        });
      });
    },

    _drawForestsType: function() {
      var sql = ["SELECT unnest(array['forest_regenerated', 'forest_primary', 'forest_planted'])",
                 'AS type, unnest(array[COALESCE(forest_regenerated, 0),',
                                       'COALESCE(forest_primary, 0),',
                                       'COALESCE(forest_planted, 0)])',
                 'AS percent',
                 'FROM gfw2_countries',
                 "WHERE iso = '" + this.country.get('iso') + "'"].join(' ');

      d3.json('https://wri-01.cartodb.com/api/v2/sql?q=' + sql, function(json) {
        var data = _.pluck(json.rows, 'percent'),
            sumData = _.reduce(data, function(memo, num){ return memo + num; }, 0),
            $countryForestType = $('.country-forests-type');

        if (sumData === 0) {
          $countryForestType.find('.coming-soon').show();
          return;
        }

        if (sumData !== 100) {
          data[2] = (100 - (data[0] + data[1]));
        }

        $countryForestType.find('.forest-type-legends').show();

        var width = 225,
            height = 225,
            radius = Math.min(width, height) / 2,
            colors = ['#A1BA42', '#819515', '#DDDDDD'],
            labelColors = ['white', 'white', '#555'];

        var pie = d3.layout.pie()
            .sort(null);

        var arc = d3.svg.arc() // create <path> elements for using arc data
            .innerRadius(radius - 67)
            .outerRadius(radius)

        var svg = d3.select(".forests-type-graph")
            .append("svg")
            .attr("width", width)
            .attr("height", height)
            .attr("style", 'min-width:' + width + ';min-height:' + height)
            .append("g")
            .attr("transform", "translate(" + width / 2 + "," + height / 2 + ")");

        var path = svg.selectAll("path")
            .data(pie(data));

        path.enter().append("path")
          .attr("fill", function(d, i) { return colors[i]; })
          .attr("d", arc);

        path.enter().append('text')
          .attr('transform', function(d) { var c = arc.centroid(d); return 'translate(' + (c[0]-12) + ',' + (c[1]+8) + ')'})
          .text(function(d) {
            if (d.data > 0) return d.data + '%'
          })
          .attr('fill', function(d, i) { return labelColors[i]; } )
          .attr('class', 'notranslate')
          .style('font-size', '13px');
      });
    },


    _drawForestCertification: function() {
      var graph = '.forest_certification-graph';
      var $graph = $('.forest_certification-graph');
      var $certification = $('.country-forest_certification');
      var data = _.pluck($graph.data('json'), 'value');
      data.shift()

      var sumData = _.reduce(data, function(memo, num){ return memo + num; }, 0);

      if (sumData === 0) {
        $certification.find('.coming-soon').show();
        return;
      }


      // Parse data
      data = _.map(data, function(d, i){
        return Math.round(d * 100);
      });

      $certification.find('.forest_certification-legends').show();

      var width = 225,
          height = 225,
          radius = Math.min(width, height) / 2,
          colors = ['#819515', '#A1BA42', '#DDDDDD'],
          labelColors = ['white', 'white', '#555'];

      var pie = d3.layout.pie()
          .sort(null);

      var arc = d3.svg.arc() // create <path> elements for using arc data
          .innerRadius(radius - 67)
          .outerRadius(radius)

      var svg = d3.select(".forest_certification-graph")
          .append("svg")
          .attr("width", width)
          .attr("height", height)
          .attr("style", 'min-width:' + width + ';min-height:' + height)
          .append("g")
          .attr("transform", "translate(" + width / 2 + "," + height / 2 + ")");

      var path = svg.selectAll("path")
          .data(pie(data));

      path.enter().append("path")
        .attr("fill", function(d, i) { return colors[i]; })
        .attr("d", arc);

      path.enter().append('text')
        .attr('transform', function(d) { var c = arc.centroid(d); return 'translate(' + (c[0]-12) + ',' + (c[1]+8) + ')'})
        .text(function(d) {
          if (d.data > 0) return d.data + '%'
        })
        .attr('fill', function(d, i) { return labelColors[i]; } )
        .attr('class', 'notranslate')
        .style('font-size', '13px');
    },



    _drawFormaAlerts: function() {
      var that = this;

      var $graph = this.$('.forma-graph'),
          $tooltip = this.$('.graph-tooltip'),
          $amount = $tooltip.find('.graph-amount'),
          $date = $tooltip.find('.graph-date'),
          $comingSoonContent = this.$('#comingSoonContent'),
          $formaAlertsContent = this.$('#formaAlertsContent'),
          $formaAlertsTitle = this.$('#formaAlertsTitle');

      // Dimensions variables
      var width     = 500,
          height    = 156,
          h         = 136, // maxHeight
          radius    = width / 2,
          gridLinesCount = 7;

      // Init graph
      var graph = d3.select('.forma-graph')
        .append('svg:svg')
        .attr('class', 'line')
        .attr('width', width)
        .attr('height', height);

      // Add dashed lines grid
      var gridLineY = height;
      for (var i = 0; i < gridLinesCount; i++) {
        graph.append('svg:line')
          .attr('x1', 0)
          .attr('y1', gridLineY)
          .attr('x2', width)
          .attr('y2', gridLineY)
          .style('stroke-dasharray', ('2, 3'))
          .style('stroke', function() { return (i == 0) ? '#333' : '#CCC'; } );

        gridLineY -= height/(gridLinesCount-1);
      };

      // Render forma graph
      var sql = ["SELECT date_trunc('month', date) as date, COUNT(*) as alerts",
                 'FROM forma_api',
                 "WHERE iso = '" + this.country.get('iso') + "'",
                 "GROUP BY date_trunc('month', date)",
                 "ORDER BY date_trunc('month', date) ASC"].join(' ');

      d3.json('https://wri-01.cartodb.com/api/v2/sql?q='+sql, function(json) {
        if (json && json.rows.length > 0) {
          var data = json.rows.slice(1, json.rows.length);
          if (data.length == 0) data = json.rows;
          var lastMonth = data[data.length - 1];
          $formaAlertsTitle.find('.amount').text(that.helper.formatNumber(lastMonth.alerts));
          $formaAlertsTitle.find('.month').text(that.helper.config.MONTHNAMES[new Date(lastMonth.date).getUTCMonth()])

          $formaAlertsContent.show();
        } else {
          $comingSoonContent.show();
          return;
        };

        var x_scale = d3.scale.linear()
          .domain([0, data.length - 1])
          .range([0, width - 40]);

        var max = d3.max(data, function(d) { return parseFloat(d.alerts); });
        if (max === d3.min(data, function(d) { return parseFloat(d.alerts); })) {
          h = h/2;
        }

        var y_scale = d3.scale.linear()
          .domain([0, max])
          .range([0, h]);

        var line = d3.svg.line()
          .x(function(d, i) { return x_scale(i); })
          .y(function(d, i) { return h - y_scale(d.alerts); })
          .interpolate("monotone");

        var marginTop = 20,
            marginLeft = 20;

        var cx = width - 40 + marginLeft;
        var cy = h - y_scale(data[data.length - 1].alerts) + marginTop;

        var tooltip = d3.select('.forma-graph')
          .append('div')
          .attr('class', 'graph-tooltip')
          .style('visibility', 'hidden')

        var amount = tooltip
          .append('div')
          .attr('class', 'graph-amount')
          .text('21,123')

        tooltip
          .append('div')
          .attr('class', 'graph-date')
          .text('Alerts in')

        var tooltipDate = tooltip.select('.graph-date')
          .append('div')
          .attr('class', 'date')
          .text('November 2012');

        graph.append('svg:path')
          .attr('transform', 'translate(' + marginLeft + ',' + marginTop + ')')
          .attr('d', line(data));

        var positioner = graph.append('svg:line')
          .attr('x1', 0)
          .attr('y1', 0)
          .attr('x2', 0)
          .attr('y2', height)
          .style('visibility', 'hidden')
          .style('stroke', '#aaa');

        var marker = graph.append('svg:circle')
          .attr('class', 'forma-marker')
          .attr('cx', cx)
          .attr('cy', cy)
          .attr('r', 5);

        graph
          .on("mouseout", function() {
            positioner.style("visibility", "hidden");
            tooltip.style("visibility", "hidden");
          })
          .on("mouseover", function() {
            positioner.style("visibility", "visible");
            tooltip.style("visibility", "visible");
          })
          .on('mousemove', function(d) {
            var index = Math.round(x_scale.invert(d3.mouse(this)[0]));

            if (data[index]) {
              var cx = d3.mouse(this)[0] + marginLeft,
                  cy = h - y_scale(data[index].alerts) + marginTop,
                  date = new Date(data[index].date),
                  formattedDate = that.helper.config.MONTHNAMES[date.getUTCMonth()] + ' ' + date.getUTCFullYear();

              marker
                .attr('cx', cx)
                .attr('cy', cy);

              positioner
                .attr('x1', d3.mouse(this)[0] + marginLeft)
                .attr('x2', d3.mouse(this)[0] + marginLeft);

              amount.text(that.helper.formatNumber(data[index].alerts));
              tooltipDate.text(formattedDate);
              tooltip.style("top", "-20px").style("left", (cx - 162) + "px");
            }

          });

      });
    },

    _drawBurnedForests: function() {
      var that = this;

      var $el = $('.country-burned_forests');
      var $graph = $('.burned_forests-graph');
      var $comingSoon = $el.find('.coming-soon');
      var json = $graph.data('json');

      if (! !!json || !json.length) {
        $comingSoon.show(0);
        return;
      }
      // Dimensions variables
      var width     = 500,
          height    = 160,
          h         = 130, // maxHeight
          radius    = width / 2,
          gridLinesCount = 7;
      var marginTop = 20,
          paddingTop = 10,
          marginLeft = 20;

      // Init graph
      var graph = d3.select('.burned_forests-graph')
        .append('svg:svg')
        .attr('class', 'line')
        .attr('width', width)
        .attr('height', height);

      // Add dashed lines grid
      var gridLineY = h + paddingTop;
      for (var i = 0; i < gridLinesCount; i++) {
        graph.append('svg:line')
          .attr('x1', 0)
          .attr('y1', gridLineY)
          .attr('x2', width)
          .attr('y2', gridLineY)
          .style('stroke-dasharray', ('2, 3'))
          .style('stroke', function() { return (i == 0) ? '#333' : '#CCC'; } );

        gridLineY -= (h + paddingTop)/(gridLinesCount-1);
      };

      var x_scale = d3.scale.linear()
        .domain([0, json.length - 1])
        .range([0, width - 40]);

      var xAxis = d3.svg.axis()
                    .scale(x_scale)
                    .tickFormat(function(d, i){
                      return json[d].year;
                    })
      graph.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate("+ marginLeft +"," + (height - marginTop) + ")")
        .call(xAxis);


      var max = d3.max(json, function(d) { return parseFloat(d.area_burned_forest); });
      if (max === d3.min(json, function(d) { return parseFloat(d.area_burned_forest); })) {
        h = h/2;
      }

      var y_scale = d3.scale.linear()
        .domain([0, max])
        .range([0, h]);

      var line = d3.svg.line()
        .x(function(d, i) { return x_scale(i); })
        .y(function(d, i) { return h + paddingTop - marginTop - y_scale(d.area_burned_forest); })
        .interpolate("linear");

      var cx = width - 40 + marginLeft;
      var cy = h - y_scale(json[json.length - 1].area_burned_forest) + paddingTop;

      var tooltip = d3.select('.burned_forests-graph')
        .append('div')
        .attr('class', 'burned_forests-tooltip')
        .style('visibility', 'hidden')

      var amount = tooltip
        .append('div')
        .attr('class', 'graph-amount')
        .text('21,123')

      tooltip
        .append('div')
        .attr('class', 'graph-date')
        .text('Ha in ')

      var tooltipDate = tooltip.select('.graph-date')
        .append('div')
        .attr('class', 'date')
        .text('November 2012');

      graph.append('svg:path')
        .attr('transform', 'translate(' + marginLeft + ',' + marginTop + ')')
        .attr('d', line(json));

      var positioner = graph.append('svg:line')
        .attr('x1', 0)
        .attr('y1', 0)
        .attr('x2', 0)
        .attr('y2', h + paddingTop)
        .style('visibility', 'hidden')
        .style('stroke', '#aaa');

      var marker = graph.append('svg:circle')
        .attr('class', 'burned_forests-marker')
        .attr('cx', cx)
        .attr('cy', cy)
        .attr('r', 5);


      graph
        .on("mouseout", function() {
          positioner.style("visibility", "hidden");
          tooltip.style("visibility", "hidden");
        })
        .on("mouseover", function() {
          positioner.style("visibility", "visible");
          tooltip.style("visibility", "visible");
        })
        .on('mousemove', function(d) {
          var index = Math.round(x_scale.invert(d3.mouse(this)[0]));
          if (json[index]) {
            var cx = x_scale(index),
                cy = h - y_scale(json[index].area_burned_forest) + paddingTop,
                year = json[index].year;

            marker
              .attr('cx', cx + marginLeft)
              .attr('cy', cy);

            positioner
              .attr('x1', cx + marginLeft)
              .attr('x2', cx + marginLeft);

            amount.text(that.helper.formatNumber(json[index].area_burned_forest || 0));
            tooltipDate.text(year);
            tooltip.style("top", "-20px").style("left", (cx - 150) + "px");
          }

        });


    },

    _openDropdown: function(e) {
      e.preventDefault();
    },

  });
  return CountryShowView;

});
