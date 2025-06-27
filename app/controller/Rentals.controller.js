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

    return Controller.extend("com.videoclub.frontend.controller.Rentals", {
        
        onInit: function () {
            this._oTable = this.byId("rentalsTable");
            
            // Modelo para la vista (filtros y configuraciones)
            const oViewModel = new JSONModel({
                headerExpanded: true,
                searchQuery: "",
                selectedStatus: "",
                selectedCustomer: "",
                selectedDateRange: "",
                filteredCount: 0,
                customers: []
            });
            this.getView().setModel(oViewModel, "view");
            
            // Cargar clientes para el filtro
            this._loadCustomers();
            this._updateFilteredCount();
        },

        onNavBack: function () {
            // Intentar routing primero
            try {
                const oRouter = this.getOwnerComponent().getRouter();
                oRouter.navTo("main");
            } catch (e) {
                // Si falla el routing, usar history.back como fallback
                console.warn("Routing failed, using history.back()");
                window.history.back();
            }
        },

        // Método llamado por FilterBar cuando cambia algún filtro
        onFilterChange: function() {
            this._applyFilters();
            this._updateFilterLabels();
        },

        // Método llamado por FilterBar al hacer search
        onSearch: function() {
            this._applyFilters();
            this._updateFilterLabels();
        },

        // Método principal que aplica todos los filtros
        _applyFilters: function() {
            const oFilterBar = this.byId("rentalsFilterbar");
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
                                    new Filter("customer/name", FilterOperator.Contains, sSearchValue),
                                    new Filter("customer/email", FilterOperator.Contains, sSearchValue),
                                    new Filter("movie/title", FilterOperator.Contains, sSearchValue),
                                    new Filter("ID", FilterOperator.Contains, sSearchValue)
                                ],
                                and: false
                            });
                            aFilters.push(oSearchFilter);
                        }
                        break;
                        
                    case "Status":
                        const sStatus = oControl.getSelectedKey();
                        if (sStatus) {
                            aFilters.push(new Filter("status", FilterOperator.EQ, sStatus));
                        }
                        break;
                        
                    case "Customer":
                        const sCustomer = oControl.getSelectedKey();
                        if (sCustomer) {
                            aFilters.push(new Filter("customer_ID", FilterOperator.EQ, sCustomer));
                        }
                        break;
                        
                    case "DateRange":
                        const sDateRange = oControl.getSelectedKey();
                        if (sDateRange) {
                            const oToday = new Date();
                            let oDateFilter;
                            
                            switch (sDateRange) {
                                case "today":
                                    const sTodayStr = oToday.toISOString().split('T')[0];
                                    oDateFilter = new Filter("rentalDate", FilterOperator.EQ, sTodayStr);
                                    break;
                                case "week":
                                    const oWeekAgo = new Date(oToday.getTime() - 7 * 24 * 60 * 60 * 1000);
                                    oDateFilter = new Filter("rentalDate", FilterOperator.GE, oWeekAgo.toISOString().split('T')[0]);
                                    break;
                                case "month":
                                    const oMonthAgo = new Date(oToday.getTime() - 30 * 24 * 60 * 60 * 1000);
                                    oDateFilter = new Filter("rentalDate", FilterOperator.GE, oMonthAgo.toISOString().split('T')[0]);
                                    break;
                                case "overdue":
                                    oDateFilter = new Filter({
                                        filters: [
                                            new Filter("status", FilterOperator.EQ, "ACTIVE"),
                                            new Filter("returnDate", FilterOperator.EQ, null)
                                        ],
                                        and: true
                                    });
                                    break;
                            }
                            if (oDateFilter) aFilters.push(oDateFilter);
                        }
                        break;
                }
            });
            
            // Aplicar filtros a la tabla
            const oTable = this.byId("rentalsTable");
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
            const oFilterBar = this.byId("rentalsFilterbar");
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
                    case "Status":
                        if (oControl.getSelectedKey()) {
                            aActiveFilters.push("Estado");
                        }
                        break;
                    case "Customer":
                        if (oControl.getSelectedKey()) {
                            aActiveFilters.push("Cliente");
                        }
                        break;
                    case "DateRange":
                        if (oControl.getSelectedKey()) {
                            aActiveFilters.push("Periodo");
                        }
                        break;
                }
            });
            
            const sFilterText = aActiveFilters.length > 0 
                ? `Filtros activos: ${aActiveFilters.join(", ")}`
                : "Todos los alquileres del sistema";
                
            this.byId("rentalsExpandedLabel").setText(sFilterText);
            this.byId("rentalsSnappedLabel").setText(sFilterText);
        },

        onRentalSelect: function (oEvent) {
            const oSelectedItem = oEvent.getParameter("listItem") || oEvent.getSource();
            const oContext = oSelectedItem.getBindingContext();
            
            if (oContext) {
                oContext.requestObject().then(function(oRentalData) {
                    this.getOwnerComponent().getModel("app").setProperty("/selectedRental", oRentalData);
                }.bind(this)).catch(function(oError) {
                    console.error("Error al obtener datos del alquiler:", oError);
                });
            }
        },

        onReturnSelected: function () {
            const oAppModel = this.getOwnerComponent().getModel("app");
            const oSelectedRental = oAppModel.getProperty("/selectedRental");
            
            if (!oSelectedRental) {
                MessageToast.show("Por favor selecciona un alquiler");
                return;
            }
            
            if (oSelectedRental.status === 'RETURNED') {
                MessageToast.show("Este alquiler ya fue devuelto");
                return;
            }
            
            this._performReturn(oSelectedRental);
        },

        onReturnRental: function (oEvent) {
            const oButton = oEvent.getSource();
            const oContext = oButton.getBindingContext();
            
            if (!oContext) {
                MessageToast.show("Error: No se pudo obtener la información del alquiler");
                return;
            }
            
            oContext.requestObject().then(function(oRentalData) {
                if (oRentalData.status === 'RETURNED') {
                    MessageToast.show("Este alquiler ya fue devuelto");
                    return;
                }
                
                this._confirmReturn(oRentalData);
            }.bind(this)).catch(function(oError) {
                console.error("Error al obtener datos del alquiler:", oError);
                MessageToast.show("Error al obtener datos del alquiler");
            });
        },

        _confirmReturn: function(oRentalData) {
            MessageBox.confirm(
                `¿Confirmas la devolución de "${oRentalData.movie.title}" de ${oRentalData.customer.name}?`,
                {
                    title: "Confirmar Devolución",
                    onClose: function(sAction) {
                        if (sAction === MessageBox.Action.OK) {
                            this._performReturn(oRentalData);
                        }
                    }.bind(this)
                }
            );
        },

        _performReturn: function (oRentalData) {
            const oModel = this.getView().getModel();
            
            // Para OData V4, usar bindContext para la acción returnRental
            const oBinding = oModel.bindContext("/returnRental(...)");
            
            // Establecer parámetros
            oBinding.setParameter("rentalId", oRentalData.ID);
            
            // Ejecutar la acción
            oBinding.execute().then(function () {
                // Obtener resultado
                try {
                    const oResult = oBinding.getBoundContext().getObject();
                    const sMessage = oResult.value || oResult || "Película devuelta exitosamente";
                    MessageToast.show(sMessage);
                } catch (e) {
                    MessageToast.show("Película devuelta exitosamente");
                }
                
                this.onRefresh();
                
            }.bind(this)).catch(function (oError) {
                console.error("Error al devolver película:", oError);
                
                let sErrorMessage = "Error desconocido";
                if (oError.error && oError.error.message) {
                    sErrorMessage = oError.error.message;
                } else if (oError.message) {
                    sErrorMessage = oError.message;
                }
                
                MessageBox.error("Error al devolver la película: " + sErrorMessage);
            }.bind(this));
        },

        onShowRentalDetails: function (oEvent) {
            const oButton = oEvent.getSource();
            const oContext = oButton.getBindingContext();
            
            if (!oContext) {
                MessageToast.show("Error: No se pudo obtener la información del alquiler");
                return;
            }
            
            oContext.requestObject().then(function(oRentalData) {
                this._showRentalDetailsDialog(oRentalData);
            }.bind(this)).catch(function(oError) {
                console.error("Error al obtener datos del alquiler:", oError);
                MessageToast.show("Error al obtener datos del alquiler");
            });
        },

        onRefresh: function () {
            const oModel = this.getView().getModel();
            oModel.refresh();
            this._updateFilteredCount();
            MessageToast.show("Lista actualizada");
        },

        onSort: function () {
            // Implementar diálogo de ordenamiento si es necesario
            MessageToast.show("Funcionalidad de ordenamiento pendiente");
        },

        // Formatters
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

        formatStatusText: function (sStatus) {
            return sStatus === 'ACTIVE' ? 'Activo' : 'Devuelto';
        },

        formatStatusState: function (sStatus) {
            return sStatus === 'ACTIVE' ? 'Warning' : 'Success';
        },

        formatReturnEnabled: function (sStatus) {
            return sStatus === 'ACTIVE';
        },

        // Métodos privados
        _loadCustomers: function () {
            const oModel = this.getView().getModel();
            if (!oModel) return;

            const oBinding = oModel.bindList("/Customers");
            oBinding.requestContexts().then(function (aContexts) {
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
                    
                    this.getView().getModel("view").setProperty("/customers", aFormattedCustomers);
                }.bind(this));
                
            }.bind(this)).catch(function (oError) {
                console.error("Error al cargar clientes:", oError);
            });
        },

        _updateFilteredCount: function () {
            const oBinding = this._oTable.getBinding("items");
            if (oBinding) {
                const iCount = oBinding.getLength();
                this.getView().getModel("view").setProperty("/filteredCount", iCount);
            }
        },

        _showRentalDetailsDialog: function (oRentalData) {
            if (!this._oDetailsDialog) {
                this._oDetailsDialog = sap.ui.xmlfragment("rentalDetailsDialog",
                    "com.videoclub.frontend.view.fragment.RentalDetailsDialog", this);
                this.getView().addDependent(this._oDetailsDialog);
            }
            
            const oDetailsModel = new JSONModel({ rental: oRentalData });
            this._oDetailsDialog.setModel(oDetailsModel, "details");
            this._oDetailsDialog.open();
        },

        onCloseRentalDetailsDialog: function () {
            this._oDetailsDialog.close();
        }
    });
});