if (typeof GeocoderJS === "undefined" && typeof require === "function") {
  var GeocoderJS = require("../GeocoderJS.js");
}

;(function (GeocoderJS) {
    "use strict";

    GeocoderJS.ProviderBase = function() {};

    GeocoderJS.ProviderBase.prototype = {
      geocode: function(searchString, callback) {}
    };
   
})(GeocoderJS);
