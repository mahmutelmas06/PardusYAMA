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
const {Atk, Clutter, Gio, GLib, GMenu, GObject, Gtk, Shell, St} = imports.gi;
const AccountsService = imports.gi.AccountsService;
const AppFavorites = imports.ui.appFavorites;
const Constants = Me.imports.constants;
const Dash = imports.ui.dash;
const DND = imports.ui.dnd;
const ExtensionUtils = imports.misc.extensionUtils;
const Gettext = imports.gettext.domain(Me.metadata['gettext-domain']);
const LoginManager = imports.misc.loginManager;
const Main = imports.ui.main;
const PopupMenu = imports.ui.popupMenu;
const Signals = imports.signals;
const Tweener = imports.ui.tweener;
const Util = imports.misc.util;
const Utils =  Me.imports.utils;
const _ = Gettext.gettext;

const SWITCHEROO_BUS_NAME = 'net.hadess.SwitcherooControl';
const SWITCHEROO_OBJECT_PATH = '/net/hadess/SwitcherooControl';
const SwitcherooProxyInterface = '<node> \
<interface name="net.hadess.SwitcherooControl"> \
  <property name="HasDualGpu" type="b" access="read"/> \
</interface> \
</node>';
const SwitcherooProxy = Gio.DBusProxy.makeProxyWrapper(SwitcherooProxyInterface);

// Menu Size variables
const LARGE_ICON_SIZE = 34;
const MEDIUM_ICON_SIZE = 25;
const SMALL_ICON_SIZE = 16;
const USER_AVATAR_SIZE = 28;

const TOOLTIP_LABEL_SHOW_TIME = 0.15;
const TOOLTIP_LABEL_HIDE_TIME = 0.1;
const gnome36 = imports.misc.config.PACKAGE_VERSION >= '3.35.0';
const modernGnome = imports.misc.config.PACKAGE_VERSION >= '3.31.9';

var AppRightClickMenu = class ArcMenu_AppRightClickMenu extends PopupMenu.PopupMenu {
    constructor(actor, app, button){
        super(actor,0.0,St.Side.TOP);
        this._button = button;
        this._settings = this._button._settings;
        this._app = app;
        this.layout = this._settings.get_enum('menu-layout');
        this._boxPointer.setSourceAlignment(.20);
        
        this.discreteGpuAvailable = false;
        Gio.DBus.system.watch_name(SWITCHEROO_BUS_NAME,
            Gio.BusNameWatcherFlags.NONE,
            this._switcherooProxyAppeared.bind(this),
            () => {
                this._switcherooProxy = null;
                this._updateDiscreteGpuAvailable();
            });
        this.redisplay();
    }

    centerBoxPointerPosition(){
        this._boxPointer.setSourceAlignment(.50);
        this._arrowAlignment = .5;
    }

    set isPinnedApp(isPinnedApp){
        this._isPinnedApp = isPinnedApp;
    }

    set path(path){
        this._path = path;
    }
    
    _updateDiscreteGpuAvailable() {
        if (!this._switcherooProxy)
            this.discreteGpuAvailable = false;
        else
            this.discreteGpuAvailable = this._switcherooProxy.HasDualGpu;
    }

    _switcherooProxyAppeared() {
        this._switcherooProxy = new SwitcherooProxy(Gio.DBus.system, SWITCHEROO_BUS_NAME, SWITCHEROO_OBJECT_PATH,
            (proxy, error) => {
                if (error) {
                    log(error.message);
                    return;
                }
                this._updateDiscreteGpuAvailable();
            });
    }
    closeMenus(){
        this._button.leftClickMenu.toggle(); 
    }
    redisplay(){
        this.removeAll();
        let addStyle = this._settings.get_boolean('enable-custom-arc-menu');
        if(addStyle){
            this.actor.style_class = 'arc-right-click-boxpointer';
            this.actor.add_style_class_name('arc-right-click');
            this.actor.set_name('rightClickMenu');
        }
        else{
            this.actor.style_class = 'popup-menu-boxpointer';
            this.actor.add_style_class_name('popup-menu');   
        }
        if(this._app instanceof Shell.App){
            if(this._path != undefined){
                this._newWindowMenuItem = this._appendMenuItem(_("Open Folder Location"));
                this._newWindowMenuItem.connect('activate', () => {
                    Util.spawnCommandLine('nautilus "' +this._path +'"');
                    this.emit('activate-window', null);
                    this.closeMenus();
                });  
            }
            else{
                this.appInfo = this._app.get_app_info();
                let actions = this.appInfo.list_actions();
                
                let windows = this._app.get_windows().filter(
                    w => !w.skip_taskbar
                );
    
                if (windows.length > 0){    
                    let item = new PopupMenu.PopupMenuItem(_("Current Windows:"),{reactive:false,can_focus:false});
                    item.actor.add_style_class_name('inactive');  
                    this.addMenuItem(item);
                }
    
                windows.forEach(window => {
                    let title = window.title ? window.title
                                            : this._app.get_name();
                    let item = this._appendMenuItem(title);
                    item.connect('activate', () => {
                        this.emit('activate-window', window);
                        Main.activateWindow(window);
                        this.closeMenus();
                        
                    });
                });
                if (!this._app.is_window_backed()) {
                    this._appendSeparator();
                    if (this._app.can_open_new_window() && !actions.includes('new-window')) {
                        this._newWindowMenuItem = this._appendMenuItem(_("New Window"));
                        this._newWindowMenuItem.connect('activate', () => {
                            this._app.open_new_window(-1);
                            this.emit('activate-window', null);
                            this.closeMenus();
                        });  
                    }
                    if (this.discreteGpuAvailable &&
                        this._app.state == Shell.AppState.STOPPED &&
                        !actions.includes('activate-discrete-gpu')) {
                        this._onDiscreteGpuMenuItem = this._appendMenuItem(_("Launch using Dedicated Graphics Card"));
                        this._onDiscreteGpuMenuItem.connect('activate', () => {
                            this._app.launch(0, -1, true);
                            this.emit('activate-window', null);
                            this.closeMenus();
                        });
                    }
        
                    for (let i = 0; i < actions.length; i++) {
                        let action = actions[i];
                        let item = this._appendMenuItem(this.appInfo.get_action_name(action));
                        item.connect('activate', (emitter, event) => {
                            this._app.launch_action(action, event.get_time(), -1);
                            this.emit('activate-window', null);
                            this.closeMenus();
                        });
                    }

                    let desktopIcons = Main.extensionManager ?
                            Main.extensionManager.lookup("desktop-icons@csoriano") : //gnome-shell >= 3.33.4
                            ExtensionUtils.extensions["desktop-icons@csoriano"];
                    let desktopIconsNG = Main.extensionManager ?
                            Main.extensionManager.lookup("ding@rastersoft.com") : //gnome-shell >= 3.33.4
                            ExtensionUtils.extensions["ding@rastersoft.com"];        
                    if((desktopIcons && desktopIcons.stateObj) || (desktopIconsNG && desktopIconsNG.stateObj) ){
                        this._appendSeparator();
                        let fileSource = this.appInfo.get_filename();
                        let fileDestination = GLib.get_user_special_dir(imports.gi.GLib.UserDirectory.DIRECTORY_DESKTOP);
                        let file = Gio.File.new_for_path(fileDestination + "/" + this._app.get_id());
                        let exists = file.query_exists(null);
                        if(exists){
                            let item = this._appendMenuItem(_("Delete Desktop Shortcut"));
                            item.connect('activate', () => {
                                if(fileSource && fileDestination)
                                    Util.spawnCommandLine("rm " + fileDestination + "/" + this._app.get_id());
                                this.close();
                            });
                        }
                        else{
                            let item = this._appendMenuItem(_("Create Desktop Shortcut"));
                            item.connect('activate', () => {
                                if(fileSource && fileDestination)
                                    Util.spawnCommandLine("cp " + fileSource + " " + fileDestination);
                                this.close();
                            });
                        }
                    }

                    let canFavorite = global.settings.is_writable('favorite-apps');
                    if (canFavorite) {
                        this._appendSeparator();
                        let isFavorite = AppFavorites.getAppFavorites().isFavorite(this._app.get_id());
                        if (isFavorite) {
                            let item = this._appendMenuItem(_("Remove from Favorites"));
                            item.connect('activate', () => {
                                let favs = AppFavorites.getAppFavorites();
                                favs.removeFavorite(this._app.get_id());
                            });
                        } else {
                            let item = this._appendMenuItem(_("Add to Favorites"));
                            item.connect('activate', () => {
                                let favs = AppFavorites.getAppFavorites();
                                favs.addFavorite(this._app.get_id());
                            });
                        }
                    }
                    if(this._isPinnedApp || this.layout == Constants.MENU_LAYOUT.Default || this.layout == Constants.MENU_LAYOUT.Windows || 
                        this.layout == Constants.MENU_LAYOUT.UbuntuDash || this.layout == Constants.MENU_LAYOUT.Raven){
                        let pinnedApps = this._settings.get_strv('pinned-app-list');
                        let pinnedAppID=[];
                        for(let i=2;i<pinnedApps.length;i+=3){
                            pinnedAppID.push(pinnedApps[i]);  
                        }
                        let match = pinnedAppID.find( (element)=>{
                            return element == this._app.get_id();
                        });
                        if(match){ //if app is pinned add Unpin
                            let item = new PopupMenu.PopupMenuItem(_("Unpin from Arc Menu"));  
                            item.connect('activate', ()=>{
                                for(let i = 0;i<pinnedApps.length;i+=3){
                                    if(pinnedApps[i+2]==this._app.get_id()){
                                        this.close();
                                        pinnedApps.splice(i,3);
                                        this._settings.set_strv('pinned-app-list',pinnedApps);
                                        break;
                                    }
                                }
                            });      
                            this.addMenuItem(item);
                        }
                        else{ //if app is not pinned add pin
                            let item = new PopupMenu.PopupMenuItem(_("Pin to Arc Menu"));   
                            item.connect('activate', ()=>{
                                pinnedApps.push(this.appInfo.get_display_name());
                                pinnedApps.push(this.appInfo.get_icon().to_string());
                                pinnedApps.push(this._app.get_id());
                                this._settings.set_strv('pinned-app-list',pinnedApps);
                            });      
                            this.addMenuItem(item);
                        }
                    }
                    
                    if (Shell.AppSystem.get_default().lookup_app('org.gnome.Software.desktop')) {
                        this._appendSeparator();
                        let item = this._appendMenuItem(_("Show Details"));
                        item.connect('activate', () => {
                            let id = this._app.get_id();
                            let args = GLib.Variant.new('(ss)', [id, '']);
                            Gio.DBus.get(Gio.BusType.SESSION, null, (o, res) => {
                                let bus = Gio.DBus.get_finish(res);
                                bus.call('org.gnome.Software',
                                        '/org/gnome/Software',
                                        'org.gtk.Actions', 'Activate',
                                        GLib.Variant.new('(sava{sv})',
                                                        ['details', [args], null]),
                                        null, 0, -1, null, null);
                                this.closeMenus();
                            });
                        });
                    }
                }   
            
            }
        }  
        else{  //if pinned custom shortcut add unpin option to menu    
            if(this._isPinnedApp || this.layout == Constants.MENU_LAYOUT.Default || this.layout == Constants.MENU_LAYOUT.Windows || 
                this.layout == Constants.MENU_LAYOUT.UbuntuDash || this.layout == Constants.MENU_LAYOUT.Raven){
                this._appendSeparator();
                let item = new PopupMenu.PopupMenuItem(_("Unpin from Arc Menu"));   
                item.connect('activate', ()=>{
                    let pinnedApps = this._settings.get_strv('pinned-app-list');
                    for(let i = 0;i<pinnedApps.length;i+=3){
                        if(pinnedApps[i+2]==this._app){
                            this.close();
                            pinnedApps.splice(i,3);
                            this._button.favoritesArray.splice(i / 3, 1);
                            this._settings.set_strv('pinned-app-list',pinnedApps);
                            break;
                        }
                    }
                });      
                this.addMenuItem(item);
            }
        }
    }

    _appendSeparator() {
        let separator = new PopupMenu.PopupSeparatorMenuItem();
        separator.actor.style_class='app-right-click-sep';
        separator._separator.style_class='';
        this.addMenuItem(separator);
    }

    _appendMenuItem(labelText) {
        let item = new PopupMenu.PopupMenuItem(labelText);
        this.addMenuItem(item);
        return item;
    }
    _onKeyPress(actor, event) {
        // Disable toggling the menu by keyboard
        // when it cannot be toggled by pointer
        if (!actor.reactive)
            return Clutter.EVENT_PROPAGATE;

        let navKey;
        switch (this._boxPointer.arrowSide) {
        case St.Side.TOP:
            navKey = Clutter.KEY_Down;
            break;
        case St.Side.BOTTOM:
            navKey = Clutter.KEY_Up;
            break;
        case St.Side.LEFT:
            navKey = Clutter.KEY_Right;
            break;
        case St.Side.RIGHT:
            navKey = Clutter.KEY_Left;
            break;
        }

        let state = event.get_state();

        // if user has a modifier down (except capslock)
        // then don't handle the key press here
        state &= ~Clutter.ModifierType.LOCK_MASK;
        state &= Clutter.ModifierType.MODIFIER_MASK;

        if (state)
            return Clutter.EVENT_PROPAGATE;

        let symbol = event.get_key_symbol();
        if (symbol == Clutter.KEY_space || symbol == Clutter.KEY_Return) {
            this.toggle();
            return Clutter.EVENT_STOP;
        } else if (symbol == Clutter.KEY_Escape && this.isOpen) {
            this.close();
            return Clutter.EVENT_STOP;
        } else if (symbol == navKey) {
            if (this.isOpen){
                this.actor.navigate_focus(null, Gtk.DirectionType.TAB_FORWARD, false);
                return Clutter.EVENT_STOP;
            }
            else 
                return Clutter.EVENT_PROPAGATE;
        } else {
            return Clutter.EVENT_PROPAGATE;
        }
    }


};

