/* Applications overview tooltip
 *
 * Preferences dialog for gnome-shell-extensions-prefs tool
 */
 
const GObject = imports.gi.GObject;
const Gtk = imports.gi.Gtk;
const Gio = imports.gi.Gio;
const Lang = imports.lang;
const Me = imports.misc.extensionUtils.getCurrentExtension();
const Utils = Me.imports.utils;

const Gettext = imports.gettext.domain('applications-overview-tooltip');
const _ = Gettext.gettext;

let settings;

function init() {
	settings = Utils.getSettings(Me);
	Utils.initTranslations("applications-overview-tooltip");
}

function buildPrefsWidget(){

	// Prepare labels and controls
	let buildable = new Gtk.Builder();
	buildable.add_from_file( Me.dir.get_path() + '/prefs.xml' );
	let box = buildable.get_object('vbox_built');

	// Bind fields to settings
	settings.bind('hoverdelay', buildable.get_object('field_hoverdelay'), 'value', Gio.SettingsBindFlags.DEFAULT);
	settings.bind('labelshowtime', buildable.get_object('field_labelshowtime'), 'value', Gio.SettingsBindFlags.DEFAULT);
	settings.bind('labelhidetime', buildable.get_object('field_labelhidetime'), 'value', Gio.SettingsBindFlags.DEFAULT);
	settings.bind('alwaysshow', buildable.get_object('field_alwaysshow'), 'active', Gio.SettingsBindFlags.DEFAULT);
	settings.bind('appdescription', buildable.get_object('field_appdescription'), 'active', Gio.SettingsBindFlags.DEFAULT);
	settings.bind('groupappcount', buildable.get_object('field_groupappcount'), 'active', Gio.SettingsBindFlags.DEFAULT);
	settings.bind('borders', buildable.get_object('field_borders'), 'active', Gio.SettingsBindFlags.DEFAULT);

	box.show_all();
	return box;
};
