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

const {Atk, Clutter, GLib, GMenu, Gtk, Shell, St} = imports.gi;
const appSys = Shell.AppSystem.get_default();
const Constants = Me.imports.constants;
const Convenience = Me.imports.convenience;
const ExtensionSystem = imports.ui.extensionSystem;
const ExtensionUtils = imports.misc.extensionUtils;
const Gettext = imports.gettext.domain(Me.metadata['gettext-domain']);
const Main = imports.ui.main;
const MenuLayouts = Me.imports.menulayouts;
const MW = Me.imports.menuWidgets;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;
const Util = imports.misc.util;
const Utils =  Me.imports.utils;
const _ = Gettext.gettext;

var modernGnome = imports.misc.config.PACKAGE_VERSION >= '3.31.9';
const gnome36 = imports.misc.config.PACKAGE_VERSION >= '3.35.0';

var DASH_TO_PANEL_UUID = 'dash-to-panel@jderose9.github.com';

var ApplicationsButton =   Utils.defineClass({
    Name: 'ArcMenu_ApplicationsButton',
    Extends: PanelMenu.Button,
        _init(settings, panel) {
            this.callParent('_init');
            this._settings = settings;
            this._panel = panel;
            this._menuButtonWidget = new MW.MenuButtonWidget();
            
            //Tooltip showing/hiding
            this.tooltipShowing = false;
            this.tooltipHidingID = null;
            this.tooltipShowingID = null;

            //Create Main Button Left and Right Click Menus---------------------------------------------------
            let sourceActor =  modernGnome ?  this : this.actor;
 
            this.rightClickMenu = new RightClickMenu(sourceActor,1.0,St.Side.TOP);	
            this.rightClickMenu.connect('open-state-changed', this._onOpenStateChanged.bind(this));
           
            this.leftClickMenu = new ApplicationsMenu(sourceActor, 1.0, St.Side.TOP, this, this._settings);
            this.leftClickMenu.connect('open-state-changed', this._onOpenStateChanged.bind(this));
            //------------------------------------------------------------------------------------------------

            //Main Menu Manager--------------------------------------------------------
            this.menuManager = new PopupMenu.PopupMenuManager(this);
            this.menuManager._changeMenu = (menu) => {};
            this.menuManager.addMenu(this.rightClickMenu); 	
            this.menuManager.addMenu(this.leftClickMenu); 
            //-------------------------------------------------------------------------

            //Sub Menu Manager - For Simple Menu Layout--------------------------------
            this.subMenuManager = new PopupMenu.PopupMenuManager(this);
            this.subMenuManager._changeMenu = (menu) => {};
            //-------------------------------------------------------------------------

            //Applications Right Click Context Menu------------------------------------
            this.appMenuManager = new PopupMenu.PopupMenuManager(this);
            this.appMenuManager._changeMenu = (menu) => {};
            //-------------------------------------------------------------------------

            //Dash to Panel Integration----------------------------------------------------------------------
            this.dtp = Main.extensionManager ?
                        Main.extensionManager.lookup(DASH_TO_PANEL_UUID) : 
                        ExtensionUtils.extensions[DASH_TO_PANEL_UUID];
            this.extensionChangedId = (Main.extensionManager || ExtensionSystem).connect('extension-state-changed', (data, extension) => {
                if (extension.uuid === DASH_TO_PANEL_UUID && extension.state === 1) {
                    this.dtp = Main.extensionManager ?
                                Main.extensionManager.lookup(DASH_TO_PANEL_UUID) : 
                                ExtensionUtils.extensions[DASH_TO_PANEL_UUID];
                    this.rightClickMenu.addDTPSettings();   
                    this.dtpSettings = Convenience.getDTPSettings('org.gnome.shell.extensions.dash-to-panel',extension);
                    let side = this.dtpSettings.get_string('panel-position');
                    this.updateArrowSide(side ? side : 'TOP');
                    this.dtpPostionChangedID = this.dtpSettings.connect('changed::panel-position', ()=> {
                        let side = this.dtpSettings.get_string('panel-position');
                        this.updateArrowSide(side ? side : 'TOP');
                    });
                }
                if (extension.uuid === DASH_TO_PANEL_UUID && extension.state === 2) {
                    this.dtp = null;
                    this.rightClickMenu.removeDTPSettings();
                    this.updateArrowSide('TOP');
                    if(this.dtpPostionChangedID>0 && this.dtpSettings){
                        this.dtpSettings.disconnect(this.dtpPostionChangedID);
                        this.dtpPostionChangedID = 0;
                    }
                }  
            });
            if(this.dtp && this.dtp.stateObj){
                this.rightClickMenu.addDTPSettings();  
                this.dtpSettings = Convenience.getDTPSettings('org.gnome.shell.extensions.dash-to-panel',this.dtp);
                let side = this.dtpSettings.get_string('panel-position');
                this.updateArrowSide(side ? side : 'TOP');
                this.dtpPostionChangedID = this.dtpSettings.connect('changed::panel-position', ()=> {
                    let side = this.dtpSettings.get_string('panel-position');
                    this.updateArrowSide(side ? side : 'TOP');
                });
            }  
            //----------------------------------------------------------------------------------

            //Update Categories on 'installed-changed' event-------------------------------------
            this._installedChangedId = appSys.connect('installed-changed', () => {
                this._reload();
            });
            //-----------------------------------------------------------------------------------
            this._setMenuPositionAlignment();
            //Add Menu Button Widget to Button
            sourceActor.add_actor(this._menuButtonWidget.actor);
            if(gnome36){
                this.connect('event', this._onEvent.bind(this));
                this.connect('notify::visible', this._onVisibilityChanged.bind(this));

            }
            //Create Basic Layout ------------------------------------------------
            this.createLayoutID = GLib.timeout_add(0, 100, () => {
                this.createMenuLayout();
                this.createLayoutID = null;
                return GLib.SOURCE_REMOVE;
            });
            //--------------------------------------------------------------------
        },
        createMenuLayout(){
            this.section = new PopupMenu.PopupMenuSection();
            this.leftClickMenu.addMenuItem(this.section);            
            this.mainBox = new St.BoxLayout({
                vertical: false
            });        
            this.mainBox._delegate = this.mainBox;
            let themeContext = St.ThemeContext.get_for_stage(global.stage);
            let scaleFactor = themeContext.scale_factor;
            let height =  Math.round(this._settings.get_int('menu-height') / scaleFactor);
            this.mainBox.style = `height: ${height}px`;        
            this.section.actor.add_actor(this.mainBox);      
            //Create Menu Layout--------------------------------------------------
            let layout = this._settings.get_enum('menu-layout');
            if(layout == Constants.MENU_LAYOUT.Default)
                this.MenuLayout =  new MenuLayouts.arcmenu.createMenu(this);
            else if(layout == Constants.MENU_LAYOUT.Brisk)
                this.MenuLayout =  new MenuLayouts.brisk.createMenu(this); 
            else if(layout == Constants.MENU_LAYOUT.Whisker)
                this.MenuLayout = new MenuLayouts.whisker.createMenu(this); 
            else if (layout == Constants.MENU_LAYOUT.GnomeMenu)
                this.MenuLayout = new MenuLayouts.gnomemenu.createMenu(this); 
            else if (layout == Constants.MENU_LAYOUT.Mint)
                this.MenuLayout = new MenuLayouts.mint.createMenu(this); 
            else if (layout == Constants.MENU_LAYOUT.GnomeDash)
                this.MenuLayout = new MenuLayouts.gnomedash.createMenu(this); 
            else if (layout == Constants.MENU_LAYOUT.Elementary)
                this.MenuLayout = new MenuLayouts.elementary.createMenu(this); 
            else if (layout == Constants.MENU_LAYOUT.Redmond)
                this.MenuLayout = new MenuLayouts.redmond.createMenu(this); 
            else if (layout == Constants.MENU_LAYOUT.Simple)
                this.MenuLayout = new MenuLayouts.simple.createMenu(this);  
            else if (layout == Constants.MENU_LAYOUT.Simple2)
                this.MenuLayout = new MenuLayouts.simple2.createMenu(this);  
            else if (layout == Constants.MENU_LAYOUT.UbuntuDash)
                this.MenuLayout = new MenuLayouts.ubuntudash.createMenu(this); 
            else if (layout == Constants.MENU_LAYOUT.Budgie)
                this.MenuLayout = new MenuLayouts.budgie.createMenu(this);
            else if (layout == Constants.MENU_LAYOUT.Windows)
                this.MenuLayout = new MenuLayouts.windows.createMenu(this);
            else if (layout == Constants.MENU_LAYOUT.Runner)
                this.MenuLayout = new MenuLayouts.runner.createMenu(this);
            else if (layout == Constants.MENU_LAYOUT.Chromebook)
                this.MenuLayout = new MenuLayouts.chromebook.createMenu(this);
            else if (layout == Constants.MENU_LAYOUT.Raven)
                this.MenuLayout = new MenuLayouts.raven.createMenu(this);
            ///--------------------------------------------------------------------
            this._setMenuPositionAlignment();
            this.updateStyle();
        },
        getMenu(){
            return this.MenuLayout;
        },
        _setMenuPositionAlignment(){
            let layout = this._settings.get_enum('menu-layout');
            let arrowAlignment = (this._settings.get_int('menu-position-alignment') / 100);
            if(layout != Constants.MENU_LAYOUT.Runner){
                if(this._settings.get_enum('position-in-panel') == Constants.MENU_POSITION.Center){
                    this.rightClickMenu._arrowAlignment = arrowAlignment
                    this.leftClickMenu._arrowAlignment = arrowAlignment
                    this.rightClickMenu._boxPointer.setSourceAlignment(.5);
                    this.leftClickMenu._boxPointer.setSourceAlignment(.5);
                }
                else if(this.dtp && this.dtp.stateObj){
                    let side = this.dtpSettings.get_string('panel-position');
                    this.updateArrowSide(side ? side : 'TOP', false);
                }  
                else{
                    this.updateArrowSide('TOP', false);
                }
            }
            else{
                this.updateArrowSide('TOP', false);
                if(this._settings.get_enum('position-in-panel') == Constants.MENU_POSITION.Center){
                    this.rightClickMenu._arrowAlignment = arrowAlignment
                    this.rightClickMenu._boxPointer.setSourceAlignment(.5);
                }
            }

        },
        updateArrowSide(side, setAlignment = true){
            let arrowAlignment = 0;
            if (side == 'TOP') 
                side =  St.Side.TOP;
            else if (side == 'RIGHT') {
                arrowAlignment = 1;
                side =  St.Side.RIGHT;
            }
            else if (side == 'BOTTOM')
                side =  St.Side.BOTTOM;
            else {
                arrowAlignment = 1;
                side =  St.Side.LEFT;
            }
               
            this.rightClickMenu._arrowSide = side;
            this.rightClickMenu._boxPointer._arrowSide = side;
            this.rightClickMenu._boxPointer._userArrowSide = side;
            this.rightClickMenu._boxPointer.setSourceAlignment(arrowAlignment);
            this.rightClickMenu._arrowAlignment = arrowAlignment
            this.rightClickMenu._boxPointer._border.queue_repaint();

            this.leftClickMenu._arrowSide = side;
            this.leftClickMenu._boxPointer._arrowSide = side;
            this.leftClickMenu._boxPointer._userArrowSide = side;
            this.leftClickMenu._boxPointer.setSourceAlignment(arrowAlignment);
            this.leftClickMenu._arrowAlignment = arrowAlignment
            this.leftClickMenu._boxPointer._border.queue_repaint();
            
            if(setAlignment)
                this._setMenuPositionAlignment();
            
               
        },
        updateStyle(){
            if(this.MenuLayout)
                this.MenuLayout.updateStyle();
            let removeMenuArrow = this._settings.get_boolean('remove-menu-arrow');   
            let layout = this._settings.get_enum('menu-layout');
            let addStyle=this._settings.get_boolean('enable-custom-arc-menu');

            this.leftClickMenu.actor.style_class = addStyle ? 'arc-menu-boxpointer': 'popup-menu-boxpointer';
            this.leftClickMenu.actor.add_style_class_name( addStyle ? 'arc-menu' : 'popup-menu');

            this.rightClickMenu.actor.style_class = addStyle ? 'arc-menu-boxpointer': 'popup-menu-boxpointer';
            this.rightClickMenu.actor.add_style_class_name(addStyle ? 'arc-menu' : 'popup-menu');
    
            if(removeMenuArrow)
                this.leftClickMenu.actor.style = "-arrow-base:0px;-arrow-rise:0px; -boxpointer-gap: 0px;";
            else if(layout != Constants.MENU_LAYOUT.Raven)
                this.leftClickMenu.actor.style = null;
        },
        updateSearch(){
            if(this.MenuLayout)
                this.MenuLayout.updateSearch();
        },
        setSensitive(sensitive) {
            this.reactive = sensitive;
            this.can_focus = sensitive;
            this.track_hover = sensitive;
        },
        _onVisibilityChanged() {
            if (!this.rightClickMenu || !this.leftClickMenu)
                return;
    
            if (!this.visible){
                this.rightClickMenu.close();
                this.leftClickMenu.close();
            }     
        },
        _onEvent(actor, event) {
             if (event.type() == Clutter.EventType.BUTTON_PRESS){   
                if(event.get_button()==1){    
                    let layout = this._settings.get_enum('menu-layout');
                    if(layout == Constants.MENU_LAYOUT.GnomeDash)
                        Main.overview.toggle();
                    else{
                        if(layout == Constants.MENU_LAYOUT.Runner || layout == Constants.MENU_LAYOUT.Raven)
                            this.MenuLayout.updateRunnerLocation();
                        this.leftClickMenu.toggle();
                        if(this.leftClickMenu.isOpen){
                            this.mainBox.grab_key_focus();	
                        }
                           
                    }                
                }    
                else if(event.get_button()==3){                      
                    this.rightClickMenu.toggle();	                	
                }    
            }
            else if(event.type() == Clutter.EventType.TOUCH_BEGIN){         
                let layout = this._settings.get_enum('menu-layout');
                    if(layout == Constants.MENU_LAYOUT.GnomeDash)
                        Main.overview.toggle();
                    else{
                        if(layout == Constants.MENU_LAYOUT.Runner || layout == Constants.MENU_LAYOUT.Raven)
                            this.MenuLayout.updateRunnerLocation();
                        this.leftClickMenu.toggle();	
                        if(this.leftClickMenu.isOpen){
                            this.mainBox.grab_key_focus();	
                        }	
                    }         
            }
                    
            return Clutter.EVENT_PROPAGATE;
        },
        toggleMenu() {
            if(this.appMenuManager.activeMenu)
                this.appMenuManager.activeMenu.toggle();

            if(this.subMenuManager.activeMenu)
                this.subMenuManager.activeMenu.toggle();

            //If Layout is GnomeDash - toggle Main Overview   
            let layout = this._settings.get_enum('menu-layout');
            if(layout == Constants.MENU_LAYOUT.GnomeDash)
                Main.overview.toggle();
            else{
                if(layout == Constants.MENU_LAYOUT.Runner || layout == Constants.MENU_LAYOUT.Raven)
                    this.MenuLayout.updateRunnerLocation();
                this.leftClickMenu.toggle();
                if(this.leftClickMenu.isOpen){
                    this.mainBox.grab_key_focus();	
                }
            }	  

        },
        getActiveMenu(){
            if(this.appMenuManager.activeMenu)
                return this.appMenuManager.activeMenu;
            else if(this.subMenuManager.activeMenu)
                return this.appMenuManager.activeMenu;
            else if(this.leftClickMenu.isOpen)
                return this.leftClickMenu;
            else if(this.rightClickMenu.isOpen)
                return this.rightClickMenu;
            else
                return null;
        },
        toggleRightClickMenu(){
            if(this.rightClickMenu.isOpen)
                this.rightClickMenu.toggle();   
        },
        getWidget() {
            return this._menuButtonWidget;
        },
        updateHeight(){
            //set menu height
            let layout = this._settings.get_enum('menu-layout');
            let themeContext = St.ThemeContext.get_for_stage(global.stage);
            let scaleFactor = themeContext.scale_factor;
            let height =  Math.round(this._settings.get_int('menu-height') / scaleFactor);
            if(!(layout == Constants.MENU_LAYOUT.Simple || layout == Constants.MENU_LAYOUT.Simple2 || layout == Constants.MENU_LAYOUT.Runner) && this.MenuLayout)
                this.mainBox.style = `height: ${height}px`;
            
           
            this._redisplay();
            this._redisplayRightSide();
        },
        // Destroy the menu button
        destroy() {  
            if(this.reloadID){
                GLib.source_remove(this.reloadID);
                this.reloadID = null;
            }
            if(this.createLayoutID){
                GLib.source_remove(this.createLayoutID);
                this.createLayoutID = null;
            }
            if(this.updateMenuLayoutID){
                GLib.source_remove(this.updateMenuLayoutID);
                this.updateMenuLayoutID = null;
            }
            if (this.tooltipShowingID) {
                GLib.source_remove(this.tooltipShowingID);
                this.tooltipShowingID = null;
            }     
            if (this.tooltipHidingID) {
                GLib.source_remove(this.tooltipHidingID);
                this.tooltipHidingID = null;
            }   
            if(this.MenuLayout)
                this.MenuLayout.destroy();

            if(this.extensionChangedId){
                (Main.extensionManager || ExtensionSystem).disconnect(this.extensionChangedId);
                this.extensionChangedId = null;
            }
            if(this.dtpPostionChangedID && this.dtpSettings){
                this.dtpSettings.disconnect(this.dtpPostionChangedID);
                this.dtpPostionChangedID = null;
            }
            if(this._installedChangedId){
                appSys.disconnect(this._installedChangedId);
                this._installedChangedId = null;
            }
            if(this.leftClickMenu){
                this.leftClickMenu.destroy();
            }
            if(this.rightClickMenu){
                this.rightClickMenu.destroy();
            }
            this.container.child = null;
            this.container.destroy();
        },
        _updateMenuLayout(){
            this.tooltipShowing = false;
            if (this.tooltipShowingID) {
                GLib.source_remove(this.tooltipShowingID);
                this.tooltipShowingID = null;
            }     
            if (this.tooltipHidingID) {
                GLib.source_remove(this.tooltipHidingID);
                this.tooltipHidingID = null;
            }    
            this.MenuLayout.destroy();
            this.MenuLayout = null;
            this.leftClickMenu.removeAll();
            this.updateMenuLayoutID = GLib.timeout_add(0, 100, () => {
                this.createMenuLayout();
                this.updateMenuLayoutID = null;
                return GLib.SOURCE_REMOVE;
            });  
        },        
        _loadPinnedShortcuts(){
            if(this.MenuLayout)
                this.MenuLayout._loadPinnedShortcuts();
        },
        updateRunnerLocation(){
            if(this.MenuLayout)
                this.MenuLayout.updateRunnerLocation();
        },
        updateIcons(){
            if(this.MenuLayout)
                this.MenuLayout.updateIcons();
        },
        _loadCategories(){
            if(this.MenuLayout)
                this.MenuLayout._loadCategories();
        },
        _clearApplicationsBox() {
            if(this.MenuLayout)
                this.MenuLayout._clearApplicationsBox();
        },
        _displayCategories() {
            if(this.MenuLayout)
                this.MenuLayout._displayCategories();
        },
        _displayFavorites() {
            if(this.MenuLayout)
                this.MenuLayout._displayFavorites();
        },
        _loadFavorites() {
            if(this.MenuLayout)
                this.MenuLayout._loadFavorites();
        },
        _displayAllApps() {
            if(this.MenuLayout)
                this.MenuLayout._displayAllApps();
        },
        selectCategory(dir) {
            if(this.MenuLayout)
                this.MenuLayout.selectCategory(dir);
        },
        _displayGnomeFavorites(){
            if(this.MenuLayout)
                this.MenuLayout._displayGnomeFavorites();
        },
        _setActiveCategory(){
            if(this.MenuLayout)
                this.MenuLayout._setActiveCategory();
        },
        scrollToButton(button){
            if(this.MenuLayout)
                this.MenuLayout.scrollToButton(button);
        },
        _redisplayRightSide(){
            if(this.MenuLayout)
                this.MenuLayout._redisplayRightSide();
        },
        _redisplay() {
            if(this.MenuLayout)
                this.MenuLayout._redisplay();
        },
        _reload(){
            if(this.MenuLayout)
                this.MenuLayout.needsReload = true;
        },
        setCurrentMenu(menu) {
            if(this.MenuLayout)
                this.MenuLayout.setCurrentMenu(menu);
        },
        getCurrentMenu(){
            if(this.MenuLayout)
                return this.MenuLayout.getCurrentMenu();
        },
        getShouldLoadFavorites(){
            if(this.MenuLayout)
                return this.MenuLayout.shouldLoadFavorites;
        },
        resetSearch(){ //used by back button to clear results
            if(this.MenuLayout)
                this.MenuLayout.resetSearch();
        },
        setDefaultMenuView(){
            if(this.MenuLayout)
                this.MenuLayout.setDefaultMenuView();
        },
        // Handle changes in menu open state
        _onOpenStateChanged(menu, open) {
            if (open){
                if(this.menuManager.activeMenu) 
                    this.menuManager.activeMenu.toggle();
                this.getWidget().getPanelIcon().add_style_pseudo_class('active');
                modernGnome ?  this.add_style_pseudo_class('active') : this.actor.add_style_pseudo_class('active');
            }      
            else{ 
                this.getWidget().getPanelIcon().remove_style_pseudo_class('active');
                modernGnome ? this.remove_style_pseudo_class('active'): this.actor.remove_style_pseudo_class('active');
            }
            if (menu == this.leftClickMenu) {
                if(open){
                    this.mainBox.show();  
                }
            }
        }
    });
