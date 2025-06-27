sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/ui/model/Sorter",
    "sap/ui/model/json/JSONModel"
], function (Controller, MessageToast, MessageBox, Filter, FilterOperator, Sorter, JSONModel) {
    "use strict";

    return Controller.extend("com.videoclub.frontend.controller.Movies", {
        
        onInit: function () {
            this._oTable = this.byId("moviesTable");
            
            // Modelo para la vista (filtros y configuraciones)
            const oViewModel = new JSONModel({
                headerExpanded: true,
                searchQuery: "",
                selectedGenres: [],
                selectedAvailability: "",
                selectedYearRange: "",
                selectedPopularity: "",
                filteredCount: 0,
                genres: []
            });
            this.getView().setModel(oViewModel, "view");
            
            // Cargar géneros únicos para el filtro
            this._loadGenres();
        },

        onNavBack: function () {
            const oRouter = this.getOwnerComponent().getRouter();
            oRouter.navTo("main");
        },

        // Método llamado por FilterBar cuando cambia algún filtro
        onFilterChange: function(oEvent) {
            this._applyFilters();
            this._updateFilterLabels();
        },

        // Método llamado por FilterBar al hacer search
        onSearch: function(oEvent) {
            this._applyFilters();
            this._updateFilterLabels();
        },

        // Método principal que aplica todos los filtros
        _applyFilters: function() {
            const oFilterBar = this.byId("filterbar");
            const aFilters = [];
            
            const aFilterItems = oFilterBar.getFilterGroupItems();
            
            aFilterItems.forEach((oFilterItem) => {
                const sName = oFilterItem.getName();
                const oControl = oFilterItem.getControl();
                
                switch (sName) {
                    case "SearchQuery":
                        const sSearchValue = oControl.getValue();
                        if (sSearchValue) {
                            const oSearchFilter = new Filter({
                                filters: [
                                    new Filter("title", FilterOperator.Contains, sSearchValue),
                                    new Filter("director", FilterOperator.Contains, sSearchValue),
                                    new Filter("description", FilterOperator.Contains, sSearchValue),
                                    new Filter("genre", FilterOperator.Contains, sSearchValue)
                                ],
                                and: false
                            });
                            aFilters.push(oSearchFilter);
                        }
                        break;
                        
                    case "Genre":
                        const aSelectedGenres = oControl.getSelectedKeys();
                        if (aSelectedGenres && aSelectedGenres.length > 0) {
                            const aGenreFilters = aSelectedGenres.map(genre => 
                                new Filter("genre", FilterOperator.EQ, genre)
                            );
                            aFilters.push(new Filter({
                                filters: aGenreFilters,
                                and: false
                            }));
                        }
                        break;
                        
                    case "Availability":
                        const sAvailability = oControl.getSelectedKey();
                        if (sAvailability === "available") {
                            aFilters.push(new Filter("stock", FilterOperator.GT, 0));
                        } else if (sAvailability === "outOfStock") {
                            aFilters.push(new Filter("stock", FilterOperator.EQ, 0));
                        }
                        break;
                        
                    case "YearRange":
                        const sYearRange = oControl.getSelectedKey();
                        if (sYearRange) {
                            let oYearFilter;
                            switch (sYearRange) {
                                case "2020s":
                                    oYearFilter = new Filter("year", FilterOperator.GE, 2020);
                                    break;
                                case "2010s":
                                    oYearFilter = new Filter({
                                        filters: [
                                            new Filter("year", FilterOperator.GE, 2010),
                                            new Filter("year", FilterOperator.LT, 2020)
                                        ],
                                        and: true
                                    });
                                    break;
                                case "2000s":
                                    oYearFilter = new Filter({
                                        filters: [
                                            new Filter("year", FilterOperator.GE, 2000),
                                            new Filter("year", FilterOperator.LT, 2010)
                                        ],
                                        and: true
                                    });
                                    break;
                                case "1990s":
                                    oYearFilter = new Filter({
                                        filters: [
                                            new Filter("year", FilterOperator.GE, 1990),
                                            new Filter("year", FilterOperator.LT, 2000)
                                        ],
                                        and: true
                                    });
                                    break;
                                case "1980s":
                                    oYearFilter = new Filter({
                                        filters: [
                                            new Filter("year", FilterOperator.GE, 1980),
                                            new Filter("year", FilterOperator.LT, 1990)
                                        ],
                                        and: true
                                    });
                                    break;
                                case "1970s":
                                    oYearFilter = new Filter({
                                        filters: [
                                            new Filter("year", FilterOperator.GE, 1970),
                                            new Filter("year", FilterOperator.LT, 1980)
                                        ],
                                        and: true
                                    });
                                    break;
                                case "classics":
                                    oYearFilter = new Filter("year", FilterOperator.LT, 1970);
                                    break;
                            }
                            if (oYearFilter) aFilters.push(oYearFilter);
                        }
                        break;
                        
                    case "Popularity":
                        const sPopularity = oControl.getSelectedKey();
                        if (sPopularity === "popular") {
                            aFilters.push(new Filter("rentedCount", FilterOperator.GE, 20));
                        } else if (sPopularity === "moderate") {
                            aFilters.push(new Filter({
                                filters: [
                                    new Filter("rentedCount", FilterOperator.GE, 10),
                                    new Filter("rentedCount", FilterOperator.LT, 20)
                                ],
                                and: true
                            }));
                        } else if (sPopularity === "new") {
                            aFilters.push(new Filter("rentedCount", FilterOperator.LT, 10));
                        }
                        break;
                }
            });
            
            // Aplicar filtros a la tabla
            const oTable = this.byId("moviesTable");
            const oBinding = oTable.getBinding("items");
            
            if (oBinding) {
                oBinding.filter(aFilters);
                
                // Actualizar contador después de aplicar filtros
                setTimeout(() => {
                    this._updateFilteredCount();
                }, 100);
            } else {
                console.error("Table binding not found");
            }
        },

        // Actualizar labels de filtros activos
        _updateFilterLabels: function() {
            const oFilterBar = this.byId("filterbar");
            const aFilterItems = oFilterBar.getFilterGroupItems();
            const aActiveFilters = [];
            
            aFilterItems.forEach((oFilterItem) => {
                const sName = oFilterItem.getName();
                const oControl = oFilterItem.getControl();
                
                switch (sName) {
                    case "SearchQuery":
                        if (oControl.getValue()) {
                            aActiveFilters.push("Búsqueda");
                        }
                        break;
                    case "Genre":
                        const aGenres = oControl.getSelectedKeys();
                        if (aGenres && aGenres.length > 0) {
                            aActiveFilters.push(`${aGenres.length} Género(s)`);
                        }
                        break;
                    case "Availability":
                        if (oControl.getSelectedKey()) {
                            aActiveFilters.push("Disponibilidad");
                        }
                        break;
                    case "YearRange":
                        if (oControl.getSelectedKey()) {
                            aActiveFilters.push("Década");
                        }
                        break;
                    case "Popularity":
                        if (oControl.getSelectedKey()) {
                            aActiveFilters.push("Popularidad");
                        }
                        break;
                }
            });
            
            const sFilterText = aActiveFilters.length > 0 
                ? `Filtros activos: ${aActiveFilters.join(", ")}`
                : "Todas las películas disponibles";
                
            this.byId("expandedLabel").setText(sFilterText);
            this.byId("snappedLabel").setText(sFilterText);
        },

        onMovieSelect: function (oEvent) {
            const oSelectedItem = oEvent.getParameter("listItem") || oEvent.getSource();
            const oContext = oSelectedItem.getBindingContext();
            
            if (oContext) {
                oContext.requestObject().then(function(oMovieData) {
                    this.getOwnerComponent().getModel("app").setProperty("/selectedMovie", oMovieData);
                }.bind(this)).catch(function(oError) {
                    console.error("Error al obtener datos de la película:", oError);
                });
            }
        },

        onRentSelected: function () {
            const oAppModel = this.getOwnerComponent().getModel("app");
            const oSelectedMovie = oAppModel.getProperty("/selectedMovie");
            
            if (!oSelectedMovie) {
                MessageToast.show("Por favor selecciona una película");
                return;
            }
            
            this._openRentDialog(oSelectedMovie);
        },

        onRentMovie: function (oEvent) {
            const oButton = oEvent.getSource();
            const oContext = oButton.getBindingContext();
            
            if (!oContext) {
                MessageToast.show("Error: No se pudo obtener la información de la película");
                return;
            }
            
            oContext.requestObject().then(function(oMovieData) {
                this._openRentDialog(oMovieData);
            }.bind(this)).catch(function(oError) {
                console.error("Error al obtener datos de la película:", oError);
                MessageToast.show("Error al obtener datos de la película");
            });
        },

        onShowMovieDetails: function (oEvent) {
            const oButton = oEvent.getSource();
            const oContext = oButton.getBindingContext();
            
            if (!oContext) {
                MessageToast.show("Error: No se pudo obtener la información de la película");
                return;
            }
            
            oContext.requestObject().then(function(oMovieData) {
                this._showMovieDetailsDialog(oMovieData);
            }.bind(this)).catch(function(oError) {
                console.error("Error al obtener datos de la película:", oError);
                MessageToast.show("Error al obtener datos de la película");
            });
        },

        onRefresh: function () {
            const oModel = this.getView().getModel();
            oModel.refresh();
            this._updateFilteredCount();
            MessageToast.show("Catálogo actualizado");
        },

        onSort: function () {
            if (!this._oSortDialog) {
                this._oSortDialog = sap.ui.xmlfragment("sortDialog",
                    "com.videoclub.frontend.view.fragment.SortDialog", this);
                this.getView().addDependent(this._oSortDialog);
            }
            this._oSortDialog.open();
        },

        // Formatters - simplificados
        formatGenreIcon: function (sGenre) {
            const oGenreIcons = {
                "Acción": "sap-icon://arobase",
                "Drama": "sap-icon://theater",
                "Comedia": "sap-icon://emoji",
                "Romance": "sap-icon://heart",
                "Ciencia Ficción": "sap-icon://space-navigation",
                "Terror": "sap-icon://warning",
                "Animación": "sap-icon://palette",
                "Aventura": "sap-icon://journey-arrive",
                "Crimen": "sap-icon://shield"
            };
            return oGenreIcons[sGenre] || "sap-icon://video";
        },

        formatStockIcon: function (iStock) {
            if (iStock > 5) return "sap-icon://accept";
            if (iStock > 0) return "sap-icon://warning";
            return "sap-icon://decline";
        },

        formatStockState: function (iStock) {
            if (iStock > 5) return "Success";
            if (iStock > 0) return "Warning";
            return "Error";
        },

        formatPopularityState: function (iRentedCount) {
            if (iRentedCount >= 20) return "Success";
            if (iRentedCount >= 10) return "Warning";
            return "Information";
        },

        formatAvailabilityText: function (iStock) {
            return iStock > 0 ? "Disponible" : "Agotado";
        },

        formatAvailabilityState: function (iStock) {
            return iStock > 0 ? "Success" : "Error";
        },

        formatButtonEnabled: function (iStock) {
            return iStock > 0;
        },

        _loadGenres: function () {
            const oModel = this.getView().getModel();
            if (!oModel) return;

            const oBinding = oModel.bindList("/Movies");
            oBinding.requestContexts().then(function (aContexts) {
                const aGenres = [];
                const oGenreSet = new Set();
                
                const aPromises = aContexts.map(function(oContext) {
                    return oContext.requestObject();
                });
                
                Promise.all(aPromises).then(function(aMovies) {
                    aMovies.forEach(function(oMovie) {
                        const sGenre = oMovie.genre;
                        if (sGenre && !oGenreSet.has(sGenre)) {
                            oGenreSet.add(sGenre);
                            aGenres.push({ key: sGenre, text: sGenre });
                        }
                    });
                    
                    this.getView().getModel("view").setProperty("/genres", aGenres);
                    this._updateFilteredCount();
                }.bind(this));
                
            }.bind(this)).catch(function (oError) {
                console.error("Error al cargar géneros:", oError);
            });
        },

        _updateFilteredCount: function () {
            const oBinding = this._oTable.getBinding("items");
            if (oBinding) {
                const iCount = oBinding.getLength();
                this.getView().getModel("view").setProperty("/filteredCount", iCount);
            }
        },

        _openRentDialog: function (oMovieData) {
            if (!this._oRentDialog) {
                this._oRentDialog = sap.ui.xmlfragment("rentDialog", 
                    "com.videoclub.frontend.view.fragment.RentDialog", this);
                this.getView().addDependent(this._oRentDialog);
            }
            
            const oRentModel = new JSONModel({
                movie: oMovieData,
                customerId: "",
                quantity: 1,
                customers: []
            });
            this._oRentDialog.setModel(oRentModel, "rent");
            
            this._loadCustomers();
            this._oRentDialog.open();
        },

        _loadCustomers: function () {
            const oModel = this.getView().getModel();
            if (!oModel) return;

            const oBinding = oModel.bindList("/Customers");
            oBinding.requestContexts().then(function (aContexts) {
                // Usar requestObject() para cada contexto
                const aPromises = aContexts.map(function(oContext) {
                    return oContext.requestObject();
                });
                
                Promise.all(aPromises).then(function(aCustomers) {
                    const aFormattedCustomers = aCustomers.map(function(oCustomer) {
                        return {
                            id: oCustomer.ID,
                            name: oCustomer.name,
                            email: oCustomer.email
                        };
                    });
                    
                    this._oRentDialog.getModel("rent").setProperty("/customers", aFormattedCustomers);
                }.bind(this));
                
            }.bind(this)).catch(function (oError) {
                console.error("Error al cargar clientes:", oError);
            });
        },

        onConfirmRent: function () {
            const oRentModel = this._oRentDialog.getModel("rent");
            const oRentData = oRentModel.getData();
            
            if (!oRentData.customerId) {
                MessageToast.show("Por favor selecciona un cliente");
                return;
            }
            
            if (oRentData.quantity < 1 || oRentData.quantity > oRentData.movie.stock) {
                MessageToast.show(`La cantidad debe estar entre 1 y ${oRentData.movie.stock}`);
                return;
            }
            
            this._performRental(oRentData);
        },

        _performRental: function (oRentData) {
            const oModel = this.getView().getModel();
            
            // Mostrar loading
            this._oRentDialog.setBusy(true);
            
            const oBinding = oModel.bindContext("/rentMovie(...)");
            
            oBinding.setParameter("movieId", oRentData.movie.ID);
            oBinding.setParameter("customerId", oRentData.customerId);
            oBinding.setParameter("quantity", oRentData.quantity);
            
            oBinding.execute().then(function () {
                this._oRentDialog.setBusy(false);
                
                try {
                    const oResult = oBinding.getBoundContext().getObject();
                    const sMessage = oResult.value || oResult || "Película alquilada exitosamente";
                    MessageToast.show(sMessage);
                } catch (e) {
                    // Si no hay valor de retorno, mostrar mensaje genérico
                    MessageToast.show("Película alquilada exitosamente");
                }
                
                this._oRentDialog.close();
                this.onRefresh();
                
            }.bind(this)).catch(function (oError) {
                this._oRentDialog.setBusy(false);
                console.error("Error al alquilar película:", oError);
                
                let sErrorMessage = "Error desconocido";
                if (oError.error && oError.error.message) {
                    sErrorMessage = oError.error.message;
                } else if (oError.message) {
                    sErrorMessage = oError.message;
                } else if (oError.responseText) {
                    try {
                        const oErrorData = JSON.parse(oError.responseText);
                        sErrorMessage = oErrorData.error?.message || sErrorMessage;
                    } catch (e) {
                        sErrorMessage = oError.responseText;
                    }
                }
                
                MessageBox.error("Error al alquilar la película: " + sErrorMessage);
            }.bind(this));
        },

        onCancelRent: function () {
            this._oRentDialog.close();
        },

        _showMovieDetailsDialog: function (oMovieData) {
            if (!this._oDetailsDialog) {
                this._oDetailsDialog = sap.ui.xmlfragment("detailsDialog",
                    "com.videoclub.frontend.view.fragment.MovieDetailsDialog", this);
                this.getView().addDependent(this._oDetailsDialog);
            }
            
            const oDetailsModel = new JSONModel({ movie: oMovieData });
            this._oDetailsDialog.setModel(oDetailsModel, "details");
            this._oDetailsDialog.open();
        },

        onCloseDetailsDialog: function () {
            this._oDetailsDialog.close();
        }
    });
});