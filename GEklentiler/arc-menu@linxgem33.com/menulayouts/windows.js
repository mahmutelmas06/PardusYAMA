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

const {Clutter, GLib, Gio, GMenu, Gtk, Shell, St} = imports.gi;
const appSys = Shell.AppSystem.get_default();
const ArcSearch = Me.imports.searchGrid;
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

var createMenu = class{
    constructor(mainButton) {
        this._button = mainButton;
        this._settings = mainButton._settings;
        this.mainBox = mainButton.mainBox; 
        this.appMenuManager = mainButton.appMenuManager;
        this.subMenuManager = mainButton.subMenuManager;
        this.leftClickMenu  = mainButton.leftClickMenu;
        this.currentMenu = Constants.CURRENT_MENU.FAVORITES; 
        this._applicationsButtons = new Map();
        this.shouldLoadFavorites = true;
        this._session = new GnomeSession.SessionManager();
        this.newSearch = new ArcSearch.SearchResults(this);      
        this._mainBoxKeyPressId = this.mainBox.connect('key-press-event', this._onMainBoxKeyPress.bind(this));
        this.isRunning=true;

        
        this._tree = new GMenu.Tree({ menu_basename: 'applications.menu' });
        this._treeChangedId = this._tree.connect('changed', ()=>{
            this.needsReload = true;
        });

        //LAYOUT------------------------------------------------------------------------------------------------
        this.mainBox.vertical = false;
        this.placesBox = new St.BoxLayout({
            vertical: true
        });
        this.placesTopBox = new St.BoxLayout({
            vertical: true
        });
        this.placesBottomBox = new St.BoxLayout({
            vertical: true
        });
        this.placesBox.add( this.placesTopBox, {
            expand: true,
            x_fill: false,
            y_fill: false,
            x_align: St.Align.START,
            y_align: St.Align.START
        });
        this.placesBox.add( this.placesBottomBox, {
            expand: true,
            x_fill: false,
            y_fill: false,
            x_align: St.Align.START,
            y_align: St.Align.END
        });
        this.placesBox.style = "margin: 0px 5px 0px 10px; spacing: 10px;";
        this.mainBox.add( this.placesBox, {
            expand: true,
            x_fill: false,
            y_fill: true,
            x_align: St.Align.START,
            y_align: St.Align.START
        });
        this.favoritesButton = new MW.FavoritesButton( this);
        this.placesTopBox.add(this.favoritesButton.actor, {
            expand: false,
            x_fill: true,
            x_align: St.Align.END,
            margin:5,
        });
        let userButton= new MW.CurrentUserButton( this);
        this.placesBottomBox.add(userButton.actor, {
            expand: false,
            x_fill: true,
            x_align: St.Align.END,
            margin:5,
        });
        this.placesBottomBox.style = "spacing: 5px;";
        let path = GLib.get_user_special_dir(imports.gi.GLib.UserDirectory.DIRECTORY_DOCUMENTS);
        if (path != null){
            let placeInfo = new MW.PlaceInfo(Gio.File.new_for_path(path), _("Documents"));
            let placeMenuItem = new MW.PlaceButtonItem(this, placeInfo);
            this.placesBottomBox.add_actor(placeMenuItem.actor);
        }
        let settingsButton= new MW.SettingsButton( this);
        this.placesBottomBox.add(settingsButton.actor, {
            expand: false,
            x_fill: true,
            x_align: St.Align.END,
            margin:5,
        });
        let powerButton= new MW.PowerButton( this);
        this.placesBottomBox.add(powerButton.actor, {
            expand: false,
            x_fill: true,
            x_align: St.Align.END,
            margin:5,
        });
        //Sub Main Box -- stores left and right box
        this.subMainBox= new St.BoxLayout({
            vertical: true
        });
        this.mainBox.add(this.subMainBox, {
            expand: true,
            x_fill: true,
            y_fill: true,
            y_align: St.Align.START
        });
        this.user = new MW.UserMenuIcon(this);
        this.subMainBox.add(this.user.actor, {
            expand: false,
            x_fill: false,
            y_fill: false,
            y_align: St.Align.MIDDLE,
            x_align: St.Align.MIDDLE
        });

        //Top Search Bar
        // Create search box
        this.searchBox = new MW.SearchBox(this);
        this.searchBox._stEntry.style = "min-height: 0px; border-radius: 18px; padding: 7px 12px;";
        this.searchBox.actor.style ="margin: 0px 10px 10px 10px;padding-top: 15px; padding-bottom: 0.5em;padding-left: 0.4em;padding-right: 0.4em;";
        this._firstAppItem = null;
        this._firstApp = null;
        this._tabbedOnce = false;
        this._searchBoxChangedId = this.searchBox.connect('changed', this._onSearchBoxChanged.bind(this));
        this._searchBoxKeyPressId = this.searchBox.connect('key-press-event', this._onSearchBoxKeyPress.bind(this));
        this._searchBoxKeyFocusInId = this.searchBox.connect('key-focus-in', this._onSearchBoxKeyFocusIn.bind(this));
        //Add search box to menu
        this.subMainBox.add(this.searchBox.actor, {
            expand: false,
            x_fill: true,
            y_fill: false,
            y_align: St.Align.START
        });

        //Right Box
        this.shorcutsBox = new St.BoxLayout({
            vertical: true
        });

        this.shortcutsScrollBox = new St.ScrollView({
            x_fill:false,
            y_fill: false,
            y_align: St.Align.START,
            overlay_scrollbars: true,
            style_class: 'vfade'
        });   
        this.shortcutsScrollBox.connect('key-press-event',(actor,event)=>{
            let key = event.get_key_symbol();
            if(key == Clutter.KEY_Up)
                this.scrollToItem(this.activeMenuItem, Constants.DIRECTION.UP);
            else if(key == Clutter.KEY_Down)
                this.scrollToItem(this.activeMenuItem,Constants.DIRECTION.DOWN);
        }) ;
        this.shortcutsScrollBox.style = "width:525px;";   
        this.shortcutsScrollBox.set_policy(Gtk.PolicyType.NEVER, Gtk.PolicyType.AUTOMATIC);
        this.shortcutsScrollBox.add_actor( this.shorcutsBox);
        this.shortcutsScrollBox.clip_to_allocation = true;

        //this.shorcutsBox.add(this.iconGrid.actor);
        this.subMainBox.add( this.shortcutsScrollBox, {
            expand: false,
            x_fill: false,
            y_fill: true,
            y_align: St.Align.START
        });

        this._loadCategories();
        this._displayAllApps();
        this._loadFavorites();
        this._createFavoritesMenu();
        
        
        this._display();
    }
    _createRightBox(){
    }
    _createFavoritesMenu(){
        this.dummyCursor = new St.Widget({ width: 0, height: 0, opacity: 0 });
        Main.uiGroup.add_actor(this.dummyCursor);
        this.favoritesMenu = new PopupMenu.PopupMenu(this.dummyCursor, 0, St.Side.TOP);
        this.section = new PopupMenu.PopupMenuSection();
        this.favoritesMenu.addMenuItem(this.section);  
        
        this.leftPanelPopup = new St.BoxLayout({
            vertical: true
        });   
        this.leftPanelPopup._delegate = this.leftPanelPopup;
        let headerBox = new St.BoxLayout({
            vertical: true
        });    
        this.leftPanelPopup.add(headerBox,{
            expand:false,
            x_fill:true,
            y_fill: false,
            y_align: St.Align.START
        })
        //Add back button to menu
        this.backButton = new MW.BackMenuItem(this);
        headerBox.add(this.backButton.actor, {
            expand: false,
            x_fill: true,
            y_fill: false,
            y_align: St.Align.End
        });

        //Add Horizontal Separator
        headerBox.add(this._createHorizontalSeparator(Constants.SEPARATOR_STYLE.LONG), {
            x_expand: true,
            x_fill: true,
            y_fill: false,
            y_align: St.Align.END
        });
        this.applicationsScrollBox = new St.ScrollView({
            x_fill: true,
            y_fill: false,
            y_align: St.Align.START,
            style_class: 'vfade',
            overlay_scrollbars: true,
            reactive:true
        });        
        this.applicationsScrollBox.set_policy(Gtk.PolicyType.NEVER, Gtk.PolicyType.AUTOMATIC);
        this.leftPanelPopup.add(this.applicationsScrollBox, {
            expand: true,
            x_fill: true, y_fill: true,
            y_align: St.Align.START
        });
       
        this.applicationsBox = new St.BoxLayout({
            vertical: true
        });     
        this.applicationsScrollBox.add_actor(this.applicationsBox);
        this.applicationsScrollBox.clip_to_allocation = true;

        this.leftPanelShortcutsBox = new St.BoxLayout({
            vertical: true
        });     

        this.leftPanelPopup.add(this.leftPanelShortcutsBox,{
            expand:true,
            x_fill:true,
            y_fill: false,
            y_align: St.Align.END
        })
        let path = GLib.get_user_special_dir(imports.gi.GLib.UserDirectory.DIRECTORY_DOCUMENTS);
        if (path != null){
            let placeInfo = new MW.PlaceInfo(Gio.File.new_for_path(path), _("Documents"));
            let placeMenuItem = new MW.PlaceMenuItem(this, placeInfo);
            this.leftPanelShortcutsBox.add_actor(placeMenuItem.actor);
        }
        if (GLib.find_program_in_path("gnome-control-center")) {
            let shortcutMenuItem = new MW.ShortcutMenuItem(this, _("Settings"), "preferences-system-symbolic", "gnome-control-center");
            this.leftPanelShortcutsBox.add_actor(shortcutMenuItem.actor);
           
        }
        let themeContext = St.ThemeContext.get_for_stage(global.stage);
        let scaleFactor = themeContext.scale_factor;
        let height =  Math.round(this._settings.get_int('menu-height') / scaleFactor);
        this.leftPanelPopup.style = `height: ${height}px`;        
        this.section.actor.add_actor(this.leftPanelPopup); 
        this._displayFavorites();
        this.subMenuManager.addMenu(this.favoritesMenu);
        this.favoritesMenu.actor.hide();
        Main.uiGroup.add_actor(this.favoritesMenu.actor);
    }
    toggleFavoritesMenu(){
        let appsScrollBoxAdj = this.applicationsScrollBox.get_vscroll_bar().get_adjustment();
        appsScrollBoxAdj.set_value(0);

        let addStyle=this._settings.get_boolean('enable-custom-arc-menu');
        this.favoritesMenu.actor.style_class = addStyle ? 'arc-menu-boxpointer': 'popup-menu-boxpointer';
        this.favoritesMenu.actor.add_style_class_name( addStyle ? 'arc-menu' : 'popup-menu');
        this.favoritesButton.tooltip.hide();
        let themeNode = this.leftClickMenu.actor.get_theme_node();
        let rise = themeNode.get_length('-arrow-rise');
        let backgroundColor = themeNode.get_color('-arrow-background-color');
        let shadeColor;
        let drawBoxshadow = true;
        if(backgroundColor.alpha ==0 || !backgroundColor || backgroundColor === Clutter.Color.TRANSPARENT){
            backgroundColor = themeNode.get_color('background-color');
            if(backgroundColor.alpha==0 || !backgroundColor || backgroundColor === Clutter.Color.TRANSPARENT){
                    drawBoxshadow = false;
            }
                
        }
        let styleProperties;
        if(drawBoxshadow){
            shadeColor = backgroundColor.shade(.35);
            backgroundColor = "rgba("+backgroundColor.red+","+backgroundColor.green+","+backgroundColor.blue+","+backgroundColor.alpha+")";
            shadeColor ="rgba("+shadeColor.red+","+shadeColor.green+","+shadeColor.blue+","+shadeColor.alpha+")";
            styleProperties = "box-shadow: 3px 0px 8px 0px "+shadeColor+";background-color: "+backgroundColor+";";
        }

        let borderRadius = themeNode.get_length('-arrow-border-radius');
        this.favoritesMenu.actor.style = "-boxpointer-gap: 0px; -arrow-border-color:transparent; -arrow-border-width:0px; width: 250px;"
                                            +"-arrow-base:0px;-arrow-rise:0px; -arrow-background-color:transparent;"
                                            +" border-radius: "+borderRadius+"px;" + styleProperties;

        let base = themeNode.get_length('-arrow-base');
        let borderWidth = themeNode.get_length('-arrow-border-width');

        this.leftClickMenu.actor.get_allocation_box();
        let [x, y] = this.leftClickMenu.actor.get_transformed_position();
        if(this.leftClickMenu._arrowSide == St.Side.TOP)
            y += rise + 1;
        else 
            y += 1;
        if(this.leftClickMenu._arrowSide == St.Side.LEFT)
            x= x+(borderRadius * 2) + rise + 1;
        else
            x = x+(borderRadius * 2);
        this.dummyCursor.set_position(Math.round(x+borderWidth), Math.round(y+borderWidth));
        this.favoritesMenu.toggle();
    }
    
    updateIcons(){
    }
    resetSearch(){ //used by back button to clear results -- gets called on menu close
        this.searchBox.clear();
        this.setDefaultMenuView();  
    }
    setDefaultMenuView(){
        this.searchBox.clear();
        this.newSearch._reset();
        this._clearApplicationsBox();
        this._displayAppIcons();
        let appsScrollBoxAdj = this.shortcutsScrollBox.get_vscroll_bar().get_adjustment();
        appsScrollBoxAdj.set_value(0);
        appsScrollBoxAdj = this.applicationsScrollBox.get_vscroll_bar().get_adjustment();
        appsScrollBoxAdj.set_value(0);
    }
    _redisplayRightSide(){
        let themeContext = St.ThemeContext.get_for_stage(global.stage);
        let scaleFactor = themeContext.scale_factor;
        let height =  Math.round(this._settings.get_int('menu-height') / scaleFactor);
        this.leftPanelPopup.style = `height: ${height}px`;     
    }
    // Redisplay the menu
    _redisplay() {
        this._display();
    }
    _reload() {
        this._loadCategories();
        this._displayAllApps();
        this._display();
    }
    // Display the menu
    _display() {
        this._clearApplicationsBox();
        this._displayAppIcons();
        
        if(this.vertSep!=null)
            this.vertSep.queue_repaint(); 
        
    }
    updateStyle(){
        let addStyle=this._settings.get_boolean('enable-custom-arc-menu');
        if(this.newSearch){
            addStyle ? this.newSearch.setStyle('arc-menu-status-text') :  this.newSearch.setStyle('search-statustext'); 
            addStyle ? this.searchBox._stEntry.set_name('arc-search-entry') : this.searchBox._stEntry.set_name('search-entry');
        }
        if(this.placesTopBox){
            this.placesTopBox.get_children().forEach((actor) => {
                if(actor instanceof St.Button){
                    addStyle ? actor.add_style_class_name('arc-menu-action') : actor.remove_style_class_name('arc-menu-action');
                }
            });
        }
        if(this.placesBottomBox){
            this.placesBottomBox.get_children().forEach((actor) => {
                if(actor instanceof St.Button){
                    addStyle ? actor.add_style_class_name('arc-menu-action') : actor.remove_style_class_name('arc-menu-action');
                }
            });
        }
        
    }
    // Load data for all menu categories
    _loadCategories() {
        this.applicationsByCategory = null;
        this.applicationsByCategory = {};

        this._tree.load_sync();
        let root = this._tree.get_root_directory();
        let iter = root.iter();
        let nextType;
        while ((nextType = iter.next()) != GMenu.TreeItemType.INVALID) {
            if (nextType == GMenu.TreeItemType.DIRECTORY) {
                let dir = iter.get_directory();                  
                if (!dir.get_is_nodisplay()) {
                    let categoryId = dir.get_menu_id();
                    this.applicationsByCategory[categoryId] = [];
                    this._loadCategory(categoryId, dir);
                }
            }
        }
    }
    // Load menu category data for a single category
    _loadCategory(categoryId, dir) {
        let iter = dir.iter();
        let nextType;
        while ((nextType = iter.next()) != GMenu.TreeItemType.INVALID) {
            if (nextType == GMenu.TreeItemType.ENTRY) {
                let entry = iter.get_entry();
                let id;
                try {
                    id = entry.get_desktop_file_id();
                } catch (e) {
                    continue;
                }
                let app = appSys.lookup_app(id);
                if (app){
                    this.applicationsByCategory[categoryId].push(app);
                    let item = this._applicationsButtons.get(app);
                    if (!item) {
                        item = new MW.ApplicationMenuIcon(this, app);
                        this._applicationsButtons.set(app, item);
                    }
                }
            } else if (nextType == GMenu.TreeItemType.DIRECTORY) {
                let subdir = iter.get_directory();
                if (!subdir.get_is_nodisplay())
                    this._loadCategory(categoryId, subdir);
            }
        }
    }
    _displayCategories(){
    }
    _displayGnomeFavorites(){
    }
    _displayPlaces() {
    }
    _loadFavorites() {
        let pinnedApps = this._settings.get_strv('pinned-app-list');
        this.favoritesArray=null;
        this.favoritesArray=[];
        for(let i = 0;i<pinnedApps.length;i+=3){
            if(i == 0 && pinnedApps[0]=="ArcMenu_WebBrowser")
                this.updatePinnedAppsWebBrowser(pinnedApps);
            let favoritesMenuItem = new MW.FavoritesMenuItem(this, pinnedApps[i], pinnedApps[i+1], pinnedApps[i+2]);
            favoritesMenuItem.connect('saveSettings', ()=>{
                let array = [];
                for(let i = 0;i < this.favoritesArray.length; i++){
                    array.push(this.favoritesArray[i]._name);
                    array.push(this.favoritesArray[i]._iconPath);
                    array.push(this.favoritesArray[i]._command);		   
                }
                this._settings.set_strv('pinned-app-list',array);
            });
            this.favoritesArray.push(favoritesMenuItem);
        }   
    }
    updatePinnedAppsWebBrowser(pinnedApps){
        //Find the Default Web Browser, if found add to pinned apps list, if not found delete the placeholder.
        //Will only run if placeholder is found. Placeholder only found with default settings set.
        if(pinnedApps[0]=="ArcMenu_WebBrowser")
        {     
            let [res, stdout, stderr, status] = GLib.spawn_command_line_sync("xdg-settings get default-web-browser");
            let webBrowser = String.fromCharCode.apply(null, stdout);
            let browserName = webBrowser.split(".desktop")[0];
            browserName+=".desktop";
            this._app = appSys.lookup_app(browserName);
            if(this._app){
                let appIcon = this._app.create_icon_texture(25);
                let iconName = '';
                if(appIcon.icon_name)
                    iconName = appIcon.icon_name;
                else if(appIcon.gicon)
                    iconName = appIcon.gicon.to_string();
                pinnedApps[0] = this._app.get_name();
                pinnedApps[1] = iconName;
                pinnedApps[2] = this._app.get_id();
            }
            else{
                pinnedApps.splice(0,3);
            }
            this.shouldLoadFavorites = false; // We don't want to trigger a setting changed event
            this._settings.set_strv('pinned-app-list',pinnedApps);
            this.shouldLoadFavorites = true;
        }
    }
    _displayFavorites() {
        let actors = this.applicationsBox.get_children();
        for (let i = 0; i < actors.length; i++) {
            let actor = actors[i];
            this.applicationsBox.remove_actor(actor);
        }
        for(let i = 0;i < this.favoritesArray.length; i++){
            this.applicationsBox.add_actor(this.favoritesArray[i].actor);		   
        }
        this.updateStyle();  
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
        let appsScrollBoxAdj = this.shortcutsScrollBox.get_vscroll_bar().get_adjustment();
        appsScrollBoxAdj.set_value(0);
        let actors = this.shorcutsBox.get_children();
        for (let i = 0; i < actors.length; i++) {
            let actor = actors[i];
            this.shorcutsBox.remove_actor(actor);
        }
    }
    selectCategory(dir) {
    }
    // Display application menu items
    _displayButtons(apps) {
        if (apps) {
            if(this.appsBox){
                let inner =  this.appsBox.get_children();
                for (let i = 0; i < inner.length; i++) {
                    let actors =  inner[i].get_children();
                    for (let j = 0; j < actors.length; j++) {
                        let actor = actors[j];
                        inner[i].remove_actor(actor);
                    }
                }
                this.activeMenuItem = null;
                this.appsBox.destroy();
            }

            this.appsBox= new St.BoxLayout({
                vertical: true
            });
            this.appsBox.style ='spacing: 15px; margin: 5px'
            let count = 0;
            for (let i = 0; i < apps.length; i++) {
                let app = apps[i];
                let item = this._applicationsButtons.get(app);
                if (!item) {
                    item = new MW.ApplicationMenuIcon(this, app);
                    this._applicationsButtons.set(app, item);
                }
                if(count%5==0){ //create a new row every 5 app icons
                    this.rowBox= new St.BoxLayout({
                        vertical: false
                    });
                    this.rowBox.style ='spacing: 10px; margin: 5px'
                    this.appsBox.add(this.rowBox, {
                        expand: false,
                        x_fill: false,
                        y_fill: false,
                        x_align: St.Align.MIDDLE,
                        y_align: St.Align.MIDDLE
                    });
                }
                count++;

                this.rowBox.add(item.actor, {
                    expand: false,
                    x_fill: false,
                    y_fill: false,
                    x_align: St.Align.MIDDLE,
                    y_align: St.Align.MIDDLE
                });
                if(i==0){
                    this.activeMenuItem = item;
                    this.firstItem = item;
                }
            }
        }
    }
    _displayAppIcons(){
        this.shorcutsBox.add(this.appsBox, {
            expand: true,
            x_fill: true,
            y_fill: true,
            x_align: St.Align.MIDDLE,
            y_align: St.Align.MIDDLE
        });
        this.activeMenuItem = this.firstItem;
        if(this.leftClickMenu.isOpen)
            this.mainBox.grab_key_focus();
    }
    _displayAllApps(){
        let appList= []
        this._applicationsButtons.forEach((value,key,map) => {
            appList.push(key);
        });
        appList.sort((a, b) => {
            return a.get_name().toLowerCase() > b.get_name().toLowerCase();
        });
        this._displayButtons(appList);
        this.updateStyle(); 

    }
    _listApplications(category_menu_id) {
    }
    getShouldShowShortcut(shortcutName){
    }
    _onSearchBoxKeyPress(searchBox, event) {
        let symbol = event.get_key_symbol();
        if (!searchBox.isEmpty() && searchBox.hasKeyFocus()) {
            if (symbol == Clutter.Up) {
                this.newSearch.highlightDefault(false);
            }
            else if (symbol == Clutter.Down) {
                this.newSearch.highlightDefault(false);
            }
        }
        return Clutter.EVENT_PROPAGATE;
    }
    _onSearchBoxKeyFocusIn(searchBox) {
        if (!searchBox.isEmpty()) {
            this.newSearch.highlightDefault(false);
        }
    }
    _onSearchBoxChanged(searchBox, searchString) {        
        if(searchBox.isEmpty()){  
            this.newSearch.setTerms(['']); 
            this.setDefaultMenuView();                     	          	
            this.newSearch.actor.hide();
        }            
        else{       
            let appsScrollBoxAdj = this.shortcutsScrollBox.get_vscroll_bar().get_adjustment();
            appsScrollBoxAdj.set_value(0);  
            this._clearApplicationsBox();
            this.shorcutsBox.add(this.newSearch.actor, {
                x_expand: false,
                y_expand:false,
                x_fill: true,
                y_fill: false,
                x_align: St.Align.MIDDLE
            });    
                
            this.newSearch.highlightDefault(true);
            this.newSearch.actor.show();         
            this.newSearch.setTerms([searchString]);      
        }            	
    }
    scrollToItem(button,direction) {
        if(button!=null){
            let appsScrollBoxAdj = this.shortcutsScrollBox.get_vscroll_bar().get_adjustment();
            let catsScrollBoxAlloc = this.shortcutsScrollBox.get_allocation_box();
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
        return Constants.CURRENT_MENU.FAVORITES;
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
                return Clutter.EVENT_PROPAGATE;
            case Clutter.KEY_Up:
            case Clutter.KEY_Down:
            case Clutter.KEY_Left:
            case Clutter.KEY_Right:          
                if(this.searchBox.hasKeyFocus() && this.newSearch._defaultResult){
                    if(this.newSearch.actor.get_parent()){
                        this.newSearch._defaultResult.actor.grab_key_focus();
                        let appsScrollBoxAdj = this.shortcutsScrollBox.get_vscroll_bar().get_adjustment();
                        appsScrollBoxAdj.set_value(0);
                        return Clutter.EVENT_STOP;
                    }                   
                    else{
                        return Clutter.EVENT_PROPAGATE;
                    } 
                }
                else if(this.activeMenuItem!=null && !this.activeMenuItem.actor.has_key_focus()){
                    this.activeMenuItem.actor.grab_key_focus();
                    return Clutter.EVENT_STOP;
                }
                else if(this.activeMenuItem!=null){
                    this.activeMenuItem.actor.grab_key_focus();
                    return Clutter.EVENT_PROPAGATE;
                }
                else{
                    return Clutter.EVENT_PROPAGATE;
                }
            case Clutter.KEY_KP_Enter:
            case Clutter.KEY_Return:
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
        this._applicationsButtons.forEach((value,key,map)=>{
            value.destroy();
        });
        this._applicationsButtons=null;

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
        if (this._treeChangedId > 0) {
            this._tree.disconnect(this._treeChangedId);
            this._treeChangedId = 0;
            this._tree = null;
        }
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
};
