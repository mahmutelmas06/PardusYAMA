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

const {Gdk, Gio, GLib, Gtk, St} = imports.gi;
const Constants = Me.imports.constants;
const DashMenu = Me.imports.menuButtonDash;
const Gettext = imports.gettext.domain(Me.metadata['gettext-domain']);
const Helper = Me.imports.helper;
const Main = imports.ui.main;
const PanelMenu = Me.imports.menuButtonPanel;
const _ = Gettext.gettext;

var modernGnome = imports.misc.config.PACKAGE_VERSION >= '3.31.9';
/**
 * The Menu Settings Controller class is responsible for changing and handling
 * the settings changes of the Arc Menu.
 */
var MenuSettingsController = class {
    constructor(settings, settingsControllers, panel, isMainPanel, dashOrPanel) {
        this._settings = settings;
        this.panel = panel;
        this.dashOrPanel = dashOrPanel;

        this.updateThemeID = GLib.timeout_add(0, 100, () => {
            Me.imports.prefs.saveCSS(this._settings);
            Main.loadTheme();
            this.updateThemeID = null;
            return GLib.SOURCE_REMOVE;
        });
        this.currentMonitorIndex = 0;
        this.isMainPanel = isMainPanel;
    
        if(this.dashOrPanel == Constants.ARC_MENU_PLACEMENT.PANEL){
            this._menuButton = new PanelMenu.ApplicationsButton(settings, panel);
            this._activitiesButton = this.panel.statusArea.activities;
        }
        else{
            this._menuButton = new DashMenu.ApplicationsButton(settings, panel);
            this.menuButtonAdjustedActor = this._menuButton.container;
            this._configureActivitiesButton();
        }
            
        this._settingsControllers = settingsControllers

         // Create the button, a Hot Corner Manager, a Menu Keybinder as well as a Keybinding Manager

        this._hotCornerManager = new Helper.HotCornerManager(this._settings,() => this.toggleMenus());
        if(this.isMainPanel){
            this._menuHotKeybinder = new Helper.MenuHotKeybinder(() => this._onHotkey());
            this._keybindingManager = new Helper.KeybindingManager(this._settings); 
        }
        this._applySettings();
    }

    // Load and apply the settings from the arc-menu settings
    _applySettings() {
        this._updateHotCornerManager();
        if(this.isMainPanel)
            this._updateHotKeyBinder();
        this._setButtonAppearance();
        this._setButtonText();
        this._setButtonIcon();
        this._setButtonIconSize();
        this._setButtonIconPadding();
    }
    // Bind the callbacks for handling the settings changes to the event signals
    bindSettingsChanges() {
        this.settingsChangeIds = [
            this._settings.connect('changed::hot-corners', this._updateHotCornerManager.bind(this)),
            this._settings.connect('changed::menu-hotkey', this._updateHotKeyBinder.bind(this)),
            this._settings.connect('changed::position-in-panel', this._setButtonPosition.bind(this)),
            this._settings.connect('changed::menu-position-alignment', this._setMenuPositionAlignment.bind(this)),
            this._settings.connect('changed::menu-button-appearance', this._setButtonAppearance.bind(this)),
            this._settings.connect('changed::custom-menu-button-text', this._setButtonText.bind(this)),
            this._settings.connect('changed::menu-button-icon', this._setButtonIcon.bind(this)),
            this._settings.connect('changed::custom-menu-button-icon', this._setButtonIcon.bind(this)),
            this._settings.connect('changed::custom-menu-button-icon-size', this._setButtonIconSize.bind(this)),
            this._settings.connect('changed::button-icon-padding', this._setButtonIconPadding.bind(this)),
            this._settings.connect('changed::enable-menu-button-arrow', this._setMenuButtonArrow.bind(this)),
            this._settings.connect('changed::enable-custom-arc-menu', this._enableCustomArcMenu.bind(this)),
            this._settings.connect('changed::remove-menu-arrow', this._enableCustomArcMenu.bind(this)),
            this._settings.connect('changed::krunner-show-details', this._updateKRunnerSearchLayout.bind(this)),
            this._settings.connect('changed::directory-shortcuts-list', this._redisplayRightSide.bind(this)),
            this._settings.connect('changed::application-shortcuts-list', this._redisplayRightSide.bind(this)),
            this._settings.connect('changed::show-power-button', this._redisplayRightSide.bind(this)),
            this._settings.connect('changed::show-logout-button', this._redisplayRightSide.bind(this)),
            this._settings.connect('changed::show-lock-button', this._redisplayRightSide.bind(this)),
            this._settings.connect('changed::show-external-devices', this._redisplayRightSide.bind(this)),
            this._settings.connect('changed::show-bookmarks', this._redisplayRightSide.bind(this)),
            this._settings.connect('changed::show-suspend-button', this._redisplayRightSide.bind(this)),
            this._settings.connect('changed::menu-height', this._updateMenuHeight.bind(this)),
            this._settings.connect('changed::right-panel-width', this._updateMenuHeight.bind(this)),
            this._settings.connect('changed::reload-theme',this._reloadExtension.bind(this)),
            this._settings.connect('changed::pinned-app-list',this._updateFavorites.bind(this)),
            this._settings.connect('changed::mint-pinned-app-list',this._updateButtonFavorites.bind(this)),
            this._settings.connect('changed::mint-separator-index',this._updateButtonFavorites.bind(this)),
            this._settings.connect('changed::ubuntu-dash-pinned-app-list',this._updateButtonFavorites.bind(this)),
            this._settings.connect('changed::ubuntu-dash-separator-index',this._updateButtonFavorites.bind(this)),
            this._settings.connect('changed::enable-pinned-apps',this._updateMenuDefaultView.bind(this)),
            this._settings.connect('changed::enable-ubuntu-homescreen',this._setDefaultMenuView.bind(this)),
            this._settings.connect('changed::menu-layout', this._updateMenuLayout.bind(this)),
            this._settings.connect('changed::enable-large-icons', this.updateIcons.bind(this)),
            this._settings.connect('changed::runner-position', this.updateRunnerLocation.bind(this)),
            this._settings.connect('changed::enable-sub-menus', this._reload.bind(this)), 
            this._settings.connect('changed::disable-category-arrows', this._reload.bind(this)),
            this._settings.connect('changed::disable-activities-button', this._configureActivitiesButton.bind(this)),
        ];
    }
    _reload(){
        this._menuButton._reload();
    }

    updateRunnerLocation(){
        this._menuButton.updateRunnerLocation();
    }
    updateIcons(){
        this._menuButton.updateIcons();
    }
    _updateMenuLayout(){
        this._menuButton._updateMenuLayout();
    }
    _setDefaultMenuView(){
        this._menuButton.setDefaultMenuView();
    }
    toggleMenus(){
        if(Main.overview.visible)
            Main.overview.hide();
        else{
            if(this._settings.get_boolean('multi-monitor') && global.dashToPanel){
                let screen = Gdk.Screen.get_default();
                let pointer = global.get_pointer();
                let currentMonitor = screen.get_monitor_at_point(pointer[0],pointer[1]);
                for(let i = 0;i<screen.get_n_monitors();i++){
                    if(i==currentMonitor)
                        this.currentMonitorIndex=i;
                }
                //close current menus that are open on monitors other than current monitor
                for (let i = 0; i < this._settingsControllers.length; i++) {
                    if(i!=this.currentMonitorIndex){
                    if(this._settingsControllers[i]._menuButton.leftClickMenu.isOpen)
                        this._settingsControllers[i]._menuButton.toggleMenu();
                    if(this._settingsControllers[i]._menuButton.rightClickMenu.isOpen)
                        this._settingsControllers[i]._menuButton.toggleRightClickMenu();
                    }
                }  
                //toggle menu on current monitor
                for (let i = 0; i < this._settingsControllers.length; i++) {
                    if(i==this.currentMonitorIndex)
                        this._settingsControllers[i]._menuButton.toggleMenu();
                }   
            }
            else {
                this._menuButton.toggleMenu();
            }
        }
    }
    _reloadExtension(){
        if(this._settings.get_boolean('reload-theme') == true){
            Main.loadTheme();
            this._settings.set_boolean('reload-theme',false);
        }
    }
    _enableCustomArcMenu() {
        this._menuButton.updateStyle();
    }
    _updateKRunnerSearchLayout(){
        if(this._settings.get_enum('menu-layout') == Constants.MENU_LAYOUT.Runner || this._settings.get_enum('menu-layout') == Constants.MENU_LAYOUT.Raven)
            this._menuButton.updateSearch();
    }
    _updateMenuHeight(){
        this._menuButton.updateHeight();
    }
    _updateFavorites(){
        let layout = this._settings.get_enum('menu-layout');
        if(layout == Constants.MENU_LAYOUT.Default || layout == Constants.MENU_LAYOUT.UbuntuDash ||
            layout == Constants.MENU_LAYOUT.Windows || layout == Constants.MENU_LAYOUT.Raven){
            if(this._menuButton.getShouldLoadFavorites())
                this._menuButton._loadFavorites();
            if(this._menuButton.getCurrentMenu() == Constants.CURRENT_MENU.FAVORITES)
               this._menuButton._displayFavorites();
        }
        if(layout == Constants.MENU_LAYOUT.Mint){
            if(this._menuButton.getShouldLoadFavorites())
                this._menuButton._loadFavorites();
        }

    }
    _updateButtonFavorites(){
        let layout = this._settings.get_enum('menu-layout');
        if(layout == Constants.MENU_LAYOUT.UbuntuDash){
            if(this._menuButton.getShouldLoadFavorites())
                this._menuButton._loadPinnedShortcuts();
        }
        if(layout == Constants.MENU_LAYOUT.Mint ){
            if(this._menuButton.getShouldLoadFavorites())
                this._menuButton._loadFavorites();
        }

    }
    _updateMenuDefaultView(){
        if(this._settings.get_boolean('enable-pinned-apps'))
            this._menuButton._displayFavorites();
        else
            this._menuButton._displayCategories();
    }
    _redisplayRightSide(){
        this._menuButton._redisplayRightSide();
    }
    _updateHotCornerManager() {
        let hotCornerAction = this._settings.get_enum('hot-corners');
        if (hotCornerAction == Constants.HOT_CORNERS_ACTION.Default) {
            this._hotCornerManager.enableHotCorners();
        } 
        else if(hotCornerAction == Constants.HOT_CORNERS_ACTION.Disabled) {
            this._hotCornerManager.disableHotCorners();
        }
        else if(hotCornerAction == Constants.HOT_CORNERS_ACTION.ToggleArcMenu) {
            this._hotCornerManager.modifyHotCorners();
        }
        else if(hotCornerAction == Constants.HOT_CORNERS_ACTION.Custom) {
            this._hotCornerManager.modifyHotCorners();
        }
    }

    _updateHotKeyBinder() {
        if (this.isMainPanel) {
            let hotkeySettingsKey = 'menu-keybinding-text';
            let menuKeyBinding = '';
            let hotKeyPos = this._settings.get_enum('menu-hotkey');

            this._keybindingManager.unbind(hotkeySettingsKey);
            this._menuHotKeybinder.disableHotKey();
            this._menuKeyBindingKey = 0;
            
            if (hotKeyPos==3) {
                this._keybindingManager.bind(hotkeySettingsKey, 'menu-keybinding', () => this._onHotkey());
                menuKeyBinding = this._settings.get_string(hotkeySettingsKey);
            }
            else if (hotKeyPos !== Constants.HOT_KEY.Undefined ) {
                let hotKey = Constants.HOT_KEY[hotKeyPos];
                this._menuHotKeybinder.enableHotKey(hotKey);
                menuKeyBinding = hotKey;
            }

            if (menuKeyBinding) {
                this._menuKeyBindingKey = Gtk.accelerator_parse(menuKeyBinding)[0];
            }
        } 
    }

    _onHotkey() {
        let hotKeyPos = this._settings.get_enum('menu-hotkey');
        if(hotKeyPos==1){
            this.toggleMenus();
        }
        else{
            if (this._settings.get_boolean('disable-hotkey-onkeyrelease'))
                this.toggleMenus();
            else
                this._onHotkeyRelease();
        }
    }

    _onHotkeyRelease() {
        let activeMenu = this._settingsControllers[this.currentMonitorIndex]._menuButton.getActiveMenu();
        let focusPanel;

        if(this.dashOrPanel == Constants.ARC_MENU_PLACEMENT.PANEL)
            focusPanel = modernGnome ? this.panel : this.panel.actor;
        else
            focusPanel = modernGnome ? this.panel._allDocks[0].dash : this.panel._allDocks[0].actor;

        let focusTarget = activeMenu ? 
                          (activeMenu.actor || activeMenu) : focusPanel;
        
        this.disconnectKeyRelease();

        this.keyInfo = {
            pressId: focusTarget.connect('key-press-event', _ => this.disconnectKeyRelease()),
            releaseId: focusTarget.connect('key-release-event', (actor, event) => {
                this.disconnectKeyRelease();

                if (this._menuKeyBindingKey == event.get_key_symbol()) {
                    this.toggleMenus();
                }
            }),
            target: focusTarget
        };

        focusTarget.grab_key_focus();
    }

    disconnectKeyRelease() {
        if (this.keyInfo) {
            this.keyInfo.target.disconnect(this.keyInfo.pressId);
            this.keyInfo.target.disconnect(this.keyInfo.releaseId);
            this.keyInfo = 0;
        }
    }

    // Place the menu button to main panel as specified in the settings
    _setButtonPosition() {
        if (this._isButtonEnabled()) {
            this._removeMenuButtonFromMainPanel();
            this._addMenuButtonToMainPanel();
            this._setMenuPositionAlignment();
        }
    }
    _setMenuPositionAlignment(){
        this._menuButton._setMenuPositionAlignment();
    }
    // Change the menu button appearance as specified in the settings
    _setButtonAppearance() {
        if(this.dashOrPanel == Constants.ARC_MENU_PLACEMENT.PANEL){
            let menuButtonWidget = this._menuButton.getWidget();
            switch (this._settings.get_enum('menu-button-appearance')) {
                case Constants.MENU_APPEARANCE.Text:
                    menuButtonWidget.hidePanelIcon();
                    menuButtonWidget.showPanelText();
                    break;
                case Constants.MENU_APPEARANCE.Icon_Text:
                    menuButtonWidget.hidePanelIcon();
                    menuButtonWidget.hidePanelText();
                    menuButtonWidget.showPanelIcon();
                    menuButtonWidget.showPanelText();
                    break;
                case Constants.MENU_APPEARANCE.Text_Icon:
                    menuButtonWidget.hidePanelIcon();
                    menuButtonWidget.hidePanelText();
                    menuButtonWidget.showPanelText();
                    menuButtonWidget.showPanelIcon();
                    break;
                case Constants.MENU_APPEARANCE.Icon: /* falls through */
                default:
                    menuButtonWidget.hidePanelText();
                    menuButtonWidget.showPanelIcon();
            }
            this._setMenuButtonArrow();
        }
    }
    _setMenuButtonArrow() {
        if(this.dashOrPanel == Constants.ARC_MENU_PLACEMENT.PANEL){
            let menuButtonWidget = this._menuButton.getWidget();
            if (this._settings.get_boolean('enable-menu-button-arrow')) {
                menuButtonWidget.hideArrowIcon();
                menuButtonWidget.showArrowIcon();
            } else {
                menuButtonWidget.hideArrowIcon();
            }
        }
    }

    // Update the text of the menu button as specified in the settings
    _setButtonText() {
        if(this.dashOrPanel == Constants.ARC_MENU_PLACEMENT.PANEL){
            // Update the text of the menu button
            let menuButtonWidget = this._menuButton.getWidget();
            let label = menuButtonWidget.getPanelLabel();

            let customTextLabel = this._settings.get_string('custom-menu-button-text');
            label.set_text(customTextLabel);
        }
    }

    // Update the icon of the menu button as specified in the settings
    _setButtonIcon() {
        let path = this._settings.get_string('custom-menu-button-icon');
        let menuButtonWidget = this._menuButton.getWidget();
        let stIcon = menuButtonWidget.getPanelIcon();
        let iconEnum = this._settings.get_enum('menu-button-icon');
        if(iconEnum == Constants.MENU_BUTTON_ICON.Custom){
            if (GLib.file_test(path, GLib.FileTest.EXISTS)) {
                stIcon.set_gicon(Gio.icon_new_for_string(path));
            }
        }
        else if(iconEnum == Constants.MENU_BUTTON_ICON.System){
            stIcon.set_icon_name('start-here-symbolic');
        }
        else if(iconEnum == Constants.MENU_BUTTON_ICON.Arc_Menu){
            path = Me.path + Constants.ARC_MENU_ICON.path;
            if (GLib.file_test(path, GLib.FileTest.EXISTS)) {
                stIcon.set_gicon(Gio.icon_new_for_string(path));
            } 
        }
        else{
            path = Me.path + Constants.MENU_ICONS[iconEnum - 3].path;
            if (GLib.file_test(path, GLib.FileTest.EXISTS)) {
                stIcon.set_gicon(Gio.icon_new_for_string(path));
            } 
        }
    }

    // Update the icon of the menu button as specified in the settings
    _setButtonIconSize() {
        if(this.dashOrPanel == Constants.ARC_MENU_PLACEMENT.PANEL){
            let menuButtonWidget = this._menuButton.getWidget();
            let stIcon = menuButtonWidget.getPanelIcon();
            let iconSize = this._settings.get_double('custom-menu-button-icon-size');
            let size = iconSize;
            stIcon.icon_size = size;
        }
    }
    _setButtonIconPadding() {
        if(this.dashOrPanel == Constants.ARC_MENU_PLACEMENT.PANEL){
            let menuButtonWidget = this._menuButton.getWidget();
            let stIcon = menuButtonWidget.getPanelIcon();
            let iconPadding = this._settings.get_int('button-icon-padding');
            stIcon.style = "padding: 0 "+iconPadding+"px;";
        }
    }

    // Get the current position of the menu button and its associated position order
    _getMenuPositionTuple() {
        switch (this._settings.get_enum('position-in-panel')) {
            case Constants.MENU_POSITION.Center:
                return ['center', 0];
            case Constants.MENU_POSITION.Right:
                return ['right', -1];
            case Constants.MENU_POSITION.Left: /* falls through */
            default:
                return ['left', 0];
        }
    }
    _configureActivitiesButton(restore = false){
        if(this.dashOrPanel == Constants.ARC_MENU_PLACEMENT.DTD){
            let isActivitiesButtonPresent = Main.panel.statusArea.activities && Main.panel.statusArea.activities.container &&
                                            Main.panel._leftBox.contains(Main.panel.statusArea.activities.container);
            let disable = this._settings.get_boolean('disable-activities-button');  
            if(!disable || restore){
                if(!isActivitiesButtonPresent){
                    Main.panel._leftBox.add_child(Main.panel.statusArea.activities.container);
                    Main.panel._leftBox.set_child_at_index(Main.panel.statusArea.activities.container, 0);
                }
            }                          
            if(disable){
                if(isActivitiesButtonPresent)
                    Main.panel._leftBox.remove_child(Main.panel.statusArea.activities.container);   
            }

        }
    }
    // Check if the activities button is present on the main panel
    _isActivitiesButtonPresent() {
        // Thanks to lestcape @github.com for the refinement of this method.
        return (this._activitiesButton &&
            this._activitiesButton.container &&
            this.panel._leftBox.contains(this._activitiesButton.container));
    }

    // Remove the activities button from the main panel
    _removeActivitiesButtonFromMainPanel() {
        if (this._isActivitiesButtonPresent()) {
            this.panel._leftBox.remove_child(this._activitiesButton.container);
        }
    }

    // Add or restore the activities button on the main panel
    _addActivitiesButtonToMainPanel() {
        if (this.panel == Main.panel && !this._isActivitiesButtonPresent()) {
            // Retsore the activities button at the default position
            this.panel._leftBox.add_child(this._activitiesButton.container);
            this.panel._leftBox.set_child_at_index(this._activitiesButton.container, 0);
        }
    }

    // Add the menu button to the main panel
    _addMenuButtonToMainPanel() {
        let [menuPosition, order] = this._getMenuPositionTuple();
        this.panel.addToStatusArea('arc-menu', this._menuButton, order, menuPosition);
    }

    // Remove the menu button from the main panel
    _removeMenuButtonFromMainPanel() {
        this.panel.menuManager.removeMenu(this._menuButton.leftClickMenu);
        this.panel.menuManager.removeMenu(this._menuButton.rightClickMenu);
        this.panel.statusArea['arc-menu'] = null;
    }

    // Enable the menu button
    enableButton() {
        this._removeActivitiesButtonFromMainPanel(); // disable the activities button
        this._addMenuButtonToMainPanel();
    }
    reEstablishDash(){  
        let container = this.panel._allDocks[0].dash._container;
        
        this.oldShowAppsIcon = this.panel._allDocks[0].dash._showAppsIcon;
        container.remove_actor(this.oldShowAppsIcon);

        this._setButtonIcon();
        let iconSize = this.panel._allDocks[0].dash.iconSize;
        this._menuButton._menuButtonWidget.icon.setIconSize(iconSize);

        container.add_actor(this.menuButtonAdjustedActor);
        this.panel._allDocks[0].dash._showAppsIcon = this.menuButtonAdjustedActor;

        this.hoverID = this.menuButtonAdjustedActor.child.connect('notify::hover', () => {
            this.panel._allDocks[0].dash._syncLabel(this.menuButtonAdjustedActor, null);
        });

        this.hidingID = Main.overview.connect('hiding', () => {
            this.panel._allDocks[0].dash._labelShowing = false;
            this.menuButtonAdjustedActor.hideLabel();
        });

        this.panel._allDocks[0].dash._queueRedisplay();
        this.oldDashDestroy = this.panel._allDocks[0].dash.destroy;
        this.panel._allDocks[0].dash.destroy = ()=> {
            if(this.hoverID){
                this.menuButtonAdjustedActor.child.disconnect(this.hoverID);
                this.hoverID = null;
            }
            if(this.hidingID){
                Main.overview.disconnect(this.hidingID);
                this.hidingID = null;
            }
            
            let container = this.panel._allDocks[0].dash._container;
            if(container)
                container.remove_actor(this.menuButtonAdjustedActor);
            
            this.panel._allDocks[0].dash._signalsHandler.destroy();
        };
    }
    // Enable the menu button
    enableButtonInDash() {
        this.reEstablishDash();       
        this.panelConnectID = this.panel.connect("toggled",()=>{
            this.reEstablishDash();
            this._menuButton.leftClickMenu.toggle();
            this._menuButton.leftClickMenu.toggle();
        });

    }

    // Disable the menu button
    _disableButton() {
        this._removeMenuButtonFromMainPanel();
        this._addActivitiesButtonToMainPanel(); // restore the activities button
        this._menuButton.destroy();
    }

    _isButtonEnabled() {
        return this.panel.statusArea['arc-menu'] !== null;
    }

    // Destroy this object
    destroy() {
        if (this.updateThemeID) {
            GLib.source_remove(this.updateThemeID);
            this.updateThemeID = null;
        }
        this.settingsChangeIds.forEach(id => this._settings.disconnect(id));
        this._hotCornerManager.destroy();
        
        if(this.dashOrPanel == Constants.ARC_MENU_PLACEMENT.DTD){
            if(this.panelConnectID && this.panel){
                this.panel.disconnect(this.panelConnectID);
                this.panelConnectID = null;
            } 
            if(this.hoverID){
                this.menuButtonAdjustedActor.child.disconnect(this.hoverID);
                this.hoverID = null;
            }
            if(this.hidingID){
                Main.overview.disconnect(this.hidingID);
                this.hidingID = null;
            }
            let parent = this.menuButtonAdjustedActor.get_parent();
            if(parent)
                parent.remove_actor(this.menuButtonAdjustedActor);
            if(this.panel._allDocks.length){
                let container = this.panel._allDocks[0].dash._container;
                this.panel._allDocks[0].dash._showAppsIcon = this.oldShowAppsIcon;
                container.add_actor(this.panel._allDocks[0].dash._showAppsIcon);
                this.panel._allDocks[0].dash.destroy = this.oldDashDestroy;
                this.panel._allDocks[0].dash._queueRedisplay();
            }
            this._configureActivitiesButton(true);
            this._menuButton.destroy();
        }
        else if(this.panel == undefined)
            this._menuButton.destroy();
        else if (this._isButtonEnabled()) {
            this._disableButton();
        }

        if(this.isMainPanel){
            this.disconnectKeyRelease();
            this._menuHotKeybinder.destroy();
            this._keybindingManager.destroy();
        }
        this._settings = null;
        this._activitiesButton = null;
        this._menuButton = null;
    }
};
