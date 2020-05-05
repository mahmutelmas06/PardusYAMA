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
const Gettext = imports.gettext.domain(Me.metadata['gettext-domain']);
const _ = Gettext.gettext;

var VERSION = "40";

var CURRENT_MENU = {
    FAVORITES: 0,
    CATEGORIES: 1,
    CATEGORY_APPLIST: 2,
    SEARCH_RESULTS: 3
};

var ARC_MENU_PLACEMENT = {
    PANEL: 0,
    DTP: 1,
    DTD: 2
};

var EXTENSION = {
    DTP: 0,
    DTD: 1
};

var DEFAULT_DIRECTORIES = [
    imports.gi.GLib.UserDirectory.DIRECTORY_DOCUMENTS,
    imports.gi.GLib.UserDirectory.DIRECTORY_DOWNLOAD,
    imports.gi.GLib.UserDirectory.DIRECTORY_MUSIC,
    imports.gi.GLib.UserDirectory.DIRECTORY_PICTURES,
    imports.gi.GLib.UserDirectory.DIRECTORY_VIDEOS
];

var DIRECTION = {
    UP: 0,
    DOWN: 1
};
var SEPARATOR_ALIGNMENT = {
    VERTICAL: 0,
    HORIZONTAL: 1
};
var SEPARATOR_STYLE = {
    NORMAL: 0,
    LONG: 1,
    SHORT: 2,
    MAX: 3,
};

var SUPER_L = 'Super_L';
var SUPER_R = 'Super_R';
var EMPTY_STRING = '';

var HOT_KEY = { // See: org.gnome.shell.extensions.arc-menu.menu-hotkey
    Undefined: 0,
    Super_L: 1,
    Super_R: 2,
    // Inverse mapping
    0: EMPTY_STRING,  // Note: an empty string is evaluated to false
    1: SUPER_L,
    2: SUPER_R
};

var HOT_CORNERS_ACTION = {
    Default: 0,
    Disabled: 1,
    ToggleArcMenu: 2,
    Custom: 3
}

var SECTIONS = [
    'devices',
    'network',
    'bookmarks',
];

var MENU_POSITION = { // See: org.gnome.shell.extensions.arc-menu.menu-position
    Left: 0,
    Center: 1,
    Right: 2
};

var DIALOG_TYPE = {
    Default: 0,
    Mint_Pinned_Apps: 1,
    Application_Shortcuts: 2,
    Directories_Shortcuts: 3
};

var MENU_LAYOUT = { // See: org.gnome.shell.extensions.arc-menu.menu-position
    Default: 0,
    Brisk: 1,
    Whisker: 2,
    GnomeMenu: 3,
    Mint: 4,
    Elementary: 5,
    GnomeDash: 6,
    Simple: 7,
    Simple2: 8,
    Redmond: 9,
    UbuntuDash: 10,
    Budgie: 11,
    Windows: 12,
    Runner: 13,
    Chromebook: 14,
    Raven: 15
};

var MENU_APPEARANCE = {
    Icon: 0,
    Text: 1,
    Icon_Text: 2,
    Text_Icon: 3
};

var MENU_BUTTON_ICON = { 
    Arc_Menu: 0,
    System: 1,
    Custom: 2,
    Arc_Menu_Alt: 3,
    Arc_Menu_Original: 4,
    Curved_A: 5,
    Start_Box: 6,
    Focus: 7,
    Triple_Dash:8,
    Whirl: 9,
    Whirl_Circle: 10,
    Sums: 11,
    Arrow: 12,
    Lins: 13,    
    Diamond_Square: 14,
    Octo_Maze: 15,
    Search: 16
};
var ARC_MENU_ICON = { 
    name: _("Arc Menu"), 
    path: '/media/icons/arc-menu-symbolic.svg'
};

var MENU_ICONS = [
    { name: _("Arc Menu Alt"), path: '/media/icons/arc-menu-alt-symbolic.svg'},
    { name: _("Arc Menu Original"), path: '/media/icons/arc-menu-old-symbolic.svg'},
    { name: _("Curved A"), path: '/media/icons/curved-a-symbolic.svg'},
    { name: _("Start Box"), path: '/media/icons/start-box-symbolic.svg'},
    { name: _("Focus"), path: '/media/icons/focus-symbolic.svg'},
    { name: _("Triple Dash"), path: '/media/icons/triple-dash-symbolic.svg'},
    { name: _("Whirl"), path: '/media/icons/whirl-symbolic.svg'},
    { name: _("Whirl Circle"), path: '/media/icons/whirl-circle-symbolic.svg'},
    { name: _("Sums"), path: '/media/icons/sums-symbolic.svg'},
    { name: _("Arrow"), path: '/media/icons/arrow-symbolic.svg'},
    { name: _("Lins"), path: '/media/icons/lins-symbolic.svg'},
    { name: _("Diamond Square"), path: '/media/icons/diamond-square-symbolic.svg'},
    { name: _("Octo Maze"), path: '/media/icons/octo-maze-symbolic.svg'},
    { name: _("Search"), path: '/media/icons/search-symbolic.svg'}
]

