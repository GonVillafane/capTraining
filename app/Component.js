sap.ui.define([
    "sap/ui/core/UIComponent",
    "sap/ui/model/json/JSONModel"
], function (UIComponent, JSONModel) {
    "use strict";

    return UIComponent.extend("com.videoclub.frontend.Component", {
        metadata: {
            manifest: "json"
        },

        init: function () {
            UIComponent.prototype.init.apply(this, arguments);

            this.setModel(new JSONModel({
                busy: false,
                selectedMovie: null,
                selectedCustomer: null,
                filterGenre: "",
                showOnlyAvailable: false,
                movieCount: 0,
                activeRentals: 0,
                totalRevenue: "0.00"
            }), "app");

            this.getRouter().initialize();
        },

        createContent: function () {
            return sap.ui.view({
                viewName: "com.videoclub.frontend.view.App",
                type: "XML",
                id: "app"
            });
        },

        getContentDensityClass: function () {
            if (!this._sContentDensityClass) {
                if (!sap.ui.Device.support.touch) {
                    this._sContentDensityClass = "sapUiSizeCompact";
                } else {
                    this._sContentDensityClass = "sapUiSizeCozy";
                }
            }
            return this._sContentDensityClass;
        }
    });
});