var SeparatorDrawingArea =  GObject.registerClass(class ArcMenu_SeparatorDrawingArea extends St.DrawingArea {
    _init(settings,alignment,style,params) {
        super._init(params);
        this._settings = settings;
        this._alignment = alignment;
        this._style = style;

        if(this._style == Constants.SEPARATOR_STYLE.SHORT)
            this.set_height(15); //increase height if on right side
        else if(this._style == Constants.SEPARATOR_STYLE.LONG)
            this.set_height(10);
        else if(this._style == Constants.SEPARATOR_STYLE.MAX)
            this.set_height(1);
    }
    vfunc_repaint(){
       
        let shouldDraw = this._settings.get_boolean('vert-separator');
        if((this._alignment == Constants.SEPARATOR_ALIGNMENT.VERTICAL && shouldDraw) || 
            this._alignment == Constants.SEPARATOR_ALIGNMENT.HORIZONTAL || 
            (this._alignment == Constants.SEPARATOR_ALIGNMENT.VERTICAL && this._style == Constants.SEPARATOR_STYLE.SHORT)){
            let cr = this.get_context();
            let [width, height] = this.get_surface_size();
            let color = this._settings.get_string('separator-color')
            let b, stippleColor;   
            [b,stippleColor] = Clutter.Color.from_string(color);   
            let stippleWidth = 1;
            if(this._alignment == Constants.SEPARATOR_ALIGNMENT.VERTICAL){
                let x = Math.floor(width / 2) + 0.5;
                if(this._style == Constants.SEPARATOR_STYLE.SHORT){
                    cr.moveTo(x,  height / 5);
                    cr.lineTo(x, 4 * height / 5);
                }
                else{
                    cr.moveTo(x,  0.5);
                    cr.lineTo(x, height - 0.5);
                }
            }
            else if (this._alignment == Constants.SEPARATOR_ALIGNMENT.HORIZONTAL){
                if(this._style == Constants.SEPARATOR_STYLE.SHORT){
                    cr.moveTo(width / 4, height - 7.5);
                    cr.lineTo(3 * width / 4, height - 7.5);
                }
                else if(this._style == Constants.SEPARATOR_STYLE.LONG){
                    cr.moveTo(25, height - 4.5);
                    cr.lineTo(width - 25, height - 4.5);
                }
                else if(this._style == Constants.SEPARATOR_STYLE.MAX){
                    cr.moveTo(4, 0.5);
                    cr.lineTo(width - 4, 0.5);
                }
            }
            Clutter.cairo_set_source_color(cr, stippleColor);
            cr.setLineWidth(stippleWidth);
            cr.stroke();
            cr.$dispose();
        }
        return false;
    }
});

// Menu item to launch GNOME activities overview
var ActivitiesMenuItem =  Utils.createClass({
    Name: 'ArcMenu_ActivitiesMenuItem',
    Extends: PopupMenu.PopupBaseMenuItem, 
    // Initialize the menu item
    _init(button) {
        this.callParent('_init');
        this._button = button;
        this._icon = new St.Icon({
            icon_name: 'view-fullscreen-symbolic',
            style_class: 'popup-menu-icon',
            icon_size: SMALL_ICON_SIZE
        });
        this.actor.add_child(this._icon);
        let label = new St.Label({
            text: _("Activities Overview"),
            y_expand: true,
            y_align: Clutter.ActorAlign.CENTER
        });
        this.actor.add_child(label);
        if(gnome36){
            this.connect('button-press-event', this._onButtonPressEvent.bind(this));
            this.connect('button-release-event', this._onButtonReleaseEvent.bind(this));
        }
    },

    // Activate the menu item (Open activities overview)
    activate(event) {
        this._button.leftClickMenu.toggle();
        Main.overview.show();
        this.callParent('activate',event);
    },
    _onButtonPressEvent(actor, event) {
        return Clutter.EVENT_PROPAGATE;
    },
    _onButtonReleaseEvent(actor, event) {
        if(event.get_button()==1){
            this.activate(event);
        }
        return Clutter.EVENT_STOP;
    }
});

/**
 * A class representing a Tooltip.
 */
var Tooltip = class ArcMenu_Tooltip{
    constructor(menu, sourceActor, text) {
        this._button = menu._button;
        this.sourceActor = sourceActor;
        this._settings = this._button._settings;
        this.flipY = false;
        this.actor = new St.Label({
            style_class: 'dash-label',
            text: text ? _(text) : "",
            opacity: 0,
            y_align: .5
        });
        this.actor.set_name('tooltip-menu-item');
        global.stage.add_actor(this.actor);
        this.actor.connect('destroy',()=>{
            if(this.destroyID){
                this.sourceActor.disconnect(this.destroyID);
                this.destroyID=null
            }
            if(this.hoverID){
                this.sourceActor.disconnect(this.hoverID);
                this.hoverID=null
            }
            if(this.toggleID){
                this._settings.disconnect(this.toggleID);
                this.toggleID=null
            }
        })
        this.destroyID = this.sourceActor.connect('destroy',this.destroy.bind(this));
        this.hoverID = this.sourceActor.connect('notify::hover', this._onHover.bind(this));
        this._useTooltips = ! this._settings.get_boolean('disable-tooltips');
        this.toggleID = this._settings.connect('changed::disable-tooltips', this.disableTooltips.bind(this));
    }

    set isButton(isButton){
        this._isButton = isButton;
    }

    disableTooltips() {
        this._useTooltips = ! this._settings.get_boolean('disable-tooltips');
    }

    _onHover() {
        if (this.sourceActor.hover) {
            if(this._button.tooltipShowing){
                this.show();
            }
            else{
                this._button.tooltipShowingID = GLib.timeout_add(0, 750, () => {
                    this.show();
                    this._button.tooltipShowing = true;
                    this._button.tooltipShowingID = null;
                    return GLib.SOURCE_REMOVE;
                });
            }
            if (this._button.tooltipHidingID) {
                GLib.source_remove(this._button.tooltipHidingID);
                this._button.tooltipHidingID = null;
            }
        } 
        else {
            this.hide();
            if (this._button.tooltipShowingID) {
                GLib.source_remove(this._button.tooltipShowingID);
                this._button.tooltipShowingID = null;
            }
            this._button.tooltipHidingID = GLib.timeout_add(0, 750, () => {
                this._button.tooltipShowing = false;
                this._button.tooltipHidingID = null;
                return GLib.SOURCE_REMOVE;
            });          
        }
    }

    show() {
        if(this._useTooltips){
            let [stageX, stageY] = this.sourceActor.get_transformed_position();
            let [width, height] = this.sourceActor.get_transformed_size();
            let [menuX, menuY] = this._button.leftClickMenu.actor.get_transformed_position();
            
            let x = this._isButton ? stageX - Math.round((this.actor.get_width() - width) / 2) : stageX;
            let y = this._isButton ? stageY - this.actor.get_height() - 5 : stageY + height;
            if(this.flipY) 
                y = stageY + height + 5;
            if((x <= 0) || (x - menuX) < 10)
                x = menuX + 10;

            this.actor.show();
            this.actor.set_position(x, y);
            Tweener.addTween(this.actor, {
                opacity: 255,
                time: TOOLTIP_LABEL_SHOW_TIME,
                transition: 'easeOutQuad'
            });
        }
    }

    hide() {
        if(this._useTooltips){
            Tweener.addTween(this.actor, {
                opacity: 0,
                time: TOOLTIP_LABEL_HIDE_TIME,
                transition: 'easeOutQuad',
                onComplete: () => {
                    this.actor.hide();
                }
            });
        }
    }

    destroy() {
        if (this._button.tooltipShowingID) {
            GLib.source_remove(this._button.tooltipShowingID);
            this._button.tooltipShowingID = null;
        }
        if (this._button.tooltipHidingID) {
            GLib.source_remove(this._button.tooltipHidingID);
            this._button.tooltipHidingID = null;
        }
        if(this.toggleID>0){
            this._settings.disconnect(this.toggleID);
            this.toggleID = 0;
        }
        if(this.hoverID>0){
            this.sourceActor.disconnect(this.hoverID);
            this.hoverID = 0;
        }
        global.stage.remove_actor(this.actor);
        this.actor.destroy();
    }
};


/**
 * A base class for custom session buttons.
 */