var MENU_STYLE_CHOOSER = {
    ThumbnailHeight: 200,
    ThumbnailWidth: 200,
    MaxColumns: 6,
    Styles: [
        {   thumbnail: '/media/layouts/arc-menu.svg',
            name: 'Arc Menu'
        },
        {   thumbnail: '/media/layouts/brisk-menu.svg',
            name: 'Brisk Menu Style'
        },
        {   thumbnail: '/media/layouts/whisker-menu.svg',
            name: 'Whisker Menu Style'
        },
        {   thumbnail: '/media/layouts/gnome-menu.svg',
            name: 'GNOME Menu Style'
        },
        {   thumbnail: '/media/layouts/mint-menu.svg',
            name: 'Mint Menu Style'
        },
        {   thumbnail: '/media/layouts/elementary-menu.svg',
            name: 'Elementary Menu Style'
        },
        {   thumbnail: '/media/layouts/gnome-dash-menu.svg',
            name: 'GNOME Dash Style'
        },
        {   thumbnail: '/media/layouts/simple-menu.svg',
            name: 'Simple Menu Style'
        },
        {   thumbnail: '/media/layouts/simple-menu-2.svg',
            name: 'Simple Menu 2 Style'
        },
        {   thumbnail: '/media/layouts/redmond-style-menu.svg',
            name: 'Redmond Menu Style'
        },
        {   thumbnail: '/media/layouts/ubuntu-dash-menu.svg',
            name: 'Ubuntu Dash Style'
        },
        {   thumbnail: '/media/layouts/budgie-menu.svg',
            name: 'Budgie Style'
        },
        {   thumbnail: '/media/layouts/windows-10.svg',
            name: 'Windows 10 Style'
        },
        {   thumbnail: '/media/layouts/krunner-menu.svg',
            name: 'KRunner Style'
        },
        {   thumbnail: '/media/layouts/chromebook-menu.svg',
            name: 'Chromebook Style'
        },
        {   thumbnail: '/media/layouts/raven-menu.svg',
            name: 'Raven Menu Style'
        }
    ]
};

//Path to some files
var ARC_MENU_LOGO = {
    Path: '/media/icons/arc-menu-logo.svg',
    Size: [210, 210]
};

var COLOR_PRESET = {
    Path: '/media/misc/color-preset.svg',
    Size: [200, 35]
};

var WARNING_ICON = {
    Path: '/media/misc/warning.svg',
    Size: [30, 30] 
};

var HAMBURGER = {
    Path: '/media/misc/hamburger-symbolic.svg'
};

var KEYBOARD_LOGO = {
    Path: '/media/misc/keyboard.svg',
    Size: [256, 72] 
};

var CREDITS = '\n<b>Credits:</b>'+
		'\n\nCurrent Developers'+
		'\n <a href="https://gitlab.com/LinxGem33">@LinxGem33</a>  (Founder/Maintainer)'+
		'\n<a href="https://gitlab.com/AndrewZaech">@AndrewZaech</a>  (Developer)'+
		'\n\nPast Developers'+
		'\n <a href="https://github.com/lexruee">@lexruee</a>  (Developer)'+
		'\n\n\n<b>A Special Thanks To:</b>'+
		'\n\nTranslators'+
		'\n<a href="https://gitlab.com/LinxGem33/Arc-Menu#please-refer-to-the-wiki-section-for-a-translation-guide">Full List</a>'+
		'\nPlease See Details'+
		'\n\nOther'+
		'\n<a href="https://gitlab.com/tingvarsson">@Thomas Ingvarsson</a>  (Contributor)'+
		'\n<a href="https://github.com/charlesg99">@charlesg99</a>  (Contributor)'+
		'\n<a href="https://github.com/JasonLG1979">@JasonLG1979</a>  (Contributor)'+
		'\n<a href="https://github.com/fishears/Arc-Menu">@fishears</a>  (Contributor)'+
        '\n';
        
var GNU_SOFTWARE = '<span size="small">' +
    'This program comes with absolutely no warranty.\n' +
    'See the <a href="https://gnu.org/licenses/old-licenses/gpl-2.0.html">' +
	'GNU General Public License, version 2 or later</a> for details.' +
	'</span>';
