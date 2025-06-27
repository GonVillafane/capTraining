sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageToast",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator"
], function (Controller, MessageToast, Filter, FilterOperator) {
    "use strict";

    return Controller.extend("com.videoclub.frontend.controller.App", {
        onInit: function () {
            // Esperar a que el modelo esté disponible
            const oModel = this.getView().getModel();
            if (oModel) {
                oModel.attachMetadataLoaded(this._loadDashboardData.bind(this));
            } else {
                // Si no hay modelo, intentar cargar después
                setTimeout(this._loadDashboardData.bind(this), 1000);
            }
        },

        onNavToMovies: function () {
            this.getRouter().navTo("movies");
        },

        onNavToRentals: function () {
            this.getRouter().navTo("rentals");
        },

        onShowStats: function () {
            this._showStatsDialog();
        },

        _loadDashboardData: function () {
            const oModel = this.getView().getModel();
            const oAppModel = this.getView().getModel("app");

            if (!oModel) {
                console.log("Modelo OData no disponible aún");
                return;
            }

            try {
                // Cargar conteo de películas
                const oMoviesBinding = oModel.bindList("/Movies");
                oMoviesBinding.requestContexts().then(function (aContexts) {
                    const iMovieCount = aContexts.length;
                    const iAvailableMovies = aContexts.filter(ctx => 
                        ctx.getProperty("stock") > 0
                    ).length;
                    
                    oAppModel.setProperty("/movieCount", iMovieCount);
                    oAppModel.setProperty("/availableMovies", iAvailableMovies);
                }).catch(function (oError) {
                    console.error("Error al cargar películas:", oError);
                    oAppModel.setProperty("/movieCount", 0);
                    oAppModel.setProperty("/availableMovies", 0);
                });

                // Cargar alquileres activos
                const oRentalsBinding = oModel.bindList("/Rentals");
                oRentalsBinding.filter([new Filter("status", FilterOperator.EQ, "ACTIVE")]);
                
                oRentalsBinding.requestContexts().then(function (aContexts) {
                    let iTotalRevenue = 0;
                    aContexts.forEach(ctx => {
                        iTotalRevenue += ctx.getProperty("totalPrice") || 0;
                    });
                    
                    oAppModel.setProperty("/activeRentals", aContexts.length);
                    oAppModel.setProperty("/totalRevenue", iTotalRevenue.toFixed(2));
                }).catch(function (oError) {
                    console.error("Error al cargar alquileres:", oError);
                    oAppModel.setProperty("/activeRentals", 0);
                    oAppModel.setProperty("/totalRevenue", "0.00");
                });

            } catch (oError) {
                console.error("Error general en _loadDashboardData:", oError);
                // Establecer valores por defecto
                oAppModel.setProperty("/movieCount", 0);
                oAppModel.setProperty("/availableMovies", 0);
                oAppModel.setProperty("/activeRentals", 0);
                oAppModel.setProperty("/totalRevenue", "0.00");
            }
        },

        _showStatsDialog: function () {
            const oModel = this.getView().getModel();
            
            if (!oModel) {
                MessageToast.show("Servicio no disponible");
                return;
            }
            
            try {
                // Llamar a la función de estadísticas (CDS 8 syntax)
                const oOperation = oModel.bindContext("/getMovieStats(...)");
                oOperation.invoke().then(function () {
                    const oResult = oOperation.getBoundContext().getProperty();
                    const aStats = oResult.value || [];
                    
                    if (!this._oStatsDialog) {
                        this._oStatsDialog = sap.ui.xmlfragment({
                            fragmentName: "com.videoclub.frontend.view.fragment.StatsDialog",
                            controller: this
                        });
                        this.getView().addDependent(this._oStatsDialog);
                    }
                    
                    const oStatsModel = new sap.ui.model.json.JSONModel({ stats: aStats });
                    this._oStatsDialog.setModel(oStatsModel, "stats");
                    this._oStatsDialog.open();
                }.bind(this)).catch(function (oError) {
                    console.error("Error al cargar estadísticas:", oError);
                    MessageToast.show("Error al cargar estadísticas");
                });
            } catch (oError) {
                console.error("Error en _showStatsDialog:", oError);
                MessageToast.show("Error al cargar estadísticas");
            }
        },

        onCloseStatsDialog: function () {
            if (this._oStatsDialog) {
                this._oStatsDialog.close();
            }
        },

        getRouter: function () {
            return this.getOwnerComponent().getRouter();
        }
    });
});