var SessionButton = class ArcMenu_SessionButton{
    constructor(button, accessible_name, icon_name, gicon) {
        this._button = button;
        this.menuToggle = true;
        this.actor = new St.Button({
            reactive: true,
            can_focus: true,
            track_hover: true,
            accessible_name: accessible_name ? accessible_name : "",
            style_class: "arc-menu-button"
        });

        this.tooltip = new Tooltip(this._button, this.actor, accessible_name);
        this.tooltip.isButton = true;
        this.tooltip.hide();
        let layout = this._button._settings.get_enum('menu-layout');
        let iconSize;
        if(layout == Constants.MENU_LAYOUT.Mint)
            iconSize = 21;
        else
            iconSize = SMALL_ICON_SIZE;
        this._icon = new St.Icon({ 
            gicon: icon_name ? Gio.icon_new_for_string(icon_name) : null,
            icon_size: iconSize  
        });
        if(gicon)
            this._icon.gicon = gicon;
        else
            this._icon.gicon = icon_name ? Gio.icon_new_for_string(icon_name) : "";
        this.actor.child = this._icon;
        this.actor.connect('clicked', this._onClick.bind(this));
    }

    disableMenuToggle(){
        this.menuToggle = false;
    }

    _onClick() {
        if(this.menuToggle)
            this._button.leftClickMenu.toggle();
        this.activate();
    }

    activate() {
        // Button specific action
    }
};
// Menu Place Button Shortcut item class
var PlaceButtonItem = class ArcMenu_PlaceButtonItem extends SessionButton {
    // Initialize menu item
    constructor(button, info) {
        super(button, _(info.name), null, info.icon);
        this._button = button;
        this._info = info;
    }
    // Activate (launch) the shortcut
    activate() {
        this._info.launch();
    }

};
// Menu Category item class
var CategoryMenuButton = class ArcMenu_CategoryMenuButton extends SessionButton {
    // Initialize menu item
    constructor(button, category, title=null) {
        let name;
        let icon;
        if(category){
            name = category.get_name();
            icon = category.get_icon().to_string();
        }
        else if(title=="Home Screen"){
            name = _("Home Screen");
            icon = 'emblem-favorite-symbolic';
        }   
        else if(title!=null){
            name = title == "All Programs" ? _("All Programs") : _("Favorites");
            icon = title == "All Programs" ? 'view-grid-symbolic': 'emblem-favorite-symbolic';
        }   
        else {
            name = _("Frequent Apps");
            icon = 'emblem-favorite-symbolic';
        }
        super(button, _(name), icon);
        this.actor.style = "padding: 10px; min-height: 0px; border-width: 0px;";
        this._button = button;
        this._category = category;
        this.title = title;
        this.disableMenuToggle();

    }
    // Activate menu item (Display applications in category)
    activate(event) {
        if (this._category)
            this._button.selectCategory(this._category);
        else if(this.title =="All Programs")
            this._button._displayAllApps(this.actor);
        else if(this.title =="Home Screen")
            this._button._displayFavorites();
        else if(this.title == "Favorites")
            this._button._displayGnomeFavorites();
        else
            this._button.selectCategory("Frequent Apps");   
    }
};
// Settings Button
var MintButton = class ArcMenu_MintButton extends SessionButton {
    // Initialize the button
    constructor(button, name, icon, command) {
        super(button, name, icon);
        this._command = command;
        this._button = button;
        this.layout = this._button._settings.get_enum('menu-layout');
        this._app = Shell.AppSystem.get_default().lookup_app(this._command);
        if(this._app){
            this.actor.connect("button-release-event", this._onButtonReleaseEvent.bind(this));
        }
        this.disableMenuToggle();
    }
    _onButtonReleaseEvent(actor, event) {
  	    if(event.get_button()==3){
            if(this.rightClickMenu == undefined){
                this.rightClickMenu = new AppRightClickMenu(this.actor, this._app, this._button);
                if(this.layout == Constants.MENU_LAYOUT.UbuntuDash)
                    this.rightClickMenu.centerBoxPointerPosition();
                this._button.appMenuManager.addMenu(this.rightClickMenu);
                this.rightClickMenu.actor.hide();
                Main.uiGroup.add_actor(this.rightClickMenu.actor);
                this.actor.connect('destroy', ()=>{
                    this.rightClickMenu.destroy();
                });
            }
            this.tooltip.hide();
            if(!this.rightClickMenu.isOpen)
                this.rightClickMenu.redisplay();
            this.rightClickMenu.toggle();
	    }   
    }
    // Activate the button (Shutdown)
    activate() {
        if(this._app){
            this._button.leftClickMenu.toggle();
            this._app.open_new_window(-1);
        }
        else if(this._command === "ArcMenu_LogOut"){
            this._button.leftClickMenu.toggle();
            this._button._session.LogoutRemote(0);
        }
        else if(this._command === "ArcMenu_Lock"){
            this._button.isRunning = false;
            this._button.leftClickMenu.toggle();
            Main.screenShield.lock(true);
        }
        else if(this._command === "ArcMenu_PowerOff"){
            this._button.leftClickMenu.toggle();
            this._button._session.ShutdownRemote(0);
        }
        else if(this._command === "ArcMenu_Suspend"){
            this._button.leftClickMenu.toggle();
            let loginManager = LoginManager.getLoginManager();
            loginManager.canSuspend((result) => {
                if (result) {
                    loginManager.suspend();
                }
            });
        }
        else{
            this._button.leftClickMenu.toggle();
            Util.spawnCommandLine(this._command);
        }
            
    }
};
// Settings Button
var SettingsButton = class ArcMenu_SettingsButton extends SessionButton {
    // Initialize the button
    constructor(button) {
        super(button, _("Settings"), 'emblem-system-symbolic');
    }

    // Activate the button (Shutdown)
    activate() {
        Util.spawnCommandLine('gnome-control-center');
    }
};

// Arc Menu Settings Button
var ArcMenuSettingsButton = class ArcMenu_ArcMenuSettingsButton extends SessionButton {
    // Initialize the button
    constructor(button) {
        super(button, _("Arc Menu Settings"), Me.path + '/media/icons/arc-menu-symbolic.svg');
        this.tooltip.flipY = true;
    }

    // Activate the button (Shutdown)
    activate() {
        Util.spawnCommandLine('gnome-shell-extension-prefs arc-menu@linxgem33.com');
    }
};
//'Windows' layout favorites hamburger button
var FavoritesButton = class ArcMenu_FavoritesButton extends SessionButton {
    // Initialize the button
    constructor(button) {
        super(button, _("Favorites"), Me.path + Constants.HAMBURGER.Path);
        super.disableMenuToggle();
    }

    // Activate the button (Shutdown)
    activate() {
        this.actor.hover=false;
        this.tooltip._onHover();
        this._button.toggleFavoritesMenu();
    }
};
//'Ubuntu Dash' layout categories hamburger button
var CategoriesButton = class ArcMenu_CategoriesButton extends SessionButton {
    // Initialize the button
    constructor(button) {
        super(button, _("Categories"), Me.path + Constants.HAMBURGER.Path);
        super.disableMenuToggle();
    }

    // Activate the button (Shutdown)
    activate() {
        this.actor.hover=false;
        this.tooltip._onHover();
        this._button.toggleFavoritesMenu();
    }
};
// User Button
var UserButton = class ArcMenu_UserButton extends SessionButton {
    // Initialize the button
    constructor(button) {
        super(button, _("Users"), 'system-users-symbolic');
    }

    // Activate the button (Shutdown)
    activate() {
        Util.spawnCommandLine("gnome-control-center user-accounts");
    }
};
// User Button
var CurrentUserButton = class ArcMenu_CurrentUserButton extends SessionButton {
    constructor(button) {
        super(button, GLib.get_user_name(), 'system-users-symbolic');
        this._button = button;
        let username = GLib.get_user_name();
        this._user = AccountsService.UserManager.get_default().get_user(username);
        this.iconBin = new St.Bin({ 
            style_class: 'menu-user-avatar'
        });
        this.iconBin.style = "width: "+SMALL_ICON_SIZE+"px; height: "+SMALL_ICON_SIZE+"px;";
        this._userLoadedId = this._user.connect('notify::is-loaded', this._onUserChanged.bind(this));
        this._userChangedId = this._user.connect('changed', this._onUserChanged.bind(this));
        this.actor.connect('destroy', this._onDestroy.bind(this));
        this._onUserChanged();

        this.actor.child = this.iconBin;
    }
    activate() {
        Util.spawnCommandLine("gnome-control-center user-accounts");
    }
    // Handle changes to user information (redisplay new info)
    _onUserChanged() {
        if (this._user.is_loaded) {
            this.tooltip.actor.text = this._user.get_real_name();
            let iconFileName = this._user.get_icon_file();
            if (iconFileName && !GLib.file_test(iconFileName, GLib.FileTest.EXISTS))
                iconFileName = null;
            if (iconFileName) {
                this.iconBin.child = null;
                this.iconBin.style = 'background-image: url("%s");'.format(iconFileName) + "width: "+SMALL_ICON_SIZE+"px; height: "+SMALL_ICON_SIZE+"px;";
            } else {
                this.iconBin.style = null;
                this.iconBin.child = new St.Icon({ 
                    icon_name: 'avatar-default-symbolic',
                    icon_size: SMALL_ICON_SIZE
                });
            }
        }    
    }
    // Destroy the menu item
    _onDestroy() {
        if (this._userLoadedId != 0) {
            this._user.disconnect(this._userLoadedId);
            this._userLoadedId = 0;
        }
        if (this._userChangedId != 0) {
            this._user.disconnect(this._userChangedId);
            this._userChangedId = 0;
        }
    }
};

// Power Button
var PowerButton = class ArcMenu_PowerButton extends SessionButton {
    // Initialize the button
    constructor(button) {
        super(button, _("Power Off"), 'system-shutdown-symbolic');
    }
    // Activate the button (Shutdown)
    activate() {
        this._button._session.ShutdownRemote(0);
    }
};

// Logout Button
var LogoutButton = class ArcMenu_LogoutButton extends SessionButton {
    // Initialize the button
    constructor(button) {
        super(button, _("Log Out"), 'application-exit-symbolic');
        this.disableMenuToggle();
    }
    // Activate the button (Logout)
    activate() {
        this._button.leftClickMenu.toggle();
        this._button._session.LogoutRemote(0);
    }
};

// Suspend Button
var SuspendButton = class ArcMenu_SuspendButton extends SessionButton {
    // Initialize the button
    constructor(button) {
        super(button, _("Suspend"), 'media-playback-pause-symbolic');
    }
    // Activate the button (Suspend the system)
    activate() {
        let loginManager = LoginManager.getLoginManager();
        loginManager.canSuspend((result) => {
            if (result) {
                loginManager.suspend();
            }
        });
    }
};

// Lock Screen Button
var LockButton = class ArcMenu_LockButton extends SessionButton {
    // Initialize the button
    constructor(button) {
        super(button, _("Lock"), 'changes-prevent-symbolic');
        this.disableMenuToggle();
    }
    // Activate the button (Lock the screen)
    activate() {
        this._button.isRunning = false;
        this._button.leftClickMenu.toggle();
        Main.screenShield.lock(true);
    }
};

// Menu item to go back to category view
var BackMenuItem = Utils.createClass({
    Name: 'ArcMenu_BackMenuItem',
    Extends: PopupMenu.PopupBaseMenuItem,
    // Initialize the button
    _init(button) {
        this.callParent('_init');
        this._button = button;
        this._icon = new St.Icon({
            icon_name: 'go-previous-symbolic',
            style_class: 'popup-menu-icon',
            icon_size: 24
        });
        this.actor.add_child(this._icon);
        let backLabel = new St.Label({
            text: _("Back"),
            y_expand: true,
            y_align: Clutter.ActorAlign.CENTER
        });
        this.actor.add_child(backLabel);
        if(gnome36){
            this.connect('button-press-event', this._onButtonPressEvent.bind(this));
            this.connect('button-release-event', this._onButtonReleaseEvent.bind(this));
        }
    },
    // Activate the button (go back to category view)
    activate(event) {
        if(this._button.currentMenu !== Constants.CURRENT_MENU.FAVORITES)
            this._button._clearApplicationsBox();
        if(this._button.currentMenu == Constants.CURRENT_MENU.SEARCH_RESULTS){ 
        	if(this._button._settings.get_boolean('enable-pinned-apps')){
         		this._button.currentMenu = Constants.CURRENT_MENU.FAVORITES;
                this._button.resetSearch();
                this._button._displayFavorites();
        	}
        	else {
        		this._button.currentMenu = Constants.CURRENT_MENU.CATEGORIES;
                this._button.resetSearch();
                this._button._displayCategories();
        	}
        }
        else if(this._button.currentMenu == Constants.CURRENT_MENU.CATEGORIES){ 
 	        if(this._button._settings.get_boolean('enable-pinned-apps')){
            	this._button.currentMenu = Constants.CURRENT_MENU.FAVORITES;
            	this._button._displayFavorites();
            }   
        }
        else if(this._button.currentMenu == Constants.CURRENT_MENU.CATEGORY_APPLIST){
            this._button.currentMenu = Constants.CURRENT_MENU.CATEGORIES;
            this._button._displayCategories();
        }
        else if(this._button.currentMenu == Constants.CURRENT_MENU.FAVORITES){
            this._button.favoritesMenu ? this._button.favoritesMenu.toggle() : this._button.categoriesMenu.toggle();
        }
        this.callParent('activate',event);
    },
    _onButtonPressEvent(actor, event) {
        return Clutter.EVENT_PROPAGATE;
    },
    _onButtonReleaseEvent(actor, event) {
        if(event.get_button()==1){
            this.activate(event);
        }
        return Clutter.EVENT_STOP;
    }
});

// Menu item to view all apps
var ViewAllPrograms =Utils.createClass({
    Name: 'ArcMenu_ViewAllPrograms',
    Extends: PopupMenu.PopupBaseMenuItem, 
    // Initialize the button
    _init(button) {
        this.callParent('_init');
        this._button = button;
        this._icon = new St.Icon({
            icon_name: 'go-next-symbolic',
            style_class: 'popup-menu-icon',
            icon_size: 24,
             x_align: St.Align.START
        });
        this.actor.add_child(this._icon);
        let backLabel = new St.Label({
            text: _("All Programs"),
            y_expand: true,
            y_align: Clutter.ActorAlign.CENTER
        });
        this.actor.add_child(backLabel);
        if(gnome36){
            this.connect('button-press-event', this._onButtonPressEvent.bind(this));
            this.connect('button-release-event', this._onButtonReleaseEvent.bind(this));
        }
    },
    // Activate the button (go back to category view)
    activate(event) {
      this._button._clearApplicationsBox();
      if(this._button._settings.get_boolean('enable-pinned-apps')){
	      this._button._displayCategories();
	      this._button.currentMenu = Constants.CURRENT_MENU.CATEGORIES;
      }
      else{ 
       	  this._button._displayAllApps();
          this._button.currentMenu = Constants.CURRENT_MENU.SEARCH_RESULTS;
      }
      this.callParent('activate',event);
    },
    _onButtonPressEvent(actor, event) {
        return Clutter.EVENT_PROPAGATE;
    },
    _onButtonReleaseEvent(actor, event) {
        if(event.get_button() == 1){
            this.activate(event);
        }
        return Clutter.EVENT_STOP;
    }
});

