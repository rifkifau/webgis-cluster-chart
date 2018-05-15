  "use strict"

  //kalau buat geojson dengan QGIS, pastikan proyeksinya EPSG 4326 - WGS84
  //dan lebih baik hapus "name": yg ada di bawah "type": "FeatureCollection"
  //Di akhir tambahkan code berikut:
  //, "properties": {"fields": {"Jenis": {"lookup": {"1": "SMA", "2": "SMK", "3": "Madrasah", "4": "lainnya"}, "name": "Jenis Sekolah"},
  // "poi_name": {"name": "Nama Sekolah"},
  // "st_name": {"name": "Alamat Sekolah"},
  // "ph_number": {"name": "Telp. Sekolah"},
  // "Pemilik": {"lookup": {"1": "Swasta", "2": "Negeri"}, "name": "Kepemilikan"}}, "attribution": "Sebaran Sekolah: <a href=\"http://gis.dukcapil.kemendagri.go.id/\" target=\"blank\">Dukcapil</a>", "description": "Sebaran Sekolah di Indonesia"}}
  var geojson,
      metadata,
      geojsonPath = 'data/sebaran-sma.geojson',
      categoryField = 'Jenis', //This is the fieldname for marker category (used in the pie and legend)
      iconField = 'Pemilik', //This is the fieldame for marker icon
      popupFields = ['poi_name','st_name','ph_number', 'Pemilik'], //Popup will display these fields
      tileServer = 'http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      tileAttribution = 'Map data: <a href="http://openstreetmap.org">OSM</a>',

      osm = L.tileLayer(
        'http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        {attribution: 'Basemap: <a href="http://openstreetmap.org">OSM</a>',  maxZoom: 17}
      ),

//Untuk minimap (inset), karena kalau sama akan membingungkan dua kontrol peta
      osm2 = L.tileLayer(
        'http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        {attribution: 'Basemap: <a href="http://openstreetmap.org">OSM</a>',  maxZoom: 17}
      ),

      greyscale   = L.tileLayer(
        'http://{s}.www.toolserver.org/tiles/bw-mapnik/{z}/{x}/{y}.png',
        {attribution: 'Basemap: <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>',  maxZoom: 17}
      ),
      esriimagery = L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        {attribution: 'Basemap: Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',  maxZoom: 17}
      ),
      natgeo   = L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/NatGeo_World_Map/MapServer/tile/{z}/{y}/{x}',
        {attribution: 'Basemap: Esri &mdash; National Geographic, Esri, DeLorme, NAVTEQ, UNEP-WCMC, USGS, NASA, ESA, METI, NRCAN, GEBCO, NOAA, iPC',  maxZoom: 17}
      ),
      baseLayers = {
    		"OpenStreetMap": osm,
    		"OSM Black & White": greyscale,
        "ESRI World Imagery": esriimagery,
        "ESRI NatGeo World Map": natgeo
      },

      rmax = 30, //Maximum radius for cluster pies
      markerclusters = L.markerClusterGroup({
        maxClusterRadius: 2*rmax,
        iconCreateFunction: defineClusterIcon //this is where the magic happens
      }),
      map = L.map('map', {
        zoomControl: false,
    		layers: [osm]
    	}).setView([-2.87, 117.01], 5);

  L.control.layers(baseLayers).addTo(map);
  L.control.scale({ metric: true, imperial: true }).addTo(map);
  L.control.mousePosition().addTo(map);
  L.control.locate().addTo(map);
  var zoom_bar = new L.Control.ZoomBar({position: 'topleft'}).addTo(map);
  var miniMap = new L.Control.MiniMap(osm2, { toggleDisplay: true, position: 'bottomleft' }).addTo(map);
  var sidebar = L.control.sidebar('sidebar').addTo(map);

  //Add basemap
  // L.tileLayer(tileServer, {attribution: tileAttribution,  maxZoom: 17}).addTo(map);
  //and the empty markercluster layer
  map.addLayer(markerclusters);


  //Ready to go, load the geojson
  d3.json(geojsonPath, function(error, data) {
      if (!error) {
          geojson = data;
          metadata = data.properties;
          var markers = L.geoJson(geojson, {
			pointToLayer: defineFeature,
			onEachFeature: defineFeaturePopup
          });
          markerclusters.addLayer(markers);
          map.fitBounds(markers.getBounds());
          map.attributionControl.addAttribution(metadata.attribution);
          renderLegend();
      } else {
	  console.log('Could not load data...');
      }
  });

function defineFeature(feature, latlng) {
  //Ini adalah alasan mengapa tabel atributnya diisi nilai (angka)
  //Cek di CSS ada class "icon-1, -2, -3, -4, dst" dan "category-1, -2, -3, -4, -5, dst"
  //Untuk field yang tidak disimbolisasi (cuma buat popup), bisa ditulis dengan teks, tapi ingat habis edit geojson shift+f5 (kena cache soalnya)
  var categoryVal = feature.properties[categoryField],
      iconVal = feature.properties[iconField];
    var myClass = 'marker category-'+categoryVal+' icon-'+iconVal;
    var myIcon = L.divIcon({
        className: myClass,
        iconSize:null
    });
    return L.marker(latlng, {icon: myIcon});
}

