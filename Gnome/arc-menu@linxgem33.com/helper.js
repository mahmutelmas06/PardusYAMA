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
const {Gio, GObject, Gtk, Meta, Shell} = imports.gi;
const Constants = Me.imports.constants;
const Main = imports.ui.main;
const Util = imports.misc.util;


// Local constants
const MUTTER_SCHEMA = 'org.gnome.mutter';
const WM_KEYBINDINGS_SCHEMA = 'org.gnome.desktop.wm.keybindings';

/**
 * The Menu HotKeybinder class helps us to bind and unbind a menu hotkey
 * to the Arc Menu. Currently, valid hotkeys are Super_L and Super_R.
 */
var MenuHotKeybinder = class {

    constructor(menuToggler) {
        this._menuToggler = menuToggler;
        this.hotKeyEnabled = false;
        this.overlayKeyID = 0;
        this.defaultOverlayKeyID = 0;
        this.arcMenuCalling = false;
        this._mutterSettings = new Gio.Settings({ 'schema': MUTTER_SCHEMA });
        this._wmKeybindings = new Gio.Settings({ 'schema': WM_KEYBINDINGS_SCHEMA });
        this._oldPanelMainMenuKey = this._wmKeybindings.get_value('panel-main-menu');
        this._oldOverlayKey = this._mutterSettings.get_value('overlay-key');
        this.overlayKeyConnectID = this._mutterSettings.connect('changed::overlay-key', () => {
            if(!this.arcMenuCalling)
                this._oldOverlayKey = this._mutterSettings.get_value('overlay-key');
        });
        this.panelMainMenuKeyConnectID = this._wmKeybindings.connect('changed::panel-main-menu', () => {
            if(!this.arcMenuCalling)
                this._oldPanelMainMenuKey = this._wmKeybindings.get_value('panel-main-menu');
        });
        this._hotkeyMenuToggleId = Main.layoutManager.connect('startup-complete', ()=>{
            this._updateHotkeyMenuToggle();
        });
    }

    // Set Main.overview.toggle to toggle Arc Menu instead
    enableHotKey(hotkey) {
        this.arcMenuCalling = true;
        if (hotkey == Constants.SUPER_L) {
            this._mutterSettings.set_string('overlay-key', hotkey);
            Main.wm.allowKeybinding('overlay-key', Shell.ActionMode.NORMAL |
                Shell.ActionMode.OVERVIEW | Shell.ActionMode.POPUP);
            this.hotKeyEnabled =  true;
            if(!Main.layoutManager._startingUp)
                this._updateHotkeyMenuToggle();
        }
        else{
            this._wmKeybindings.set_strv('panel-main-menu', [hotkey]);
        }
        this.arcMenuCalling = false;
    }

    // Set Main.overview.toggle to default function and default hotkey
    disableHotKey() {
        this.arcMenuCalling = true;
        this._mutterSettings.set_value('overlay-key', this._oldOverlayKey);
        if(this.overlayKeyID > 0){
            global.display.disconnect(this.overlayKeyID);
            this.overlayKeyID = null;
        }
        if(this.defaultOverlayKeyID>0){
            GObject.signal_handler_unblock(global.display, this.defaultOverlayKeyID);
            this.defaultOverlayKeyID = null;
        }
        Main.wm.allowKeybinding('overlay-key', Shell.ActionMode.NORMAL |
            Shell.ActionMode.OVERVIEW);
        this.hotKeyEnabled = false;
    
        this._wmKeybindings.set_value('panel-main-menu', this._oldPanelMainMenuKey);    
        this.arcMenuCalling = false;
        
    }

    // Update hotkey menu toggle function
    _updateHotkeyMenuToggle() {
        if(this.hotKeyEnabled){
            Main.wm.allowKeybinding('overlay-key', Shell.ActionMode.NORMAL |
            Shell.ActionMode.OVERVIEW | Shell.ActionMode.POPUP);

            //Find signal ID in Main.js that connects 'overlay-key' to global.display and toggles Main.overview
            let [bool,signal_id, detail] = GObject.signal_parse_name('overlay-key', global.display, true);
            this.defaultOverlayKeyID = GObject.signal_handler_find(global.display, GObject.SignalMatchType.ID, signal_id, detail, null, null, null); 

            //If signal ID found, block it and connect new 'overlay-key' to toggle arc menu.
            if(this.defaultOverlayKeyID>0){
                GObject.signal_handler_block(global.display, this.defaultOverlayKeyID);
                this.overlayKeyID = global.display.connect('overlay-key', () => {
                    this._menuToggler();
                });
            }
            else
                global.log("Arc Menu ERROR - Failed to set Super_L hotkey");
        }   
        Main.wm.setCustomKeybindingHandler('panel-main-menu',
            Shell.ActionMode.NORMAL | Shell.ActionMode.OVERVIEW | Shell.ActionMode.POPUP,
            this._menuToggler.bind(this));
    }
    // Destroy this object
    destroy() {
        // Clean up and restore the default behaviour
        if(this.overlayKeyConnectID){
            this._mutterSettings.disconnect(this.overlayKeyConnectID);
            this.overlayKeyConnectID = null;
        }
        if(this.panelMainMenuKeyConnectID){
            this._wmKeybindings.disconnect(this.panelMainMenuKeyConnectID);
            this.panelMainMenuKeyConnectID = null;
        }
        this.disableHotKey();
        if (this._hotkeyMenuToggleId) {
            // Disconnect the keybinding handler
            Main.layoutManager.disconnect(this._hotkeyMenuToggleId);
            this._hotkeyMenuToggleId = null;
        }
    }
};

