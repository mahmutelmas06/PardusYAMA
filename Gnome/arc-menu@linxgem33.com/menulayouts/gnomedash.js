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

var createMenu = class {
    constructor(mainButton) {
    }
    _onMainBoxKeyPress(mainBox, event) {
    }
    updateIcons(){       
    }
    setCurrentMenu(menu){
    }
    getCurrentMenu(){
    } 
    resetSearch(){
    }
    _redisplayRightSide(){
    }
    _redisplay() {
    }
    _reload() {
    }
    updateStyle(){
    }
    _display() {
    }
    _loadCategory(categoryId, dir) {
    }
    _loadCategories() {
    }
    _displayCategories(){
    }
    _displayGnomeFavorites(){
    }
    _displayPlaces() {
    }
    _loadFavorites() {  
    }
    _displayFavorites() {     
    }
    _createLeftBox(){    
    }
    placesAddSeparator(id){   
    }
    _redisplayPlaces(id) {
    }
    _createPlaces(id) {       
    }
    getShouldShowShortcut(shortcutName){   
    }
    scrollToButton(button) {
    }
    setDefaultMenuView(){
    }
    _setActiveCategory(){
    }   
    _clearApplicationsBox() {
    }
    selectCategory(dir) {
    }
    _displayButtons(apps) {
    }
    _displayAllApps(){
    }
    _listApplications(category_menu_id) {
    }
    destroy(){
    }
};