function defineFeaturePopup(feature, layer) {
  var props = feature.properties,
    fields = metadata.fields,
    popupContent = '';

  popupFields.map( function(key) {
    if (props[key]) {
      var val = props[key],
        label = fields[key].name;
      if (fields[key].lookup) {
        val = fields[key].lookup[val];
      }
      popupContent += '<span class="attribute"><span class="label">'+label+':</span> '+val+'</span>';
    }
  });
  popupContent = '<div class="map-popup">'+popupContent+'</div>';
  layer.bindPopup(popupContent,{offset: L.point(1,-2)});
}

function defineClusterIcon(cluster) {
    var children = cluster.getAllChildMarkers(),
        n = children.length, //Get number of markers in cluster
        strokeWidth = 1, //Set clusterpie stroke width
        r = rmax-2*strokeWidth-(n<10?12:n<100?8:n<1000?4:0), //Calculate clusterpie radius...
        iconDim = (r+strokeWidth)*2, //...and divIcon dimensions (leaflet really want to know the size)
        data = d3.nest() //Build a dataset for the pie chart
          .key(function(d) { return d.feature.properties[categoryField]; })
          .entries(children, d3.map),
        //bake some svg markup
        html = bakeThePie({data: data,
                            valueFunc: function(d){return d.values.length;},
                            strokeWidth: 1,
                            outerRadius: r,
                            innerRadius: r-10,
                            pieClass: 'cluster-pie',
                            pieLabel: n,
                            pieLabelClass: 'marker-cluster-pie-label',
                            pathClassFunc: function(d){return "category-"+d.data.key;},
                            pathTitleFunc: function(d){return metadata.fields[categoryField].lookup[d.data.key]+' ('+d.data.values.length+' accident'+(d.data.values.length!=1?'s':'')+')';}
                          }),
        //Create a new divIcon and assign the svg markup to the html property
        myIcon = new L.DivIcon({
            html: html,
            className: 'marker-cluster',
            iconSize: new L.Point(iconDim, iconDim)
        });
    return myIcon;
}

/*function that generates a svg markup for the pie chart*/
function bakeThePie(options) {
    /*data and valueFunc are required*/
    if (!options.data || !options.valueFunc) {
        return '';
    }
    var data = options.data,
        valueFunc = options.valueFunc,
        r = options.outerRadius?options.outerRadius:28, //Default outer radius = 28px
        rInner = options.innerRadius?options.innerRadius:r-10, //Default inner radius = r-10
        strokeWidth = options.strokeWidth?options.strokeWidth:1, //Default stroke is 1
        pathClassFunc = options.pathClassFunc?options.pathClassFunc:function(){return '';}, //Class for each path
        pathTitleFunc = options.pathTitleFunc?options.pathTitleFunc:function(){return '';}, //Title for each path
        pieClass = options.pieClass?options.pieClass:'marker-cluster-pie', //Class for the whole pie
        pieLabel = options.pieLabel?options.pieLabel:d3.sum(data,valueFunc), //Label for the whole pie
        pieLabelClass = options.pieLabelClass?options.pieLabelClass:'marker-cluster-pie-label',//Class for the pie label

        origo = (r+strokeWidth), //Center coordinate
        w = origo*2, //width and height of the svg element
        h = w,
        donut = d3.layout.pie(),
        arc = d3.svg.arc().innerRadius(rInner).outerRadius(r);

    //Create an svg element
    var svg = document.createElementNS(d3.ns.prefix.svg, 'svg');
    //Create the pie chart
    var vis = d3.select(svg)
        .data([data])
        .attr('class', pieClass)
        .attr('width', w)
        .attr('height', h);

    var arcs = vis.selectAll('g.arc')
        .data(donut.value(valueFunc))
        .enter().append('svg:g')
        .attr('class', 'arc')
        .attr('transform', 'translate(' + origo + ',' + origo + ')');

    arcs.append('svg:path')
        .attr('class', pathClassFunc)
        .attr('stroke-width', strokeWidth)
        .attr('d', arc)
        .append('svg:title')
          .text(pathTitleFunc);

    vis.append('text')
        .attr('x',origo)
        .attr('y',origo)
        .attr('class', pieLabelClass)
        .attr('text-anchor', 'middle')
        //.attr('dominant-baseline', 'central')
        /*IE doesn't seem to support dominant-baseline, but setting dy to .3em does the trick*/
        .attr('dy','.3em')
        .text(pieLabel);
    //Return the svg-markup rather than the actual element
    return serializeXmlNode(svg);
}

/*Function for generating a legend with the same categories as in the clusterPie*/
//Inilah mengapa dalam geojson ada 'lookup' dan 'name' (tidak dihasilkan dari eksport di QGIS, harus ditambahi sendiri)
function renderLegend() {
    var data = d3.entries(metadata.fields[categoryField].lookup),
      legenddiv = d3.select('body').append('div')
        .attr('id','legend');

    var heading = legenddiv.append('div')
        .classed('legendheading', true)
        .text(metadata.fields[categoryField].name);

    var legenditems = legenddiv.selectAll('.legenditem')
        .data(data);

    legenditems
        .enter()
        .append('div')
        .attr('class',function(d){return 'category-'+d.key;})
        .classed({'legenditem': true})
        .text(function(d){return d.value;});

}

/*Helper function*/
function serializeXmlNode(xmlNode) {
    if (typeof window.XMLSerializer != "undefined") {
        return (new window.XMLSerializer()).serializeToString(xmlNode);
    } else if (typeof xmlNode.xml != "undefined") {
        return xmlNode.xml;
    }
    return "";
}
