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

// Import Libraries
const Me = imports.misc.extensionUtils.getCurrentExtension();

const {Clutter, Gdk, GLib, Gio, GMenu, Gtk, Shell, St} = imports.gi;
const appSys = Shell.AppSystem.get_default();
const ArcSearch = Me.imports.search;
const Constants = Me.imports.constants;
const GnomeSession = imports.misc.gnomeSession;
const Gettext = imports.gettext.domain(Me.metadata['gettext-domain']);
const Main = imports.ui.main;
const MenuLayouts = Me.imports.menulayouts;
const MW = Me.imports.menuWidgets;
const PlaceDisplay = Me.imports.placeDisplay;
const PopupMenu = imports.ui.popupMenu;
const Utils =  Me.imports.utils;
const _ = Gettext.gettext;

var modernGnome = imports.misc.config.PACKAGE_VERSION >= '3.31.9';
const RUNNER_WIDTH = 500;

var createMenu = class {
    constructor(mainButton) {
        this._button = mainButton;
        this._settings = mainButton._settings;
        this.mainBox = mainButton.mainBox; 
        this.appMenuManager = mainButton.appMenuManager;
        this._session = new GnomeSession.SessionManager();
        this.leftClickMenu  = mainButton.leftClickMenu;
        this.currentMenu = Constants.CURRENT_MENU.FAVORITES; 
        this._applicationsButtons = new Map();
        this.isRunning=true;
        this.shouldLoadFavorites = true;
        this.newSearch = new ArcSearch.SearchResults(this);     
        this._mainBoxKeyPressId = this.mainBox.connect('key-press-event', this._onMainBoxKeyPress.bind(this));
        
        this.mainBox.style = `max-height: 400px;`;       

        this.dummyCursor = new St.Widget({ width: 0, height: 0, opacity: 0 });
        Main.uiGroup.add_actor(this.dummyCursor);
        this.updateRunnerLocation();

        //store old leftClickMenu variables
        this.oldSourceActor = this.leftClickMenu.sourceActor;
        this.oldFocusActor = this.leftClickMenu.focusActor;
        this.oldArrowAlignment = this.leftClickMenu.actor._arrowAlignment;

        this.leftClickMenu.actor.style = "-arrow-base:0px;-arrow-rise:0px;";
        this.leftClickMenu.sourceActor = this.dummyCursor;
        this.leftClickMenu.focusActor = this.dummyCursor;
        this.leftClickMenu._boxPointer.setPosition(this.dummyCursor, 0.5);
        this.leftClickMenu.close();
        this.leftClickMenu._boxPointer.hide();

        this.mainBox.vertical = true;
        //Menus Left Box container
        this.topBox = new St.BoxLayout({
            vertical: false
        });
        this.topBox.style = "width: " + RUNNER_WIDTH + "px";
        // Create search box
        this.searchBox = new MW.SearchBox(this);
        this.searchBox.actor.style = "padding-top: 0.5em; padding-bottom: 0.5em;padding-left: 1em;padding-right: .5em;";
        this._firstAppItem = null;
        this._firstApp = null;
        this._tabbedOnce = false;
        this._searchBoxChangedId = this.searchBox.connect('changed', this._onSearchBoxChanged.bind(this));
        this._searchBoxKeyPressId = this.searchBox.connect('key-press-event', this._onSearchBoxKeyPress.bind(this));
        this._searchBoxKeyFocusInId = this.searchBox.connect('key-focus-in', this._onSearchBoxKeyFocusIn.bind(this));
        //Add search box to menu
        this.topBox.add(this.searchBox.actor, {
            expand: true,
            x_fill: true,
            y_fill: false,
            y_align: St.Align.START
        });
        //Add LeftBox to MainBox
        this.mainBox.add(this.topBox, {
            expand: true,
            x_fill: true,
            y_fill: true
        });
        this.arcMenuSettingsButton = new MW.ArcMenuSettingsButton( this);
        this.topBox.add(this.arcMenuSettingsButton.actor, {
            expand: false,
            x_fill: false,
            y_fill: false,
            y_align: St.Align.START,
            x_align: St.Align.CENTER
        });
        this.arcMenuSettingsButton.actor.style = "margin-right: .5em;";
        //Applications Box - Contains Favorites, Categories or programs
        this.applicationsScrollBox = new St.ScrollView({
            x_fill:true,
            y_fill: false,
            y_align: St.Align.START,
            x_align: St.Align.START,
            overlay_scrollbars: true,
            style_class: 'apps-menu vfade',
            reactive:true
        });      
        this.applicationsScrollBox.style = "width: " + RUNNER_WIDTH + "px";
        this.applicationsScrollBox.connect('key-press-event',(actor,event)=>{
            let key = event.get_key_symbol();
            if(key == Clutter.KEY_Up)
                this.scrollToItem(this.activeMenuItem,Constants.DIRECTION.UP);
            else if(key == Clutter.KEY_Down)
                this.scrollToItem(this.activeMenuItem,Constants.DIRECTION.DOWN);
        }) ;         
        this.applicationsScrollBox.set_policy(Gtk.PolicyType.NEVER, Gtk.PolicyType.AUTOMATIC);
        this.mainBox.add(this.applicationsScrollBox, {
            expand: true,
            x_fill: true,
            y_fill: true,
            y_align: St.Align.START
        });
        this.applicationsBox = new St.BoxLayout({ vertical: true });
        this.applicationsScrollBox.add_actor(this.applicationsBox);
        this.applicationsScrollBox.clip_to_allocation = true;


        this._display(); 
    }
    updateRunnerLocation(){
        this.leftClickMenu.actor.style = "-arrow-base:0px;-arrow-rise:0px;";
        this.leftClickMenu._boxPointer.setSourceAlignment(0.5);
        this.leftClickMenu._arrowAlignment = 0.5
        //Get screen, find monitor at point of menuButton, get that monitors geometry
        let screen = Gdk.Screen.get_default();
        let [x, y] = this._button._menuButtonWidget.actor.get_transformed_position();
        let currentMonitor = screen.get_monitor_at_point(x,y);
        
        let rect = screen.get_monitor_workarea(currentMonitor);
        //Position the runner menu in the center of the current monitor, at top of screen.
        let positionX = Math.round(rect.x + (rect.width / 2));
        let positionY = rect.y;
        if(this._settings.get_enum('runner-position') == 1)
            positionY = Math.round(rect.y + (rect.height / 2) - 125);
        this.dummyCursor.set_position(positionX,  positionY);

    }
    // Create the menu layout
    _createRightBox(){
    }
    updateIcons(){
        this.newSearch._reset();
    }
    resetSearch(){ 
        this.searchBox.clear();
        this.setDefaultMenuView();  
    }
    setDefaultMenuView(){
        this.searchBox.clear();
        this.newSearch._reset();
        this._clearApplicationsBox();
        let appsScrollBoxAdj = this.applicationsScrollBox.get_vscroll_bar().get_adjustment();
        appsScrollBoxAdj.set_value(0);
    }
    _redisplayRightSide(){
    }
    // Redisplay the menu
    _redisplay() {
        if (this.applicationsBox)
            this._clearApplicationsBox();
    }
    _reload() {
    }
    // Display the menu
    _display() {
    }
    updateStyle(){
        let addStyle=this._settings.get_boolean('enable-custom-arc-menu');
        if(this.newSearch){
            addStyle ? this.newSearch.setStyle('arc-menu-status-text') :  this.newSearch.setStyle('search-statustext'); 
            addStyle ? this.searchBox._stEntry.set_name('arc-search-entry') : this.searchBox._stEntry.set_name('search-entry');
        }
        addStyle ? this.arcMenuSettingsButton.actor.add_style_class_name('arc-menu-action') : this.arcMenuSettingsButton.actor.remove_style_class_name('arc-menu-action');
        this.leftClickMenu.actor.style = "-arrow-base:0px;-arrow-rise:0px;";
      
    }
    updateSearch(){
        this.newSearch._reloadRemoteProviders();
    }
    _loadCategories(){
    }
    _loadCategory(categoryId, dir) {
    }
    _displayCategories(){
    }
    _displayGnomeFavorites(){
    }
    // Load menu place shortcuts
    _displayPlaces() {
    }
    _loadFavorites() {
    }
    _displayFavorites() {
    }
    placesAddSeparator(id){
    }
    _redisplayPlaces(id) {
    }
    _createPlaces(id) {
    }   
    _setActiveCategory(){
    }
    // Clear the applications menu box
    _clearApplicationsBox() {
        let actors = this.applicationsBox.get_children();
        for (let i = 0; i < actors.length; i++) {
            let actor = actors[i];
            this.applicationsBox.remove_actor(actor);
        }
    }
    selectCategory(dir) {
    }
    _displayButtons(apps) {               
    }
    _displayAllApps(){        
    }
    _listApplications(category_menu_id) {
    }
    getShouldShowShortcut(shortcutName){
    }     
    _onSearchBoxKeyPress(searchBox, event) {
        let symbol = event.get_key_symbol();
        if (!searchBox.isEmpty() && searchBox.hasKeyFocus()) {
            if (symbol == Clutter.Up) {
                this.newSearch.getTopResult().actor.grab_key_focus();
            }
            else if (symbol == Clutter.Down) {
                this.newSearch.getTopResult().actor.grab_key_focus();
            }
        }
        return Clutter.EVENT_PROPAGATE;
    }
    _onSearchBoxKeyFocusIn(searchBox) {
        if (!searchBox.isEmpty()) {
            this.newSearch.highlightDefault(true);
        }
    }
    _onSearchBoxChanged(searchBox, searchString) {        
        if(searchBox.isEmpty()){  
            this.newSearch.setTerms(['']); 
            this.setDefaultMenuView();                     	          	
            this.newSearch.actor.hide();
        }            
        else{         
            this._clearApplicationsBox(); 
            this.applicationsBox.add(this.newSearch.actor,{
                expand: true,
                x_fill: true,
                y_fill: true,
                x_align: St.Align.MIDDLE,
                y_align: St.Align.MIDDLE
            }); 
            this.newSearch.highlightDefault(true);
            this.newSearch.actor.show();         
            this.newSearch.setTerms([searchString]);           	    
        }            	
    }
    // Scroll to a specific button (menu item) in the applications scroll view
    scrollToItem(button, direction) {
        if(button!=null){
            let appsScrollBoxAdj = this.applicationsScrollBox.get_vscroll_bar().get_adjustment();
            let catsScrollBoxAlloc = this.applicationsScrollBox.get_allocation_box();
            let boxHeight = catsScrollBoxAlloc.y2 - catsScrollBoxAlloc.y1;
            let[v, l, upper] = appsScrollBoxAdj.get_values();
            let currentScrollValue = appsScrollBoxAdj.get_value();
            let box = button.actor.get_allocation_box();
            let buttonHeight = box.y1 - box.y2;
    
            if(direction == Constants.DIRECTION.DOWN && currentScrollValue == 0){
                currentScrollValue=.01;
                appsScrollBoxAdj.set_value(currentScrollValue);
            }
            else if(direction == Constants.DIRECTION.UP && (currentScrollValue + boxHeight) == upper){
                currentScrollValue-=0.01;
                appsScrollBoxAdj.set_value(currentScrollValue);
            }
            else{
                direction == Constants.DIRECTION.UP ? buttonHeight = buttonHeight : buttonHeight = - buttonHeight;
                appsScrollBoxAdj.set_value(currentScrollValue + buttonHeight);
            }
        }
    }
    setCurrentMenu(menu){
        this.currentMenu = menu;
    }
    getCurrentMenu(){
        return this.currentMenu;
    } 
    _onMainBoxKeyPress(mainBox, event) {
        if (!this.searchBox) {
            return Clutter.EVENT_PROPAGATE;
        }
        if (event.has_control_modifier()) {
            if(this.searchBox)
                this.searchBox.grabKeyFocus();
            return Clutter.EVENT_PROPAGATE;
        }

        let symbol = event.get_key_symbol();
        let key = event.get_key_unicode();

        switch (symbol) {
            case Clutter.KEY_BackSpace:
                if(this.searchBox){
                    if (!this.searchBox.hasKeyFocus()) {
                        this.searchBox.grabKeyFocus();
                        let newText = this.searchBox.getText().slice(0, -1);
                        this.searchBox.setText(newText);
                    }
                }
                return Clutter.EVENT_PROPAGATE;
            case Clutter.KEY_Tab:
            case Clutter.KEY_KP_Tab:
            case Clutter.KEY_Up:
            case Clutter.KEY_Down:
            case Clutter.KEY_Left:
            case Clutter.KEY_Right:  
                return Clutter.EVENT_PROPAGATE;
            default:
                if (key.length != 0) {
                    if(this.searchBox){
                        this.searchBox.grabKeyFocus();
                        let newText = this.searchBox.getText() + key;
                        this.searchBox.setText(newText);
                    }
                }
        }
        return Clutter.EVENT_PROPAGATE;
    }
    destroy(){
        this.leftClickMenu.actor.style = null;
        this.leftClickMenu.sourceActor = this.oldSourceActor;
        this.leftClickMenu.focusActor = this.oldFocusActor;
        this.leftClickMenu._boxPointer.setPosition(this.oldSourceActor, this.oldArrowAlignment);
        this.leftClickMenu.close();
        this.leftClickMenu._boxPointer.hide();
        if(this.searchBox!=null){
            if (this._searchBoxChangedId > 0) {
                this.searchBox.disconnect(this._searchBoxChangedId);
                this._searchBoxChangedId = 0;
            }
            if (this._searchBoxKeyPressId > 0) {
                this.searchBox.disconnect(this._searchBoxKeyPressId);
                this._searchBoxKeyPressId = 0;
            }
            if (this._searchBoxKeyFocusInId > 0) {
                this.searchBox.disconnect(this._searchBoxKeyFocusInId);
                this._searchBoxKeyFocusInId = 0;
            }
            if (this._mainBoxKeyPressId > 0) {
                this.mainBox.disconnect(this._mainBoxKeyPressId);
                this._mainBoxKeyPressId = 0;
            }
        }
        if(this.newSearch){
            this.newSearch.destroy();
        }
        Main.uiGroup.remove_actor(this.dummyCursor);
        this.dummyCursor.destroy();
        this.isRunning=false;
    }
    //Create a horizontal separator
    _createHorizontalSeparator(style){
        let alignment = Constants.SEPARATOR_ALIGNMENT.HORIZONTAL;
        let hSep = new MW.SeparatorDrawingArea(this._settings,alignment,style,{
            x_expand:true,
            y_expand:false
        });
        hSep.queue_repaint();
        return hSep;
    }
    // Create a vertical separator
    _createVertSeparator(){    
        let alignment = Constants.SEPARATOR_ALIGNMENT.VERTICAL;
        let style = Constants.SEPARATOR_STYLE.NORMAL;
        this.vertSep = new MW.SeparatorDrawingArea(this._settings,alignment,style,{
            x_expand:true,
            y_expand:true,
            style_class: 'vert-sep'
        });
        this.vertSep.queue_repaint();
        return  this.vertSep;
    }
};