/**
 * The Keybinding Manager class allows us to bind and unbind keybindings
 * to a keybinding handler.
 */
var KeybindingManager = class {
    constructor(settings) {
        this._settings = settings;
        this._keybindings = new Map();
    }

    // Bind a keybinding to a keybinding handler
    bind(keybindingNameKey, keybindingValueKey, keybindingHandler) {
        if (!this._keybindings.has(keybindingNameKey)) {
            this._keybindings.set(keybindingNameKey, keybindingValueKey);
            let keybinding = this._settings.get_string(keybindingNameKey);
            this._setKeybinding(keybindingNameKey, keybinding);

            Main.wm.addKeybinding(keybindingValueKey, this._settings,
                Meta.KeyBindingFlags.NONE,
                Shell.ActionMode.NORMAL | Shell.ActionMode.OVERVIEW | Shell.ActionMode.POPUP,
                keybindingHandler.bind(this));

            return true;
        }
        return false;
    }

    // Set or update a keybinding in the Arc Menu settings
    _setKeybinding(keybindingNameKey, keybinding) {
        if (this._keybindings.has(keybindingNameKey)) {
            let keybindingValueKey = this._keybindings.get(keybindingNameKey);
            let [key, mods] = Gtk.accelerator_parse(keybinding);

            if (Gtk.accelerator_valid(key, mods)) {
                let shortcut = Gtk.accelerator_name(key, mods);
                this._settings.set_strv(keybindingValueKey, [shortcut]);
            } else {
                this._settings.set_strv(keybindingValueKey, []);
            }
        }
    }

    // Unbind a keybinding
    unbind(keybindingNameKey) {
        if (this._keybindings.has(keybindingNameKey)) {
            let keybindingValueKey = this._keybindings.get(keybindingNameKey);
            Main.wm.removeKeybinding(keybindingValueKey);
            this._keybindings.delete(keybindingNameKey);
            return true;
        }
        return false;
    }

    // Destroy this object
    destroy() {
        let keyIter = this._keybindings.keys();
        for (let i = 0; i < this._keybindings.size; i++) {
            let keybindingNameKey = keyIter.next().value;
            this.unbind(keybindingNameKey);
        }
    }
};

/**
 * The Hot Corner Manager class allows us to disable and enable
 * the gnome-shell hot corners.
 */
var HotCornerManager = class {
    constructor(settings, menuToggler) {
        this._settings = settings;
        this._menuToggler = menuToggler;
        this._hotCornersChangedId = Main.layoutManager.connect('hot-corners-changed', this._redisableHotCorners.bind(this));
    }

    _redisableHotCorners() {
        let hotCornerAction = this._settings.get_enum('hot-corners');
        if(hotCornerAction == Constants.HOT_CORNERS_ACTION.Disabled) {
            this.disableHotCorners();
        }
        else if(hotCornerAction == Constants.HOT_CORNERS_ACTION.ToggleArcMenu) {
            this.modifyHotCorners();
        }
        else if(hotCornerAction == Constants.HOT_CORNERS_ACTION.Custom) {
            this.modifyHotCorners();
        }
    }

    // Get all hot corners from the main layout manager
    _getHotCorners() {
        return Main.layoutManager.hotCorners;
    }

    // Enable all hot corners
    enableHotCorners() {
        // Restore the default behaviour and recreate the hot corners
        Main.layoutManager._updateHotCorners();
    }

    // Disable all hot corners
    disableHotCorners() {
        let hotCorners = this._getHotCorners();
        // Monkey patch each hot corner
        hotCorners.forEach((corner) => {
            if (corner) {
                corner._toggleOverview = () => { };
                corner._pressureBarrier._trigger = () => { };
            }
        });
    }

    // Change hotcorners to toggle Arc Menu
    modifyHotCorners() {
        let hotCorners = this._getHotCorners();
        let hotCornerAction = this._settings.get_enum('hot-corners');
        // Monkey patch each hot corner
        hotCorners.forEach((corner) => {
            if (corner) {
                corner._toggleOverview = () => { };
                corner._pressureBarrier._trigger = () => { 
                    corner._pressureBarrier._isTriggered = true;
                    if(corner._ripples)
                        corner._ripples.playAnimation(corner._x, corner._y);
                    else
                        corner._rippleAnimation();
                    if(hotCornerAction == Constants.HOT_CORNERS_ACTION.ToggleArcMenu)
                        this._menuToggler(); 
                    else if(hotCornerAction == Constants.HOT_CORNERS_ACTION.Custom){
                        let cmd = this._settings.get_string('custom-hot-corner-cmd');
                        if(cmd == "ArcMenu_ShowAllApplications"){
                            Main.overview.viewSelector._toggleAppsPage();
                        }
                        else if(cmd == "ArcMenu_RunCommand"){
                            Main.openRunDialog();
                        }
                        else{
                            Util.spawnCommandLine(this._settings.get_string('custom-hot-corner-cmd'));
                        }
                    }
                    
                    corner._pressureBarrier._reset();
                };
            }
        });
    }

    // Destroy this object
    destroy() {
        if (this._hotCornersChangedId>0) {
            Main.layoutManager.disconnect(this._hotCornersChangedId);
            this._hotCornersChangedId = 0;
        }

        // Clean up and restore the default behaviour
        this.enableHotCorners();
    }
};
