/**
 * Main App Controller for the Angular Material Starter App
 */
var UsersController = (function () {
    function UsersController(usersService, $mdSidenav, $mdBottomSheet) {
        this.userService = usersService;
        this.$mdSidenav = $mdSidenav;
        this.$mdBottomSheet = $mdBottomSheet;
        var self = this;
        usersService
            .loadAll()
            .then(function (users) {
            self.users = [].concat(users);
            self.selected = users[0];
        });
    }
    UsersController.prototype.toggleUsersList = function () {
        this.$mdSidenav('left').toggle();
    };
    ;
    UsersController.prototype.selectUser = function (user) {
        this.selected = user;
        this.toggleUsersList();
    };
    ;
    UsersController.prototype.share = function ($event) {
        var user = this.selected;
        this.$mdBottomSheet.show({
            parent: angular.element(document.getElementById('content')),
            templateUrl: '/src/users/view/contactSheet.html',
            controller: ['$mdBottomSheet', UserSheetController],
            controllerAs: "vm",
            bindToController: true,
            targetEvent: $event
        }).then(function (clickedItem) {
            //$log.debug( clickedItem.name + ' clicked!');
        });
        /**
         * Bottom Sheet controller for the Avatar Actions
         */
        function UserSheetController($mdBottomSheet) {
            this.user = user;
            this.items = [
                { name: 'Phone', icon: 'phone', icon_url: 'assets/svg/phone.svg' },
                { name: 'Twitter', icon: 'twitter', icon_url: 'assets/svg/twitter.svg' },
                { name: 'Google+', icon: 'google_plus', icon_url: 'assets/svg/google_plus.svg' },
                { name: 'Hangout', icon: 'hangouts', icon_url: 'assets/svg/hangouts.svg' }
            ];
            this.performAction = function (action) {
                $mdBottomSheet.hide(action);
            };
        }
    };
    return UsersController;
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = [
    'usersService', '$mdSidenav', '$mdBottomSheet',
    UsersController
];
