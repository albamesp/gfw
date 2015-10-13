class LandingController < ApplicationController
  layout 'landing'
  def is_number?(string)
    true if Float(string) rescue false
  end

  def index
    require 'open-uri'
    @title = 'Monitoring forests in near real time'
    @desc = 'Empowering people everywhere to better manage and conserve forest landscapes through an interactive online forest monitoring system.'
    @keywords = 'forests, forest data, forest monitoring, forest landscapes, maps, gis, visualize, geospatial, forest analysis, forest news, forest alerts, conservation, forest updates, forest watch, analysis, deforestation, deforesting, tree cover loss, explore forests, mapping, trees, forest loss'
    @feedview    = []
    @storiesview = []

    fview     = Nokogiri::HTML(open('https://gfw-huggin.herokuapp.com/users/1/web_requests/14/feedviewrss.xml'))
    fview.css('item').each do |i|
      puts i
      @feedview.push({
        'title' => i.css('title').text,
        'link' => (i.css('gfwid').text.length > 0)? '/stories/'+i.css('gfwid').text : 'https://groups.google.com/forum/#!forum/globalforestwatch',
        'date' => i.css('pubDate').text,
        'description' => i.css('description').text,
        'author' => i.css('author').text,
        'avatar' => (i.css('gfwid').text.length > 0)? 'https://maps.googleapis.com/maps/api/staticmap?center=48.149567,-55.063267&zoom=2&size=80x80' : '/assets/logos/google.svg'
      })
      break if @feedview.length > 5
    end
    fstories  = Nokogiri::HTML(open('https://gfw-huggin.herokuapp.com/users/1/web_requests/15/keepupdatedgfwrss.xml'))
    fstories.css('item').each do |i|
      if (i.css('media').text.length > 0 && JSON.parse(i.css('media')[0].text)[1])
        img = 'http://gfw2stories.s3.amazonaws.com/uploads/' + JSON.parse(i.css('media')[0].text)[1]['url']
      else
        # '/assets/' + i.css('category').text + '.png' ||
        img = '/assets/blog-categories/news.png'
      end
      @storiesview.push({
        'title' => i.css('title').text,
        'link' => i.css('link').text,
        'date' => i.css('pubDate').text,
        'description' => i.css('description').text,
        'avatar' => img,
        'id' => is_number?(i.css('gfwid').text)? '/stories/'+i.css('gfwid').text : i.css('gfwid').text
      })
      break if @storiesview.length > 2
    end
  end

end