// Aplication menu class
var ApplicationsMenu = class ArcMenu_ApplicationsMenu extends PopupMenu.PopupMenu{
    // Initialize the menu
    constructor(sourceActor, arrowAlignment, arrowSide, button, settings) {
        super(sourceActor, arrowAlignment, arrowSide);
        this._settings = settings;
        this._button = button;  
        this.actor.add_style_class_name('panel-menu');
        Main.uiGroup.add_actor(this.actor);
        this.actor.hide();
        this.connect('menu-closed', () => this._onCloseEvent());
    }

    open(animation){
        this._onOpenEvent();
        super.open(animation);
    }

    _onOpenEvent(){
        if(this._button.MenuLayout && this._button.MenuLayout.needsReload){
            this._button.MenuLayout._reload();
            this._button.MenuLayout.needsReload = false;
            this._button.setDefaultMenuView(); 
        } 
    }

    _onCloseEvent(){
        if(this._button.appMenuManager.activeMenu)
            this._button.appMenuManager.activeMenu.toggle();
        if(this._button.subMenuManager.activeMenu)
            this._button.subMenuManager.activeMenu.toggle();
        if(this._button.MenuLayout && this._button.MenuLayout.isRunning){
            if(this._button.MenuLayout.needsReload)
                this._button.MenuLayout._reload();
            this._button.MenuLayout.needsReload = false;
            this._button.setDefaultMenuView(); 
        }
    }
};
// Aplication menu class
var RightClickMenu = class ArcMenu_RightClickMenu extends PopupMenu.PopupMenu {
    // Initialize the menu
    constructor(sourceActor, arrowAlignment, arrowSide, button, settings) {
        super(sourceActor, arrowAlignment, arrowSide);
        this._settings = settings;
        this._button = button;  
        this.DTPSettings=false;
        
        this.actor.add_style_class_name('panel-menu');
        Main.uiGroup.add_actor(this.actor);
        this.actor.hide();
        let item = new PopupMenu.PopupMenuItem(_("Arc Menu Settings"));
        item.connect('activate', ()=>{
            Util.spawnCommandLine('gnome-shell-extension-prefs arc-menu@linxgem33.com');
        });
        this.addMenuItem(item);        
        item = new PopupMenu.PopupSeparatorMenuItem();     
        item._separator.style_class='arc-menu-sep';     
        this.addMenuItem(item);      
        
        item = new PopupMenu.PopupMenuItem(_("Arc Menu on GitLab"));        
        item.connect('activate', ()=>{
            Util.spawnCommandLine('xdg-open https://gitlab.com/LinxGem33/Arc-Menu');
        });     
        this.addMenuItem(item);  
        item = new PopupMenu.PopupMenuItem(_("About Arc Menu"));          
        item.connect('activate', ()=>{
            Util.spawnCommandLine('xdg-open https://gitlab.com/LinxGem33/Arc-Menu/wikis/Introduction');
        });      
        this.addMenuItem(item);
    }
    addDTPSettings(){
        if(this.DTPSettings==false){
            let item = new PopupMenu.PopupMenuItem(_("Dash to Panel Settings"));
            item.connect('activate', ()=>{
                Util.spawnCommandLine('gnome-shell-extension-prefs ' + DASH_TO_PANEL_UUID);
            });
            this.addMenuItem(item,1);   
            this.DTPSettings=true;
        }
    }
    removeDTPSettings(){
        let children = this._getMenuItems();
        if(children[1] instanceof PopupMenu.PopupMenuItem)
            children[1].destroy();
        this.DTPSettings=false;
    }
};
