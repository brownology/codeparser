function xy(e) {
    if (!e) var e = window.event;
    if (e.pageX || e.pageY) {
        return [e.pageX, e.pageY]
    } else if (e.clientX || e.clientY) {
        return [e.clientX + document.body.scrollLeft + document.documentElement.scrollLeft, e.clientY + document.body.scrollTop + document.documentElement.scrollTop];
    }
    return [0, 0]
}

function mouseOver(evt, pos) {

    //get group element
    var target = evt.currentTarget;
    var title = "";
    var description = "";
    var color = "";
    if (target.getElementsByTagName("title")[0] && target.getElementsByTagName("title")[0].childNodes[0]) {
        title = target.getElementsByTagName("title")[0].childNodes[0].nodeValue;
    }
    if (target.getElementsByTagName("desc")[0] && target.getElementsByTagName("desc")[0].childNodes[0]) {
        description = target.getElementsByTagName("desc")[0].childNodes[0].nodeValue;
    }

    if (target.getElementsByTagName("rect")[0].attributes[2]) {
        color = target.getElementsByTagName("rect")[0].attributes[2].nodeValue;
    }
    var text = title == "" ? description : title + "<br/>" + description;
    $(".tipMid").html(text);
    $(".tip").css("left", pos[0] - 65);
    $(".tip").css("top", pos[1] - 100);
    $("#tooltip").css("background-color", color);
    $(".tip").show();
}

function mouseOut() {
    $(".tip").hide();
}

function zoomCallback(zoomScale) {
    //console.log('Updated zoom scale: ' + zoomScale);
    sessionStorage.setItem('vzoom', zoomScale);
}

function panCallback(newPan) {
    //console.log('Updated pan: %o', newPan);
    var pan = { x: newPan.x, y: newPan.y };
    sessionStorage.setItem('vpan', JSON.stringify(pan));
}

