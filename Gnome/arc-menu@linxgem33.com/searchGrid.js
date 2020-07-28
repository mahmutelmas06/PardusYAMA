/*
 * Arc Menu - A traditional application menu for GNOME 3
 *
 * Arc Menu Lead Developer
 * Andrew Zaech https://gitlab.com/AndrewZaech
 * 
 * Arc Menu Founder/Maintainer/Graphic Designer
 * LinxGem33 https://gitlab.com/LinxGem33
 * 
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 2 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

const Me = imports.misc.extensionUtils.getCurrentExtension();
const {Clutter, Gio, GLib, GObject, Shell, St } = imports.gi;
const AppDisplay = imports.ui.appDisplay;
const appSys = Shell.AppSystem.get_default();
const Constants = Me.imports.constants;
const Gettext = imports.gettext.domain(Me.metadata['gettext-domain']);
const MW = Me.imports.menuWidgets;
const PopupMenu = imports.ui.popupMenu;
const RemoteSearch = imports.ui.remoteSearch;
const Signals = imports.signals;
const SystemActions = imports.misc.systemActions;
const Utils =  Me.imports.utils;
const _ = Gettext.gettext;

const SEARCH_PROVIDERS_SCHEMA = 'org.gnome.desktop.search-providers';

var MAX_LIST_SEARCH_RESULTS_ROWS = 6;
var MAX_APPS_SEARCH_RESULTS_ROWS = 6;
const gnome36 = imports.misc.config.PACKAGE_VERSION >= '3.35.0';

var ListSearchResult = class ArcMenu_ListSearchResultGrid {
    constructor(provider, metaInfo, resultsView) {
           this.provider = provider;
        this._button= resultsView._button;
        this.metaInfo = metaInfo;
        this._resultsView = resultsView;
        this._settings = this._button._settings;
        this.app = appSys.lookup_app(this.metaInfo['id']);
        if(this.provider.id =='org.gnome.Nautilus.desktop')
            this.menuItem = new MW.SearchResultItem(this._button, appSys.lookup_app(this.provider.id), this.metaInfo['description']);
        else if(this.app)
            this.menuItem = new MW.SearchResultItem(this._button,this.app); 
        else
            this.menuItem =  new MW.SearchResultItem(this._button); 

        this.menuItem.connect('activate', this.activate.bind(this));

        this._termsChangedId = 0;
        this.menuItem.actor.style =  "border-radius:4px;";
        this.layout = this._settings.get_enum('menu-layout');
        let ICON_SIZE = 32;
        if(this.layout == Constants.MENU_LAYOUT.Elementary || this.layout == Constants.MENU_LAYOUT.UbuntuDash){
            ICON_SIZE = 32;
        }
        else {
            ICON_SIZE = 24;
        } 
        
        // An icon for, or thumbnail of, content
        let icon = this.metaInfo['createIcon'](ICON_SIZE);
        if(icon) 
            this.menuItem.actor.add_child(icon);
        else
            this.menuItem.actor.style = (ICON_SIZE==32) ?  "border-radius:4px; padding: 12px 0px;":  "padding: 9px 0px;";

        this.label = new St.Label({ 
            text: this.metaInfo['name'],
            y_align: Clutter.ActorAlign.CENTER 
        });
        if(this._settings.get_boolean('krunner-show-details') && this.layout == Constants.MENU_LAYOUT.Raven){
            this.menuItem.actor.style = "height:40px";
            this.label.style = "font-weight: bold;";

            let descriptionBox = new St.BoxLayout({
                vertical:true
            });
            if(icon) 
                icon.icon_size = 32;
            
            let text = this.metaInfo['description'] ? this.metaInfo['description'] : '';
            if(text == '')
                text = this.app.get_description() ? this.app.get_description() : '';
                this.label.y_expand = true;
            let descriptionLabel = new St.Label({ 
                text: text,
                x_align: Clutter.ActorAlign.START,
                x_expand: true,
                y_align: Clutter.ActorAlign.CENTER 
            });

            descriptionBox.add(this.label);                           
            descriptionBox.add(descriptionLabel);

            this.menuItem.actor.add_child(descriptionBox);
        }
        else if(this.layout == Constants.MENU_LAYOUT.Raven){
            this.menuItem.actor.style = null;
            this.menuItem.actor.add_child(this.label);
        }
        else{
            this.menuItem.actor.add_child(this.label);
        }
        
        this.menuItem.actor.connect('notify::hover', this._onHover.bind(this));
        if (this.metaInfo['description']&&  this.provider.appInfo.get_name() == "Calculator") {
            this.label.text = this.metaInfo['name'] + "   " + this.metaInfo['description'];
        }
    }
    _onHover(){
        if(this.menuItem.tooltip==undefined && this.menuItem.actor.hover){
            let description = this.app ? this.app.get_description() : this.metaInfo['description'];
            Utils.createTooltip(this._button, this.menuItem, this.label, description);
        }
    }
    activate() {
        this.emit('activate', this.metaInfo.id);
    }
    _highlightTerms() {
        let markup = this._resultsView.highlightTerms(this.metaInfo['description'].split('\n')[0]);
        this._descriptionLabel.clutter_text.set_markup(markup);
    }

};Signals.addSignalMethods(ListSearchResult.prototype);

var AppSearchResult = class  ArcMenu_AppSearchResultGrid {
    constructor(provider, metaInfo, resultsView) {
               this.provider = provider;
        this._button= resultsView._button;
        this.metaInfo = metaInfo;
        this._resultsView = resultsView;
        this._settings = this._button._settings;
        this.layout = this._settings.get_enum('menu-layout');
        this.app = appSys.lookup_app(this.metaInfo['id']);
        if(this.app){
            this.menuItem = new MW.ApplicationMenuIcon(this._button, this.app);
        }
        else{
            let ICON_SIZE = 16;
            this.menuItem = new MW.SearchResultItem(this._button); 
            this.menuItem.actor.vertical = true;
            if(this.layout == Constants.MENU_LAYOUT.Elementary || this.layout == Constants.MENU_LAYOUT.UbuntuDash){
                this.menuItem.actor.style ='border-radius:4px; padding: 5px; spacing: 0px; width:95px; height:95px;';
                ICON_SIZE = 52;
            }
            else {
                this.menuItem.actor.style ='border-radius:4px; padding: 5px; spacing: 0px; width:80px;height:80px;';
                ICON_SIZE = 36;
            } 
            this._iconBin = new St.Bin({
                y_align: St.Align.END,
                x_align: gnome36 ? Clutter.ActorAlign.CENTER : St.Align.MIDDLE
            });

            this.icon = this.metaInfo['createIcon'](ICON_SIZE);
            this._iconBin.set_child(this.icon);    
           
            if (this.icon) {
                this.menuItem.actor.add_child(this._iconBin);
            } 
            else{
                if(this.layout == Constants.MENU_LAYOUT.Elementary || this.layout == Constants.MENU_LAYOUT.UbuntuDash){
                    this.menuItem.actor.style = "border-radius:4px; padding: 25px 0px;";
                }
                else {
                    this.menuItem.actor.style = "border-radius:4px; padding: 20px 0px;";
                }
            } 
            
            this.label = new St.Label({
                text: this.metaInfo['name'],
                y_expand: false,
                y_align: St.Align.END,
                x_align: St.Align.END
            });
            this.menuItem.actor.add_child(this.label);
            this.menuItem.actor.connect('notify::hover', this._onHover.bind(this));
            this.menuItem.connect('activate', this.activate.bind(this));
        }
       
    }
    _onHover(){
        if(this.menuItem.tooltip==undefined && this.menuItem.actor.hover){
            let description = this.app ? this.app.get_description() : this.metaInfo['description'];
            Utils.createTooltip(this._button, this.menuItem, this.label, description);
        }
    }
    activate() {
        this.emit('activate', this.metaInfo.id);
    }

};Signals.addSignalMethods(AppSearchResult.prototype);
var SearchResultsBase = class ArcMenu_SearchResultsBaseGrid{
    constructor(provider, resultsView) {
        this.provider = provider;
        this._resultsView = resultsView;
        this._button= resultsView._button;
        this._terms = [];

        this.actor = new St.BoxLayout({
            vertical: true 
        });

        this._resultDisplayBin = new St.Bin();
        this.actor.add(this._resultDisplayBin);

        this._resultDisplays = {};

        this._clipboard = St.Clipboard.get_default();

        this._cancellable = new Gio.Cancellable();
        this.actor.connect('destroy', this._onDestroy.bind(this));
    }

    _onDestroy() {
        this._terms = [];
    }

    _createResultDisplay(meta) {
        if (this.provider.createResultObject)
            return this.provider.createResultObject(meta, this._resultsView);
        
        return null;
    }

    clear() {
        this._cancellable.cancel();
        this._clearResultDisplay();
        this.actor.hide();
        for (let resultId in this._resultDisplays)
            this._resultDisplays[resultId].menuItem.destroy();
        this._resultDisplays = {};
    }

    _keyFocusIn(actor) {
        this.emit('key-focus-in', actor);
    }

    _activateResult(result, id) {
        if(this.provider.activateResult){
            this.provider.activateResult(id, this._terms);
            if (result.metaInfo.clipboardText)
                this._clipboard.set_text(St.ClipboardType.CLIPBOARD, result.metaInfo.clipboardText);
            this._button.leftClickMenu.toggle();
        }
        else{
            this._button.leftClickMenu.toggle();
            if (id.endsWith('.desktop')) {
                let app = appSys.lookup_app(id);
                app.open_new_window(-1);
            }
            else
                SystemActions.getDefault().activateAction(id);
        }
    }

    _setMoreCount(count) {
    }

    _ensureResultActors(results, callback) {
        let metasNeeded = results.filter(
            resultId => this._resultDisplays[resultId] === undefined
        );

        if (metasNeeded.length === 0) {
            callback(true);
        } else {
            this._cancellable.cancel();
            this._cancellable.reset();

            this.provider.getResultMetas(metasNeeded, metas => {
                if (this._cancellable.is_cancelled()) {
                    if (metas.length > 0)
                        log(`Search provider ${this.provider.id} returned results after the request was canceled`);
                    callback(false);
                    return;
                }
                if (metas.length != metasNeeded.length) {
                    log('Wrong number of result metas returned by search provider ' + this.provider.id +
                        ': expected ' + metasNeeded.length + ' but got ' + metas.length);
                    callback(false);
                    return;
                }
                if (metas.some(meta => !meta.name || !meta.id)) {
                    log('Invalid result meta returned from search provider ' + this.provider.id);
                    callback(false);
                    return;
                }

                metasNeeded.forEach((resultId, i) => {
                    let meta = metas[i];                    
                    let display = this._createResultDisplay(meta);
                    display.connect('activate', this._activateResult.bind(this));
                    display.menuItem.connect('key-focus-in', this._keyFocusIn.bind(this));
                    this._resultDisplays[resultId] = display;
                });
                callback(true);
            }, this._cancellable);
        }
    }

    updateSearch(providerResults, terms, callback) {
        this._terms = terms;
        if (providerResults.length == 0) {
            this._clearResultDisplay();
            this.actor.hide();
            callback();
        } else {
            let maxResults = this._getMaxDisplayedResults();
            let results = this.provider.filterResults(providerResults, maxResults);
            let moreCount = Math.max(providerResults.length - results.length, 0);

            this._ensureResultActors(results, successful => {
                if (!successful) {
                    this._clearResultDisplay();
                    callback();
                    return;
                }

                // To avoid CSS transitions causing flickering when
                // the first search result stays the same, we hide the
                // content while filling in the results.
                this.actor.hide();
                this._clearResultDisplay();
                results.forEach(resultId => {
                    this._addItem(this._resultDisplays[resultId]);
                });
               
                this._setMoreCount(this.provider.canLaunchSearch ? moreCount : 0);
                this.actor.show();
                callback();
            });
        }
    }
};

var ListSearchResults = class ArcMenu_ListSearchResultsGrid extends SearchResultsBase {
    constructor(provider, resultsView) {
        super(provider, resultsView);
        this._button = resultsView._button;
        this._settings = this._button._settings;
        this.layout = this._settings.get_enum('menu-layout');
        this._container = new St.BoxLayout({
            vertical: false,
            x_align: St.Align.START 
        });

        if(this.layout == Constants.MENU_LAYOUT.Raven){
            this._container.vertical = true;
            this._container.style = null;
        }
        else{
            this._container.style = "padding: 10px;";
        }
        
        this.providerInfo = new ArcSearchProviderInfo(provider,this._button);
        this.providerInfo.connect('key-focus-in', this._keyFocusIn.bind(this));
        this.providerInfo.connect('activate', () => {
            this.providerInfo.animateLaunch();
            provider.launchSearch(this._terms);
            this._button.leftClickMenu.toggle();
        });
        this._container.add(this.providerInfo.actor, { 
            x_fill: true,
            y_fill: false,
            x_align: St.Align.START,
            y_align: St.Align.START,
            x_expand:true 
        });

        this._content = new St.BoxLayout({
            vertical: true 
        });

        this._container.add(this._content, { 
            expand: true
        });
  
        this._resultDisplayBin.set_child(this._container);
        this._resultDisplayBin.x_expand = true;
        this._resultDisplayBin.x_fill = true;
    }

    _setMoreCount(count) {
        this.providerInfo.setMoreCount(count);
    }

    _getMaxDisplayedResults() {
        return MAX_LIST_SEARCH_RESULTS_ROWS;
    }

    _clearResultDisplay() {
        this._content.remove_all_children();
    }

    _createResultDisplay(meta) {
        return super._createResultDisplay(meta, this._resultsView) ||
               new ListSearchResult(this.provider, meta, this._resultsView);
    }
    _addItem(display) {
        this._content.add_actor(display.menuItem.actor);
    }

    getFirstResult() {
        if (this._content.get_n_children() > 0)
            return this._content.get_child_at_index(0)._delegate;
        else
            return null;
    }
    destroy(){
        this._resultDisplayBin.destroy();
        this._resultDisplayBin = null;
    }
};
Signals.addSignalMethods(ListSearchResults.prototype);
var AppSearchResults = class ArcMenu_AppSearchResultsGrid extends SearchResultsBase {
      constructor(provider, resultsView) {
        super(provider, resultsView);
        this._parentContainer = resultsView.actor;
        this._grid = new St.BoxLayout({vertical: false});
        this._grid.style = "padding: 10px; spacing:10px;";        
        this._resultDisplayBin.set_child(this._grid);
        this._resultDisplayBin.x_align =  gnome36 ? Clutter.ActorAlign.CENTER : St.Align.MIDDLE
    }

    _getMaxDisplayedResults() {
         return MAX_APPS_SEARCH_RESULTS_ROWS;
    }

    _clearResultDisplay() {
        this._grid.remove_all_children();
    }
    
    _createResultDisplay(meta) {
        return  new AppSearchResult(this.provider, meta, this._resultsView);
    }

    _addItem(display) {
      this._grid.add_actor(display.menuItem.actor);
    }

    getFirstResult() {
          if (this._grid.get_n_children() > 0)
            return this._grid.get_child_at_index(0)._delegate;
        else
            return null;
    }
    destroy(){
        this._resultDisplayBin.destroy();
        this._resultDisplayBin = null;
    }
};
Signals.addSignalMethods(AppSearchResults.prototype);

var SearchResults = class ArcMenu_SearchResultsGrid {
    constructor(button) {
        this._button = button;
        this.layout = button._settings.get_enum('menu-layout');

        this.actor = new St.BoxLayout({
            vertical: true 
        });
        this.actor._delegate = this.actor;
        this._content = new St.BoxLayout({
            vertical: true 
        });

        this.actor.add(this._content);

        if(this.layout == Constants.MENU_LAYOUT.Elementary || this.layout == Constants.MENU_LAYOUT.UbuntuDash)
            MAX_APPS_SEARCH_RESULTS_ROWS = 6;
        else if(this.layout == Constants.MENU_LAYOUT.Raven)
            MAX_APPS_SEARCH_RESULTS_ROWS = 3;
        else 
            MAX_APPS_SEARCH_RESULTS_ROWS = 4; 

        this._statusText = new St.Label();

        this._statusBin = new St.Bin({ 
            x_align: gnome36 ? Clutter.ActorAlign.CENTER : St.Align.MIDDLE,
            y_align: gnome36 ? Clutter.ActorAlign.CENTER : St.Align.MIDDLE
        });

        if(button._settings.get_boolean('enable-custom-arc-menu'))
            this._statusText.add_style_class_name('arc-menu-status-text');
        else
            this._statusText.add_style_class_name('search-statustext');

        this.actor.add(this._statusBin);
        this._statusBin.add_actor(this._statusText);

        this._highlightDefault = false;
        this._defaultResult = null;
        this._startingSearch = false;

        this._terms = [];
        this._results = {};

        this._providers = [];

        this._highlightRegex = null;

        this._searchSettings = new Gio.Settings({ schema_id: SEARCH_PROVIDERS_SCHEMA });
        this.disabledID = this._searchSettings.connect('changed::disabled', this._reloadRemoteProviders.bind(this));
        this.enabledID =  this._searchSettings.connect('changed::enabled', this._reloadRemoteProviders.bind(this));
        this.disablExternalID = this._searchSettings.connect('changed::disable-external', this._reloadRemoteProviders.bind(this));
        this.sortOrderID = this._searchSettings.connect('changed::sort-order', this._reloadRemoteProviders.bind(this));

        this._searchTimeoutId = 0;
        this._cancellable = new Gio.Cancellable();

        this._registerProvider(new AppDisplay.AppSearchProvider());

        this.installChangedID = appSys.connect('installed-changed', this._reloadRemoteProviders.bind(this));

        this._reloadRemoteProviders();
    }
    setStyle(style){
        if(this._statusText)
            this._statusText.style_class = style;
    }
    destroy(){
        if (this._searchTimeoutId > 0) {
            GLib.source_remove(this._searchTimeoutId);
            this._searchTimeoutId = 0;
        }
        if(this.disabledID>0){
            this._searchSettings.disconnect(this.disabledID);
            this.disabledID=0;
        }
        if(this.enabledID>0){
            this._searchSettings.disconnect(this.enabledID);
            this.enabledID=0;
        }
        if(this.disablExternalID>0){
            this._searchSettings.disconnect(this.disablExternalID);
            this.disablExternalID=0;
        }
        if(this.sortOrderID>0){
            this._searchSettings.disconnect(this.sortOrderID);
            this.sortOrderID=0;
        }
        if(this.installChangedID>0){
            appSys.disconnect(this.installChangedID);
            this.installChangedID=0;
        }     
        this._providers.forEach(provider => {
            provider.display.destroy();
        });   
    }
    _reloadRemoteProviders() {
        let remoteProviders = this._providers.filter(p => p.isRemoteProvider);
        remoteProviders.forEach(provider => {
            this._unregisterProvider(provider);
        });

        RemoteSearch.loadRemoteSearchProviders(this._searchSettings, providers => {
            providers.forEach(this._registerProvider.bind(this));
        });
    }

    _registerProvider(provider) {
        provider.searchInProgress = false;
        this._providers.push(provider);
        this._ensureProviderDisplay(provider);
    }

    _unregisterProvider(provider) {
        let index = this._providers.indexOf(provider);
        this._providers.splice(index, 1);

        if (provider.display){
            provider.display.actor.destroy();
        }
    }

    _gotResults(results, provider) {
        this._results[provider.id] = results;
        this._updateResults(provider, results);
    }

    _clearSearchTimeout() {
        if (this._searchTimeoutId > 0) {
            GLib.source_remove(this._searchTimeoutId);
            this._searchTimeoutId = 0;
        }
    }

    _reset() {
        this._terms = [];
        this._results = {};
        this._clearDisplay();
        this._clearSearchTimeout();
        this._defaultResult = null;
        this._startingSearch = false;

        this._updateSearchProgress();
    }

    _doSearch() {
        this._startingSearch = false;

        let previousResults = this._results;
        this._results = {};

        this._providers.forEach(provider => {
            provider.searchInProgress = true;

            let previousProviderResults = previousResults[provider.id];
            if (this._isSubSearch && previousProviderResults)
                provider.getSubsearchResultSet(previousProviderResults,
                                               this._terms,
                                               results => {
                                                   this._gotResults(results, provider);
                                               },
                                               this._cancellable);
            else
                provider.getInitialResultSet(this._terms,
                                             results => {
                                                 this._gotResults(results, provider);
                                             },
                                             this._cancellable);
        });

        this._updateSearchProgress();

        this._clearSearchTimeout();
    }

    _onSearchTimeout() {
        this._searchTimeoutId = 0;
        this._doSearch();
        return GLib.SOURCE_REMOVE;
    }

    setTerms(terms) {
        // Check for the case of making a duplicate previous search before
        // setting state of the current search or cancelling the search.
        // This will prevent incorrect state being as a result of a duplicate
        // search while the previous search is still active.
        let searchString = terms.join(' ');
        let previousSearchString = this._terms.join(' ');
        if (searchString == previousSearchString)
            return;

        this._startingSearch = true;

        this._cancellable.cancel();
        this._cancellable.reset();

        if (terms.length == 0) {
            this._reset();
            return;
        }

        let isSubSearch = false;
        if (this._terms.length > 0)
            isSubSearch = searchString.indexOf(previousSearchString) == 0;

        this._terms = terms;
        this._isSubSearch = isSubSearch;
        this._updateSearchProgress();

        if (this._searchTimeoutId == 0)
            this._searchTimeoutId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 150, this._onSearchTimeout.bind(this));

        let escapedTerms = this._terms.map(term => Shell.util_regex_escape(term));
        this._highlightRegex = new RegExp(`(${escapedTerms.join('|')})`, 'gi');
     
        this.emit('terms-changed');
    }


    _ensureProviderDisplay(provider) {
        if (provider.display)
            return;

        let providerDisplay;
        if (provider.appInfo)
      
            providerDisplay = new ListSearchResults(provider, this);
        else
            providerDisplay = new AppSearchResults(provider, this);
        providerDisplay.actor.hide();
        this._content.add(providerDisplay.actor);
        provider.display = providerDisplay;
    }

    _clearDisplay() {
        this._providers.forEach(provider => {
            provider.display.clear();
        });
    }

    _maybeSetInitialSelection() {
        let newDefaultResult = null;

        let providers = this._providers;
        for (let i = 0; i < providers.length; i++) {
            let provider = providers[i];
            let display = provider.display;

            if (!display.actor.visible)
                continue;

            let firstResult = display.getFirstResult();
            if (firstResult) {
                newDefaultResult = firstResult;
                break; // select this one!
            }
        }

        if (newDefaultResult != this._defaultResult) {
            this._setSelected(this._defaultResult, false);
            this._setSelected(newDefaultResult, this._highlightDefault);

            this._defaultResult = newDefaultResult;
        }
    }

    get searchInProgress() {
        if (this._startingSearch)
            return true;

        return this._providers.some(p => p.searchInProgress);
    }

    _updateSearchProgress() {
        let haveResults = this._providers.some(provider => {
            let display = provider.display;
            return (display.getFirstResult() != null);
        });

        this._statusBin.visible = !haveResults;

        if (!haveResults) {
            if (this.searchInProgress) {
                this._statusText.set_text(_("Searching..."));
            } else {
                this._statusText.set_text(_("No results."));
            }
        }
    }

    _updateResults(provider, results) {
        let terms = this._terms;
        let display = provider.display;
        display.updateSearch(results, terms, () => {
            provider.searchInProgress = false;

            this._maybeSetInitialSelection();
            this._updateSearchProgress();
        });
    }

    highlightDefault(highlight) {
        this._highlightDefault = highlight;
        this._setSelected(this._defaultResult, highlight);
    }

    getTopResult(){
        return this._defaultResult;
    }
    
    _setSelected(result, selected) {
        if (!result || result === undefined || result === null)
            return;
        if (selected) {
            result.actor.add_style_class_name('selected');
        } else {
            result.actor.remove_style_class_name('selected');
        }
    }

    highlightTerms(description) {
        if (!description)
            return '';

        if (!this._highlightRegex)
            return description;

        return description.replace(this._highlightRegex, '<b>$1</b>');
    }
};
Signals.addSignalMethods(SearchResults.prototype);

var ArcSearchProviderInfo =Utils.createClass({
    Name: 'ArcMenu_ArcSearchProviderInfoGrid',
    Extends: PopupMenu.PopupBaseMenuItem, 
    _init(provider,button) {
        this.callParent('_init');
        this.provider = provider;
        this._button = button;
        this._settings = button._settings;
        this.layout = button._settings.get_enum('menu-layout');

        this._content = new St.BoxLayout({ 
            vertical: false 
        });
        this._content.style = "spacing: 5px;";

        let icon = new St.Icon({ 
            icon_size: 32,
            gicon: provider.appInfo.get_icon() 
        });
        this._content.add_actor(icon);

        if(this.layout == Constants.MENU_LAYOUT.Elementary || this.layout == Constants.MENU_LAYOUT.UbuntuDash){
            this.actor.style = "border-radius:4px; spacing: 0px; width: 190px;";
            icon.icon_size = 32;
        }
        if(this.layout == Constants.MENU_LAYOUT.Raven){
            icon.icon_size = 24;
            this._content.style = "spacing: 12px;";
        }
        else{
            this.actor.style = "border-radius:4px; spacing: 0px; width: 150px;";
            icon.icon_size = 24;
        } 
        this.nameLabel = new St.Label({ 
            text: provider.appInfo.get_name() + ":",
            x_align: Clutter.ActorAlign.START,
            y_align: Clutter.ActorAlign.CENTER
        });
        if(this._settings.get_boolean('krunner-show-details') && this.layout == Constants.MENU_LAYOUT.Raven){
            this.actor.style = "height:40px";
            this.nameLabel.style = 'font-weight: bold;';
            let box = new St.BoxLayout({vertical:true});
            icon.icon_size = 32;
            let text = provider.appInfo.get_description() != null ? provider.appInfo.get_description() : '';

            let descriptionLabel = new St.Label({ 
                text: text,
                x_align: Clutter.ActorAlign.START,
                y_align: Clutter.ActorAlign.CENTER,
                x_expand: true
            });
            this.nameLabel.y_expand = true;
            box.add(this.nameLabel);
            box.add(descriptionLabel);
            this._content.add_actor(box);
            this._content.remove_actor(icon);
        }
        else if(this.layout == Constants.MENU_LAYOUT.Raven){
            this.actor.style = "height:25px";
            this._content.remove_actor(icon);
            this._content.add_actor(this.nameLabel);
        }
        else{
            this._content.add_actor(this.nameLabel);
        }

        this.actor.vertical = false;
        this.actor.add_child(this._content);


        this._moreText="";
        
        
        this.hoverID = this.actor.connect('notify::hover', this._onHover.bind(this));
        this.actor.connect('notify::active',()=> this.setActive(this.actor.active, false));

        if(gnome36){
            this.connect('button-press-event', this._onButtonPressEvent.bind(this));
            this.connect('button-release-event', this._onButtonReleaseEvent.bind(this));
        }
    },
    _onHover() {
        if(this.actor.hover && this._button.newSearch._highlightDefault)
            this._button.newSearch.highlightDefault(false);
        if(this.tooltip==undefined && this.actor.hover){
            let description = this.provider.appInfo.get_description();
            Utils.createTooltip(this._button, this, this.nameLabel, description);
        }
    },
    animateLaunch() {
        let app = appSys.lookup_app(this.provider.appInfo.get_id());
    },

    setMoreCount(count) {
        this._moreText= ngettext("%d more", "%d more", count).format(count);
        if(count>0){
            if(this.layout == Constants.MENU_LAYOUT.Raven)
                this.nameLabel.text = this.provider.appInfo.get_name() + " ("+ this._moreText+")";
            else
                this.nameLabel.text = this.provider.appInfo.get_name() + "\n("+ this._moreText+")";
        }
            
    },
    _onButtonPressEvent(actor, event) {
        return Clutter.EVENT_PROPAGATE;
    },
    _onButtonReleaseEvent(actor, event) {
        if(event.get_button()==1){
            this.activate(event);
        }
        return Clutter.EVENT_STOP;
    },
    setActive(active, callParent = true){
        if(active){
            if(this._button.activeMenuItem && this._button.activeMenuItem != this)
                this._button.activeMenuItem.setFakeActive(false);
            this._button.activeMenuItem = this;
        }            
        else if(this._button.leftClickMenu.isOpen)
            this._button.activeMenuItem = null;
        if(callParent)
            this.callParent('setActive',active);
    },
    setFakeActive(active) {
        if (active) {
            this.actor.add_style_class_name('selected');
        } else {
            this.actor.remove_style_class_name('selected');
        }
    }
});
