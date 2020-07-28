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
const AppFavorites = imports.ui.appFavorites;
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

var createMenu = class{
    constructor(mainButton) {
        this._button = mainButton;
        this._settings = mainButton._settings;
        this.mainBox = mainButton.mainBox; 
        this.appMenuManager = mainButton.appMenuManager;
        this.leftClickMenu  = mainButton.leftClickMenu;
        this.currentMenu = Constants.CURRENT_MENU.FAVORITES; 
        this._applicationsButtons = new Map();
        this._session = new GnomeSession.SessionManager();
        this.isRunning=true;

        this._mainBoxKeyPressId = this.mainBox.connect('key-press-event', this._onMainBoxKeyPress.bind(this));

        this._tree = new GMenu.Tree({ menu_basename: 'applications.menu' });
        this._treeChangedId = this._tree.connect('changed', ()=>{
            this.needsReload = true;
        });
        //LAYOUT------------------------------------------------------------------------------------------------
        this.mainBox.vertical = true;
        
        this._firstAppItem = null;
        this._firstApp = null;
        this._tabbedOnce = false;

        //Sub Main Box -- stores left and right box
        this.subMainBox= new St.BoxLayout({
            vertical: false
        });
        this.mainBox.add(this.subMainBox, {
            expand: true,
            x_fill: true,
            y_fill: true,
            y_align: St.Align.START
        });

        //Right Box
        this.rightBox = new St.BoxLayout({
            vertical: true,
            style_class: 'right-box'
        });
        this.shorcutsBox = new St.BoxLayout({
            vertical: true
        });
        this.shortcutsScrollBox = new St.ScrollView({
            x_fill: true,
            y_fill: false,
            y_align: St.Align.START,
            overlay_scrollbars: true,
            style_class: 'vfade'
        }); 
        let rightPanelWidth = this._settings.get_int('right-panel-width');
        rightPanelWidth += 45;
        this.rightBox.style = "width: " + rightPanelWidth + "px;";
        this.shortcutsScrollBox.style = "width: " + rightPanelWidth + "px;";  
        this.shortcutsScrollBox.connect('key-press-event',(actor,event)=>{
            let key = event.get_key_symbol();
            if(key == Clutter.KEY_Up)
                this.scrollToItem(this.activeMenuItem, this.shortcutsScrollBox, Constants.DIRECTION.UP);
            else if(key == Clutter.KEY_Down)
                this.scrollToItem(this.activeMenuItem, this.shortcutsScrollBox, Constants.DIRECTION.DOWN);
        }) ;  
        this.shortcutsScrollBox.set_policy(Gtk.PolicyType.NEVER, Gtk.PolicyType.AUTOMATIC);

        this.shortcutsScrollBox.add_actor( this.shorcutsBox);
        this.shortcutsScrollBox.clip_to_allocation = true;
        this.rightBox.add(this.shortcutsScrollBox);
        // Left Box
        //Menus Left Box container
        this.leftBox = new St.BoxLayout({
            vertical: true,
            style_class: 'left-box'
        });
        this.subMainBox.add( this.leftBox, {
            expand: true,
            x_fill: true,
            y_fill: true,
            y_align: St.Align.START
        });
        //Add Vert Separator to Main Box
        this.subMainBox.add( this._createVertSeparator(), {
            expand: true,
            x_fill: true,
            y_fill: true
        });
        this._createLeftBox();
        this.subMainBox.add( this.rightBox, {
            expand: true,
            x_fill: true,
            y_fill: true,
            y_align: St.Align.START
        });

        this._loadCategories();

        this._display(); 
    }
    _createLeftBox(){
        //Applications Box - Contains Favorites, Categories or programs
        this.applicationsScrollBox = new St.ScrollView({
            x_fill: true,
            y_fill: true,
            y_align: St.Align.START,
            style_class: 'apps-menu vfade left-scroll-area',
            overlay_scrollbars: true
        });
        this.applicationsScrollBox.connect('key-press-event',(actor,event)=>{
            let key = event.get_key_symbol();
            if(key == Clutter.KEY_Up)
                this.scrollToItem(this.activeMenuItem, this.applicationsScrollBox, Constants.DIRECTION.UP);
            else if(key == Clutter.KEY_Down)
                this.scrollToItem(this.activeMenuItem, this.applicationsScrollBox, Constants.DIRECTION.DOWN);
        }) ;      
        this.applicationsScrollBox.set_policy(Gtk.PolicyType.NEVER, Gtk.PolicyType.AUTOMATIC);

        this.leftBox.add( this.applicationsScrollBox, {
            expand: true,
            x_fill: true, y_fill: true,
            y_align: St.Align.START
        });
        this.applicationsBox = new St.BoxLayout({ vertical: true });
        this.applicationsScrollBox.add_actor( this.applicationsBox);

        this.activitiesBox= new St.BoxLayout({ vertical: false });
        let activities = new MW.ActivitiesMenuItem(this);
            this.activitiesBox.add(activities.actor, {
                expand: true,
                x_fill: true,
                y_fill: false,
                y_align: St.Align.START
            });
        this.leftBox.add( this.activitiesBox, {
            expand: true,
            x_fill: true, y_fill: false,
            y_align: St.Align.END
        });
        
    }
    updateIcons(){   
        this._applicationsButtons.forEach((value,key,map)=>{
            map.get(key)._updateIcon();
        });    
    }
    resetSearch(){ //used by back button to clear results
        this.setDefaultMenuView();  
    }
    setDefaultMenuView(){
        this._displayGnomeFavorites();
        this._setActiveCategory(this.categoryDirectories[0], false);

        let appsScrollBoxAdj = this.applicationsScrollBox.get_vscroll_bar().get_adjustment();
        appsScrollBoxAdj.set_value(0);
        appsScrollBoxAdj = this.shortcutsScrollBox.get_vscroll_bar().get_adjustment();
        appsScrollBoxAdj.set_value(0);
    }
    _redisplayRightSide(){
        let rightPanelWidth = this._settings.get_int('right-panel-width');
        rightPanelWidth += 45;
        this.rightBox.style = "width: " + rightPanelWidth + "px;";
        this.shortcutsScrollBox.style = "width: " + rightPanelWidth + "px;";
    }
    // Redisplay the menu
    _redisplay() {
        if (this.applicationsBox)
            this._clearApplicationsBox();
        this._display();
    }
    _reload() {
        for (let i = 0; i < this.categoryDirectories.length; i++) {
            this.categoryDirectories[i].destroy();
        }    
        this._applicationsButtons.forEach((value,key,map) => {
            this._applicationsButtons.delete(key);
            value.destroy(); 
        });
        this.applicationsBox.destroy_all_children();
        this._loadCategories();
        this._display();
    }
    // Display the menu
    _display() {
        this._displayGnomeFavorites();
        this._displayCategories();

        if(this.vertSep!=null)
            this.vertSep.queue_repaint(); 
    }
    updateStyle(){
    }

    // Load data for all menu categories
    _loadCategories() {
        this.applicationsByCategory = null;

        this.applicationsByCategory = {};
        this.categoryDirectories = null;
        this.categoryDirectories=[];   

        let categoryMenuItem = new MW.CategoryMenuItem(this, "","Favorites");
        this.categoryDirectories.push(categoryMenuItem);
        categoryMenuItem = new MW.CategoryMenuItem(this, "","All Programs");
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
                    categoryMenuItem = new MW.CategoryMenuItem(this, dir);
                    this.categoryDirectories.push(categoryMenuItem); 
                }
            }
        }
    }
    // Load menu category data for a single category
    _loadCategory(categoryId, dir, submenuItem) {
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
                if (!app)
                    app = new Shell.App({ app_info: entry.get_app_info() });
                if (app.get_app_info().should_show()){
                    let item = this._applicationsButtons.get(app);
                    if (!item) {
                        item = new MW.ApplicationMenuItem(this, app);
                    }
                    if(!submenuItem){
                        this.applicationsByCategory[categoryId].push(app);
                        this._applicationsButtons.set(app, item);
                    }
                    else{
                        submenuItem._applicationsButtons.set(app, item);
                    }
                }
                    
            } else if (nextType == GMenu.TreeItemType.DIRECTORY) {
                let subdir = iter.get_directory();
                if (!subdir.get_is_nodisplay()){
                    if(this._settings.get_boolean('enable-sub-menus')){
                        this.applicationsByCategory[categoryId].push(subdir);
                        let submenuItem = this._applicationsButtons.get(subdir);
                        if (!submenuItem) {
                            submenuItem = new MW.CategorySubMenuItem(this, subdir);
                            submenuItem._setParent(this.leftClickMenu);
                            this._applicationsButtons.set(subdir, submenuItem);
                        }
                        this._loadCategory(categoryId, subdir, submenuItem);
                    }
                    else{
                        this._loadCategory(categoryId, subdir);
                    }
                }
            }
        }
    }

    _displayCategories(){
        this._clearApplicationsBox();
        
        for (let i = 0; i < this.categoryDirectories.length; i++) {
            this.applicationsBox.add_actor(this.categoryDirectories[i].actor);	
            if(i==0){
                this.activeMenuItem = this.categoryDirectories[i];
                if(this.leftClickMenu.isOpen)
                    this.mainBox.grab_key_focus();
            }	 	
        }
        this.updateStyle();
    }
    _displayGnomeFavorites(){
        let appList = AppFavorites.getAppFavorites().getFavorites();

        appList.sort((a, b) => {
            return a.get_name().toLowerCase() > b.get_name().toLowerCase();
        });

        this._displayButtons(appList);
        this.updateStyle(); 
    }

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
    _setActiveCategory(category, setActive = true){
        this.activeMenuItem = category;
        if(setActive){
            category.setFakeActive(true);
            if(this.leftClickMenu.isOpen)
                this.activeMenuItem.actor.grab_key_focus();
        }
        else{
            if(this.leftClickMenu.isOpen)
                this.mainBox.grab_key_focus();
        }
    }
    // Clear the applications menu box
    _clearApplicationsBox() {
        let actors = this.applicationsBox.get_children();
        for (let i = 0; i < actors.length; i++) {
            let actor = actors[i];
            this.applicationsBox.remove_actor(actor);
        }
    }
    _clearShortcutsBox(){
        this.activeMenuItem = null;
        let actors = this.shorcutsBox.get_children();
        for (let i = 0; i < actors.length; i++) {
            let actor = actors[i];
            if(actor._delegate instanceof MW.CategorySubMenuItem)
                actor._delegate.menu.close();
            this.shorcutsBox.remove_actor(actor);
        }
    }
    // Select a category or show category overview if no category specified
    selectCategory(dir) {
        if (dir!="Frequent Apps") {
            this._displayButtons(this._listApplications(dir.get_menu_id()));
        }
        else if(dir=="Frequent Apps") {
            this._displayButtons(this._listApplications("Frequent Apps"));

        }
        else {
            this._displayCategories();
        }
        this.updateStyle();
    }
    // Display application menu items
    _displayButtons(apps) {
        if (apps) {
            this._clearShortcutsBox();
            for (let i = 0; i < apps.length; i++) {
                let app = apps[i];
                let item = this._applicationsButtons.get(app);
                if (!item) {
                    item = new MW.ApplicationMenuItem(this, app);
                    this._applicationsButtons.set(app, item);
                }
                if(item.actor.get_parent()){
                    item.actor.get_parent().remove_actor(item.actor);
                }
                if (!item.actor.get_parent()) 
                    this.shorcutsBox.add_actor(item.actor);
                if(item instanceof MW.CategorySubMenuItem){
                    this.shorcutsBox.add_actor(item.menu.actor);
                    item._updateIcons();
                } 
            }
        }
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
    // Get a list of applications for the specified category or search query
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
    scrollToItem(button,scrollView, direction) {
        if(button!=null){
            let appsScrollBoxAdj = scrollView.get_vscroll_bar().get_adjustment();
            let catsScrollBoxAlloc = scrollView.get_allocation_box();
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
        let symbol = event.get_key_symbol();
        let key = event.get_key_unicode();

        switch (symbol) {
            case Clutter.KEY_BackSpace:
            case Clutter.KEY_Tab:
            case Clutter.KEY_KP_Tab:
                return Clutter.EVENT_PROPAGATE;
            case Clutter.KEY_Up:
            case Clutter.KEY_Down:
            case Clutter.KEY_Left:
            case Clutter.KEY_Right:  
                if(this.activeMenuItem!=null && !this.activeMenuItem.actor.has_key_focus()){
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
                return Clutter.EVENT_PROPAGATE;
        }
    }
    destroy(){
        for (let i = 0; i < this.categoryDirectories.length; i++) {
            this.categoryDirectories[i].destroy();
        }
        this._applicationsButtons.forEach((value,key,map)=>{
            value.destroy();
        });
        this.categoryDirectories=null;
        this._applicationsButtons=null;

        if (this._treeChangedId > 0) {
            this._tree.disconnect(this._treeChangedId);
            this._treeChangedId = 0;
            this._tree = null;
        }
        this.isRunning=false;

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
