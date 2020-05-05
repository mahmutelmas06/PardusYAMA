const Main = imports.ui.main;
const AppDisplay = imports.ui.appDisplay;
const PopupMenu = imports.ui.popupMenu;
const GLib = imports.gi.GLib;
const Lang = imports.lang;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Convenience = Me.imports.convenience;

const Gettext = imports.gettext.domain('add-on-desktop');
const _ = Gettext.gettext;

let origins = [];

function inject_fun(parent, name, fun) {
	let origin = parent[name];
	origins[name] = origin;
	parent[name] = function() {
		let origin_ret = origin.apply(this, arguments);
		if (origin_ret !== undefined) return origin_ret;
		return fun.apply(this, arguments);
	}
}

function remove_fun(parent, name) {
	parent[name] = origins[name];
}


function init() {
	Convenience.initTranslations();
}

let DesktopFolder = GLib.get_user_special_dir(	GLib.UserDirectory.DIRECTORY_DESKTOP	);
	
function enable() {
	inject_fun(AppDisplay.AppIconMenu.prototype, "_redisplay",  function() {
		if (Main.overview.viewSelector.getActivePage() == 2 || Main.overview.viewSelector.getActivePage() == 3) {
			this._appendSeparator();
			this._appendMenuItem(_("Add on the desktop")).connect("activate", Lang.bind(this, function() {
				GLib.spawn_command_line_async(
					"cp " +
					this._source.app.get_app_info().get_filename() +
					" " +
					DesktopFolder +
					"/"
				);
			}));
		}
	});
}

function disable() {
	remove_fun(AppDisplay.AppIconMenu.prototype, "_redisplay");
}