// Menu shortcut item class
var ShortcutMenuItem = Utils.createClass({
    Name: 'ArcMenu_ShortcutMenuItem',
    Extends: PopupMenu.PopupBaseMenuItem,
    // Initialize the menu item
    _init(button, name, icon, command) {
        this.callParent('_init');
        this._button = button;
        this._command = command;
        //Check for default commands--------
        if(this._command == "ArcMenu_Software"){
            if(GLib.find_program_in_path('gnome-software'))
                this._command='org.gnome.Software.desktop';
            else if(GLib.find_program_in_path('pamac-manager'))
                this._command='pamac-manager.desktop';
            else if(GLib.find_program_in_path('io.elementary.appcenter')){
                this._command='io.elementary.appcenter.desktop';
                icon = 'pop-shop';
            }  
        }
        this._app = Shell.AppSystem.get_default().lookup_app(this._command);
        //---------
        this._icon = new St.Icon({
            icon_name: icon,
            gicon: Gio.icon_new_for_string(icon),
            style_class: 'popup-menu-icon',
            icon_size: SMALL_ICON_SIZE
        });
        this.actor.add_child(this._icon);
        this.label = new St.Label({
            text: _(name), y_expand: true,
            y_align: Clutter.ActorAlign.CENTER
        });
        this.actor.connect('notify::hover',this._onHover.bind(this));
        this.actor.add_child(this.label);
        if(gnome36){
            this.connect('button-press-event', this._onButtonPressEvent.bind(this));
            this.connect('button-release-event', this._onButtonReleaseEvent.bind(this));
        }
    },
    setAsIcon(){
        this.actor.vertical = true;
        this.actor.connect('notify::active',()=> this.setActive(this.actor.active, false));

        let layout = this._button._settings.get_enum('menu-layout');        
        if(layout == Constants.MENU_LAYOUT.Elementary || layout == Constants.MENU_LAYOUT.UbuntuDash){
            this._iconSize = 52;
            this.actor.style ='border-radius:4px; padding: 5px; spacing: 0px; width:95px; height:95px;';
        }
            
        else{
            this._iconSize = 36;  
            this.actor.style ='border-radius:4px; padding: 5px; spacing: 0px; width:80px;height:80px;';
        }
        this._icon.icon_size = this._iconSize;
        this.label.y_expand = true;
        this.label.x_expand= true;
        this.label.x_align = Clutter.ActorAlign.CENTER;
        this.label.y_align=  Clutter.ActorAlign.CENTER;
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
    _onHover() {
        let lbl = this.label.clutter_text;
        lbl.get_allocation_box();
        if(lbl.get_layout().is_ellipsized()){
            if(this.tooltip==undefined && this.actor.hover){
                this.tooltip = new Tooltip(this._button, this.actor, this.label.text);
                this.tooltip._onHover();
            }
        }
        else{
            if(this.tooltip){
                this.tooltip.destroy();
                this.tooltip = null;
            }
        }
    },
    // Activate the menu item (Launch the shortcut)
    activate(event) {
        this._button.leftClickMenu.toggle();
        if(this._command =="ArcMenu_ActivitiesOverview")
            Main.overview.show();
        else if(this._command == "ArcMenu_RunCommand")
            Main.openRunDialog();
        else if(this._app)
            this._app.open_new_window(-1);
        else
            Util.spawnCommandLine(this._command);
        this.callParent('activate',event);
    },
    setIconSizeLarge(){
        this._icon.icon_size = MEDIUM_ICON_SIZE;
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
    setFakeActive(active) {
        if (active) {
            this.actor.add_style_class_name('selected');
        } else {
            this.actor.remove_style_class_name('selected');
        }
    }
});

// Menu item which displays the current user
var UserMenuItem =Utils.createClass({
    Name: 'ArcMenu_UserMenuItem',
    Extends: PopupMenu.PopupBaseMenuItem, 
    // Initialize the menu item
    _init(button) {
        this.callParent('_init');
        this._button = button;
        let username = GLib.get_user_name();
        this._user = AccountsService.UserManager.get_default().get_user(username);
        this.iconBin =  new St.Bin({ 
            style_class: 'menu-user-avatar'
        });
        this.iconBin.style = "width: "+USER_AVATAR_SIZE +"px; height: "+USER_AVATAR_SIZE +"px;";
        this.actor.add_child(this.iconBin);
        this._userLabel = new St.Label({
            text: GLib.get_real_name(),
            y_expand: true,
            y_align: Clutter.ActorAlign.CENTER
        });
        this.actor.add_child(this._userLabel);
        this._userLoadedId = this._user.connect('notify::is-loaded', this._onUserChanged.bind(this));
        this._userChangedId = this._user.connect('changed', this._onUserChanged.bind(this));
        this.actor.connect('destroy', this._onDestroy.bind(this));
        this._onUserChanged();
        if(gnome36){
            this.connect('button-press-event', this._onButtonPressEvent.bind(this));
            this.connect('button-release-event', this._onButtonReleaseEvent.bind(this));
        }
    },
    // Activate the menu item (Open user account settings)
    activate(event) {
        Util.spawnCommandLine("gnome-control-center user-accounts");
        this._button.leftClickMenu.toggle();
        this.callParent('activate',event);
    },
    // Handle changes to user information (redisplay new info)
    _onUserChanged() {
        if (this._user.is_loaded) {
            this._userLabel.set_text(this._user.get_real_name());
            let iconFileName = this._user.get_icon_file();
            if (iconFileName && !GLib.file_test(iconFileName ,GLib.FileTest.EXISTS))
                iconFileName = null;
            if (iconFileName) {
                this.iconBin.child = null;
                this.iconBin.style = 'background-image: url("%s");'.format(iconFileName) + "width: "+USER_AVATAR_SIZE +"px; height: "+USER_AVATAR_SIZE +"px;";
            } else {
                this.iconBin.style = null;
                this.iconBin.child = new St.Icon({ 
                    icon_name: 'avatar-default-symbolic',
                    icon_size: USER_AVATAR_SIZE
                });
            }
        }
    },
    // Destroy the menu item
    _onDestroy() {
        if (this._userLoadedId != 0) {
            this._user.disconnect(this._userLoadedId);
            this._userLoadedId = 0;
        }
        if (this._userChangedId != 0) {
            this._user.disconnect(this._userChangedId);
            this._userChangedId = 0;
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
    }
});

var UserMenuIcon =  class ArcMenu_UserMenuIcon{
    constructor(button) {
        this._button = button;
        let username = GLib.get_user_name();
        this._user = AccountsService.UserManager.get_default().get_user(username);
        this.actor = new St.Bin({ 
            style_class: 'menu-user-avatar',
            track_hover:true,
            reactive: true
        });
        this.actor.style = "width: 75px; height: 75px;";
        this._userLoadedId = this._user.connect('notify::is-loaded', this._onUserChanged.bind(this));
        this._userChangedId = this._user.connect('changed', this._onUserChanged.bind(this));
        this.actor.connect('destroy', this._onDestroy.bind(this));
        this._onUserChanged();
        this.actor.connect('notify::hover',this._onHover.bind(this));
    }
    _onHover() {
        if(this.tooltip==undefined && this.actor.hover){
            this.tooltip = new Tooltip(this._button, this.actor, GLib.get_real_name());
            this.tooltip.isButton = true;
            this.tooltip.flipY = true;
            this.tooltip._onHover();
        }
    }
    // Handle changes to user information (redisplay new info)
    _onUserChanged() {
        if (this._user.is_loaded) {
            let iconFileName = this._user.get_icon_file();
            if (iconFileName && !GLib.file_test(iconFileName ,GLib.FileTest.EXISTS))
                iconFileName = null;
            if (iconFileName) {
                this.actor.child = null;
                this.actor.style = 'background-image: url("%s");'.format(iconFileName) + "width: 75px; height: 75px;";
            } else {
                this.actor.style = null;
                this.actor.child = new St.Icon({ icon_name: 'avatar-default-symbolic',
                                                    icon_size: 75});
            }
        }
        
    }
    // Destroy the menu item
    _onDestroy() {
        if (this._userLoadedId != 0) {
            this._user.disconnect(this._userLoadedId);
            this._userLoadedId = 0;
        }
        if (this._userChangedId != 0) {
            this._user.disconnect(this._userChangedId);
            this._userChangedId = 0;
        }
    }
};

// Menu pinned apps/favorites item class
var FavoritesMenuItem = Utils.createClass({
    Name: 'ArcMenu_FavoritesMenuItem',
    Extends: PopupMenu.PopupBaseMenuItem, 
    Signals: {'saveSettings': {}},
    // Initialize the menu item
    _init(button, name, icon, command) {
        this.callParent('_init');
        this._button = button;
        this._command = command;
        this._iconPath = icon;
        this._name = name;
        this._app = Shell.AppSystem.get_default().lookup_app(this._command);

        //Modifiy the Default Pinned Apps---------------------
        if(this._name == "Arc Menu Settings"){
            this._name = _("Arc Menu Settings");
            this._iconPath = Me.path + '/media/icons/arc-menu-symbolic.svg';
        }
        else if(this._name == "Terminal"){
            this._name = _("Terminal");
        }
        //-------------------------------------------------------

        this._icon = new St.Icon({
            gicon: Gio.icon_new_for_string(this._iconPath),
            style_class: 'popup-menu-icon',
            icon_size: MEDIUM_ICON_SIZE
        })
        this.actor.add_child(this._icon);
 
        this.label = new St.Label({
            text: _(this._name), y_expand: true, x_expand: true,
            y_align: Clutter.ActorAlign.CENTER
        });
        this.actor.add_child(this.label);
        this._draggable = DND.makeDraggable(this.actor);
        this.isDraggableApp = true;
	    this._draggable.connect('drag-begin', this._onDragBegin.bind(this));
        this._draggable.connect('drag-cancelled', this._onDragCancelled.bind(this));
        this._draggable.connect('drag-end', this._onDragEnd.bind(this));

        this.actor.connect('notify::active',()=> this.setActive(this.actor.active, false));
        this.actor.connect('notify::hover',this._onHover.bind(this));
        
        if(gnome36){
            this.connect('button-press-event', this._onButtonPressEvent.bind(this));
            this.connect('button-release-event', this._onButtonReleaseEvent.bind(this));
        }
    },
    setFakeActive(active) {
        if (active) {
            this.actor.add_style_class_name('selected');
        } else {
            this.actor.remove_style_class_name('selected');
        }
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
    _onHover() {
        let lbl = this.label.clutter_text;
        lbl.get_allocation_box();
        if(lbl.get_layout().is_ellipsized()){
            if(this.tooltip==undefined && this.actor.hover){
                this.tooltip = new Tooltip(this._button, this.actor, this._name);
                this.tooltip._onHover();
            }
        }
        else{
            if(this.tooltip){
                this.tooltip.destroy();
                this.tooltip = null;
            }
        }
    },
    _onButtonPressEvent(actor, event) {
		
        return Clutter.EVENT_PROPAGATE;
    },
    _onButtonReleaseEvent(actor, event) {
        if(event.get_button()==1){
            this.activate(event); 
        }
  	    if(event.get_button()==3){
            if(this.rightClickMenu == undefined){
                let app = this._app ? this._app : this._command;
                this.rightClickMenu = new AppRightClickMenu(this.actor, app, this._button);
                this.rightClickMenu.isPinnedApp = true;

                this._button.appMenuManager.addMenu(this.rightClickMenu);
                this.rightClickMenu.actor.hide();
                Main.uiGroup.add_actor(this.rightClickMenu.actor);
                this.actor.connect('destroy', ()=>{
                    this.rightClickMenu.destroy();
                });
            }
            if(this.tooltip!=undefined)
                this.tooltip.hide();
            if(!this.rightClickMenu.isOpen)
                this.rightClickMenu.redisplay();
            this.rightClickMenu.toggle();
	    }   
        return Clutter.EVENT_STOP;
    },
   _onDragBegin() {   
        this._dragMonitor = {
            dragMotion: (this, this._onDragMotion.bind(this))
        };
        DND.addDragMonitor(this._dragMonitor); 
        DND.SNAP_BACK_ANIMATION_TIME = 0;
        this.dragStartY = (this._draggable._dragStartY); 
        this._emptyDropTarget = new Dash.EmptyDropTargetItem();
        this._emptyDropTarget.setChild(new St.Bin({ style_class: 'arc-empty-dash-drop-target' }));  
        if(this._button._settings.get_enum('menu-layout')== Constants.MENU_LAYOUT.Windows)
            this._emptyDropTarget.style = "width: 250px;";
        let p = this._button.applicationsBox.get_transformed_position();
        this.posY= p[1];        
        this.rowHeight = this._button.applicationsBox.get_child_at_index(0).height;

        this.startIndex=0;
        for(let i = 0; i< this._button.applicationsBox.get_children().length;i++){
        if(this.actor == this._button.applicationsBox.get_child_at_index(i))
            this.startIndex=i;
        }
        this._button.applicationsBox.insert_child_at_index(this._emptyDropTarget, this.startIndex);
            
        Main.overview.beginItemDrag(this);  
        this._emptyDropTarget.show(true); 

    },
    _onDragMotion(dragEvent) {
    	this.newIndex = Math.floor((this._draggable._dragY - this.posY) / (this.rowHeight));
    	if(this.newIndex > this._button.applicationsBox.get_children().length -1)
            this.newIndex = this._button.applicationsBox.get_children().length -1;
        if(this.newIndex < 0)
            this.newIndex = 0;	
    	if(this._button.applicationsBox.get_child_at_index(this.newIndex) != this._emptyDropTarget){
            this._button.applicationsBox.set_child_at_index(this._emptyDropTarget, this.newIndex);
	    }

	    return DND.DragMotionResult.CONTINUE;
    },
    _onDragCancelled() {
        Main.overview.cancelledItemDrag(this);
    },

    _onDragEnd() {    
 	    this._button.applicationsBox.remove_child(this._emptyDropTarget); 
        let index = this.newIndex;
        if(index > this.startIndex)
        	index--;
        if(index > this._button.applicationsBox.get_children().length -1)
        	index = this._button.applicationsBox.get_children().length -1;
         if(index < 0)
            index = 0;	
        if(index != this.startIndex){	
            this._button.applicationsBox.set_child_at_index(this.actor,index);    	
            let temp = this._button.favoritesArray[this.startIndex];
            this._button.favoritesArray.splice(this.startIndex,1);
            this._button.favoritesArray.splice(index,0,temp);
        }
        Main.overview.endItemDrag(this);
        DND.removeDragMonitor(this._dragMonitor);   
        this.emit('saveSettings');	  
    },
    
    getDragActor() {
        let addStyle = this._button._settings.get_boolean('enable-custom-arc-menu');
        let icon = new St.Icon({
            gicon: Gio.icon_new_for_string(this._iconPath),
            style_class: 'popup-menu-icon',
            icon_size: 40
        });
        addStyle ? icon.add_style_class_name('arc-menu-action') : icon.remove_style_class_name('arc-menu-action');
        return icon;
    },

    // Returns the original actor that should align with the actor
    // we show as the item is being dragged.
    getDragActorSource() {
        return this.actor;
    },

    // Activate the menu item (Launch the shortcut)
    activate(event) {
        if(this._app){
            this._app.open_new_window(-1);
        }
            
        else
            Util.spawnCommandLine(this._command);

        this._button.leftClickMenu.toggle();
        this.callParent('activate',event);
    }
});
// Menu pinned apps/favorites item class
var FavoritesMenuIcon = Utils.createClass({
    Name: 'ArcMenu_FavoritesMenuIcon',
    Extends: PopupMenu.PopupBaseMenuItem,
    // Initialize the menu item
    _init(button, name, icon, command) {
        this.callParent('_init');
        this._button = button;
        this._command = command;
        this._iconPath = icon;
        this._name = name;
        this._app = Shell.AppSystem.get_default().lookup_app(this._command);
        this.actor.vertical = true;

        let layout = this._button._settings.get_enum('menu-layout');
        if(layout == Constants.MENU_LAYOUT.Elementary || layout == Constants.MENU_LAYOUT.UbuntuDash)
            this.actor.style ='border-radius:4px; padding: 5px; spacing: 0px; width:95px; height:95px;';
        else
            this.actor.style ='border-radius:4px; padding: 5px; spacing: 0px; width:80px;height:80px;';
        
        //Modifiy the Default Pinned Apps---------------------
        if(this._name == "Arc Menu Settings"){
            this._name = _("Arc Menu Settings");
            this._iconPath = Me.path + '/media/icons/arc-menu-symbolic.svg';
        }
        else if(this._name == "Terminal"){
            this._name = _("Terminal");
        }
        //-------------------------------------------------------
        if(layout == Constants.MENU_LAYOUT.Elementary || layout == Constants.MENU_LAYOUT.UbuntuDash)
            this._iconSize = 52;
        else
            this._iconSize = 36;  

        this._icon = new St.Icon({
            gicon: Gio.icon_new_for_string(this._iconPath),
            style_class: 'popup-menu-icon',
            icon_size:  this._iconSize 
        });
        this.actor.add_child(this._icon);

        this.label = new St.Label({
            text: _(this._name), y_expand: true, x_expand: true,
            x_align: Clutter.ActorAlign.CENTER,
            y_align: Clutter.ActorAlign.CENTER
        });
        this.actor.add_child(this.label);
        this.actor.connect('notify::active',()=> this.setActive(this.actor.active, false));
        this.actor.connect('notify::hover',this._onHover.bind(this));

        if(gnome36){
            this.connect('button-press-event', this._onButtonPressEvent.bind(this));
            this.connect('button-release-event', this._onButtonReleaseEvent.bind(this));
        }
    },
    _onHover() {
        let lbl = this.label.clutter_text;
        lbl.get_allocation_box();
        if(lbl.get_layout().is_ellipsized()){
            if(this.tooltip==undefined && this.actor.hover){
                this.tooltip = new Tooltip(this._button, this.actor, this._name);
                this.tooltip._onHover();
            }
        }
        else{
            if(this.tooltip){
                this.tooltip.destroy();
                this.tooltip = null;
            }
        }
    },
    _onButtonPressEvent(actor, event) {
		
        return Clutter.EVENT_PROPAGATE;
    },
    _onButtonReleaseEvent(actor, event) {
        if(event.get_button()==1){
            this.activate(event); 
        }
  	    if(event.get_button()==3){
            if(this.rightClickMenu == undefined){
                let app = this._app ? this._app : this._command;
                this.rightClickMenu = new AppRightClickMenu(this.actor, app, this._button);
                this.rightClickMenu.isPinnedApp = true;
                this.rightClickMenu.centerBoxPointerPosition();

                this._button.appMenuManager.addMenu(this.rightClickMenu);
                this.rightClickMenu.actor.hide();
                Main.uiGroup.add_actor(this.rightClickMenu.actor);
                this.actor.connect('destroy', ()=>{
                    this.rightClickMenu.destroy();
                });
            }
            if(this.tooltip!=undefined)
                this.tooltip.hide();
            if(!this.rightClickMenu.isOpen)
                this.rightClickMenu.redisplay();
            this.rightClickMenu.toggle();
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
    },
    // Activate the menu item (Launch the shortcut)
    activate(event) {
        if(this._app)
            this._app.open_new_window(-1);
        else
            Util.spawnCommandLine(this._command);

        this._button.leftClickMenu.toggle();
        this.callParent('activate',event);
    }
});
// Menu application item class
var ApplicationMenuIcon = Utils.createClass({
    Name: 'ArcMenu_ApplicationMenuIcon',
    Extends: PopupMenu.PopupBaseMenuItem,
    // Initialize menu item
    _init(button, app) {
        this.callParent('_init');
        this._button = button;
        this._app = app;
        this.actor.vertical = true;

        let layout = this._button._settings.get_enum('menu-layout');
        if(layout == Constants.MENU_LAYOUT.Elementary || layout == Constants.MENU_LAYOUT.UbuntuDash)
            this.actor.style ='border-radius:4px; padding: 5px; spacing: 0px; width:95px; height:95px;';
        else
            this.actor.style ='border-radius:4px; padding: 5px; spacing: 0px; width:80px;height:80px;';
 
        this._iconBin = new St.Bin({
            y_align: St.Align.END,
            x_align: gnome36 ? Clutter.ActorAlign.CENTER : St.Align.MIDDLE
        });
        this.actor.add_child(this._iconBin);

        this.label = new St.Label({
            text: app.get_name(),
            y_expand: false,
            y_align: St.Align.END,
            x_align: St.Align.END
        });
        this.actor.add_child(this.label);
                
        let textureCache = St.TextureCache.get_default();
        let iconThemeChangedId = textureCache.connect('icon-theme-changed', this._updateIcon.bind(this));
        this.actor.connect('destroy', () => {
            textureCache.disconnect(iconThemeChangedId);
        });
        this._updateIcon();
        this.actor.connect('notify::hover', this._onHover.bind(this));
        this.actor.connect('notify::active',()=> this.setActive(this.actor.active, false));

        if(gnome36){
            this.connect('button-press-event', this._onButtonPressEvent.bind(this));
            this.connect('button-release-event', this._onButtonReleaseEvent.bind(this));
        }
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
    _createIcon(iconSize) {
        return this._app.create_icon_texture(iconSize);
    },
    _onButtonPressEvent(actor, event) {
		
        return Clutter.EVENT_PROPAGATE;
    },
    _onButtonReleaseEvent(actor, event) {
        if(event.get_button()==1){
            this.activate(event);
        }
        if(event.get_button()==3){
            if(this.rightClickMenu == undefined){
                this.rightClickMenu = new AppRightClickMenu(this.actor, this._app, this._button);
                this.rightClickMenu.centerBoxPointerPosition();
                this._button.appMenuManager.addMenu(this.rightClickMenu);
                this.rightClickMenu.actor.hide();
                Main.uiGroup.add_actor(this.rightClickMenu.actor);
                this.actor.connect('destroy', ()=>{
                    this.rightClickMenu.destroy();
                });
            }
            if(this.tooltip!=undefined)
                this.tooltip.hide();
            if(!this.rightClickMenu.isOpen)
                this.rightClickMenu.redisplay();
            this.rightClickMenu.toggle();
	    }   
        return Clutter.EVENT_STOP;
    },
    _onHover() {
        if(this.actor.hover && this._button.newSearch._highlightDefault)
            this._button.newSearch.highlightDefault(false);
        if(this.tooltip==undefined && this.actor.hover){
            let description = this._app.get_description();
            Utils.createTooltip(this._button, this, this.label, description);
        }
    },
    _onKeyPressEvent(actor, event) {
        let symbol = event.get_key_symbol();
        if (symbol == Clutter.KEY_Return ||
            symbol == Clutter.KEY_KP_Enter) {
            this.activate(event);
            return Clutter.EVENT_STOP;
        }
        return Clutter.EVENT_PROPAGATE;
    },
    get_app_id() {
        return this._app.get_id();
    },
    activate(event) {
        this._app.open_new_window(-1);
        this._button.leftClickMenu.toggle();
    },
    setFakeActive(active) {
        if (active) {
            this.actor.add_style_class_name('selected');
        } else {
            this.actor.remove_style_class_name('selected');
        }
    },
    grabKeyFocus() {
        this.actor.grab_key_focus();
    },
    _updateIcon() {
        let layout = this._button._settings.get_enum('menu-layout');
        if(layout == Constants.MENU_LAYOUT.Elementary || layout == Constants.MENU_LAYOUT.UbuntuDash)
            this._iconBin.set_child(this._app.create_icon_texture(52));
        else
            this._iconBin.set_child(this._app.create_icon_texture(36));    
    }
});
var ApplicationMenuItem =Utils.createClass({
    Name: 'ArcMenu_ApplicationMenuItem',
    Extends: PopupMenu.PopupBaseMenuItem,
    // Initialize menu item
    _init(button, app) {
        this.callParent('_init');
        this._app = app;
        this._button = button;
        this._settings = this._button._settings;

        this._iconBin = new St.Bin();
        this.actor.add_child(this._iconBin);
        this.label = new St.Label({
            text: app.get_name(),
            y_expand: true,
            y_align: Clutter.ActorAlign.CENTER
        });
        this.actor.add_child(this.label);
        this.actor.label_actor = this.label;

        let textureCache = St.TextureCache.get_default();
        let iconThemeChangedId = textureCache.connect('icon-theme-changed',
            this._updateIcon.bind(this));
        this.actor.connect('destroy', () => {
            textureCache.disconnect(iconThemeChangedId);
        });
        this._updateIcon();

        this.actor.connect('notify::hover', this._onHover.bind(this));
        this.actor.connect('notify::active',()=> this.setActive(this.actor.active, false));

        if(gnome36){
            this.connect('button-press-event', this._onButtonPressEvent.bind(this));
            this.connect('button-release-event', this._onButtonReleaseEvent.bind(this));
        }
    },
    _onButtonPressEvent(actor, event) {	
        return Clutter.EVENT_PROPAGATE;
    },    
    _onHover() {
        if(this.tooltip==undefined && this.actor.hover){
            let description = this._app.get_description();
            Utils.createTooltip(this._button, this, this.label, description);
        }
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
    _onButtonReleaseEvent(actor, event) {
        if(event.get_button()==1){
            this.activate(event);
        }
        if(event.get_button()==3){ 
            if(this.rightClickMenu == undefined){
                this.rightClickMenu = new AppRightClickMenu(this.actor, this._app, this._button);

                this._button.appMenuManager.addMenu(this.rightClickMenu);
                this.rightClickMenu.actor.hide();
                Main.uiGroup.add_actor(this.rightClickMenu.actor);
                this.actor.connect('destroy', ()=>{
                    this.rightClickMenu.destroy();
                });
            }
            if(this.tooltip!=undefined)
                this.tooltip.hide();
            if(!this.rightClickMenu.isOpen)
                this.rightClickMenu.redisplay();
            this.rightClickMenu.toggle();
	    }   
        return Clutter.EVENT_STOP;
    },
    _onKeyPressEvent(actor, event) {
        let symbol = event.get_key_symbol();
        if (symbol == Clutter.KEY_Return ||
            symbol == Clutter.KEY_KP_Enter) {
            this.activate(event);
            return Clutter.EVENT_STOP;
        }
        return Clutter.EVENT_PROPAGATE;
    },
    get_app_id() {
        return this._app.get_id();
    },
    _createIcon(iconSize) {
        return this._app.create_icon_texture(iconSize);
    },
    activate(event) {
        this._app.open_new_window(-1);
        this._button.leftClickMenu.toggle();
        this.callParent('activate',event);
    },
    setFakeActive(active) {
        if (active) {
            this.actor.add_style_class_name('selected');
        } else {
            this.actor.remove_style_class_name('selected');
        }
    },
    grabKeyFocus() {
        this.actor.grab_key_focus();
    },
    _updateIcon() {
        let largeIcons = this._settings.get_boolean('enable-large-icons');
        this._iconBin.set_child(this._app.create_icon_texture(largeIcons ? MEDIUM_ICON_SIZE : SMALL_ICON_SIZE));
    }
});
var SearchResultItem = Utils.createClass({
    Name: 'ArcMenu_SearchResultItem',
    Extends: PopupMenu.PopupBaseMenuItem,
    // Initialize menu item
    _init(button, app,path) {
        this.callParent('_init');
        this._button = button;
        this._app =app;
        this._path=path;
        this.actor.connect('notify::hover', this._onHover.bind(this));
        this.actor.connect('notify::active',()=> this.setActive(this.actor.active, false));

        if(gnome36){
            this.connect('button-press-event', this._onButtonPressEvent.bind(this));
            this.connect('button-release-event', this._onButtonReleaseEvent.bind(this));
        }
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
    _onHover(){
        if(this.actor.hover && this._button.newSearch._highlightDefault)
            this._button.newSearch.highlightDefault(false);
    },
    _createIcon(iconSize) {
        return this._app.create_icon_texture(iconSize);
    },
    _onButtonPressEvent(actor, event) {
		
        return Clutter.EVENT_PROPAGATE;
    },
    _onButtonReleaseEvent(actor, event) {
        if(event.get_button()==1){
            this.activate(event);
        }           
        if(event.get_button()==3 && this.rightClickMenu == undefined){
            if(this._app){
                this.rightClickMenu = new AppRightClickMenu(this.actor, this._app, this._button);
                if(this._path) 
                    this.rightClickMenu.path = this._path;
                this._button.appMenuManager.addMenu(this.rightClickMenu);
                this.rightClickMenu.actor.hide();
                Main.uiGroup.add_actor(this.rightClickMenu.actor);
                this.actor.connect('destroy', ()=>{
                    this.rightClickMenu.destroy();
                });
            }
        }
        if(event.get_button()==3 && this.rightClickMenu!=undefined){ 
            if(!this.rightClickMenu.isOpen)
                this.rightClickMenu.redisplay();
            this.rightClickMenu.toggle();
            if(this.tooltip!=undefined)
                this.tooltip.hide();
        }   
        return Clutter.EVENT_STOP;
    },
    setFakeActive(active) {
        if (active) {
            this.actor.add_style_class_name('selected');
        } else {
            this.actor.remove_style_class_name('selected');
        }
    },
    _onKeyPressEvent(actor, event) {
        let symbol = event.get_key_symbol();
        if (symbol == Clutter.KEY_Return ||
            symbol == Clutter.KEY_KP_Enter) {
            this.activate(event);
            return Clutter.EVENT_STOP;
        }
        return Clutter.EVENT_PROPAGATE;
    }
});
// Menu Category item class
var CategoryMenuItem =  Utils.createClass({    
    Name: 'ArcMenu_CategoryMenuItem',
    Extends: PopupMenu.PopupBaseMenuItem,
    // Initialize menu item
    _init(button, category, title=null) {
        this.callParent('_init');
        this._button = button;
        this.layout = this._button._settings.get_enum('menu-layout');
        this._category = category;
        this.name = "";
        this.title = title;
        this._active = false;
        if (this._category) {
            this.name = this._category.get_name();
        } 
        else if(title=="Home Screen"){
            this.name = _("Home Screen");
        }   
        else if(title!=null){
            this.name = title == "All Programs" ? _("All Programs") : _("Favorites");
        }   
        else {
            this.name = _("Frequent Apps");
        }
        if(this.layout != Constants.MENU_LAYOUT.GnomeMenu){
            this._icon = new St.Icon({
                gicon: this._category ? this._category.get_icon() : null,
                style_class: 'popup-menu-icon',
                icon_size: MEDIUM_ICON_SIZE
            });
            if(title!=null){
                this._icon.icon_name = title == "All Programs" ? 'view-grid-symbolic': 'emblem-favorite-symbolic';
            }
            else if(!this._category){
                this._icon.icon_name= 'emblem-favorite-symbolic';
            }
            this.actor.add_child(this._icon);
            
        }
        else{
            this.actor.style = "padding: 10px;"
        }
        this.label = new St.Label({
            text: _(this.name),
            y_expand: true,
            x_expand:true,
            y_align: Clutter.ActorAlign.CENTER
        });
        this.actor.add_child(this.label);
        if(!this._button._settings.get_boolean("disable-category-arrows")){
            this._arrowIcon = new St.Icon({
                icon_name: 'go-next-symbolic',
                style_class: 'popup-menu-icon',
                x_align: St.Align.END,
                icon_size: 12,
            });
            this.actor.add_child(this._arrowIcon);
        }

        this.actor.label_actor = this.label;
        this.actor.connect('notify::hover', this._onHover.bind(this));
        this.actor.connect('notify::active',()=> this.setActive(this.actor.active, false));

        if(gnome36){
            this.connect('button-press-event', this._onButtonPressEvent.bind(this));
            this.connect('button-release-event', this._onButtonReleaseEvent.bind(this));
        }

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
    _onButtonPressEvent(actor, event) {
		
        return Clutter.EVENT_PROPAGATE;
    },
    _onButtonReleaseEvent(actor, event) {
        if(event.get_button()==1){
            this.activate(event);
        }
        return Clutter.EVENT_STOP;
    },
    // Activate menu item (Display applications in category)
    activate(event) {
        if (this._category)
            this._button.selectCategory(this._category);
        else if(this.title =="All Programs")
            this._button._displayAllApps(this.actor);
        else if(this.title =="Home Screen")
            this._button._displayFavorites();
        else if(this.title == "Favorites")
            this._button._displayGnomeFavorites();
        else
            this._button.selectCategory("Frequent Apps");             
        if(this.layout == Constants.MENU_LAYOUT.Brisk ||  this.layout==Constants.MENU_LAYOUT.Whisker || this.layout == Constants.MENU_LAYOUT.GnomeMenu
            || this.layout == Constants.MENU_LAYOUT.Mint ||  this.layout==Constants.MENU_LAYOUT.Budgie){
            this._button._setActiveCategory(this);
        }
    },

    _onHover() {
        if (this.actor.hover) { // mouse pointer hovers over the button
            if((this.layout == Constants.MENU_LAYOUT.Brisk ||  this.layout==Constants.MENU_LAYOUT.Whisker || this.layout == Constants.MENU_LAYOUT.GnomeMenu
                    || this.layout == Constants.MENU_LAYOUT.Mint ||  this.layout==Constants.MENU_LAYOUT.Budgie) 
                        && this._button._settings.get_boolean('activate-on-hover')){
                if (this._category)
                    this._button.selectCategory(this._category);
                else if(this.title =="All Programs")
                    this._button._displayAllApps(this.actor);
                else if(this.title == "Favorites")
                    this._button._displayGnomeFavorites();
                else
                    this._button.selectCategory("Frequent Apps");
                this._button._setActiveCategory(this);
            }
            let lbl = this.label.clutter_text;
            lbl.get_allocation_box();
            if(lbl.get_layout().is_ellipsized()){
                if(this.tooltip==undefined){
                    this.tooltip = new Tooltip(this._button, this.actor, this.name);
                    this.tooltip._onHover();
                }
            }
            else{
                if(this.tooltip){
                    this.tooltip.destroy();
                    this.tooltip = null;
                }
            }
        }   
    },
    // Set button as active, scroll to the button
    setFakeActive(active, params) {
        if (active) {
            this.actor.add_style_class_name('selected');
        }
        else{
            this.actor.remove_style_class_name('selected');
        }
    }
});
// Simple Menu item class
var SimpleMenuItem = Utils.createClass({
    Name: 'ArcMenu_SimpleMenuItem',
    Extends: PopupMenu.PopupBaseMenuItem,
    // Initialize menu item
    _init(button, category, title=null) {
        this.callParent('_init');
        this._category = category;
        this._button = button;
        this.name = "";
        this.title = title;
        this._active = false;
        if (this._category) {
            this.name = this._category.get_name();
        } 
        else if(title!=null){
            this.name = title == "All Programs" ? _("All Programs") : _("Favorites")
        }   
        else {
            this.name = _("Frequent Apps");
        }

        this._icon = new St.Icon({
            gicon: this._category ? this._category.get_icon() : null,
            style_class: 'popup-menu-icon',
            icon_size: MEDIUM_ICON_SIZE
        });
        if(title!=null){
            this._icon.icon_name = title == "All Programs" ? 'view-grid-symbolic': 'emblem-favorite-symbolic';
        }
        else if(!this._category){
            this._icon.icon_name= 'emblem-favorite-symbolic';
        }
        this.actor.add_child(this._icon);
        let categoryLabel = new St.Label({
            text: _(this.name),
            y_expand: true,
            x_expand:true,
            y_align: Clutter.ActorAlign.CENTER
        });
        this.actor.add_child(categoryLabel);
        if(!this._button._settings.get_boolean("disable-category-arrows")){
            this._arrowIcon = new St.Icon({
                icon_name: 'go-next-symbolic',
                style_class: 'popup-menu-icon',
                x_align: St.Align.END,
                icon_size: 12,
            });
            this.actor.add_child(this._arrowIcon);
        }
        this.actor.label_actor = categoryLabel;
        this.actor.connect('notify::hover', this._onHover.bind(this));
        
        let modernGnome = imports.misc.config.PACKAGE_VERSION >= '3.31.9';
        let sourceActor =  modernGnome ?  this : this.actor;
        
        

        this.subMenu = new PopupMenu.PopupMenu(this.actor,.5,St.Side.LEFT);

        Main.uiGroup.add_actor(this.subMenu.actor);  
        this.section = new PopupMenu.PopupMenuSection();
        this.subMenu.addMenuItem(this.section);  
        this.updateStyle();
        this.mainBox = new St.BoxLayout({
            vertical: false
        });    
        this.mainBox._delegate = this.mainBox;
        this.mainBox.style = 'max-height: 25em;';
        this.section.actor.add_actor(this.mainBox);   
        this.applicationsScrollBox = new St.ScrollView({
            x_fill: true,
            y_fill: false,
            y_align: St.Align.START,
            style_class: 'apps-menu vfade left-scroll-area',
            overlay_scrollbars: true
        });                
        this.applicationsScrollBox.connect('key-press-event',(actor,event)=>{
            let key = event.get_key_symbol();
            if(key == Clutter.KEY_Up)
                this.scrollToItem(this._button.activeMenuItem, this.applicationsScrollBox, Constants.DIRECTION.UP);
            else if(key == Clutter.KEY_Down)
                this.scrollToItem(this._button.activeMenuItem, this.applicationsScrollBox, Constants.DIRECTION.DOWN);
        }) ;   
        this.applicationsScrollBox.set_policy(Gtk.PolicyType.NEVER, Gtk.PolicyType.AUTOMATIC);
        this._button.subMenuManager.addMenu(this.subMenu);
        this.applicationsBox = new St.BoxLayout({ vertical: true });
        this.applicationsScrollBox.add_actor(this.applicationsBox);
        this.mainBox.add(this.applicationsScrollBox, {
            expand: true,
            x_fill: true, y_fill: true,
            y_align: St.Align.START
        });
        this.actor.connect('notify::active',()=> this.setActive(this.actor.active, false));
        if(this.subMenu._keyPressId)
            this.actor.disconnect(this.subMenu._keyPressId);
        this.actor.connect("key-press-event",(actor, event)=>{
            let symbol = event.get_key_symbol();
            let key = event.get_key_unicode();

            switch (symbol) {
                case Clutter.Left:
                case Clutter.KP_Left:
                case Clutter.KEY_Escape:
                    if(this.subMenu.isOpen){
                        this.subMenu.toggle();
                    }
                    return Clutter.EVENT_STOP;
                case Clutter.Right:
                case Clutter.KP_Right:
                    if(!this.subMenu.isOpen){
                        if (this._category)
                            this._button.selectCategory(this._category,this);
                        else if(this.title =="All Programs")
                            this._button._displayAllApps(this);
                        else if(this.title == "Favorites")
                            this._button._displayGnomeFavorites(this);
                        else
                            this._button.selectCategory("Frequent Apps",this);   
                        this.subMenu.toggle();
                        this.subMenu.actor.navigate_focus(null, modernGnome ? St.DirectionType.TAB_FORWARD : Gtk.DirectionType.TAB_FORWARD, false);
                        return Clutter.EVENT_STOP;
                    }
                    else{
                        return Clutter.EVENT_PROPAGATE;
                    }
                default:
                    return Clutter.EVENT_PROPAGATE;
            }
        });
    },
    setActive(active, callParent = true){
        if(this._button.activeMenuItem != null && this._button.leftClickMenu.isOpen)
            this._button.activeMenuItem = null;
        if(callParent)
            this.callParent('setActive',active);
    },
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
    },
    updateStyle(){
        let addStyle=this._button._settings.get_boolean('enable-custom-arc-menu');
       
        this.subMenu.actor.hide();
            if(addStyle){
                this.subMenu.actor.style_class = 'arc-menu-boxpointer';
                this.subMenu.actor.add_style_class_name('arc-menu');
            }
            else
            {       
                this.subMenu.actor.style_class = 'popup-menu-boxpointer';
                this.subMenu.actor.add_style_class_name('popup-menu');
            }
    },
    // Activate menu item (Display applications in category)
    activate(event) {
        if (this._category)
            this._button.selectCategory(this._category,this);
        else if(this.title =="All Programs")
            this._button._displayAllApps(this);
        else if(this.title == "Favorites")
            this._button._displayGnomeFavorites(this);
        else
            this._button.selectCategory("Frequent Apps",this);   
        this.subMenu.toggle();
        this.subMenu.actor.navigate_focus(null, modernGnome ? St.DirectionType.TAB_FORWARD : Gtk.DirectionType.TAB_FORWARD, false);
    },
    _onHover() {
        if (this.actor.hover) { // mouse pointer hovers over the button
            if (this._category)
                this._button.selectCategory(this._category,this);
            else if(this.title =="All Programs")
                this._button._displayAllApps(this);
            else if(this.title == "Favorites")
                this._button._displayGnomeFavorites(this);
            else
                this._button.selectCategory("Frequent Apps",this);   
            this.subMenu.toggle();
        }
    },
    // Set button as active, scroll to the button
    setFakeActive(active, params) {

    },
    _onDestroy(){

    }
});
// SubMenu Category item class
var CategorySubMenuItem = Utils.createClass({
    Name: 'ArcMenu_CategorySubMenuItem',
    Extends: PopupMenu.PopupSubMenuMenuItem,
    ParentConstrParams: ['', true],
    // Initialize menu item
    _init(button, category, title=null) {
        this.callParent('_init','',true);
        this._category = category;
        this._button = button;
        this.name = "";
        this.isSimpleMenuItem = false;
        this.title = title;
        this._active = false;
        this._applicationsButtons = new Map();
        if (this._category) {
            this.name = this._category.get_name();
        } 
        else if(title!=null){
            this.name = title == "All Programs" ? _("All Programs") : _("Favorites")
        }   
        else {
            this.name = _("Frequent Apps");
        }
        this.label.text = this.name;

        this.icon.gicon = this._category ? this._category.get_icon() : null;
        this.icon.style_class= 'popup-menu-icon';

        this.icon.icon_size = MEDIUM_ICON_SIZE;

        if(title!=null){
            this.icon.icon_name = title == "All Programs" ? 'view-grid-symbolic': 'emblem-favorite-symbolic';
        }
        else if(!this._category){
            this.icon.icon_name= 'emblem-favorite-symbolic';
        }
        this.menu.actor.connect('key-press-event',(actor,event)=>{
            let key = event.get_key_symbol();
            if(key == Clutter.KEY_Up)
                this.scrollToItem(this._button.activeMenuItem, this.menu.actor, Constants.DIRECTION.UP);
            else if(key == Clutter.KEY_Down)
                this.scrollToItem(this._button.activeMenuItem, this.menu.actor, Constants.DIRECTION.DOWN);
        }) ; 
        this._updateIcons();
        this.menu.actor.style = 'max-height: 250px;';
        this.menu.actor.overlay_scrollbars = true;
        this.menu.actor.style_class = 'vfade popup-sub-menu';
        let scrollbar = this.menu.actor.get_vscroll_bar();
        scrollbar.style="padding-right:15px;";
        this.menu._needsScrollbar = this._needsScrollbar.bind(this);
        this.actor.connect('notify::active',()=> this.setActive(this.actor.active, false));
        this.menu.connect('open-state-changed', () => {
            if(!this.menu.isOpen){
                let scrollbar= this.menu.actor.get_vscroll_bar().get_adjustment();
                scrollbar.set_value(0);
            }
        });
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
    },
    _updateIcons() {
        let largeIcons = this._button._settings.get_boolean('enable-large-icons');
        if(this._button._settings.get_enum('menu-layout') !== Constants.MENU_LAYOUT.Simple2){
            this.icon.icon_size = largeIcons ? MEDIUM_ICON_SIZE : SMALL_ICON_SIZE;
        } 
    },
    _updateIcon() {
    },
    _needsScrollbar() {
        let topMenu = this.menu;
        let [, topNaturalHeight] = topMenu.actor.get_preferred_height(-1);
        let topThemeNode = topMenu.actor.get_theme_node();

        let topMaxHeight = topThemeNode.get_max_height();
        let needsScrollbar = topMaxHeight >= 0 && topNaturalHeight >= topMaxHeight;
        if(needsScrollbar)
            this.menu.actor.style = 'min-height:150px; max-height: 250px;';
        else
            this.menu.actor.style = 'max-height: 250px;';
        return needsScrollbar;
    },
    loadMenu(){
        let children = this.menu.box.get_children();
        for (let i = 0; i < children.length; i++) {
            let item = children[i];
            this.menu.box.remove_actor(item);
        }
        let appList = [];
        this._applicationsButtons.forEach((value,key,map) => {
            appList.push(key);
        });
        appList.sort((a, b) => {
            return a.get_name().toLowerCase() > b.get_name().toLowerCase();
        }); 
        for (let i = 0; i < appList.length; i++) {
            let app = appList[i];
            let item = this._applicationsButtons.get(app);
            if(item.actor.get_parent()){
                item.actor.get_parent().remove_actor(item.actor);
            }
            if (!item.actor.get_parent()) {
                this.menu.box.add_actor(item.actor);
            }
            
        }
    },
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
    },
    _setOpenState(open) {
        if(this.isSimpleMenuItem){
            if(open){
                if (this._category)
                    this._button.selectCategory(this._category,this);
                else if(this.title =="All Programs")
                    this._button._displayAllApps(this);
                else if(this.title == "Favorites")
                    this._button._displayGnomeFavorites(this);
                else
                    this._button.selectCategory("Frequent Apps",this);
            }
        }
        else{
            if(open){
                this.loadMenu();
            }
        }
        this.setSubmenuShown(open);
    }
});



// Place Info class
var PlaceInfo = class ArcMenu_PlaceInfo {
    // Initialize place info
    constructor(file, name, icon) {
        this.file = file;
        this.name = name ? name : this._getFileName();
        this.icon = icon ? new Gio.ThemedIcon({ name: icon }) : this.getIcon();
    }

    // Launch place with appropriate application
    launch(timestamp) {
        let launchContext = global.create_app_launch_context(timestamp, -1);
        Gio.AppInfo.launch_default_for_uri(this.file.get_uri(), launchContext);
    }

    // Get Icon for place
    getIcon() {
        try {
            let info = this.file.query_info('standard::symbolic-icon', 0, null);
            return info.get_symbolic_icon();

        } catch (e) {
            if (e instanceof Gio.IOErrorEnum) {
                if (!this.file.is_native()) {
                    return new Gio.ThemedIcon({ name: 'folder-remote-symbolic' });
                } else {
                    return new Gio.ThemedIcon({ name: 'folder-symbolic' });
                }
            }
        }
    }

    // Get display name for place
    _getFileName() {
        try {
            let info = this.file.query_info('standard::display-name', 0, null);
            return info.get_display_name();
        } catch (e) {
            if (e instanceof Gio.IOErrorEnum) {
                return this.file.get_basename();
            }
        }
    }
};
Signals.addSignalMethods(PlaceInfo.prototype);

// Menu Place Shortcut item class
var PlaceMenuItem = Utils.createClass({
    Name: 'ArcMenu_PlaceMenuItem',
    Extends: PopupMenu.PopupBaseMenuItem,
    // Initialize menu item
    _init(button, info) {
        this.callParent('_init');
        this._button = button;
        this._info = info;
        this._icon = new St.Icon({
            gicon: info.icon,
            icon_size: SMALL_ICON_SIZE
        });
        this.actor.add_child(this._icon);
        this._label = new St.Label({
            text: _(info.name),
            y_expand: true,
            y_align: Clutter.ActorAlign.CENTER
        });
        this.actor.connect('notify::hover', this._onHover.bind(this));
        this.actor.add_child(this._label);
        this._changedId = this._info.connect('changed', this._propertiesChanged.bind(this));
        if(gnome36){
            this.connect('button-press-event', this._onButtonPressEvent.bind(this));
            this.connect('button-release-event', this._onButtonReleaseEvent.bind(this));
        }

    },
    _onHover() {
        let lbl = this._label.clutter_text;
        lbl.get_allocation_box();
        if(lbl.get_layout().is_ellipsized()){
            if(this.tooltip==undefined && this.actor.hover){
                this.tooltip = new Tooltip(this._button, this.actor, this._label.text);
                this.tooltip._onHover();
            }
        }
        else{
            if(this.tooltip){
                this.tooltip.destroy();
                this.tooltip = null;
            }
        }
    },
    // Destroy menu item
    destroy() {
        if (this._changedId) {
            this._info.disconnect(this._changedId);
            this._changedId = 0;
        }
    },

    // Activate (launch) the shortcut
    activate(event) {
        this._info.launch(event.get_time());
        this._button.leftClickMenu.toggle();
        this.callParent('activate',event);
    },

    // Handle changes in place info (redisplay new info)
    _propertiesChanged(info) {
        this._icon.gicon = info.icon;
        this._label.text = info.name;
    },
    _onButtonPressEvent(actor, event) {
		
        return Clutter.EVENT_PROPAGATE;
    },
    _onButtonReleaseEvent(actor, event) {
        if(event.get_button()==1){
            this.activate(event);
        }
        return Clutter.EVENT_STOP;
    }
});

/**
 * This class represents a SearchBox.
 */
var SearchBox = class ArcMenu_SearchBox{
    constructor(button) {
        this.newSearch= button.newSearch;
        this.actor = new St.BoxLayout({
            style_class: 'search-box search-box-padding'
        });
        this._stEntry = new St.Entry({
            name: 'search-entry',
            hint_text: _("Type to search…"),
            track_hover: true,
            can_focus: true
        });
        this._stEntry.style = "min-height: 0px; border-radius:4px; padding: 7px 9px;";
        this._findIcon = new St.Icon({
            style_class: 'search-entry-icon',
            icon_name: 'edit-find-symbolic',
            icon_size: 16
        });
        this._clearIcon = new St.Icon({
            style_class: 'search-entry-icon',
            icon_name: 'edit-clear-symbolic',
            icon_size: 16
        });
        this._stEntry.set_primary_icon(this._findIcon);
        this.actor.add(this._stEntry, {
            expand: true,
            x_align: St.Align.START,
            y_align: St.Align.START
        });

        this._text = this._stEntry.get_clutter_text();
        this._textChangedId = this._text.connect('text-changed', this._onTextChanged.bind(this));
        this._keyPressId = this._text.connect('key-press-event', this._onKeyPress.bind(this));
        this._keyFocusInId = this._text.connect('key-focus-in', this._onKeyFocusIn.bind(this));
        this._searchIconClickedId = 0;
        this._inputHistory = [];
        this._maxInputHistory = 5;

        this.actor.connect('destroy', this._onDestroy.bind(this));
    }

    _pushInput(searchString) {
        if (this._inputHistory.length == this._maxInputHistory) {
            this._inputHistory.shift();
        }
        this._inputHistory.push(searchString);
    }

    _lastInput() {
        if (this._inputHistory.length != 0) {
            return this._inputHistory[this._inputHistory.length - 1];
        }
        return '';
    }

    _previousInput() {
        if (this._inputHistory.length > 1) {
            return this._inputHistory[this._inputHistory.length - 2];
        }
        return '';
    }

    getText() {
        return this._stEntry.get_text();
    }

    setText(text) {
        this._stEntry.set_text(text);
    }

    // Grab the key focus
    grabKeyFocus() {
        this._stEntry.grab_key_focus();
    }

    hasKeyFocus() {
        return this._stEntry.contains(global.stage.get_key_focus());
    }
    // Clear the search box
    clear() {
        this._stEntry.set_text('');
        this.emit('cleared');
    }

    isEmpty() {
        return this._stEntry.get_text() == '';
    }

    _isActivated() {
        return this._stEntry.get_text() != '';
    }

    _setClearIcon() {
        this._stEntry.set_secondary_icon(this._clearIcon);
        if (this._searchIconClickedId == 0) {
            this._searchIconClickedId = this._stEntry.connect('secondary-icon-clicked',
                this.clear.bind(this));
        }
    }

    _unsetClearIcon() {
        if (this._searchIconClickedId > 0) {
            this._stEntry.disconnect(this._searchIconClickedId);
        }
        this._searchIconClickedId = 0;
        this._stEntry.set_secondary_icon(null);
    }

    _onTextChanged(entryText) {
        let searchString = this._stEntry.get_text();
        this._pushInput(searchString);
        if (this._isActivated()) {
            this._setClearIcon();
        } else {
            this._unsetClearIcon();
            if (searchString == '' && this._previousInput() != '') {
                this.emit('cleared');
               
            }
        }
        this.emit('changed', searchString);
    }

    _onKeyPress(actor, event) {
        let symbol = event.get_key_symbol();
        if (symbol == Clutter.KEY_Return ||
            symbol == Clutter.KEY_KP_Enter) {
            if (!this.isEmpty()) {
                if (this.newSearch.getTopResult()) {
                    this.newSearch.getTopResult().activate(event);
                }
            }
            return Clutter.EVENT_STOP;
        }
        this.emit('key-press-event', event);
        return Clutter.EVENT_PROPAGATE;
    }

    _onKeyFocusIn(actor) {
        this.emit('key-focus-in');
        return Clutter.EVENT_PROPAGATE;
    }

    _onDestroy() {
        if (this._textChangedId > 0) {
            this._text.disconnect(this._textChangedId);
            this._textChangedId = 0;
        }
        if (this._keyPressId > 0) {
            this._text.disconnect(this._keyPressId);
            this._keyPressId = 0;
        }
        if (this._keyFocusInId > 0) {
            this._text.disconnect(this._keyFocusInId);
            this._keyFocusInId = 0;
        }
    }
};
Signals.addSignalMethods(SearchBox.prototype);

/**
 * This class is responsible for the appearance of the menu button.
 */
var MenuButtonWidget = class ArcMenu_MenuButtonWidget{
    constructor() {
        this.actor = new St.BoxLayout({
            style_class: 'panel-status-menu-box',
            pack_start: false
        });
        this._arrowIcon = PopupMenu.arrowIcon(St.Side.BOTTOM);

        this._icon = new St.Icon({
            icon_name: 'start-here-symbolic',
            style_class: 'arc-menu-icon',
            track_hover:true,
            reactive: true
        });
        this._label = new St.Label({
            text: _("Applications"),
            y_expand: true,
            y_align: Clutter.ActorAlign.CENTER,
        });

        this.actor.add_child(this._icon);
        this.actor.add_child(this._label);
        this.actor.add_child(this._arrowIcon);

    }

    getPanelLabel() {
        return this._label;
    }

    getPanelIcon() {
        return this._icon;
    }
    showArrowIcon() {
        if (!this.actor.contains(this._arrowIcon)) {
            this.actor.add_child(this._arrowIcon);
        }
    }

    hideArrowIcon() {
        if (this.actor.contains(this._arrowIcon)) {
            this.actor.remove_child(this._arrowIcon);
        }
    }

    showPanelIcon() {
        if (!this.actor.contains(this._icon)) {
            this.actor.add_child(this._icon);
        }
    }

    hidePanelIcon() {
        if (this.actor.contains(this._icon)) {
            this.actor.remove_child(this._icon);
        }
    }

    showPanelText() {
        if (!this.actor.contains(this._label)) {
            this.actor.add_child(this._label);
        }
    }

    hidePanelText() {
        if (this.actor.contains(this._label)) {
            this.actor.remove_child(this._label);
        }
    }
};

var DashMenuButtonWidget = class ArcMenu_DashMenuButtonWidget{
    constructor(button, settings) {
        this._button = button;
        this._settings = settings;
        this.actor = new St.Button({
            style_class: 'show-apps',
            track_hover: true,
            can_focus: true,
            toggle_mode: false
        });
        this.actor._delegate = this;
        this.icon = new imports.ui.iconGrid.BaseIcon(_("Show Applications"),
                                            { setSizeManually: true,
                                            showLabel: false,
                                            createIcon: this._createIcon.bind(this) });
        this._icon = new St.Icon({
            icon_name: 'start-here-symbolic',
            style_class: 'arc-menu-icon',
            icon_size: 15,
            track_hover:true,
            reactive: true
        });
        this.actor.connect("notify::hover", () => {
            if(this.actor.hover)
                this._icon.add_style_pseudo_class('active');
            else if(!this._button.menuManager.activeMenu)
                this._icon.remove_style_pseudo_class('active');
        })
        this._labelText = _("Arc Menu");
        this.label = new St.Label({ style_class: 'dash-label' });
        this.label.hide();
        Main.layoutManager.addChrome(this.label);
        this.label_actor = this.label;
        let modernGnome = imports.misc.config.PACKAGE_VERSION >= '3.31.9';
        modernGnome ? this.actor.add_actor(this.icon) : this.actor.add_actor(this.icon.actor);
        
        this.child = this.actor;
    }   
    showLabel() {
        if (!this._labelText)
            return;

        this.label.set_text(this._labelText);
        this.label.opacity = 0;
        this.label.show();

        let [stageX, stageY] = this.actor.get_transformed_position();
        let node = this.label.get_theme_node();

        let itemWidth  = this.actor.allocation.x2 - this.actor.allocation.x1;
        let itemHeight = this.actor.allocation.y2 - this.actor.allocation.y1;

        let labelWidth = this.label.get_width();
        let labelHeight = this.label.get_height();

        let x, y, xOffset, yOffset;

        let position = this._button._panel._settings.get_enum('dock-position');
        this._isHorizontal = ((position == St.Side.TOP) || (position == St.Side.BOTTOM));
        let labelOffset = node.get_length('-x-offset');
        switch (position) {
            case St.Side.LEFT:
                yOffset = Math.floor((itemHeight - labelHeight) / 2);
                y = stageY + yOffset;
                xOffset = labelOffset;
                x = stageX + this.actor.get_width() + xOffset;
                break;
            case St.Side.RIGHT:
                yOffset = Math.floor((itemHeight - labelHeight) / 2);
                y = stageY + yOffset;
                xOffset = labelOffset;
                x = Math.round(stageX) - labelWidth - xOffset;
                break;
            case St.Side.TOP:
                y = stageY + labelOffset + itemHeight;
                xOffset = Math.floor((itemWidth - labelWidth) / 2);
                x = stageX + xOffset;
                break;
            case St.Side.BOTTOM:
                yOffset = labelOffset;
                y = stageY - labelHeight - yOffset;
                xOffset = Math.floor((itemWidth - labelWidth) / 2);
                x = stageX + xOffset;
                break;
        }
        
        // keep the label inside the screen border
        // Only needed fot the x coordinate.
    
        // Leave a few pixel gap
        let gap = 5;
        let monitor = Main.layoutManager.findMonitorForActor(this.actor);
        if (x - monitor.x < gap)
            x += monitor.x - x + labelOffset;
        else if (x + labelWidth > monitor.x + monitor.width - gap)
            x -= x + labelWidth - (monitor.x + monitor.width) + gap;
    
        this.label.remove_all_transitions();
        this.label.set_position(x, y);
        if(modernGnome){
            this.label.ease({
                opacity: 255,
                duration: Dash.DASH_ITEM_LABEL_SHOW_TIME,
                mode: Clutter.AnimationMode.EASE_OUT_QUAD
            });
        }   

        else{
            Tweener.addTween(this.label, {
                opacity: 255,
                time: Dash.DASH_ITEM_LABEL_SHOW_TIME,
                transition: 'easeOutQuad'
            });
        }
    }
    hideLabel() {
        if(modernGnome){
            this.label.ease({
                opacity: 0,
                duration: Dash.DASH_ITEM_LABEL_HIDE_TIME,
                mode: Clutter.AnimationMode.EASE_OUT_QUAD,
                onComplete: () => this.label.hide()
            });
        }
        else{
            Tweener.addTween(this.label, {
                opacity: 0,
                time: Dash.DASH_ITEM_LABEL_HIDE_TIME,
                transition: 'easeOutQuad',
                onComplete: () => this.label.hide()
            });
        }
    }
    _createIcon(size) {
        this._icon = new St.Icon({  
            icon_name: 'start-here-symbolic',
            style_class: 'arc-menu-icon',
            track_hover:true,
            icon_size: size,
            reactive: true
        });
        let path = this._settings.get_string('custom-menu-button-icon');
        let iconEnum = this._settings.get_enum('menu-button-icon');

        if(iconEnum == Constants.MENU_BUTTON_ICON.Custom){
            if (GLib.file_test(path, GLib.FileTest.EXISTS)) {
                this._icon.set_gicon(Gio.icon_new_for_string(path));
            }
        }
        else if(iconEnum == Constants.MENU_BUTTON_ICON.System){
            this._icon.set_icon_name('start-here-symbolic');
        }
        else if(iconEnum == Constants.MENU_BUTTON_ICON.Arc_Menu){
            path = Me.path + Constants.ARC_MENU_ICON.path;
            if (GLib.file_test(path, GLib.FileTest.EXISTS)) {
                this._icon.set_gicon(Gio.icon_new_for_string(path));
            } 
        }
        else{
            path = Me.path + Constants.MENU_ICONS[iconEnum - 3].path;
            if (GLib.file_test(path, GLib.FileTest.EXISTS)) {
                this._icon.set_gicon(Gio.icon_new_for_string(path));
            } 
        }
        return this._icon;
    }
    getPanelIcon() {
        return this._icon;
    }

};



