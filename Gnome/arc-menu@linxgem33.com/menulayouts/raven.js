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
const AppFavorites = imports.ui.appFavorites;
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
        this.leftClickMenu.actor.style = "-arrow-base:0px;-arrow-rise:0px; -boxpointer-gap: 0px;";

        this.placesBox = new St.BoxLayout({
            vertical: true
        });

        this.placesBottomBox = new St.BoxLayout({
            vertical: true
        });
        this.placesBox.add( this.placesBottomBox, {
            expand: true,
            x_fill: false,
            y_fill: false,
            x_align: St.Align.START,
            y_align: St.Align.MIDDLE
        });
        this.placesBottomBox.style = "spacing: 5px;";
        this.placesBox.style = "margin: 0px 0px 0px 0px; spacing: 10px;background-color:rgba(186, 196,201, 0.1) ; padding: 5px 5px;"+
                                "border-color:rgba(186, 196,201, 0.2) ; border-right-width: 1px;";
        this.mainBox.add( this.placesBox, {
            expand: true,
            x_fill: false,
            y_fill: true,
            x_align: St.Align.START,
            y_align: St.Align.START
        });

        this.topBox = new St.BoxLayout({
            vertical: false
        });

        //Sub Main Box -- stores left and right box
        this.subMainBox= new St.BoxLayout({
            vertical: true
        });
        this.subMainBox.add( this.topBox, {
            expand: false,
            x_fill: true,
            y_fill: false,
            x_align: St.Align.START,
            y_align: St.Align.START
        });
        this.mainBox.add(this.subMainBox, {
            expand: true,
            x_fill: true,
            y_fill: true,
            y_align: St.Align.START
        });
        //Top Search Bar
        // Create search box
        this.searchBox = new MW.SearchBox(this);
        this.searchBox._stEntry.style = "min-height: 0px; border-radius: 18px; padding: 7px 12px;";
        this.searchBox.actor.style ="margin: 0px 10px 10px 10px;padding-top: 25px; padding-bottom: 0.0em;padding-left: 0.7em;padding-right: 0.7em;";
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
            y_align: St.Align.MIDDLE
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
        this.shortcutsScrollBox.style = "width:400px;";    
        this.shortcutsScrollBox.set_policy(Gtk.PolicyType.NEVER, Gtk.PolicyType.AUTOMATIC);
        this.shortcutsScrollBox.add_actor( this.shorcutsBox);
        this.shortcutsScrollBox.clip_to_allocation = true;

        this.subMainBox.add( this.shortcutsScrollBox, {
            expand: false,
            x_fill: false,
            y_fill: true,
            y_align: St.Align.START
        });

        this.leftClickMenu.box.style = "padding-bottom:0px; padding-top:0px;";     
    
        this._loadCategories();
        this._displayCategories();
        this._createRightBox();
       
        this._loadFavorites();
        this._displayFavorites();
        this._display();
  
    }
    _createRightBox(){
        this.appShortcuts = [];
        this.appShorcutsBox = new St.BoxLayout({
            vertical: true
        });
        //Add Application Shortcuts to menu (Software, Settings, Tweaks, Terminal)
        let SOFTWARE_TRANSLATIONS = [_("Software"), _("Settings"), _("Tweaks"), _("Terminal"), _("Activities Overview"), _("Arc Menu Settings")];
        let applicationShortcuts = this._settings.get_value('application-shortcuts-list').deep_unpack();
        for(let i = 0; i < applicationShortcuts.length; i++){
            let applicationName = applicationShortcuts[i][0];
            let shortcutMenuItem = new MW.ShortcutMenuItem(this, _(applicationName), applicationShortcuts[i][1], applicationShortcuts[i][2]);
            shortcutMenuItem.setAsIcon();
            this.appShortcuts.push(shortcutMenuItem);
        }
        this._displayButtons(this.appShortcuts, _("Shortcuts"), true, this.appShorcutsBox)
    }
    _createFavoritesMenu(){


    }
    toggleFavoritesMenu(){

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
        this._displayFavorites();
        let appsScrollBoxAdj = this.shortcutsScrollBox.get_vscroll_bar().get_adjustment();
        appsScrollBoxAdj.set_value(0);
    }
    _redisplayRightSide(){ 
        this.appShorcutsBox.destroy_all_children();
        this._createRightBox();
        this._displayFavorites();
        this.updateStyle();  
    }
    // Redisplay the menu
    _redisplay() {
        this._display();
    }
    _reload() {
        this._loadCategories();
        this._displayFavorites();
        this._display();
    }
    // Display the menu
    _display() {
        this._clearApplicationsBox();
        this._displayFavorites();
        
        if(this.vertSep!=null)
            this.vertSep.queue_repaint(); 
        
    }
    updateStyle(){
        let addStyle = this._settings.get_boolean('enable-custom-arc-menu');
        if(this.newSearch){
            addStyle ? this.newSearch.setStyle('arc-menu-status-text') :  this.newSearch.setStyle('search-statustext'); 
            addStyle ? this.searchBox._stEntry.set_name('arc-search-entry') : this.searchBox._stEntry.set_name('search-entry'); 
        }
        if(this.placesBottomBox){
            this.placesBottomBox.get_children().forEach((actor) => {
                if(actor instanceof St.Button){
                    addStyle ? actor.add_style_class_name('arc-menu-action') : actor.remove_style_class_name('arc-menu-action');
                }
            });
        }           
        this.updateRunnerLocation();
    }
    updateRunnerLocation(){
        let themeContext = St.ThemeContext.get_for_stage(global.stage);
        let scaleFactor = themeContext.scale_factor;
        
        let screen = Gdk.Screen.get_default();
        let [x, y] = this._button._menuButtonWidget.actor.get_transformed_position();
        let currentMonitor = screen.get_monitor_at_point(x, y);
        let rect = screen.get_monitor_workarea(currentMonitor);
        let screenHeight = rect.height;        
        let height =  Math.round(screenHeight / scaleFactor);
        this.mainBox.style = `height: ${height}px`;
    }
    updateSearch(){
        this.newSearch._reloadRemoteProviders();
    }
    // Load data for all menu categories
    _loadCategories() {
        this.applicationsByCategory = null;
        this.applicationsByCategory = {};
        this.categoryDirectories = null;
        this.categoryDirectories=[];
        
        let categoryMenuItem = new MW.CategoryMenuButton(this, "", "Home Screen");
        this.categoryDirectories.push(categoryMenuItem);

        categoryMenuItem = new MW.CategoryMenuButton(this, "", "All Programs");
        this.categoryDirectories.push(categoryMenuItem);
      

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
                    let categoryMenuItem = new MW.CategoryMenuButton(this, dir);
                    this.categoryDirectories.push(categoryMenuItem);
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
        for (let i = 0; i < this.categoryDirectories.length; i++) {
            this.placesBottomBox.add_actor(this.categoryDirectories[i].actor);	
        }
        this.updateStyle();
    }
    _displayGnomeFavorites(){
        let appList = AppFavorites.getAppFavorites().getFavorites();

        appList.sort((a, b) => {
            return a.get_name().toLowerCase() > b.get_name().toLowerCase();
        });

        this._displayButtons(appList);
        this._displayAppIcons();
        this.updateStyle(); 
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
            let favoritesMenuItem = new MW.FavoritesMenuIcon(this, pinnedApps[i], pinnedApps[i+1], pinnedApps[i+2]);
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
        let homeScreen = this._settings.get_boolean('enable-ubuntu-homescreen');
        if(homeScreen){
            this._displayButtons(this.favoritesArray,_("Pinned Apps"), true);
            this._displayAppIcons();
            this.shorcutsBox.add(this.appShorcutsBox, {
                expand: true,
                x_fill: true,
                y_fill: true,
                x_align: St.Align.MIDDLE,
                y_align: St.Align.MIDDLE
            });
        }
        else
            this._displayAllApps();        
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
        this.activeMenuItem = null;
        let actors = this.shorcutsBox.get_children();
        for (let i = 0; i < actors.length; i++) {
            let actor = actors[i];
            this.shorcutsBox.remove_actor(actor);
        }
    }
    selectCategory(dir) {
        if (dir!="Frequent Apps") 
            this._displayButtons(this._listApplications(dir.get_menu_id()) ,dir.get_name());
        else if(dir=="Frequent Apps") 
            this._displayButtons(this._listApplications("Frequent Apps"), _("Frequent Apps"));
        this._displayAppIcons();
        this.updateStyle();
    }
    // Display application menu items
    _displayButtons(apps, category, favs = false, shorcutsAppBox = null) {
        if (apps) {
            if(shorcutsAppBox==null && this.appsBox){
                let inner =  this.appsBox.get_children();
                for (let i = 0; i < inner.length; i++) {
                    let actors =  inner[i].get_children();
                    for (let j = 0; j < actors.length; j++) {
                        let actor = actors[j];
                        inner[i].remove_actor(actor);
                    }
                }
                this.appsBox.destroy();
            }
            this._clearApplicationsBox();
            if(shorcutsAppBox==null){
                this.appsBox = new St.BoxLayout({
                    vertical: true
                });
            }

            let box = shorcutsAppBox ? shorcutsAppBox : this.appsBox;

            
            let favsLabel = new PopupMenu.PopupMenuItem(_(category));  
            favsLabel.actor.track_hover = false;
            favsLabel.actor.can_focus = false;
            favsLabel.actor.add_style_pseudo_class = () => { return false;};
            favsLabel.actor.add(this._createHorizontalSeparator(Constants.SEPARATOR_STYLE.LONG), {
                x_expand: true,
                x_fill: true,
                y_fill: false,
                y_align: St.Align.END
            });
            favsLabel.actor.add_style_class_name('popup-menu-item');
            favsLabel.label.style = 'font-weight: bold;';
            box.add(favsLabel.actor, {
                expand: false,
                x_fill: true,
                y_fill: false,
                x_align: St.Align.START,
                y_align: St.Align.START
            });
            let count = 0;

            for (let i = 0; i < apps.length; i++) {
                let app = apps[i];
                let item;
                if(favs)
                    item = app;
                else
                    item = this._applicationsButtons.get(app);
                if (!item) {
                    item = new MW.ApplicationMenuIcon(this, app);
                    this._applicationsButtons.set(app, item);
                }
                if(count%3==0){ //create a new row every 5 app icons
                    this.rowBox= new St.BoxLayout({
                        vertical: false
                    });
                    this.rowBox.style ='spacing: 10px; margin: 10px;'
                    box.add(this.rowBox, {
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
                if(i==0 && !shorcutsAppBox){
                    this.activeMenuItem = item;
                    if(this.leftClickMenu.isOpen)
                        this.mainBox.grab_key_focus();
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
    }
    _displayAllApps(){
        let appList= []
        this._applicationsButtons.forEach((value,key,map) => {
            appList.push(key);
        });
        appList.sort((a, b) => {
            return a.get_name().toLowerCase() > b.get_name().toLowerCase();
        });
        this._displayButtons(appList, _("All Programs"));
        this._displayAppIcons();
        this.updateStyle(); 

    }
    _listApplications(category_menu_id) {
        let applist;

        // Get applications in a category or all categories
        if (category_menu_id) {
            applist = this.applicationsByCategory[category_menu_id];
        } else {
            applist = [];
            for (let directory in this.applicationsByCategory)
                applist = applist.concat(this.applicationsByCategory[directory]);
        }
        if(category_menu_id != "Frequent Apps"){
            applist.sort((a, b) => {
                return a.get_name().toLowerCase() > b.get_name().toLowerCase();
            });
        }
        
        return applist;
    }
    getShouldShowShortcut(shortcutName){
    }
    _onSearchBoxKeyPress(searchBox, event) {
        let symbol = event.get_key_symbol();
        if (!searchBox.isEmpty() && searchBox.hasKeyFocus()) {
            if (symbol == Clutter.Up) {
                this.newSearch.highlightDefault(false);
                return Clutter.EVENT_PROPAGATE;
            }
            else if (symbol == Clutter.Down) {
                this.newSearch.highlightDefault(false);
                return Clutter.EVENT_PROPAGATE;
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
    scrollToItem(button, direction) {
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
        this.leftClickMenu.box.style = null;
        this.leftClickMenu.actor.style = null;
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
    // Create a vertical separator
    _createVertSeparator(){    
        let alignment = Constants.SEPARATOR_ALIGNMENT.VERTICAL;
        let style = Constants.SEPARATOR_STYLE.SHORT;
        this.vertSep = new MW.SeparatorDrawingArea(this._settings,alignment,style,{
            x_expand:false,
            y_expand:true,
            style_class: 'vert-sep'
        });
        this.vertSep.queue_repaint();
        return  this.vertSep;
    }
};
