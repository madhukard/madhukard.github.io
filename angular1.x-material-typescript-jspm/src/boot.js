/// <reference path="../../tools/typings/tsd.d.ts" />
// Load the Angular Material CSS associated with ngMaterial
// then load the app.css to provide overrides, etc.
require('angular-material/angular-material.css!');
require('assets/app.css!');
// Load Angular libraries
var angular = require('angular');
var material = require('angular-material');
// Load custom application modules
var main_1 = require('./main');
/**
 * Manually bootstrap the application when AngularJS and
 * the application classes have been loaded.
 */
angular
    .element(document)
    .ready(function () {
    var appName = 'starter-app';
    var body = document.getElementsByTagName("body")[0];
    var app = angular
        .module(appName, [material, main_1.default]);
    angular.bootstrap(body, [app.name], { strictDi: false });
});
