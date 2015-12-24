var URL_AVATAR_ICONS = 'assets/svg/avatars.svg';
var URL_ICON_MENU = 'assets/svg/menu.svg';
var URL_ICON_SHARE = 'assets/svg/share.svg';
// Load the custom app ES6 modules
var UsersController_1 = require('./UsersController');
var UsersDataservice_1 = require('./UsersDataservice');
// Define the Angular 'users' module
var moduleName = angular
    .module("users", [])
    .service("usersService", UsersDataservice_1.default)
    .controller("UsersController", UsersController_1.default)
    .config(function ($mdIconProvider) {
    // Register `dashboard` iconset & icons for $mdIcon service lookups
    $mdIconProvider
        .defaultIconSet(URL_AVATAR_ICONS, 128)
        .icon('menu', URL_ICON_MENU, 24)
        .icon('share', URL_ICON_SHARE, 24);
})
    .name;
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = moduleName;