var Venues = EventBuilder.extend({
    columns: []
    , activeVenueId: 0
    , moduleData: {
        SsoId: ""
        , Module: ""
        , BusinessId: 0
        , Criteria: ""
        , EventId: 0
        , ModuleIds: []
    }

    , sameseat: ""
    , fontsize: "0.7 px"
    , fontcolor: "#000000"
    , rectColor: ""
    , lblColor: ""
    , seatColor: ""
    , originalLabelStyle: ""
    , groupselectON: false
    , selectedSeatprint: []
    , selectedItems: []

    , init: function () {

        this.eventId = EventBuilder.fn.getLocalStorageItem.call(this, 'eventId');
        $('a[data-name^="menu"].btn-success').removeClass('btn-success').addClass('btn-primary');
        $('[data-name="menu.venues"]').removeClass('btn-primary').addClass('btn-success');

        GridToolbar.fn.hideSearchForDdl();
        this.columns = [];
        this.setSplitter();

    }

    , venueGrid: { id: "venueGrid", selector: "#venueGrid", module: "Venues" }

    , urls: {
        GetSelectedColumns: '/EventBuilder/GetSelectedColumns'
        , GetVenues: '/Venues/GetVenues'
        , GetVenueSvg: '/Venues/GetVenueSVG'
        , GetAddVenueTemplate: '/Venues/GetAddVenueTemplate'
        , Add: '/Venues/CreateVenue'
        , Update: '/Venues/Update'
        , QuickSearch: '/Venues/QuickSearch'
        , QuickSearchAutoComplete: '/Venues/GetVenueNames'
        , DeleteVenue: '/Venues/Delete'
        , ChangeArchiveState: '/Venues/ChangeArchiveState'
        , CancelEdit: '/Venues/CancelEdit'
        , LockVenue: '/Venues/LockVenue'
        , UnLockVenues: '/Venues/UnLockVenues'
        , Print: '/Venues/Print'
        , PrintSelectedSeats: '/Venues/PrintSelectedSeats'
        , PrintPreview: '/Seating/GetVenueSVGVenuesPrintPreview'
        , ClearSearchFilters: '/Venues/ClearSearchFilters'
        , GetVenueHistory: '/Venues/GetVenueHistory'
    }

    , venueFormSelectors: {
        Category1: "[name='Category1']"
        , Category2: "[name='Category2']"
        , Group1: "[name='Group1']"
        , Group2: "[name='Group2']"
        , Group3: "[name='Group3']"
        , Batch1: "[name='Batch1']"
        , Batch2: "[name='Batch2']"
        , Batch3: "[name='Batch3']"
        , Phone1Type: "[name='Phone1Type']"
        , Phone2Type: "[name='Phone2Type']"
        , Phone3Type: "[name='Phone3Type']"
    }

    , svgChart: {}

    , initSvgChart: function () {
        var zoom = Number(sessionStorage.getItem('vzoom'));
        var pan = JSON.parse(sessionStorage.getItem('vpan'));
        var svgChart = svgPanZoom('#svg-chart', { center: true, maxZoom: 50, controlIconsEnabled: true,zoomScaleSensitivity: 0.3, onZoom: zoomCallback, onPan: panCallback });

        if (!isNaN(zoom) && zoom > 0 && pan !== null) {
            svgChart.zoom(zoom);
            svgChart.zoomAtPoint(zoom, pan);
        }
        else {
            svgChart.fit();
        }

    }

    , activateChart: function () {
        return svgPanZoom('#svg-chart');
    }

    , isPanEnabled: function () {
        var chart = this.activateChart();
        return chart.isPanEnabled();
    }

    //#region Venues Code
    , venueCudOperation: function (data, operation) {
        var url = "/Events/" + operation.capitalizeFirstLetter() + "Venue";

        this.venueServicePromise(url, data)
        .done(function (results) {
            console.log(operation + ' completed. ' + results);
        })
        .fail(function (xhr, error, status) {
            console.log(operation + ' failed. ' + error + '. ' + status);
        });
    }

    , cancelEdit: function (venueId, records) {
        var self = this;
        var params = { venueId: venueId, records: records };
        self.venueServicePromise(self.urls.CancelEdit, params)
        .done(function (results) {
            window.record = 0;
            self.setGridDataSource(results);
        })
        .fail(function (xhr, status, error) {
            console.log('[Venues.cancelEdit] ' + error);
        })
        .always(function () {
            var venueName = $('.panel-title').html();
            
            self.displayVenue(venueId, venueName);
        })

    }

    , lockVenue: function (venueId) {
        this.venueServicePromise(this.urls.LockVenue, { venueId: venueId })
        .fail(function (xhr, status, error) {
            console.log("Failed to lock record. error[" + error + "], status[" + status + "]");
            throw error;
        });
    }

    , unLockVenues: function (venueIds) {
        this.venueServicePromise(this.urls.UnLockVenues, { venueIds: venueIds })
        .done(function (results) {
            bootbox.alert(results);
        })
        .fail(function (xhr, error, status) {
            console.log("Failed to lock record. error[" + error + "], status[" + status + "]");
            bootbox.alert("Failed to unlock record. error[" + error + "]");
        });
    }

    , venueServicePromise: function (url, data, isServerReturningHtml) {
        data = data === null || data === 'undefined' ? {} : data;
        var params = null;
        if (typeof data === 'object') {
            params = JSON.stringify(data);
        }
        else {
            params = data;
        }

        var dataTypeExpectedBack = "json";

        if (isServerReturningHtml === true) {
            dataTypeExpectedBack = "html";
        }

        return $.ajax({
            type: "POST",
            url: url,
            dataType: dataTypeExpectedBack,
            contentType: "application/json; charset=UTF-8",
            data: params
        });
    }

    , setVenueGridDataSourceData: function (data) {
        var self = this;
        var dataSource = $(this.venueGrid.selector).data('kendoGrid').options.dataSource;
        //dataSource.options.schema.model.fields = EventBuilder.fn.gridDataSourceFields(this.columns);
        //kendo.parseDate doesn't work on JSON dates
        //data.EventDate = kendo.parseDate(data.EventDate, "MM/dd/yyyy");//third parameter is the culture
        //7/29/2015 coming back as data.Data
        //1. Check if data is an array
        //2. if data is not an array try parsing data.Data
        //7/30/2015 - went through the events module and didn't see data.Data
        //            will leave the code in place.
        var ldata = data;
        if (!$.isArray(data) && typeof data.Data !== 'undefined') {

            if (typeof data.Data !== 'object') {
                ldata = JSON.parse(data.Data);
            }
            else {
                ldata = data.Data;
            }
        }
        self.adjustGridData(ldata);

        dataSource.data(ldata);

        return dataSource;
    }

    , setGridDataSource: function (data) {
        var self = this;
        var gridData = null;

        if (typeof data === 'object') {
            gridData = data;
        }
        else {
            gridData = JSON.parse(data);
        }

        if (gridData.length === 0) gridData = [];

        var grid = $(self.venueGrid.selector).data('kendoGrid');
        //Objects are passed by reference.
        //Only manipulating the values so passing by reference is fine.
        //self.adjustGridData(gridData);

        var dataSource = self.setVenueGridDataSourceData(gridData);

        if (gridData.length > 0)
            EventBuilder.fn.reapplySort(self.venueGrid.selector, dataSource);

        EventBuilder.fn.setGridScrollPosition('venueGrid');
    }

    , adjustGridData: function (data) {
        var ldata = data;
        if (!$.isArray(data) && typeof data.Data !== 'undefined') {

            if (typeof data.Data !== 'object') {
                ldata = JSON.parse(data.Data);
            }
            else {
                ldata = data.Data;
            }
        }
        var utcOffset = sessionStorage.getItem("utcOffset");
        $.each(ldata, function (i, v) {

            //The format is maintained from the template
            ldata[i].CreatedOn = kendo.parseDate(v.CreatedOn);
            ldata[i].UpdatedOn = kendo.parseDate(v.UpdatedOn);
            //ldata[i].Name = v.Name !== null ? he.decode(v.Name) : v.Name;
            //ldata[i].Location = v.Location !== null ? he.decode(v.Location) : v.Location;
            //ldata[i].City = v.City !== null ? he.decode(v.City) : v.City;

            if (self.itemExistAndNotNull(v.EventDate)) {
                ldata[i].EventDate = kendo.toString(kendo.parseDate(v.EventDate), kendo.culture().calendar.patterns.d);
            }
            if (self.itemExistAndNotNull(v.CreatedOn)) {
                ldata[i].CreatedOn = adjustUtcTime(v.CreatedOn, utcOffset);
            }
            if (self.itemExistAndNotNull(v.UpdatedOn)) {
                ldata[i].UpdatedOn = adjustUtcTime(v.UpdatedOn, utcOffset);
            }

        });

        //return ldata;
    }
    
    , clearSearchFilters: function () {
        var self = this;
        self.venueServicePromise(self.urls.ClearSearchFilters, {})
        .done(function (results) {
        }).
        fail(function (xhr, status, error) {
            console.log('[venues.clearSearchFilters] ' + error);
        });
    }

    , activateSelectedVenue: function (venueId) {
        console.log('The selected venueId is ' + venueId);

        EventBuilder.fn.setSessionStorageItem.call(this, 'venuesVenueId', venueId);

        //TODO - Show selected venue on the right side of splitter
    }

    , getActiveVenueId: function () {
        var venueId = EventBuilder.fn.setSessionStorageItem.call(this, 'venuesVenueId');
        if (!isNaN(venueId) || venueId <= 0)
            return 0;
        else
            return Number(venueId);
    }

    , setGridHeight: function () {
        var pageHeight = window.innerHeight;
        var pageWidth = window.innerWidth;
        var gridHeight = 0;
        if (pageWidth / pageHeight > 1.5) {
            gridHeight = pageHeight * .77;
        } else {
            gridHeight = pageHeight * .78;
        }
        $(this.venueGrid.selector).height(gridHeight);
    }

    , initGridItems: function () {

        this.columns = EventBuilder.fn.gridColumns(columns, true, module);
    }

    , venueGridDataSource: function (url, params, columns) {
        var self = this;
        var data = null;
        if (typeof params === 'object') {
            data = JSON.stringify(params);
        }
        else {
            data = params === null || typeof params === 'undefined' ? {} : params;
        }

        var dataSource = new kendo.data.DataSource({
            gridId: "#venueGrid"
            , transport: {
                read: function (options) {

                    self.showLoading(true);
                    console.log('[venueGridDataSource] read fired with data [' + data + ']');
                    self.venueServicePromise(url, data)
                    .done(function (results) {
                        var gridData = null;

                        if (typeof data === 'object') {
                            gridData = results;
                        }
                        else {
                            gridData = JSON.parse(results);
                        }
                        //Objects are passed by reference.
                        Venues.fn.adjustGridData(gridData);
                        //Executing the success method of the read function argument will populate the DataSource instance and fire its change event.
                        options.success(gridData);
                        
                    })
                    .fail(function (xhr, status, error) {
                        var msg = "[Venue.venueGridDataSource] venue datasource error: " + error;
                        console.log(msg + ', status: ' + status);
                        self.displayError('Venue read failed. ' + error);
                    })
                    .always(function () {
                        self.showLoading(false);
                    });
                }
               , update: function (options) {
                   var venueName = options.data.Name;
                   var venueId = options.data.VenueID;
                   var activateVenue = true;

                   var updatedVenue = options.data;
                   self.venueServicePromise(self.urls.Update, updatedVenue)
                     .done(function (results) {
                         console.log('[Venues.venueGridDataSource] Venue update completed.');

                         self.displayVenue(venueId, venueName);
                         //to prevent displaying the first venue  
                         //during the grid databinding process
                         //sessionStorage.setItem('isEditing', 'true');
                         self.setGridDataSource(results);
                     })
                     .fail(function (xhr, status, error) {
                         console.log('[Venues.venueGridDataSource] Venue update failed. ' + error + '. ' + status);
                         //error isn't always an object need to check
                         var encodedStr = error.message.replace(/[\u00A0-\u9999<>\&]/gim, function (i) {
                             return '&#' + i.charCodeAt(0) + ';';
                         });
                         bootbox.alert({ title: 'Update Error', message: encodedStr, className: 'top-most' });
                         options.error(error);
                     });
               }
            }
            , schema: {
                model: {
                    id: "VenueID",//This is required or Updating will not work at all
                    fields: EventBuilder.fn.gridDataSourceFields(columns, self.venueGrid.module)
                }
            }
            , requestStart: function (e) {
                //reset the record count, especially during sorting
                window.record = 0;
            }
            , change: function (e) {
                console.log('[Venue.venueGridDataSource] dataSource change event fired');
                window.record = 0;
                var gridId = e.sender.options.gridId;
                var sort = e.sender.sort();
                if (sort) {
                    EventBuilder.fn.handleSortOrderDisplay.call(this, gridId, sort);
                }
            }
        });

        var gridSort = self.venueGrid.id + 'Sort';
        var sortOrder = sessionStorage.getItem(gridSort);

        if (typeof (sortOrder) !== 'undefined' && sortOrder !== null && sortOrder !== '') {
            EventBuilder.fn.reapplySort(self.venueGrid.selector, dataSource);
        }

        return dataSource;
    }

    //called by the gridtoolbar
    //Calls: getGrid
    , quickSearch: function (venueName) {
        var url = this.urls.QuickSearch;

        var params = { name: venueName };

        this.getGrid(url, params);
    }

    //Calls: displayGrid
    , loadInitialGrid: function (clearSearchFilters) {

        var self = this;
        var url = this.urls.GetSelectedColumns;
        var params = null;

        if (clearSearchFilters === true) params = { clearSearchFilters: clearSearchFilters };

        self.showLoading(true);

        self.venueServicePromise(url, { module: self.venueGrid.module })
        .done(function (results) {
            var data = '';
            if (typeof results === 'object') {
                data = results;
            }
            else {
                data = JSON.parse(results);
            }
            self.columns = data;
        })
        .then(function () {
            self.displayGrid(self.venueGrid.selector, self.urls.GetVenues, params, self.columns, null);
            //self.setGridHeight();
            //The first venue is set in the venueGridDataSource in the read transport.
        })
        .then(function () {
            var grid = $(self.venueGrid.selector).data('kendoGrid');
            grid.refresh();
        })
        .fail(function (xhr, status, error) {
            console.log('[Venue.loadInitialGrid] error: ' + error + ', status: ' + status)
            self.displayError(error);
        })
        .always(function () {
            self.showLoading(false);

        });


        //not ideal, need to update
        //$('[data-name="gridRecordCount"]').html('Total Count: 10 records');
    }

    , getGrid: function (url, params) {

        var self = this;
        self.showLoading(true);
        self.venueServicePromise(url, params)
        .done(function (results) {
            window.record = 0;
            if ($(self.venueGrid.selector).data('kendoGrid')) {
                self.setGridDataSource(results);
            }
            else {
                self.displayGrid(self.venueGrid.selector, null, null, self.columns, results);
            }
        })
        .fail(function (xhr, status, error) {
            console.log(error);
            console.log(status);
            self.displayError('[getGrid] ' + error);
        })
        .always(function () {
            self.showLoading(false);
            //self.setSplitter();
        });
    }

    , displayGrid: function (selector, url, params, columns, gridData) {
        var self = this;
        var module = this.venueGrid.module;
        var data = null;
        var idField = "";

        //record must be a global variable
        window.record = 0;
        var currentRecordCount = 0;

        if (gridData !== null && $(selector).data('kendoGrid')) {
            console.log('[displayGrid] reusing grid');
            if (typeof gridData === 'object') {
                data = gridData;
            }
            else {
                data = JSON.parse(gridData);
            }

            self.setGridDataSource(data);
            currentRecordCount = data.length;
            console.log('current record count: ' + currentRecordCount);
        }
        else {
            console.log('[displayGrid] Making new grid');
            $(selector).kendoGrid({
                dataSource: self.venueGridDataSource(url, params, columns),
                pageable: false,
                sortable: { mode: "multiple", allowUnsort: true },
                scrollable: true,
                selectable: "multiple row",
                resizable: true,
                reorderable: true,
                noRecords: true,
                columnResize: function (e) {
                    var width = e.newWidth;
                    var name = e.column.field;
                    var colId = e.column.attributes["data-sc-id"];
                    console.log('column: ' + name);
                    console.log('column width: ' + width);
                    EventBuilder.fn.saveColumnInfo.call(this, module, colId, width, 0);
                },
                columnReorder: function (e) {
                    if (e.oldIndex === 0 || e.newIndex === 0) { e.preventDefault(); return false; }

                    if (e.newIndex > 1 || e.oldIndex > 1) {

                        var newIndex = e.newIndex - 2;
                        var oldIndex = e.oldIndex - 2;
                        EventBuilder.fn.saveColumnPosition("Venues", oldIndex, newIndex);
                    }
                },
                columns: EventBuilder.fn.gridColumns(columns, true, module),
                change: function (e, args) {
                    idField = e.sender.dataSource.options.schema.model.id;
                    EventBuilder.fn.onChangeHandleSelectedRows(e.sender, idField, self.selectedItems);
                },
                dataBound: function (e) {
                    var rows = e.sender.options.dataSource.data().length;
                    Venues.fn.setDisplayRecordCount(rows);

                    idField = e.sender.dataSource.options.schema.model.id;
                    EventBuilder.fn.onDataBoundHandleSelectedRows(e.sender, idField, self.selectedItems);

                    //Venues.fn.afterNewVenueAction(rows.length);
                    Venues.fn.displayVenueOnLoad(rows);
                },
                editable: {
                    mode: "popup",
                    window: { title: "Edit Venue", draggable: false },
                    template: kendo.template($("#popup-editor").html())
                },
                edit: function (e) {//put into a function
                    e.sender.clearSelection();
                    //to prevent displaying the first venue  
                    //during the grid databinding process
                    sessionStorage.setItem('isEditing', 'true');

                    $('[name=activeModule]').val("Venues");
                    var venueId = e.model.id;
                    e.sender.select("tr[data-uid='" + e.model.uid + "']");


                    self.venueServicePromise(self.urls.LockVenue, { venueId: venueId })
                    .done(function () {
                        self.prepareVenueForEdit(e);

                        self.validateAddVenueForm();

                        self.displayHistoryGrid(venueId);
                    })
                    .fail(function (xhr, status, error) {
                        $('.k-grid-cancel').click();
                        bootbox.alert(error);

                        return false;
                    });

                },
                excelExport: function (e) {
                    var from = e.sender;
                    var cellId = e.sender._cellId;
                    var gridName = cellId.substring(0, cellId.indexOf('_'));
                    var filename = gridName + ".xlsx";
                    e.workbook.fileName = filename; //"venuesGrid.xlsx";
                }
                , cancel: function (e) {
                    //Canceling an edit increments the row number.
                    //So refreshing the grid corrects the issue.
                    //Refreshing the grid is a temp solution.
                    e.preventDefault();
                    var isDirty = e.model.dirty;
                    var venueId = e.model.id;
                    var records = Number(EventBuilder.fn.getSessionItem("recentVenues"));
                    records = records === 0 ? 10 : records;

                    if (isDirty) {
                        var grid = this;

                        bootbox.dialog({
                            message: "The current Venue has been modified. Do you want to save the changes?",
                            title: "Venue Confirmation",
                            className: "top-most",
                            buttons: {
                                success: {
                                    label: "Yes",
                                    className: "btn-primary",
                                    callback: function () {
                                        grid.dataSource.sync();
                                    }
                                },
                                "No": {
                                    className: "btn-primary",
                                    callback: function () {
                                        self.cancelEdit(venueId, records);
                                    }
                                },
                                "Cancel": {
                                    className: "btn-default",
                                    callback: function () {
                                        $('.bootbox.modal').modal('hide');
                                    }
                                }
                            }
                        });

                    }
                    else {
                        self.cancelEdit(venueId, records);
                    }
                }
            });
        }
    }

    //called by the gridtoolbar
    //Calls: getGrid
    , getVenues: function () {
        var url = this.urls.GetVenues;
        //this.setGridHeight();
        this.getGrid(url)
    }

    //Calls: loadInitialGrid
    , reloadGrid: function (clearSearchFilters) {
        if ($(this.venueGrid.selector).data('kendoGrid')) {
            $(this.venueGrid.selector).data('kendoGrid').destroy();
            $(this.venueGrid.selector).empty();
        }
        if (clearSearchFilters) {
            this.clearSearchFilters();
        }

        this.loadInitialGrid();
    }

    , addVenue: function (data, submitter) {
        var self = this;

        $("#loading").show();
        var name = data["Name"];
        this.venueServicePromise(this.urls.Add, data)
        .done(function (results) {
            var data;
            if (typeof results === 'object') {
                data = results;
            }
            else {
                data = JSON.parse(results);
            }
            var venueId = data.Item1;
            var rows = data.Item2;
            self.setGridDataSource(rows);

            //always show the newly added venue
            self.activateSelectedVenue(venueId, name);
        })
        .fail(function (xhr, status, error) {
            var msg = '[addVenue] Error: ' + error;
            console.log(msg);
            self.displayError(error);
            EventBuilder.fn.displayError(msg);
        })
        .always(function () {
            self.showLoading(false);
        });
    }

    , setDisplayRecordCount: function (count) {
        console.log('[setDisplayRecordCount]    getGrid: row count ' + count);

        $('[data-name="gridRecordCount"]').html('Total Count: ' + count + ' records');
        this.resizeGridToolbar();
    }
    //validation for advanced search is in gridtoolbar.js
    , validateAddVenueForm: function () {
        $('form').kendoValidator({
            rules: {
                validateVenueName: function (input) {
                    if (input.is('[name=Name]')) {
                        var name = $.trim($('[name=Name]').val());
                        if (name === "") {
                            return false;
                        }
                    }
                    return true;
                }
                , validateFile: function (input) {
                    if (input[0].type == "file") {
                        return input.closest(".k-upload").find(".k-file").length;
                    }
                    return true;
                }
                , validateHiddenFile: function (input) {
                    if (input.is('#LabelFile') || input.is('#SeatFile')) {
                        var file = input.is('#LabelFile') ? $('#LabelFile').val() : $('#SeatFile').val();
                        if (file === '' || !file.match(/(?:txt)$/)) {
                            return false;
                        }
                    }
                    return true;
                }
            }
            , messages: {
                validateVenueName: "The venue name must contain visible characters."
                , validateFile: "The file needs to be a text file (.txt)."
                , validateHiddenFile: "Please select labels file."
            }
        });
    }

    , onUpload_Error: function (e) {
        var files = e.files;
        var msg = e.XMLHttpRequest.statusText;
        var sender = e.sender.element[0].id;

        $('#upload').prop('disabled', 'disabled');

        if (e.operation === "upload") {
            if (sender === "file_labels")
                $('#LabelFile').val('').blur();
            else if (sender === "file_seats")
                $('#SeatFile').val('').blur();
            bootbox.alert({ title: 'Venue File Upload Error', message: msg });
        }
    }

    , onUpload_Select: function (e) {
        var ext = e.files[0].extension;
        var filename = e.files[0].name;
        var sender = e.sender.element[0].id;
        if (ext !== ".txt") {
            bootbox.alert('Only text files are allowed.');
            e.preventDefault();
        }
        else {
            console.log("%s is %s", sender, filename);
            if (sender === "file_labels")
                $('#LabelFile').val(filename).blur();
            else if (sender === "file_seats")
                $('#SeatFile').val(filename).blur();

            $('#upload').removeAttr('disabled');
        }
    }

    , prepareVenueForEdit: function (e) {
        var self = this;
        var venueId = e.model.id;
        self.lockVenue(venueId);

        var createdOn = moment(e.model.CreatedOn);
        var updatedOn = moment(e.model.UpdatedOn);

        createdOn = kendo.toString(kendo.parseDate(e.model.CreatedOn), kendo.culture().calendar.patterns.d);
        updatedOn = kendo.toString(kendo.parseDate(e.model.UpdatedOn), kendo.culture().calendar.patterns.d);

        $('[name="CreatedOn"]').html(createdOn);
        $('[name="UpdatedOn"]').html(updatedOn);

        if (!e.model.ActiveFlag)
            $('[name="Archived"]').addClass('glyphicon glyphicon-unchecked').css('color', 'green');
        else
            $('[name="Archived"]').addClass('glyphicon glyphicon-check').css('color', 'blue');

        $('[data-name="venue-static-info"] input').css({ 'max-width': '100px' });

        //Set Window title to event name
        var name = he.encode(e.model.Name);
        $('.panel-title').html(name);
        
        //remove the default icons from the buttons
        $('.k-edit-buttons').find('span').remove();

        //rename the kendo's update button
        $('div.k-edit-buttons a:first').attr("name", "save").html("Save");
        //need to move the focus to the button, otherwise if the user change one field
        //and click save the change isn't being registered with kendo. This is not 
        //occurring in Events, where the code is almost identical.
        $('div.k-edit-buttons a:first').on('mousedown', function (e) { this.focus(); });

        //so the scrollbars will work
        //http://docs.telerik.com/kendo-ui/controls/data-management/grid/appearance#hidden-containers
        $('#venueHistoryTab').on('shown.bs.tab', function (e) {
            $('#venueHistory').data('kendoGrid').resize();
        })

    }

    , displayHistoryGrid: function (venueId) {
        var self = this;
        self.venueServicePromise(self.urls.GetVenueHistory, { venueId: venueId })
                    .done(function (data) {
                        var gridData = null;
                        if (typeof (data) === 'object') {
                            gridData = data;
                        }
                        else {
                            gridData = JSON.parse(data);
                        }
                        gridData = self.formatDates(gridData);
                        $("#venueHistory").kendoGrid({
                            dataSource: gridData,
                            columns: [
                                { field: "Field_Name", title: "Field Name", width: 150 },
                                { field: "Old_Value", title: "Old Value", width: 300 },
                                { field: "New_Value", title: "New Value", width: 300 },
                                { field: "UpdateOn", title: "Updated On", width: 150 },
                                { field: "UpdateBy", title: "Updated By", width: 150 }
                            ],
                            noRecords: true,
                            resizable: true,
                            height: 430,
                            pageable: false,
                            reorderable: true,
                            selectable: true
                        });
                    })
                    .fail(function (xhr, status, error) {
                        var msg = "[VenueHistory]: " + error;
                        console.log(msg);
                        self.displayError(msg);
                    });
    }

    , formatDates: function (ldata) {
        var self = this;
        $.each(ldata, function (i, v) {
            //console.log('[venues.formatDates] index[%s]',i);
            //console.log(v);
            //The format is maintained from the template
            if (self.itemExistAndNotNull(v.CreatedOn)) {

                ldata[i].CreatedOn = adjustUtcTime(v.CreatedOn);
            }

            if (self.itemExistAndNotNull(v.UpdateOn)) {

                ldata[i].UpdateOn = adjustUtcTime(v.UpdateOn);
            }
        });

        return ldata;
    }

    , itemExistAndNotNull: function (item) {
        if (typeof (item) !== 'undefined' && item !== null)
            return true;
        else
            return false;
    }

    , initComboBoxes: function () {
        $("[data-name='frozenColumns']").kendoComboBox({
            dataSource: {
                data: ["0", "1", "2", "3", "4", "5"]
            },
            value: 0,
            change: function () {
                var colIndx = this.value();
                freezeGridColumns("venueGrid", colIndx);
            }

        });
        $("#frozenColumns").closest(".k-widget").hide();

    }

    , setKendoUIControls: function () {
        //$('[name="EventDate"]').kendoDatePicker();

    }

    , setgridtoolbar: function () {
        GridToolbar.fn.searchForDdl("Venues");
        GridToolbar.fn.setVenueActions();
    }

    , deleteVenue: function (venueIds, closeActiveVenue) {
        var self = this;
        self.showLoading(true);
        var title = 'Venues Deleted';
        var content = '';
        var params = { venueIds: venueIds };
        this.venueServicePromise(this.urls.DeleteVenue, params)
        .done(function (results) {
            var data;
            if (typeof results === 'object') {
                data = results;
            }
            else {
                data = JSON.parse(results);
            }
            content = data.Item1;
            var rows = data.Item2;

            bootbox.alert({ title: title, message: content });

            self.showLoading(true);
            self.setVenueGridDataSourceData(rows);

            //if (closeActiveVenue) {
            //    EventBuilder.fn.closeActiveVenue();
            //}
        })
        .then(function () {
            self.showFirstVenueInGrid();
        })
        .fail(function (xhr, status, error) {
            self.showLoading(false);
            console.log('Delete Venues Error: ' + error + ', status: ' + status);
            content = "[Delete Venues Error] Error: " + error;

            self.displayError(content);

        })
        .always(function () {
            self.showLoading(false);
        });
    }

    , changeArchiveState: function (venueIds, archive) {
        var self = this;
        var action = archive ? "Archived" : "Unarchived";

        var title = action + " Venues";
        var content = "The selected venues have been " + action;
        var modalIdentifer = "mae";
        var hideFooter = false;
        var onlyShowCloseButton = true;
        self.showLoading(true);
        self.venueServicePromise(self.urls.ChangeArchiveState, { ids: venueIds, archive: archive })
        .done(function (results) {
            self.displayGrid(self.venueGrid.selector, null, null, null, results);

            GridToolbar.fn.displayDialog(title, content, modalIdentifer, hideFooter, onlyShowCloseButton);
        })
        .fail(function (xhr, status, error) {
            console.log('[changeArchiveState] error: ' + error + ', status: ' + status);
            self.displayError('[Events changeArchiveState] ' + error);
        })
        .always(function () {
            self.showLoading(false);
        });
    }

    , initEvents: function () {
        var self = this;

        var grid = $(this.venueGrid.selector);
        grid.on('click', 'td.clickable-cell', function () {
            var venue = $(this).children('span');
            var venueId = venue.attr('data-id');
            var venueName = venue.attr('data-name');
            //self.activateSelectedVenue(venueId, venueName);
            self.displayVenue(venueId, venueName);
        });

        $('#printreset').on('click', function () {
            if ($('svg').length === 0) {
                return false;
            }
            self.clearSelectedSeats();
        });

        $('#printselection').on('click', function () {
            if ($('svg').length === 0) {
                self.displayErrorDialog('A venue must be loaded before printing.');
                return false;
            }

            var isActive = $(this).data("active");
            if (typeof(isActive)==='undefined' || isActive === "no") {
                $(this).attr('title', 'Click to de-activate seat selection.');
                $(this).data('active', 'yes');
                //$(this).css('background-color', 'red');
                $(this).removeClass('btn-default').addClass('btn-danger');
                //self.prepareCanvasForSeatSelection();
                //self.groupselectON = true;
                self.activateChart().disablePan();
                //sessionStorage.setItem("groupselectONDragOFF", self.groupselectON);

            }
            else {
                $(this).data('active', 'no');
                //$(this).css('background-color', 'transparent');
                $(this).removeClass('btn-danger').addClass('btn-default');
                //self.groupselectON = false;
                self.activateChart().enablePan();
                //sessionStorage.setItem("groupselectONDragOFF", self.groupselectON);
            }
        });

        $('#printaction').on('click', function () {
            if ($('svg').length === 0) {
                self.displayErrorDialog('A venue must be loaded before printing.');
                return false;
            }
            //var preview = window.open();
            //var venue = $('#SVGcanvas').html();
            //$(preview.document.body).html(venue);
            Venues.fn.printAction();
        });

        $('#seatingChart').on('click', '.chartitem', function (e) {
            var printon = $('#printselection').data('active');
            if (printon === 'yes') {
                var id = $(this).find('.drop').attr('id');
                Venues.fn.handleSeatSelection(id); //(this.id);
            }
        });

    }

    , displayErrorDialog: function (message) {
        //GridToolbar.fn.displayDialog("Error", message, "", false, true, true);
        bootbox.alert({ title: "Error", message: message });
    }

    , displayError: function (message) {
        //EventBuilder.fn.displayError(message);
        bootbox.alert({ title: "Error", message: message });
    }

    , showLoading: function (show) {
        EventBuilder.fn.displayLoadingAnimation(show);
    }
    //#endregion

    , isEditing: function () {
        var isEditing = sessionStorage.getItem('isEditing');
        if (isEditing !== null) {
            sessionStorage.removeItem('isEditing');
            return true;
        }

        return false;
    }

    , showFirstVenueInGrid: function () {
        //to prevent overriding the venue that was edited
        if (Venues.fn.isEditing()) return;

        console.log('[showFirstVenueInGrid]');
        var grid = $(Venues.fn.venueGrid.selector).data("kendoGrid");
        grid.select('tbody:last tr:first');
        var row = grid.select();
        var data = grid.dataItem(row[0]);
        var venueId = 0;
        var venueName = '';
        if (data !== null) {
            var venueId = data.VenueID;
            var venueName = data.Name;
            console.log('[showFirstVenueInGrid] venueId[' + venueId + '], venueName[' + venueName + ']');
            //this.displayVenue(venueId, venueName);
            Venues.fn.scrollToVenue(venueId);
            Venues.fn.displayVenue(venueId, venueName);
        }
        else {
            console.log('[showFirstVenueInGrid] grid row was not selected.');
        }

    }

    //#region Existing Venue code
    , setSplitter: function () {
        if ($("#splitter").length > 0) {
            console.log('[Venues.setSplitter] setting the splitter size');
            //setSplitterHeight("#splitter");

            //$("#splitter").kendoSplitter();
            $("#splitter").kendoSplitter({
                orientation: "horizontal",
                panes: [
                    { collapsible: true },
                    { collapsible: true }
                ]
                , resize: Venues.fn.resizeGridToolbar
            });

            //The panes are not taking up the entire width of the splitter
            var pane1 = $('#venueGrid').parent().width();
            var pane2 = $("#splitter").width() - pane1;
            $('#venueSvg').parent().width(pane2);

        }
    }

    , setSplitterWidth: function (splitterSelector) {
        var pageHeight = window.innerHeight;
        var pageWidth = window.innerWidth;
        var width = 0;
        if (pageWidth / pageHeight > 1.5) {
            width = pageWidth * .84;
        } else {
            width = pageWidth * .85;
        }
        $(splitterSelector).width(width);
    }

    , resizeGridToolbar: function (e) {
        var toolbar = $('[data-eb-module="Venues"]');
        var grid = $('#venueGrid');
        var gridWidth = grid.outerWidth();
        toolbar.width(gridWidth);
        
    }

    , onResize: function (e) {
        // prevent endless recursion from resizes
        if (!this.appliesSizes) {
            this.appliesSizes = true;

            // calculate pane width
            var element = this.element;
            var pane = element.find(".k-pane:first");
            var ratio = Math.ceil(pane.width() * 100 / element.width());

            // set pane width in percentages
            this.size(pane, ratio + "%");

            this.appliesSizes = false;
        }
    }

    , setgridtoolbar: function () {
        GridToolbar.fn.searchForDdl("Venues");
        GridToolbar.fn.setVenueActions();
    }

    , onInsertClick: function () {

        $.get("/Venues/Add", { selected: $('#choose').val() },
            function (data) {
                //                         added for QC 1579
                if (data.HasError) {
                    $('#update').html(data.ErrorMesage + "<p><input type='button' id='btnOk' value='OK' onclick='errorHideReload();'></p>");
                    $("#grayout").css("visibility", "visible");
                    $("#update").css("visibility", "visible");
                }
                else {
                    $('#update').html(data);
                    $("#grayout").css("visibility", "visible");
                    $("#update").css("visibility", "visible");
                }
            }
        );
    }

    , displayVenue: function (venueId, venueName) {
        var self = this;
        self.showLoading(true);

        self.venueServicePromise(self.urls.GetVenueSvg, { venueId: venueId }, true)
        .done(function (html) {
            sessionStorage.setItem('venuesVenueId', venueId);
            $('#venuename').html(venueName);
            $('#seatingChart').html(html);
            // self.setSplitter();
            //self.scrollToVenue(venueId);
            EventBuilder.fn.setGridScrollPosition(Venues.fn.venueGrid.id);
            self.initSvgChart();

        })
        .then(function () {
            //console.log('calling svg load event.');
            //var svg = $('svg')[0];
            //console.log('[displayVenue] ajax then. trigger the load event for venueId[%s]', venueId);
            //svg.dispatchEvent(new Event('load'));
            //console.log('[displayVenue] ajax then. after load event for venueId[%s]', venueId);
            //creating drag/drop events everytime a venue is displayed.
            //incorrect behavior.
            self.prepareCanvasForSeatSelection();
        })
        .fail(function (xhr, status, error) {
            bootbox.alert(error);
        })
        .always(function () {
            self.showLoading(false);
        });
    }

    , scrollToVenue: function (venueId) {
        var grid = $(Venues.fn.venueGrid.selector).data('kendoGrid');
        var row = grid.dataSource.get(venueId);
        if (Venues.fn.itemExistAndNotNull(row)) {
            var uid = row.uid;
            var content = $('.k-grid-content');

            grid.clearSelection();
            var rowSelector = "tr[data-uid='" + uid + "']";
            grid.select(rowSelector);
            content.scrollTop(0);
            content.scrollTop($(rowSelector).offset().top - content.offset().top);
            //var scrollPos = Number(sessionStorage.getItem('venueGrid_scrollPosition'));

            //if(scrollPos >= 0) content.scrollTop(scrollPos);
            
        }
    }

    , afterNewVenueAction: function (rowCount) {
        console.log('[afterNewVenueAction] rowCount[%s]', rowCount);
        //rowCount is used to check that the dataSource has data
        //because the dataBound event trigger before the dataSource has data.
        if (rowCount > 0) {
            var venueId = $('#venueId').val();
            var venueName = $('#venueName').val();
            if (venueId !== '') {
                $('#venueId').val('');
                Venues.fn.scrollToVenue(venueId);
                Venues.fn.displayVenue(venueId, venueName);
            }
        }
    }

    , displayVenueOnLoad: function (rowCount) {
        console.log('[displayVenueOnLoad]')
        if($('#venueId').val() !== ''){
            Venues.fn.afterNewVenueAction(rowCount);
        }
        else {
            Venues.fn.showFirstVenueInGrid();
        }
    }
    //#endregion

    //#region Printing
    , printEvents: function () {
        //Zoom in seatting chart
        $('#zoomIn').click(function () {
            var step = slider.slider("option", "step");
            var value = slider.slider("value") + step;
            slider.slider('value', value);
            if (value <= 3) {
                //                zoom(1.25);
                zoom('@ViewBag.zoomInValue');
            }
        });

        //Zoom out seatting chart
        $('#zoomOut').click(function () {
            var step = slider.slider("option", "step");
            var value = slider.slider("value") - step;
            slider.slider('value', value);
            if (value >= 0) {
                //                zoom(.8);
                zoom('@ViewBag.zoomOutValue');
            }
        });
    }

    , getQueryString: function () {
        var result = {}, queryString = location.search.substring(1);
        var re = /([^&=]+)=([^&]*)/g;
        var m;

        while (m = re.exec(queryString)) {
            result[decodeURIComponent(m[1])] = decodeURIComponent(m[2]);
        }

        return result;
    }

    , printAction: function () {
        var self = this;
        var venueId = sessionStorage.getItem('venuesVenueId');
        if (self.selectedSeatprint.length > 0) {
            console.log('[printAction]');
            console.log(self.selectedSeatprint);
            self.printSelectedSeats(venueId, self.selectedSeatprint);
        }
        else {
            //self.printVenue(venueId);
            self.printSelectedSeats(venueId, '');
        }
    }

    , print: function (url, params) {
        var self = this;
        $.post(url, params, function (html) {

            //$('#SVGPrint').html(data);
            //var content = document.getElementById("SVGPrint");
            var popupWin = window.open('', '_blank', '');
            popupWin.document.open();
            popupWin.document.write('<html><head><title>Print EventBuilder Venue</title></head><body><div id="seatingChart" style="width:100%; height:100%;">' + html+'</div>');
            popupWin.document.write('<script src="/Scripts/jquery-1.11.2.js"></script>');
            popupWin.document.write('<script src="/Scripts/SeattingChart/SVGzoom.js"></script></body></html>');
                     
            popupWin.document.close();
        })
        .fail(function (xhr, status, error) {
            bootbox.alert({ title: 'Venue Print Error', message: error });
        })
        .always(function () {
            self.showLoading(false);
        });
    }

    , printVenue: function (venueId) {
        var self = this;
        self.print(self.urls.Print, { venueId: venueId });

    }

    , printSelectedSeats: function (venueId, selectedIds) {
        var self = this;
        var params = { venueId: venueId, seatIds: selectedIds.toString() };
        self.print(self.urls.PrintSelectedSeats, params);
    }
    //#endregion

    , prepareCanvasForSeatSelection: function () {
        var self = this;

        //In order to bind the drag-n-drop events to a more specific
        //element, needed to check if groupselectON was set to true
        //otherwise that element would disappear.
        //$('#venueSvg')
        $(document)
        .drag("start", function (ev, dd) {
            //venues loaded when the page loads this value is stays false after the print selection button is clicked.
            //self.groupselectON = sessionStorage.getItem('groupselectONDragOFF') === "true";
            if (!self.isPanEnabled()) {
                console.log('start.drag groupselectON[' + self.groupselectON + ']');
                return $('<div class="selection"/>')
                    .css('opacity', .65)
                    .appendTo(document.body);
            }

        }, { distance: 25 })
        .drag(function (ev, dd) {
            //console.log('.drag ev.pageY[' + ev.pageY + '], dd.startY[' + ev.pageY + ']');
            if (!self.isPanEnabled()) {
                $(dd.proxy).css({
                    top: Math.min(ev.pageY, dd.startY),
                    left: Math.min(ev.pageX, dd.startX),
                    height: Math.abs(ev.pageY - dd.startY),
                    width: Math.abs(ev.pageX - dd.startX)
                });
            }
        })
        .drag("end", function (ev, dd) {

            if (!self.isPanEnabled()) {
                console.log('drag.end');
                $(dd.proxy).remove();
            }
        });

        $(".drop")
            .drop("start", function () {
                //console.log('drop.start');
                var id = $(this).attr('id');
                if (id != null || id != undefined) {
                    if (id.indexOf("L") === -1 && id.indexOf("T") === -1)
                        document.getElementById(id).setAttribute("style", "stroke:RED;stroke-width:3;fill:#CCCCFF;");
                    else if (id.indexOf('L') >= 0 || id.indexOf('T') >= 0) {
                        self.originalLabelStyle = document.getElementById(id).getAttribute('style');
                        document.getElementById(id).setAttribute('style', self.originalLabelStyle.replace(/fill:#\w*;/, 'fill:RED;'));
                    }
                }
            })
        .drop(function (ev, dd) {
            //this.setAttributeNS(null, "style", "stroke:RED;stroke-width:3;fill:#CCCCFF;");
        })
        .drop("end", function () {
            var seat_name;
            //console.log('drop.end');
            //console.log('drop end localName [%s]',this.localName);
            selectedId = $(this).attr('id');
            self.handleSeatSelection(selectedId);
        });

        $.drop({
            multi: true
        });
    }

    //#region Seat Selection Helper Functions
    , handleSeatSelection: function (selectedId) {
        var self = this;
        var seatId;
        var seatIdParts;
        if (selectedId != null && typeof (selectedId) != undefined) {
            seatIdParts = selectedId.split("_");
            seatId = seatIdParts !== null && typeof (seatIdParts) !== 'undefined' && seatIdParts.length > 1 ? seatIdParts[1] : null;

            if (selectedId.indexOf("L") === -1 && selectedId.indexOf("T") === -1) {
                if ($.inArray(seatId, self.selectedSeatprint) < 0) {
                    if (seatId != null || seatId != undefined) {
                        self.selectedSeatprint.push(seatId);
                        //selectedSeatprint = self.eliminateDuplicates(selectedSeatprint);
                        document.getElementById(selectedId).setAttribute("style", "stroke:BLUE;stroke-width:3;");
                    }
                }
                else {
                    seat_name = "seat_" + seatId;
                    console.log('remove %s', seat_name);
                    document.getElementById(seat_name).setAttribute("style", "stroke:BLACK;stroke-width:1;");
                    self.removeItems(self.selectedSeatprint, seatId);
                }
            }
            else if (selectedId.indexOf("L") === -1 || selectedId.indexOf("T") === -1) {
                if ($.inArray(seatId, self.selectedSeatprint) < 0) {
                    self.selectedSeatprint.push(seatId);
                    //selectedSeatprint = self.eliminateDuplicates(selectedSeatprint);
                    var style;
                    if (self.originalLabelStyle === "")
                        self.originalLabelStyle = document.getElementById(selectedId).getAttribute('style');

                    document.getElementById(selectedId).setAttribute("style", self.originalLabelStyle.replace(/fill:#\w*;/, 'fill:blue'));
                }
                else {
                    document.getElementById(selectedId).setAttribute("style", self.originalLabelStyle);
                    self.removeItems(self.selectedSeatprint, seatId);
                }
            }
        }
    }

    , eliminateDuplicates: function (arr) {
        var i,
      len = arr.length,
      out = [],
      obj = {};

        for (i = 0; i < len; i++) {
            obj[arr[i]] = 0;
        }
        for (i in obj) {
            out.push(i);
        }
        return out;
    }

    , removeItems: function (array, item) {
        var i = 0;
        while (i < array.length) {
            if (array[i] == item) {
                array.splice(i, 1);
            } else {
                i++;
            }
        }
        return array;
    }

    , clearSelectedSeats: function () {
        var self = this;
        var count = self.selectedSeatprint.length;
        var item = '';
        console.log('[clearSelectedSeats] count[%s] ', count);
        console.log(self.selectedSeatprint);
        for (var i = 0; i < count; i++) {
            item = self.selectedSeatprint[0];
            if (typeof (item) === 'undefined' || item === null) { console.log('item at index %s is %s', i, item); continue; }

            if (item.indexOf("L") >= 0 || item.indexOf("T") >= 0) {
                var label = "lbl_" + item;
                console.log('  index[%s], labelID[%s], style[%s]', i, label, self.originalLabelStyle);
                
                document.getElementById(label).setAttribute("style", self.originalLabelStyle);
                self.removeItems(self.selectedSeatprint, item);
            }
            else {
                var seat_name = "seat_" + item;
                console.log('  index[%s], seatID[%s]', i, seat_name);
                document.getElementById(seat_name).setAttribute("style", "stroke:BLACK;stroke-width:1;");
                self.removeItems(self.selectedSeatprint, item);
            }
        }
    }
    //#endregion
});

$(function () {
    $('a[data-name^="menu"].btn-success').removeClass('btn-success').addClass('btn-primary');
    $('a[data-name$="venues"]').removeClass('btn-primary').addClass('btn-success');
    //sessionStorage.removeItem("canDeactivateEvent");
    var venue = new Venues();
    sessionStorage.setItem('venueGrid_scrollPosition', 0);
    //sessionStorage.setItem("groupselectONDragOFF", false);
    venue.loadInitialGrid(true);
    venue.initEvents();
    venue.setgridtoolbar();

    $('#body').css('overflow', 'hidden');

    $('.sortsearchWrapper').css({ 'left': '450px', 'width': '100%' });
});



