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
const {Gdk, GdkPixbuf, Gio, GLib, GObject, Gtk} = imports.gi;
const Constants = Me.imports.constants;
const Convenience = Me.imports.convenience;
const Gettext = imports.gettext.domain(Me.metadata['gettext-domain']);
const LayoutTweaks = Me.imports.menulayouts.tweaks;
const PW = Me.imports.prefsWidgets;
const _ = Gettext.gettext;

const SCHEMA_PATH = '/org/gnome/shell/extensions/arc-menu/';
const GSET = 'gnome-shell-extension-tool';

//Pinned Apps Page
var PinnedAppsPage = GObject.registerClass(
    class ArcMenu_PinnedAppsPage extends PW.NotebookPage {
        _init(settings) {
            super._init(_('Pinned Apps'));
            this._settings = settings;
            
            //list of currently pinned apps attached to scroll window
            this.pinnedAppsScrollWindow = new Gtk.ScrolledWindow();
            this.pinnedAppsScrollWindow.set_policy(Gtk.PolicyType.AUTOMATIC, Gtk.PolicyType.AUTOMATIC);
            this.pinnedAppsScrollWindow.set_max_content_height(300);
            this.pinnedAppsScrollWindow.set_min_content_height(300);
            this.frame = new PW.FrameBox();
            //function to load all pinned apps
            this._loadPinnedApps(this._settings.get_strv('pinned-app-list'));
            this.pinnedAppsScrollWindow.add_with_viewport(this.frame);
            this.add(this.pinnedAppsScrollWindow);
            
            //third row - add more apps to pinned apps list
            let addPinnedAppsFrame = new PW.FrameBox();
            let addPinnedAppsFrameRow = new PW.FrameBoxRow();
            let addPinnedAppsFrameLabel = new Gtk.Label({
                label: _("Add More Apps"),
                use_markup: true,
                xalign: 0,
                hexpand: true
            });
            let addPinnedAppsButton = new PW.IconButton({
                circular: false,
                icon_name: 'list-add-symbolic',
                tooltip_text: _("Browse a list of all applications to add to your Pinned Apps list.")
            });
            addPinnedAppsButton.connect('clicked', ()=> {
                let dialog = new AddAppsToPinnedListWindow(this._settings, this, Constants.DIALOG_TYPE.Default);
                dialog.show_all();
                dialog.connect('response', ()=> { 
                    if(dialog.get_response()) {
                        //checked apps to add to pinned apps list - from dialog 'Add" button click event
                        let newPinnedApps = dialog.get_newPinnedAppsArray();
                        let array=[]; 
                        for(let i = 0;i<newPinnedApps.length;i++){
                            array.push(newPinnedApps[i]._name);
                            array.push(newPinnedApps[i]._icon);
                            array.push(newPinnedApps[i]._cmd);
                        }
                        this._loadPinnedApps(array);
                        dialog.destroy();
                        this.frame.show();
                        this.savePinnedAppsButton.set_sensitive(true);
                    }
                    else
                        dialog.destroy();
                }); 
            });
            addPinnedAppsFrameRow.add(addPinnedAppsFrameLabel);
            addPinnedAppsFrameRow.add(addPinnedAppsButton);
            addPinnedAppsFrame.add(addPinnedAppsFrameRow);
            this.add(addPinnedAppsFrame);
            
            //fourth row - add custom app to pinned list
            let addCustomAppFrame = new PW.FrameBox();
            let addCustomAppFrameRow = new PW.FrameBoxRow();
            let addCustomAppFrameLabel = new Gtk.Label({
                label: _("Add Custom Shortcut"),
                use_markup: true,
                xalign: 0,
                hexpand: true
            });
            let addCustomAppButton = new PW.IconButton({
                circular: false,
                icon_name: 'list-add-symbolic',
                tooltip_text: _("Create a custom shortcut to add to your Pinned Apps list.")
            });
            addCustomAppButton.connect('clicked', ()=> {
                let dialog = new AddCustomLinkDialogWindow(this._settings, this, Constants.DIALOG_TYPE.Default);
                dialog.show_all();
                dialog.connect('response', ()=> { 
                    if(dialog.get_response()) {
                        let newPinnedApps = dialog.get_newPinnedAppsArray();
                        this._loadPinnedApps(newPinnedApps);
                        dialog.destroy();
                        this.frame.show();
                        this.savePinnedAppsButton.set_sensitive(true);
                    }
                    else
                        dialog.destroy();
                }); 
            });
            addCustomAppFrameRow.add(addCustomAppFrameLabel);
            addCustomAppFrameRow.add(addCustomAppButton);
            addCustomAppFrame.add(addCustomAppFrameRow);
            this.add(addCustomAppFrame);
            
            //last row - save settings
            this.savePinnedAppsButton = new Gtk.Button({
                label: _("Save"),
            });
            this.savePinnedAppsButton.connect('clicked', ()=> {
                //iterate through each frame row (containing apps to pin) to create an array to save in settings
                let array = [];
                for(let x = 0;x < this.frame.count; x++) {
                    array.push(this.frame.get_index(x)._name);
                    array.push(this.frame.get_index(x)._icon);
                    array.push(this.frame.get_index(x)._cmd);
                }
                this._settings.set_strv('pinned-app-list',array);
                this.savePinnedAppsButton.set_sensitive(false);
            }); 
            this.savePinnedAppsButton.set_halign(Gtk.Align.END);
            this.savePinnedAppsButton.set_sensitive(false);
            this.add(this.savePinnedAppsButton);
        }
         
        _loadPinnedApps(array) {
            for(let i = 0;i<array.length;i+=3) {
                let frameRow = new PW.FrameBoxRow();
                frameRow._name = array[i];
                frameRow._icon = array[i+1];
                frameRow._cmd = array[i+2];
                
                let arcMenuImage = new Gtk.Image( {
                    gicon: Gio.icon_new_for_string(frameRow._icon),
                    pixel_size: 22
                });

                let arcMenuImageBox = new Gtk.VBox({
                    margin_left:5,
                    expand: false
                });
                arcMenuImageBox.add(arcMenuImage);
                frameRow.add(arcMenuImageBox);

                let frameLabel = new Gtk.Label({
                    use_markup: false,
                    xalign: 0,
                    hexpand: true
                });

                frameLabel.label = _(frameRow._name);
                frameRow.add(frameLabel);
                let buttonBox = new Gtk.Grid({
                    margin_top:0,
                    margin_bottom: 0,
                    vexpand: false,
                    hexpand: false,
                    margin_right: 15,
                    column_spacing: 2
                });

                //create the three buttons to handle the ordering of pinned apps
                //and delete pinned apps
                let editButton = new PW.IconButton({
                    circular: false,
                    icon_name: 'emblem-system-symbolic',
                    tooltip_text: _('Modify')
                });
                let upButton = new PW.IconButton({
                    circular: false,
                    icon_name: 'go-up-symbolic',
                    tooltip_text: _('Move Up')
                });
                let downButton = new PW.IconButton({
                    circular: false,
                    icon_name: 'go-down-symbolic',
                    tooltip_text: _('Move Down')
                });
                let deleteButton = new PW.IconButton({
                    circular: false,
                    icon_name: 'edit-delete-symbolic',
                    tooltip_text: _('Delete')
                });
                editButton.connect('clicked', ()=> {
                    let appArray = [frameRow._name,frameRow._icon,frameRow._cmd];
                    let dialog = new AddCustomLinkDialogWindow(this._settings, this, Constants.DIALOG_TYPE.Default, true, appArray);
                    dialog.show_all();
                    dialog.connect('response', ()=> { 
                        if(dialog.get_response()) {
                            let newPinnedApps = dialog.get_newPinnedAppsArray();
                            frameRow._name = newPinnedApps[0];
                            frameRow._icon = newPinnedApps[1];
                            frameRow._cmd = newPinnedApps[2];
                            frameLabel.label = _(frameRow._name);
                            arcMenuImage.gicon = Gio.icon_new_for_string(frameRow._icon);
                            dialog.destroy();
                            this.frame.show();
                            this.savePinnedAppsButton.set_sensitive(true);
                        }
                        else
                            dialog.destroy();
                    });  
                });
                upButton.connect('clicked', ()=> {
                    //find index of frameRow in frame
                    //remove and reinsert at new position
                    let index = frameRow.get_index();
                    if(index!=0) {
                      this.frame.remove(frameRow);
                      this.frame.insert(frameRow,index-1);
                    }
                    this.frame.show();
                    this.savePinnedAppsButton.set_sensitive(true);
                });

                downButton.connect('clicked', ()=> {
                    //find index of frameRow in frame
                    //remove and reinsert at new position
                    let index = frameRow.get_index();
                    if(index+1<this.frame.count) {
                      this.frame.remove(frameRow);
                      this.frame.insert(frameRow,index+1);
                    }
                    this.frame.show();
                    this.savePinnedAppsButton.set_sensitive(true);
                });

                deleteButton.connect('clicked', ()=> {
                    //remove frameRow
                    this.frame.remove(frameRow);
                    this.frame.show();
                    this.savePinnedAppsButton.set_sensitive(true);
                });
                //add everything to frame
                buttonBox.add(editButton);
                buttonBox.add(upButton);
                buttonBox.add(downButton);
                buttonBox.add(deleteButton);
                frameRow.add(buttonBox);
                this.frame.add(frameRow);
            }
        }
});
//Dialog Window for Adding Apps to Pinned Apps List   
var AddAppsToPinnedListWindow = GObject.registerClass(
    class ArcMenu_AddAppsToPinnedListWindow extends PW.DialogWindow {
        _init(settings, parent, dialogType) {
            this._settings = settings;
            this._dialogType = dialogType;
            if(this._dialogType == Constants.DIALOG_TYPE.Default)  
                super._init(_('Add to your Pinned Apps'), parent);     
            else if(this._dialogType == Constants.DIALOG_TYPE.Mint_Pinned_Apps)
                super._init(_('Change Selected Pinned App'), parent);
            else if(this._dialogType == Constants.DIALOG_TYPE.Application_Shortcuts)
                super._init(_('Select Application Shortcuts'), parent);
            else if(this._dialogType == Constants.DIALOG_TYPE.Directories_Shortcuts)
                super._init(_('Select Directory Shortcuts'), parent);
            this.newPinnedAppsArray=[];
            this.addResponse = false;
        }

        _createLayout(vbox) {
            //create a scrolledwindow for list of all apps
            let pinnedAppsScrollWindow = new Gtk.ScrolledWindow();
            pinnedAppsScrollWindow.set_policy(Gtk.PolicyType.AUTOMATIC, Gtk.PolicyType.AUTOMATIC);
            pinnedAppsScrollWindow.set_max_content_height(300);
            pinnedAppsScrollWindow.set_min_content_height(300);
            pinnedAppsScrollWindow.set_min_content_width(500);
            pinnedAppsScrollWindow.set_min_content_width(500);
            this.appsFrame = new PW.FrameBox();
            let addAppsButton;
            if(this._dialogType == Constants.DIALOG_TYPE.Default || this._dialogType == Constants.DIALOG_TYPE.Application_Shortcuts
                || this._dialogType == Constants.DIALOG_TYPE.Directories_Shortcuts){
                //Label and button to add apps to list
                addAppsButton = new Gtk.Button({
                    label: _("Add"),
                    xalign:1
                });

                addAppsButton.connect('clicked', ()=> {
                    this.addResponse = true;
                    this.response(-10);
                });
                addAppsButton.set_halign(Gtk.Align.END);
            }
            

            // add the frames to the vbox
            
            pinnedAppsScrollWindow.add_with_viewport(this.appsFrame);
            vbox.add(pinnedAppsScrollWindow);
            if(this._dialogType == Constants.DIALOG_TYPE.Default){
                this._loadCategories();
                vbox.add(addAppsButton);
            }
            else if(this._dialogType == Constants.DIALOG_TYPE.Directories_Shortcuts){
                let defaultApplicationShortcuts = this._settings.get_default_value('directory-shortcuts-list').deep_unpack();
                defaultApplicationShortcuts.push(["Computer", "ArcMenu_Computer", "ArcMenu_Computer"]);
                defaultApplicationShortcuts.push(["Network", "ArcMenu_Network", "ArcMenu_Network"]);
                for(let i = 0;i < defaultApplicationShortcuts.length; i++) {
                    let frameRow = new PW.FrameBoxRow();
                    frameRow._icon = getIconPath(defaultApplicationShortcuts[i]);
                    frameRow._name = _(defaultApplicationShortcuts[i][0]);
                    frameRow._cmd = defaultApplicationShortcuts[i][2];

                    let iconImage = new Gtk.Image( {
                        gicon: Gio.icon_new_for_string(frameRow._icon),
                        pixel_size: 22
                    });

                    let iconImageBox = new Gtk.VBox( {
                        margin_left: 5,
                        expand: false
                    });
                    iconImageBox.add(iconImage);
                    frameRow.add(iconImageBox);

                    let frameLabel = new Gtk.Label( {
                        use_markup: false,
                        xalign: 0,
                        hexpand: true
                    });
                    frameLabel.label = frameRow._name;
                    frameRow.add(frameLabel);
                    
                    let checkButton = new Gtk.CheckButton({
                        margin_right: 20
                    });
                    checkButton.connect('toggled', ()=> {
                        //if checkbox is checked add the framerow to newPinnedAppsArray
                        //else if unchecked remove it from the array
                        if(checkButton.get_active()) {
                            this.newPinnedAppsArray.push(frameRow);
                        }
                        else {
                            let index= this.newPinnedAppsArray.indexOf(frameRow);
                            this.newPinnedAppsArray.splice(index,1);
                        }
                    });
                    frameRow.add(checkButton);
                    
                    
                    this.appsFrame.add(frameRow);
                    
                }
                vbox.add(addAppsButton);
            }
            else if(this._dialogType == Constants.DIALOG_TYPE.Application_Shortcuts){
                this._loadCategories();
                let defaultApplicationShortcutsFrame = new PW.FrameBox();
                let defaultApplicationShortcuts = this._settings.get_default_value('application-shortcuts-list').deep_unpack();
                defaultApplicationShortcuts.push([_("Arc Menu Settings"), Me.path + '/media/icons/arc-menu-symbolic.svg', "gnome-shell-extension-prefs arc-menu@linxgem33.com"]);
                defaultApplicationShortcuts.push([_("Run Command..."), "system-run-symbolic", "ArcMenu_RunCommand"]);
                for(let i = 0;i < defaultApplicationShortcuts.length; i++) {
                    let frameRow = new PW.FrameBoxRow();
                    frameRow._name = _(defaultApplicationShortcuts[i][0]);
                    frameRow._icon = defaultApplicationShortcuts[i][1];
                    frameRow._cmd = defaultApplicationShortcuts[i][2];
                    if(frameRow._cmd == "ArcMenu_Software" && GLib.find_program_in_path('io.elementary.appcenter')){
                        frameRow._icon = 'pop-shop';
                    }
                    let iconImage = new Gtk.Image( {
                        gicon: Gio.icon_new_for_string(frameRow._icon),
                        pixel_size: 22
                    });

                    let iconImageBox = new Gtk.VBox( {
                        margin_left: 5,
                        expand: false
                    });
                    iconImageBox.add(iconImage);
                    frameRow.add(iconImageBox);

                    let frameLabel = new Gtk.Label( {
                        use_markup: false,
                        xalign: 0,
                        hexpand: true
                    });
                    frameLabel.label = frameRow._name;
                    frameRow.add(frameLabel);
                    
                    let checkButton = new Gtk.CheckButton({
                        margin_right: 20
                    });
                    checkButton.connect('toggled', ()=> {
                        //if checkbox is checked add the framerow to newPinnedAppsArray
                        //else if unchecked remove it from the array
                        if(checkButton.get_active()) {
                            this.newPinnedAppsArray.push(frameRow);
                        }
                        else {
                            let index= this.newPinnedAppsArray.indexOf(frameRow);
                            this.newPinnedAppsArray.splice(index,1);
                        }
                    });
                    frameRow.add(checkButton);
                    

                    defaultApplicationShortcutsFrame.add(frameRow);
                    
                }
                let notebook = new PW.Notebook();

                let defaultAppsPage = new PW.NotebookPage(_("Default Apps"));
                notebook.append_page(defaultAppsPage);
                defaultAppsPage.add(defaultApplicationShortcutsFrame);
                vbox.remove(pinnedAppsScrollWindow);
                let systemAppsPage = new PW.NotebookPage(_("System Apps"));
                notebook.append_page(systemAppsPage);
                systemAppsPage.add(pinnedAppsScrollWindow);

                vbox.add(notebook);
                vbox.add(addAppsButton);
            }
            else{
                this._loadCategories();
                let defaultAppsWindow = new Gtk.ScrolledWindow();
                defaultAppsWindow.set_policy(Gtk.PolicyType.AUTOMATIC, Gtk.PolicyType.AUTOMATIC);
                defaultAppsWindow.set_max_content_height(300);
                defaultAppsWindow.set_min_content_height(300);
                defaultAppsWindow.set_min_content_width(500);
                defaultAppsWindow.set_min_content_width(500);
            
                let defaultApplicationShortcutsFrame = new PW.FrameBox();
                defaultAppsWindow.add_with_viewport(defaultApplicationShortcutsFrame);
                let defaultApplicationShortcuts = this._settings.get_default_value('directory-shortcuts-list').deep_unpack();
                defaultApplicationShortcuts.push(["Computer", "ArcMenu_Computer", "ArcMenu_Computer"]);
                defaultApplicationShortcuts.push(["Network", "ArcMenu_Network", "ArcMenu_Network"]);

                defaultApplicationShortcuts.push(["Lock", "changes-prevent-symbolic", "ArcMenu_Lock"]);
                defaultApplicationShortcuts.push(["Log Out", "application-exit-symbolic", "ArcMenu_LogOut"]);
                defaultApplicationShortcuts.push(["Power Off", "system-shutdown-symbolic", "ArcMenu_PowerOff"]);
                defaultApplicationShortcuts.push(["Suspend", "media-playback-pause-symbolic", "ArcMenu_Suspend"]);
                for(let i = 0;i < defaultApplicationShortcuts.length; i++) {
                    let frameRow = new PW.FrameBoxRow();

                    frameRow._icon = getIconPath(defaultApplicationShortcuts[i]);                        
                    frameRow._name = _(defaultApplicationShortcuts[i][0]);
                    frameRow._cmd = defaultApplicationShortcuts[i][2];

                    let iconImage = new Gtk.Image( {
                        gicon: Gio.icon_new_for_string(frameRow._icon),
                        pixel_size: 22
                    });

                    let iconImageBox = new Gtk.VBox( {
                        margin_left: 5,
                        expand: false
                    });
                    iconImageBox.add(iconImage);
                    frameRow.add(iconImageBox);

                    let frameLabel = new Gtk.Label( {
                        use_markup: false,
                        xalign: 0,
                        hexpand: true
                    });
                    frameLabel.label = frameRow._name;
                    frameRow.add(frameLabel);
                    
                    
                    let checkButton = new PW.IconButton({
                        circular: false,
                        icon_name: 'list-add-symbolic'
                    });
                    checkButton.margin_right = 20;
                    checkButton.connect('clicked', ()=> {
                        this.newPinnedAppsArray.push(frameRow._name, frameRow._icon, frameRow._cmd);
                        this.addResponse = true;
                        this.response(-10);
                    });
                    frameRow.add(checkButton);

                    defaultApplicationShortcutsFrame.add(frameRow);
                    
                }
                let notebook = new PW.Notebook();

                let defaultAppsPage = new PW.NotebookPage(_("Presets"));
                notebook.append_page(defaultAppsPage);
                defaultAppsPage.add(defaultAppsWindow);
                vbox.remove(pinnedAppsScrollWindow);
                let systemAppsPage = new PW.NotebookPage(_("System Apps"));
                notebook.append_page(systemAppsPage);
                systemAppsPage.add(pinnedAppsScrollWindow);

                vbox.add(notebook);
            }
        }

        //function to get the array of apps to add to list
        get_newPinnedAppsArray() {
            return this.newPinnedAppsArray;
        }
        get_response() {
            return this.addResponse;
        }
        _loadCategories() {
            //get all apps, store in list
            let allApps = Gio.app_info_get_all();

            //sort apps by name alphabetically
            allApps.sort((a, x) => {
              let _a = a.get_display_name();
              let _b = x.get_display_name();
              return GLib.strcmp0(_a, _b);
            });
            let iter = this._dialogType == Constants.DIALOG_TYPE.Default ? -1 : 0;
            for(let i = iter; i < allApps.length; i++) {
                if(i == -1 ? true : allApps[i].should_show()) {
                    let frameRow = new PW.FrameBoxRow();
                    if(i == -1){
                        frameRow._name = _("Arc Menu Settings");
                        frameRow._icon = Me.path + '/media/icons/arc-menu-symbolic.svg';
                        frameRow._cmd = "gnome-shell-extension-prefs arc-menu@linxgem33.com";
                    }
                    else{
                        frameRow._name = allApps[i].get_display_name();
                        if(allApps[i].get_icon())
                            frameRow._icon = allApps[i].get_icon().to_string(); //stores icon as string
                        else 
                            frameRow._icon= "dialog-information";
                            
                        frameRow._cmd = allApps[i].get_id(); //string for command line to launch .desktop files
                    }
                   
                    let iconImage = new Gtk.Image( {
                        gicon: Gio.icon_new_for_string(frameRow._icon),
                        pixel_size: 22
                    });

                    let iconImageBox = new Gtk.VBox( {
                        margin_left: 5,
                        expand: false
                    });
                    iconImageBox.add(iconImage);
                    frameRow.add(iconImageBox);

                    let frameLabel = new Gtk.Label( {
                        use_markup: false,
                        xalign: 0,
                        hexpand: true
                    });
                    frameLabel.label = frameRow._name;
                    frameRow.add(frameLabel);
                    if(this._dialogType == Constants.DIALOG_TYPE.Default || this._dialogType == Constants.DIALOG_TYPE.Application_Shortcuts||
                        this._dialogType == Constants.DIALOG_TYPE.Directories_Shortcuts){
                        let checkButton = new Gtk.CheckButton({
                            margin_right: 20
                        });
                        checkButton.connect('toggled', ()=> {
                            //if checkbox is checked add the framerow to newPinnedAppsArray
                            //else if unchecked remove it from the array
                            if(checkButton.get_active()) {
                                this.newPinnedAppsArray.push(frameRow);
                            }
                            else {
                                let index= this.newPinnedAppsArray.indexOf(frameRow);
                                this.newPinnedAppsArray.splice(index,1);
                            }
                        });
                        frameRow.add(checkButton);
                    }
                    else{
                        let checkButton = new PW.IconButton({
                            circular: false,
                            icon_name: 'list-add-symbolic'
                        });
                        checkButton.margin_right = 20;
                        checkButton.connect('clicked', ()=> {
                            this.newPinnedAppsArray.push(frameRow._name, frameRow._icon, frameRow._cmd);
                            this.addResponse = true;
                            this.response(-10);
                        });
                        frameRow.add(checkButton);
                    }

                    this.appsFrame.add(frameRow);
                }
            }
        }
});
    
//Dialog Window for Adding Custom Links to Pinned Apps List    
var AddCustomLinkDialogWindow = GObject.registerClass(
    class ArcMenu_AddCustomLinkDialogWindow extends PW.DialogWindow {
        _init(settings, parent, dialogType, isAppEdit=false, appArray=null) {
            this._settings = settings;
            this.newPinnedAppsArray=[];
            this.addResponse = false;
            this.isAppEdit = isAppEdit;
            this._dialogType = dialogType;
            this.appArray = appArray;
            if(this._dialogType == Constants.DIALOG_TYPE.Default)  
                super._init(isAppEdit?_('Edit Pinned App'):_('Add a Custom Shortcut'), parent);    
            else if(this._dialogType == Constants.DIALOG_TYPE.Mint_Pinned_Apps)
                super._init(isAppEdit?_('Edit Pinned App'):_('Add a Custom Shortcut'), parent);
            else if(this._dialogType == Constants.DIALOG_TYPE.Application_Shortcuts)
                super._init(isAppEdit?_('Edit Shortcut'):_('Add a Custom Shortcut'), parent);
            else if(this._dialogType == Constants.DIALOG_TYPE.Directories_Shortcuts)
                super._init(isAppEdit?_('Edit Custom Shortcut'):_('Add a Custom Shortcut'), parent);
        }

        _createLayout(vbox) {
            let mainFrame = new PW.FrameBox();
            //first row  - Name of Custom link
            let nameFrameRow = new PW.FrameBoxRow();
            let nameFrameLabel = new Gtk.Label({
                label: _('Shortcut Name:'),
                use_markup: true,
                xalign: 0,
                hexpand: true,
                selectable: false
            });
            let nameEntry = new Gtk.Entry();
            nameEntry.set_width_chars(35);
            nameFrameRow.add(nameFrameLabel);
            nameFrameRow.add(nameEntry);
            nameEntry.grab_focus();
            mainFrame.add(nameFrameRow);
            //second row  - Icon of Custom link
            let iconFrameRow = new PW.FrameBoxRow();
            let iconFrameLabel = new Gtk.Label({
                label: _("Icon:"),
                use_markup: true,
                xalign: 0,
                hexpand: true,
                selectable: false
            });
            let iconEntry = new Gtk.Entry();
            iconEntry.set_width_chars(35);
            // create file filter and file chooser button
            let fileFilter = new Gtk.FileFilter();
            fileFilter.add_pixbuf_formats();
            let fileChooserButton = new Gtk.FileChooserButton({
                action: Gtk.FileChooserAction.OPEN,
                title: _('Please select an image icon'),
                filter: fileFilter,
                width_chars: 10
            });
            fileChooserButton.connect('file-set', (widget) => {
                let iconFilepath = widget.get_filename();
                iconEntry.set_text(iconFilepath);
            });
            fileChooserButton.set_current_folder(GLib.get_user_special_dir(GLib.UserDirectory.DIRECTORY_PICTURES));

            iconFrameRow.add(iconFrameLabel);
            iconFrameRow.add(fileChooserButton);
            iconFrameRow.add(iconEntry);
            if(this._dialogType !== Constants.DIALOG_TYPE.Directories_Shortcuts)
                mainFrame.add(iconFrameRow);

            //third row  - Command of Custom link
            let cmdFrameRow = new PW.FrameBoxRow();
            let cmdFrameLabel = new Gtk.Label({
                label: _('Terminal Command:'),
                use_markup: true,
                xalign: 0,
                hexpand: true,
                selectable: false
            });
            if(this._dialogType == Constants.DIALOG_TYPE.Directories_Shortcuts)
                cmdFrameLabel.label =  _("Shortcut Path:");
            let cmdEntry = new Gtk.Entry();
            cmdEntry.set_width_chars(35);
            cmdFrameRow.add(cmdFrameLabel);
            cmdFrameRow.add(cmdEntry);
            mainFrame.add(cmdFrameRow);
            //last row - Label and button to add custom link to list

            let addButton = new Gtk.Button({
                label: this.isAppEdit ?_("Save") :_("Add")
            });

            if(this.appArray!=null) {
                nameEntry.text=this.appArray[0];
                iconEntry.text=this.appArray[1];
                cmdEntry.text=this.appArray[2];
                let iconFilepath = iconEntry.get_text();
                if (iconFilepath) {
                    fileChooserButton.set_filename(iconFilepath);
                }
            }
            addButton.connect('clicked', ()=> {
                this.newPinnedAppsArray.push(nameEntry.get_text());
                if(this._dialogType !== Constants.DIALOG_TYPE.Directories_Shortcuts)
                    this.newPinnedAppsArray.push(iconEntry.get_text());
                else
                    this.newPinnedAppsArray.push("ArcMenu_Folder");
                this.newPinnedAppsArray.push(cmdEntry.get_text());
                this.addResponse = true;
                this.response(-10);
            });
            addButton.set_halign(Gtk.Align.END);

            // add the frames to the vbox
            vbox.add(mainFrame);
            vbox.add(addButton);
        }
        //function to get the array of apps to add to list
        get_newPinnedAppsArray(){
          return this.newPinnedAppsArray;
        }
        get_response(){
          return this.addResponse;
        }
});


// General Settings Page
var GeneralPage = GObject.registerClass(
    class ArcMenu_GeneralPage extends PW.NotebookPage {
        _init(settings) {
            super._init(_('General'));
            this._settings = settings;
          
            let menuPlacementFrame = new PW.FrameBox();
            this._createDisplayOnFrame(menuPlacementFrame);      
            this._settings.connect('changed::dtp-dtd-state', ()=>{
                menuPlacementFrame.remove_all_children();
                this._createDisplayOnFrame(menuPlacementFrame);   
                menuPlacementFrame.show();
            }) 
            
            //Tool-tips
            let tooltipFrame = new PW.FrameBox();
            let tooltipRow = new PW.FrameBoxRow();
            let tooltipLabel = new Gtk.Label({
                label: _("Disable Tooltips"),
                use_markup: true,
                xalign: 0,
                hexpand: true
            });

            let tooltipSwitch = new Gtk.Switch({ 
                halign: Gtk.Align.END,
                tooltip_text: _("Disable all tooltips in Arc Menu") 
            });
            tooltipSwitch.set_active(this._settings.get_boolean('disable-tooltips'));
            tooltipSwitch.connect('notify::active', (widget) => {
                this._settings.set_boolean('disable-tooltips', widget.get_active());
            });

            tooltipRow.add(tooltipLabel);
            tooltipRow.add(tooltipSwitch);
            tooltipFrame.add(tooltipRow);

            // Hot Corner Box   
            let modifyHotCornerFrame = new PW.FrameBox();
            let modifyHotCornerRow = new PW.FrameBoxRow();
            let modifyHotCornerLabel = new Gtk.Label({
                label: _("Modify Activities Hot Corner"),
                use_markup: true,
                xalign: 0,
                hexpand: true
            });
            
            let modifyHotCornerButton = new PW.IconButton({
                circular: true,
                icon_name: 'emblem-system-symbolic',
                tooltip_text: _("Modify the action of the Activities Hot Corner")
            });
            modifyHotCornerButton.connect('clicked', ()=> {
                let dialog = new ModifyHotCornerDialogWindow(this._settings, this);
                dialog.show_all();
                dialog.connect('response', ()=> { 
                    dialog.destroy();
                }); 
            });
            let modifyHotCornerSwitch = new Gtk.Switch({ 
                halign: Gtk.Align.END,
                tooltip_text: _("Override the default behavoir of the Activities Hot Corner")
            });
            modifyHotCornerSwitch.set_active(this._settings.get_boolean('override-hot-corners'));
            modifyHotCornerButton.set_sensitive(this._settings.get_boolean('override-hot-corners'));
            modifyHotCornerSwitch.connect('notify::active', (widget) => {
                this._settings.set_boolean('override-hot-corners',widget.get_active());
                modifyHotCornerButton.set_sensitive(widget.get_active());
                if(!widget.get_active()){
                    this._settings.set_enum('hot-corners',Constants.HOT_CORNERS_ACTION.Default);
                }
            });
            modifyHotCornerRow.add(modifyHotCornerLabel);
            modifyHotCornerRow.add(modifyHotCornerButton);
            modifyHotCornerRow.add(modifyHotCornerSwitch);
            modifyHotCornerFrame.add(modifyHotCornerRow);

           
            //Pinned Apps / Categories Default View Toggle 
            let defaultLeftBoxFrame = new PW.FrameBox();
            let defaultLeftBoxRow = new PW.FrameBoxRow();
            let defaultLeftBoxLabel = new Gtk.Label({
                label: _("Arc Menu Default View"),
                use_markup: true,
                xalign: 0,
                hexpand: true
            });
            let defaultLeftBoxCombo = new Gtk.ComboBoxText({ 
                halign: Gtk.Align.END,
                tooltip_text: _("Choose the default menu view for Arc Menu") 
            });
            defaultLeftBoxCombo.append_text(_("Pinned Apps"));
            defaultLeftBoxCombo.append_text(_("Categories List"));
            if(this._settings.get_boolean('enable-pinned-apps'))
                defaultLeftBoxCombo.set_active(0);
            else 
            defaultLeftBoxCombo.set_active(1);
            defaultLeftBoxCombo.connect('changed', (widget) => {
                if(widget.get_active()==0)
                    this._settings.set_boolean('enable-pinned-apps',true);
            if(widget.get_active()==1)
                    this._settings.set_boolean('enable-pinned-apps',false);
            });
            
            defaultLeftBoxRow.add(defaultLeftBoxLabel);
            defaultLeftBoxRow.add(defaultLeftBoxCombo);
            defaultLeftBoxFrame.add(defaultLeftBoxRow);
            
            //Hotkey On Key Release
            let keyReleaseRow = new PW.FrameBoxRow();
            let keyReleaseLabel = new Gtk.Label({
                label: _("Hotkey activation"),
                use_markup: true,
                xalign: 0,
                hexpand: true
            });
            let keyReleaseCombo = new Gtk.ComboBoxText({ 
                halign: Gtk.Align.END,
                tooltip_text: _("Choose a method for the hotkey activation")  
            });
            keyReleaseCombo.append_text(_("Key Release"));
            keyReleaseCombo.append_text(_("Key Press"));
            if(this._settings.get_boolean('disable-hotkey-onkeyrelease'))
                keyReleaseCombo.set_active(1);
            else 
                keyReleaseCombo.set_active(0);
            keyReleaseCombo.connect('changed', (widget) => {
                if(widget.get_active()==0)
                    this._settings.set_boolean('disable-hotkey-onkeyrelease',false);
                if(widget.get_active()==1)
                    this._settings.set_boolean('disable-hotkey-onkeyrelease',true);
            });

            keyReleaseRow.add(keyReleaseLabel);
            keyReleaseRow.add(keyReleaseCombo);
        
            // Menu Hotkey and Keybinding Frame Box
            this.menuKeybindingFrame = new PW.FrameBox();
            let menuHotkeyLabelRow = new PW.FrameBoxRow();
            let menuHotkeyLabel = new Gtk.Label({
                label: _("Arc Menu Hotkey"),
                use_markup: true,
                xalign: 0,
                hexpand: true
            });
            menuHotkeyLabelRow.add(menuHotkeyLabel);

            let menuHotkeyButtonRow = new PW.FrameBoxRow();
            let leftButton = new Gtk.RadioButton({
                label: _("Left Super Key"),
                halign: Gtk.Align.CENTER,
                hexpand: true,
                draw_indicator: false,
                tooltip_text: _("Set Arc Menu hotkey to Left Super Key")  
            });   
            let rightButton = new Gtk.RadioButton({
                label: _("Right Super Key"),
                group: leftButton,
                halign: Gtk.Align.CENTER,
                hexpand: true,
                draw_indicator: false,
                tooltip_text: _("Set Arc Menu hotkey to Right Super Key")  
            });   
            let customButton = new Gtk.RadioButton({
                label: _("Custom Hotkey"),
                group: leftButton,
                halign: Gtk.Align.CENTER,
                hexpand: true,
                draw_indicator: false,
                tooltip_text: _("Set a custom hotkey for Arc Menu")  
            });   
            this.undefinedButton = new Gtk.RadioButton({
                label: _("None"),
                group: leftButton,
                halign: Gtk.Align.CENTER,
                hexpand: true,
                draw_indicator: false,
                tooltip_text: _("Clear Arc Menu hotkey, use GNOME default")  
            });  
            switch (this._settings.get_enum('menu-hotkey')) {
                case 0:
                    this.undefinedButton.set_active(true);
                    break;
                case 1:
                    leftButton.set_active(true);
                    break;
                case 2:
                    rightButton.set_active(true);
                    break;
                case 3:
                    customButton.set_active(true);
                    break;
            }
            this.undefinedButton.connect('toggled', () => {
                if(this.undefinedButton.get_active()){
                    this._settings.set_enum('menu-hotkey', 0);
                }
            });
            leftButton.connect('toggled', () => {
                if(leftButton.get_active()){
                    this._settings.set_enum('menu-hotkey', 1);
                }
            });
            rightButton.connect('toggled', () => {
                if(!rightButton.get_active() && this.menuKeybindingFrame.count>=3){
                    this.menuKeybindingFrame.remove(keyReleaseRow);
                }
                else if(rightButton.get_active()){
                    this.menuKeybindingFrame.add(keyReleaseRow);
                    this.menuKeybindingFrame.show();
                    this._settings.set_enum('menu-hotkey', 2);
                }
            });
            customButton.connect('toggled', () => {
                if(!customButton.get_active() && this.menuKeybindingFrame.count>=4){
                    this.menuKeybindingFrame.remove(keyReleaseRow);
                    this.menuKeybindingFrame.remove(menuKeybindingRow);
                }
                else if(!customButton.get_active() && this.menuKeybindingFrame.count>=3){
                    this.menuKeybindingFrame.remove(keyReleaseRow);
                }
                else if(customButton.get_active()){
                    this.menuKeybindingFrame.add(menuKeybindingRow);
                    this.menuKeybindingFrame.add(keyReleaseRow);
                    this.menuKeybindingFrame.show();
                    this._settings.set_enum('menu-hotkey', 3);
                }
            });

            menuHotkeyButtonRow.add(this.undefinedButton);
            menuHotkeyButtonRow.add(leftButton);
            menuHotkeyButtonRow.add(rightButton);
            menuHotkeyButtonRow.add(customButton);

            this.menuKeybindingFrame.add(menuHotkeyLabelRow);
            this.menuKeybindingFrame.add(menuHotkeyButtonRow);

            let menuKeybindingRow = new PW.FrameBoxRow();    
            let currentHotkeyLabel = new Gtk.Label( {
                label: _("Current Hotkey"),
                use_markup: true,
                xalign: 0,
                hexpand: false
            });

            let shortcutCell = new Gtk.ShortcutsShortcut({
                halign: Gtk.Align.CENTER,
                hexpand: true,
                tooltip_text: _("Current custom hotkey")  
            });
            shortcutCell.accelerator = this._settings.get_string('menu-keybinding-text');
            
            let modifyHotkeyButton = new Gtk.Button({
                label: _("Modify Hotkey"),
                halign: Gtk.Align.END,
                hexpand: false,
                tooltip_text: _("Create your own hotkey combination for Arc Menu")  
            });   
            menuKeybindingRow.add(currentHotkeyLabel);
            menuKeybindingRow.add(shortcutCell);
            menuKeybindingRow.add(modifyHotkeyButton);
            modifyHotkeyButton.connect('clicked', () => {
                let dialog = new CustomHotkeyDialogWindow(this._settings, this);
                dialog.show_all();
                dialog.connect('response', () => {   
                    if(dialog.addResponse) {
                        this._settings.set_string('menu-keybinding-text', dialog.resultsText);
                        this._settings.set_enum('menu-hotkey', 3);
                        shortcutCell.accelerator = dialog.resultsText;                   
                        dialog.destroy();
                    }
                    else {
                        shortcutCell.accelerator = this._settings.get_string('menu-keybinding-text');
                        this._settings.set_enum('menu-hotkey', 3);
                        dialog.destroy();
                    }
                }); 
            });
            if(this._settings.get_enum('menu-hotkey')==2)
                this.menuKeybindingFrame.add(keyReleaseRow);
            if(this._settings.get_enum('menu-hotkey')==3 ){
                this.menuKeybindingFrame.add(menuKeybindingRow);
                this.menuKeybindingFrame.add(keyReleaseRow);
            }

            
            // add the frames
            this.add(defaultLeftBoxFrame);
            this.add(menuPlacementFrame);
            this.add(tooltipFrame);
            this.add(modifyHotCornerFrame);
            this.add(this.menuKeybindingFrame);
            //-----------------------------------------------------------------
        }
        _createDisplayOnFrame(menuPlacementFrame){
            let menuPlacementRow = new PW.FrameBoxRow();
            let menuPlacementLabel = new Gtk.Label({
                label: _("Display Arc Menu On"),
                use_markup: true,
                xalign: 0,
                hexpand: true
            });
            let menuPlacementCombo = new Gtk.ComboBoxText({ 
                halign: Gtk.Align.END,
                tooltip_text: _("Choose where to place Arc Menu") 
            });

            let extensionStates = this._settings.get_value('dtp-dtd-state').deep_unpack();
            
            menuPlacementCombo.append_text(_("Main Panel"));
            menuPlacementCombo.append_text(_("Dash to Panel"));
            menuPlacementCombo.append_text(_("Dash to Dock"));

            let placement =  this._settings.get_enum('arc-menu-placement');
            if(placement == Constants.ARC_MENU_PLACEMENT.PANEL && extensionStates[Constants.EXTENSION.DTP])
                menuPlacementCombo.set_active(Constants.ARC_MENU_PLACEMENT.DTP);
            else if(placement == Constants.ARC_MENU_PLACEMENT.DTP && !extensionStates[Constants.EXTENSION.DTP])
                menuPlacementCombo.set_active(Constants.ARC_MENU_PLACEMENT.PANEL);  
            else{
                menuPlacementCombo.set_active(placement);
            }
             
            menuPlacementCombo.connect('changed', (widget) => {
                let placement = widget.get_active();
                this._settings.set_enum('arc-menu-placement', placement);
                menuPlacementFrame.remove_all_children();
                menuPlacementFrame.add(menuPlacementRow);
                if(menuPlacementCombo.get_active() == Constants.ARC_MENU_PLACEMENT.PANEL){
                    if(extensionStates[Constants.EXTENSION.DTP]){
                        menuPlacementFrame.add(panelWarningRow);
                    }
                    else{
                        menuPlacementFrame.add(menuPositionRow);
                        if(this._settings.get_enum('position-in-panel') == Constants.MENU_POSITION.Center)
                            menuPlacementFrame.add(menuPositionAdjustmentRow);
                    }
                    menuPlacementFrame.show();
                }
                else if(menuPlacementCombo.get_active() == Constants.ARC_MENU_PLACEMENT.DTP){
                    if(extensionStates[Constants.EXTENSION.DTP]){
                        menuPlacementFrame.add(menuPositionRow);
                        if(this._settings.get_enum('position-in-panel') == Constants.MENU_POSITION.Center)
                            menuPlacementFrame.add(menuPositionAdjustmentRow);
                        menuPlacementFrame.add(multiMonitorRow);
                    }
                    else{
                        menuPlacementFrame.add(panelWarningRow);
                    }
                    menuPlacementFrame.show();
                }
                else{
                    menuPlacementFrame.add(dtdExtraRow);
                    menuPlacementFrame.show();
                }
            });

            menuPlacementRow.add(menuPlacementLabel);
            menuPlacementRow.add(menuPlacementCombo);
            menuPlacementFrame.add(menuPlacementRow);

            let dtdExtraRow = new PW.FrameBoxRow();
            let dtdExtraRowLabel = new Gtk.Label({
                label: extensionStates[Constants.EXTENSION.DTD] ? _("Disable Activities Button") :
                                         _("Dash to Dock extension not running!") + "\n" + _("Enable Dash to Dock for this feature to work."),
                use_markup: true,
                xalign: 0,
                hexpand: true
            });

            let disableActivitiesSwitch = new Gtk.Switch({ 
                halign: Gtk.Align.END,
                tooltip_text: _("Disable Activities Button in panel") 
            });
            disableActivitiesSwitch.set_active(this._settings.get_boolean('disable-activities-button'));
            disableActivitiesSwitch.connect('notify::active', (widget) => {
                this._settings.set_boolean('disable-activities-button', widget.get_active());
            });

            let warningPath = Me.path + Constants.WARNING_ICON.Path;
            let [width, height] = Constants.WARNING_ICON.Size;
            let pixbuf = GdkPixbuf.Pixbuf.new_from_file_at_size(warningPath, width, height);
            let warningImage = new Gtk.Image({ pixbuf: pixbuf });
            let warningImageBox = new Gtk.VBox({
                margin_top: 0,
                margin_bottom: 0,
                margin_left: 10,
                expand: false
            });
            warningImageBox.add(warningImage);

            if(!extensionStates[Constants.EXTENSION.DTD]){
                dtdExtraRow.add(warningImageBox);
            }
            dtdExtraRow.add(dtdExtraRowLabel);

            if(extensionStates[Constants.EXTENSION.DTD])
                dtdExtraRow.add(disableActivitiesSwitch);


            let panelWarningRow = new PW.FrameBoxRow();
            let panelWarningLabel = new Gtk.Label({
                label: extensionStates[Constants.EXTENSION.DTP] ? _("Dash to Panel currently enabled!") + "\n" + _("Disable Dash to Panel for this feature to work."):
                                            _("Dash to Panel extension not running!") + "\n" + _("Enable Dash to Panel for this feature to work."),
                use_markup: true,
                xalign: 0,
                hexpand: true
            });    
            let panelWarningImage = new Gtk.Image({ pixbuf: pixbuf });
            let panelWarningImageBox = new Gtk.VBox({
                margin_top: 0,
                margin_bottom: 0,
                margin_left: 10,
                expand: false
            });
            panelWarningImageBox.add(panelWarningImage);
            panelWarningRow.add(panelWarningImageBox);
            panelWarningRow.add(panelWarningLabel);

            //Menu Position Box
            let menuPositionRow = new PW.FrameBoxRow();
            let menuPositionBoxLabel = new Gtk.Label({
                label: extensionStates[Constants.EXTENSION.DTP] ?  _("Position in Dash to Panel") : _("Position in Main Panel"),
                use_markup: true,
                xalign: 0,
                hexpand: true
            });

            let menuPositionLeftButton = new Gtk.RadioButton({
                label: _('Left'),
                tooltip_text: extensionStates[Constants.EXTENSION.DTP] ? _("Position Arc Menu on the Left side of Dash to Panel")
                                                                       : _("Position Arc Menu on the Left side of the Main Panel")
            });
            let menuPositionCenterButton = new Gtk.RadioButton({
                label: _('Center'),
                group: menuPositionLeftButton,
                tooltip_text: extensionStates[Constants.EXTENSION.DTP] ? _("Position Arc Menu in the Center of Dash to Panel")
                                                                       : _("Position Arc Menu in the Center of the Main Panel")
            });
            let menuPositionRightButton = new Gtk.RadioButton({
                label: _('Right'),
                group: menuPositionLeftButton,
                tooltip_text: extensionStates[Constants.EXTENSION.DTP] ? _("Position Arc Menu on the Right side of Dash to Panel") 
                                                                       : _("Position Arc Menu on the Right side of the Main Panel")
            });
            // callback handlers for the radio buttons
            menuPositionLeftButton.connect('clicked', () => {
                this._settings.set_enum('position-in-panel', Constants.MENU_POSITION.Left);
                if(menuPlacementFrame.get_index(2) === menuPositionAdjustmentRow)
                    menuPlacementFrame.remove(menuPositionAdjustmentRow);
            });
            menuPositionCenterButton.connect('clicked', () => {
                this._settings.set_enum('position-in-panel', Constants.MENU_POSITION.Center);
                if(menuPlacementFrame.get_index(2) != menuPositionAdjustmentRow){
                    menuPlacementFrame.insert(menuPositionAdjustmentRow,2);
                    menuPlacementFrame.show();
                }
            });
            menuPositionRightButton.connect('clicked', () => {
                this._settings.set_enum('position-in-panel', Constants.MENU_POSITION.Right);
                if(menuPlacementFrame.get_index(2) === menuPositionAdjustmentRow)
                    menuPlacementFrame.remove(menuPositionAdjustmentRow);
            });

            switch (this._settings.get_enum('position-in-panel')) {
                case Constants.MENU_POSITION.Left:
                    menuPositionLeftButton.set_active(true);
                    break;
                case Constants.MENU_POSITION.Center:
                    menuPositionCenterButton.set_active(true);
                    break;
                case Constants.MENU_POSITION.Right:
                    menuPositionRightButton.set_active(true);
                    break;
            }

            menuPositionRow.add(menuPositionBoxLabel);
            menuPositionRow.add(menuPositionLeftButton);
            menuPositionRow.add(menuPositionCenterButton);
            menuPositionRow.add(menuPositionRightButton);
            
            //Menu Alignment
            let menuPositionAdjustmentRow = new PW.FrameBoxRow();
            let menuPositionAdjustmentLabel = new Gtk.Label({
                label: _("Menu Alignment to Button"),
                use_markup: true,
                xalign: 0,
                hexpand: true
            });
            let alignmentScale = new Gtk.HScale({
                adjustment: new Gtk.Adjustment({
                    lower: 0,upper: 100, step_increment: 1, page_increment: 1, page_size: 0
                }),
                digits: 0,round_digits: 0,hexpand: true,
                value_pos: Gtk.PositionType.RIGHT,
                tooltip_text: _("Adjust Arc Menu's menu alignment relative to Arc Menu's icon")
            });
           // alignmentScale.connect('format-value', (scale, value) => { return value.toString() + 'px'; });
            alignmentScale.set_value(this._settings.get_int('menu-position-alignment'));
            alignmentScale.connect('value-changed', (widget) => {
                this._settings.set_int('menu-position-alignment', widget.get_value());
            }); 
            menuPositionAdjustmentRow.add(menuPositionAdjustmentLabel);
            menuPositionAdjustmentRow.add(alignmentScale);

            //Multi-monitor
            let multiMonitorRow = new PW.FrameBoxRow();
            let multiMonitorLabel = new Gtk.Label({
                label: _("Display on all monitors when using Dash to Panel"),
                use_markup: true,
                xalign: 0,
                hexpand: true
            });

            let multiMonitorSwitch = new Gtk.Switch({ 
                halign: Gtk.Align.END,
                tooltip_text: _("Display Arc Menu on all monitors when using Dash to Panel") 
            });
            multiMonitorSwitch.set_active(this._settings.get_boolean('multi-monitor'));
            multiMonitorSwitch.connect('notify::active', (widget) => {
                this._settings.set_boolean('multi-monitor', widget.get_active());
            });

            multiMonitorRow.add(multiMonitorLabel);
            multiMonitorRow.add(multiMonitorSwitch);
            if(menuPlacementCombo.get_active() == Constants.ARC_MENU_PLACEMENT.PANEL){
                if(extensionStates[Constants.EXTENSION.DTP]){
                    menuPlacementFrame.add(panelWarningRow);
                }
                else{
                    menuPlacementFrame.add(menuPositionRow);
                    if(this._settings.get_enum('position-in-panel') == Constants.MENU_POSITION.Center)
                        menuPlacementFrame.add(menuPositionAdjustmentRow);
                }
                menuPlacementFrame.show();
            }
            else if(menuPlacementCombo.get_active() == Constants.ARC_MENU_PLACEMENT.DTP){
                if(extensionStates[Constants.EXTENSION.DTP]){
                    menuPlacementFrame.add(menuPositionRow);
                    if(this._settings.get_enum('position-in-panel') == Constants.MENU_POSITION.Center)
                        menuPlacementFrame.add(menuPositionAdjustmentRow);
                    if(extensionStates[Constants.EXTENSION.DTP])
                        menuPlacementFrame.add(multiMonitorRow);
                }
                else{
                    menuPlacementFrame.add(panelWarningRow);
                }
                menuPlacementFrame.show();
            }
            else{
                menuPlacementFrame.add(dtdExtraRow);
                menuPlacementFrame.show();
            }
        }
});
//Dialog Window for Custom Activities Hot Corner
var ModifyHotCornerDialogWindow = GObject.registerClass(
    class ArcMenu_ModifyHotCornerDialogWindow extends PW.DialogWindow {
        _init(settings, parent) {
            this._settings = settings;
            this.addResponse = false;
            super._init(_('Modify Activities Hot Corner'), parent);
            this.resize(600,250);
        }

        _createLayout(vbox) { 
            // Hot Corner Box   
            let modifyHotCornerFrame = new PW.FrameBox();
            let modifyHotCornerRow = new PW.FrameBoxRow();
            let modifyHotCornerLabel = new Gtk.Label({
                label: _("Activities Hot Corner Action"),
                use_markup: true,
                xalign: 0,
                hexpand: true
            });
            let hotCornerActionCombo = new Gtk.ComboBoxText({ 
                halign: Gtk.Align.END,
                tooltip_text: _("Choose the action of the Activities Hot Corner") 
            });
            hotCornerActionCombo.append_text(_("GNOME Default"));
            hotCornerActionCombo.append_text(_("Disabled"));
            hotCornerActionCombo.append_text(_("Toggle Arc Menu"));
            hotCornerActionCombo.append_text(_("Custom"));
            
            let customHotCornerFrame = new PW.FrameBox();
            let customHeaderHotCornerRow = new PW.FrameBoxRow();
            
            let customHeaderHotCornerLabel = new Gtk.Label({
                label: "<b>"+_("Custom Activities Hot Corner Action") + "</b>\n" + _("Choose from a list of preset commands or use your own terminal command"),
                use_markup: true,
                xalign: 0,
                hexpand: true
            });
            customHeaderHotCornerLabel.set_sensitive(false);
            customHeaderHotCornerRow.add(customHeaderHotCornerLabel);
            
            let presetCustomHotCornerRow = new PW.FrameBoxRow();
            let presetCustomHotCornerLabel = new Gtk.Label({
                label: _("Preset commands"),
                use_markup: true,
                xalign: 0,
                hexpand: true
            });
            let hotCornerPresetsCombo = new Gtk.ComboBoxText({ 
                tooltip_text: _("Choose from a list of preset Activities Hot Corner commands"),
                hexpand: true
            });

            hotCornerPresetsCombo.append_text(_("Show all Applications")); // 0
            hotCornerPresetsCombo.append_text(_("GNOME Terminal")); // 1
            hotCornerPresetsCombo.append_text(_("GNOME System Monitor")); // 2
            hotCornerPresetsCombo.append_text(_("GNOME Calculator"));
            hotCornerPresetsCombo.append_text(_("GNOME gedit"));
            hotCornerPresetsCombo.append_text(_("GNOME Screenshot"));
            hotCornerPresetsCombo.append_text(_("GNOME Weather"));
            hotCornerPresetsCombo.append_text(_("Run Command..."));
            hotCornerPresetsCombo.connect('changed', (widget) => {
                if(widget.get_active()==0){
                    customHotCornerEntry.set_text("ArcMenu_ShowAllApplications");
                }
                else if(widget.get_active()==1){
                    customHotCornerEntry.set_text("gnome-terminal");
                }
                else if(widget.get_active()==2){
                    customHotCornerEntry.set_text("gnome-system-monitor");
                }
                else if(widget.get_active()==3){
                    customHotCornerEntry.set_text("gnome-calculator");
                }
                else if(widget.get_active()==4){
                    customHotCornerEntry.set_text("gedit");
                }
                else if(widget.get_active()==5){
                    customHotCornerEntry.set_text("gnome-screenshot");
                }
                else if(widget.get_active()==6){
                    customHotCornerEntry.set_text("gnome-weather");
                }
                else if(widget.get_active()==7){
                    customHotCornerEntry.set_text("ArcMenu_RunCommand");
                }
            });
            presetCustomHotCornerRow.add(presetCustomHotCornerLabel);
            presetCustomHotCornerRow.add(hotCornerPresetsCombo);
            
            let customHotCornerRow = new PW.FrameBoxRow();
            let customHotCornerLabel = new Gtk.Label({
                label: _("Terminal Command"),
                use_markup: true,
                xalign: 0,
                hexpand: true
            });
            let customHotCornerEntry = new Gtk.Entry({
                tooltip_text: _("Set a custom terminal command to launch on active hot corner")
            });
            customHotCornerEntry.connect('changed', (widget) => {
                applyButton.set_sensitive(true); 
                let index = this.checkIfMatch(customHotCornerEntry.get_text());
                hotCornerPresetsCombo.set_active(index)
            });
            customHotCornerEntry.set_width_chars(40);
            customHotCornerEntry.set_text(this._settings.get_string('custom-hot-corner-cmd'));
            let index = this.checkIfMatch(customHotCornerEntry.get_text());
            hotCornerPresetsCombo.set_active(index)
            customHotCornerRow.add(customHotCornerLabel);
            customHotCornerRow.add(customHotCornerEntry);

            customHotCornerFrame.add(customHeaderHotCornerRow);
            customHotCornerFrame.add(presetCustomHotCornerRow);
            customHotCornerFrame.add(customHotCornerRow);
            
            //Apply Button
            let applyButton = new Gtk.Button({
                label: _("Apply"),
                hexpand: true,
                tooltip_text: _("Apply changes and set new hot corner action")
            });
            applyButton.connect('clicked', () => {
                this._settings.set_string('custom-hot-corner-cmd',customHotCornerEntry.get_text());
                this._settings.set_enum('hot-corners',hotCornerActionCombo.get_active());
                applyButton.set_sensitive(false);
                this.addResponse = true;
                this.response(-10);
            });
            applyButton.set_halign(Gtk.Align.END);
            applyButton.set_sensitive(false);
           

            let hotCornerAction = this._settings.get_enum('hot-corners');
            hotCornerActionCombo.set_active(hotCornerAction);
            hotCornerActionCombo.connect('changed', (widget) => {
                applyButton.set_sensitive(true);
                if(widget.get_active()==Constants.HOT_CORNERS_ACTION.Custom){
                    customHotCornerFrame.set_sensitive(true);
                }
                else{
                    customHotCornerFrame.set_sensitive(false);
                }
            });

            modifyHotCornerRow.add(modifyHotCornerLabel);
            modifyHotCornerRow.add(hotCornerActionCombo);
            modifyHotCornerFrame.add(modifyHotCornerRow);
            if(hotCornerActionCombo.get_active() == Constants.HOT_CORNERS_ACTION.Custom)
                customHotCornerFrame.set_sensitive(true);
            else
                customHotCornerFrame.set_sensitive(false);
            vbox.add(modifyHotCornerFrame);
            vbox.add(customHotCornerFrame);
            vbox.add(applyButton);
        }
        checkIfMatch(text){
            if(text === "ArcMenu_ShowAllApplications")
                return 0;
            else if(text === "gnome-terminal")
                return 1;
            else if(text === "gnome-system-monitor")
                return 2;
            else if(text === "gnome-calculator")
                return 3;
            else if(text === "gedit")
                return 4;
            else if(text === "gnome-screenshot")
                return 5;
            else if(text === "gnome-weather")
                return 6;
            else if(text === "ArcMenu_RunCommand")
                return 7;
            else
                return -1;
        }
});
//Dialog Window for Custom Hotkey
var CustomHotkeyDialogWindow = GObject.registerClass(
    class ArcMenu_CustomHotkeyDialogWindow extends PW.DialogWindow {
        _init(settings, parent) {
            this._settings = settings;
            this.addResponse = false;
            super._init(_('Set Custom Hotkey'), parent);
        }

        _createLayout(vbox) {
            let frame = new PW.FrameBox();

            //Label 
            let labelRow = new PW.FrameBoxRow();  
            let label = new Gtk.Label({
                label: _("Press a key"),
                use_markup: true,
                xalign: .5,
                hexpand: true
            });
            labelRow.add(label);

            //Hotkey
            let hotkeyKey='';

            //Keyboard Image
            let keyboardPath = Me.path + Constants.KEYBOARD_LOGO.Path;
            let [imageWidth, imageHeight] = Constants.KEYBOARD_LOGO.Size;
            let pixbuf = GdkPixbuf.Pixbuf.new_from_file_at_size(keyboardPath, imageWidth, imageHeight);
            let keyboardImage = new Gtk.Image({ pixbuf: pixbuf });
            let keyboardImageBox = new Gtk.VBox({
                margin_top: 5,
                margin_bottom: 5,
                expand: false
            });
            keyboardImageBox.add(keyboardImage);

            //Modifiers
            let modRow= new PW.FrameBoxRow(); 
            let modLabel = new Gtk.Label({
                label: _("Modifiers"),
                xalign: 0,
                hexpand: true
            });
            let ctrlButton = new Gtk.CheckButton({
                label: _("Ctrl"),
                xalign:.5,
                draw_indicator: false
            });   
            let superButton = new Gtk.CheckButton({
                label: _("Super"),
                draw_indicator: false
            });   
            let shiftButton = new Gtk.CheckButton({
                label: _("Shift"),
                draw_indicator: false
            });   
            let altButton = new Gtk.CheckButton({
                label: _("Alt"),
                draw_indicator: false
            });  
            ctrlButton.connect('clicked', () => {
                this.resultsText=""; 
                if(ctrlButton.get_active()) this.resultsText += "<Ctrl>";     
                if(superButton.get_active()) this.resultsText += "<Super>";   
                if(shiftButton.get_active()) this.resultsText += "<Shift>";   
                if(altButton.get_active()) this.resultsText += "<Alt>";  
                this.resultsText += hotkeyKey;   
                resultsLabel.accelerator =  this.resultsText; 
                applyButton.set_sensitive(true);      
            });
            superButton.connect('clicked', () => {
                this.resultsText=""; 
                if(ctrlButton.get_active()) this.resultsText += "<Ctrl>";     
                if(superButton.get_active()) this.resultsText += "<Super>";   
                if(shiftButton.get_active()) this.resultsText += "<Shift>";   
                if(altButton.get_active()) this.resultsText += "<Alt>";  
                this.resultsText += hotkeyKey;   
                resultsLabel.accelerator =  this.resultsText;   
                applyButton.set_sensitive(true);    
            });
            shiftButton.connect('clicked', () => {
                this.resultsText=""; 
                if(ctrlButton.get_active()) this.resultsText += "<Ctrl>";     
                if(superButton.get_active()) this.resultsText += "<Super>";   
                if(shiftButton.get_active()) this.resultsText += "<Shift>";   
                if(altButton.get_active()) this.resultsText += "<Alt>";  
                this.resultsText += hotkeyKey;   
                resultsLabel.accelerator =  this.resultsText; 
                applyButton.set_sensitive(true);      
            });
            altButton.connect('clicked', () => {
                this.resultsText=""; 
                if(ctrlButton.get_active()) this.resultsText += "<Ctrl>";     
                if(superButton.get_active()) this.resultsText += "<Super>";   
                if(shiftButton.get_active()) this.resultsText += "<Shift>";   
                if(altButton.get_active()) this.resultsText += "<Alt>";  
                this.resultsText += hotkeyKey;   
                resultsLabel.accelerator =  this.resultsText;  
                applyButton.set_sensitive(true);     
            });
            modRow.add(modLabel);
            modRow.add(ctrlButton);
            modRow.add(superButton);
            modRow.add(shiftButton);
            modRow.add(altButton);

            //Hotkey Results
            let resultsRow= new PW.FrameBoxRow(); 
            let resultsLabel = new Gtk.ShortcutsShortcut({
                hexpand: true
            });
            resultsLabel.set_halign(Gtk.Align.CENTER);
            resultsRow.add(resultsLabel);
           
            //Add to frame
            frame.add(modRow);
            frame.add(labelRow);
            frame.add(keyboardImageBox);
            frame.add(resultsRow);

            //Apply Button
            let applyButton = new Gtk.Button({
                label: _("Apply"),
                xalign:1
            });
            applyButton.connect('clicked', () => {
                this.addResponse = true;
                this.response(-10);
            });
            applyButton.set_halign(Gtk.Align.END);
            applyButton.set_sensitive(false);

            //connect to key presses
            this.connect('key-release-event', (widget,event) =>  {
                this.resultsText="";
                let key = event.get_keyval()[1];
                hotkeyKey = Gtk.accelerator_name(key,0);    
                if(ctrlButton.get_active()) this.resultsText += "<Ctrl>";     
                if(superButton.get_active()) this.resultsText += "<Super>";   
                if(shiftButton.get_active()) this.resultsText += "<Shift>";   
                if(altButton.get_active()) this.resultsText += "<Alt>";  
                this.resultsText += Gtk.accelerator_name(key,0);   
                resultsLabel.accelerator =  this.resultsText;   
                applyButton.set_sensitive(true);  
            });

            //add to vbox
            vbox.add(frame);
            vbox.add(applyButton);    
        }
});
function getIconPixbuf(filePath){
    if (GLib.file_test(filePath, GLib.FileTest.EXISTS)) 
        return GdkPixbuf.Pixbuf.new_from_file_at_size(filePath, 25, 25);
    else
        return null;
}

//DialogWindow for Menu Icon Customization
var MenuButtonCustomizationWindow = GObject.registerClass(
    class ArcMenu_MenuButtonCustomizationWindow extends PW.DialogWindow {

        _init(settings, parent) {
            this._settings = settings;
            this.menuButtonColor = this._settings.get_string('menu-button-color');
            this.menuButtonActiveColor = this._settings.get_string('menu-button-active-color');
            super._init(_('Arc Menu Icon Settings'), parent);
        }

        _createLayout(vbox) {
            let menuButtonAppearanceFrame = new PW.FrameBox();
            //first row
            let menuButtonAppearanceRow = new PW.FrameBoxRow();
            let menuButtonAppearanceLabel = new Gtk.Label({
                label: _('Arc Menu Icon Appearance'),
                use_markup: true,
                xalign: 0,
                hexpand: true
            });
            let menuButtonAppearanceCombo = new Gtk.ComboBoxText({ halign: Gtk.Align.END });
            menuButtonAppearanceCombo.append_text(_("Icon"));
            menuButtonAppearanceCombo.append_text(_("Text"));
            menuButtonAppearanceCombo.append_text(_("Icon and Text"));
            menuButtonAppearanceCombo.append_text(_("Text and Icon"));
            menuButtonAppearanceCombo.set_active(this._settings.get_enum('menu-button-appearance'));
            menuButtonAppearanceCombo.connect('changed', (widget) => {
                resetButton.set_sensitive(true); 
                if(widget.get_active() != Constants.MENU_APPEARANCE.Icon && menuButtonAppearanceFrame.count == 1){
                    menuButtonAppearanceFrame.add(menuButtonCustomTextBoxRow);
                    menuButtonAppearanceFrame.show();
                }
                else if(widget.get_active() == Constants.MENU_APPEARANCE.Icon && menuButtonAppearanceFrame.count == 2){
                    menuButtonAppearanceFrame.remove(menuButtonCustomTextBoxRow);
                }
                this._settings.set_enum('menu-button-appearance', widget.get_active());
            });
            
            menuButtonAppearanceRow.add(menuButtonAppearanceLabel);
            menuButtonAppearanceRow.add(menuButtonAppearanceCombo);
            menuButtonAppearanceFrame.add(menuButtonAppearanceRow);

            // second row
            let menuButtonCustomTextBoxRow = new PW.FrameBoxRow();
            let menuButtonCustomTextLabel = new Gtk.Label({
                label: _('Arc Menu Icon Text'),
                use_markup: true,
                xalign: 0,
                hexpand: true
            });
            let menuButtonCustomTextEntry = new Gtk.Entry({ halign: Gtk.Align.END });
            menuButtonCustomTextEntry.set_width_chars(30);
            menuButtonCustomTextEntry.set_text(this._settings.get_string('custom-menu-button-text'));
            menuButtonCustomTextEntry.connect('changed', (widget) => {
                resetButton.set_sensitive(true); 
                let customMenuButtonText = widget.get_text();
                this._settings.set_string('custom-menu-button-text', customMenuButtonText);
            });

            menuButtonCustomTextBoxRow.add(menuButtonCustomTextLabel);
            menuButtonCustomTextBoxRow.add(menuButtonCustomTextEntry);
            if(this._settings.get_enum('menu-button-appearance') != Constants.MENU_APPEARANCE.Icon)
                menuButtonAppearanceFrame.add(menuButtonCustomTextBoxRow);
            vbox.add(menuButtonAppearanceFrame);

            // third row
            let menuButtonArrowIconFrame = new PW.FrameBox();
            let menuButtonArrowIconBoxRow = new PW.FrameBoxRow();
            let menuButtonArrowIconLabel = new Gtk.Label({
                label: _('Arrow beside Arc Menu Icon'),
                use_markup: true,
                xalign: 0,
                hexpand: true
            });
            let enableArrowIconSwitch = new Gtk.Switch({ halign: Gtk.Align.END });
            enableArrowIconSwitch.set_active(this._settings.get_boolean('enable-menu-button-arrow'));
            enableArrowIconSwitch.connect('notify::active', (widget) => {
                this._settings.set_boolean('enable-menu-button-arrow', widget.get_active());
                resetButton.set_sensitive(true);  
            });

            menuButtonArrowIconBoxRow.add(menuButtonArrowIconLabel);
            menuButtonArrowIconBoxRow.add(enableArrowIconSwitch);
            menuButtonArrowIconFrame.add(menuButtonArrowIconBoxRow);
            vbox.add(menuButtonArrowIconFrame);

            let menuButtonIconFrame = new PW.FrameBox();
            let menuButtonIconRow = new PW.FrameBoxRow();
            let menuButtonIconLabel = new Gtk.Label({
                label: _('Arc Menu Icon'),
                use_markup: true,
                xalign: 0,
                hexpand: true
            });
            // create file filter and file chooser button
            let fileFilter = new Gtk.FileFilter();
            fileFilter.add_pixbuf_formats();
            let fileChooserButton = new Gtk.FileChooserButton({
                action: Gtk.FileChooserAction.OPEN,
                title: _('Please select an image icon'),
                filter: fileFilter
            });

            let store = new Gtk.ListStore();
            store.set_column_types([GdkPixbuf.Pixbuf, GObject.TYPE_STRING]);
            let menuButtonIconCombo = new Gtk.ComboBox({
                model: store,
                width_request: 225
            });
            
            this.createIconList(store);

            
            let renderer = new Gtk.CellRendererPixbuf({xpad:10});
            menuButtonIconCombo.pack_start(renderer, false);
            menuButtonIconCombo.add_attribute(renderer, "pixbuf", 0);
            renderer = new Gtk.CellRendererText();
            menuButtonIconCombo.pack_start(renderer, true);
            menuButtonIconCombo.add_attribute(renderer, "text", 1);

           

            menuButtonIconCombo.set_active(this._settings.get_enum('menu-button-icon'));
            menuButtonIconCombo.connect('changed', (widget) => {
                resetButton.set_sensitive(true); 
                this._settings.set_enum('menu-button-icon', widget.get_active());
                if(widget.get_active()==Constants.MENU_BUTTON_ICON.Custom) {
                    if(menuButtonIconFrame.count == 1){
                        menuButtonIconFrame.add(fileChooserRow);
                        menuButtonIconFrame.show();
                    }

                    let iconFilepath = this._settings.get_string('custom-menu-button-icon');
                    if (iconFilepath) {
                        fileChooserButton.set_filename(iconFilepath);
                    }   
                }
                else{
                    if(menuButtonIconFrame.count == 2)
                    menuButtonIconFrame.remove(fileChooserRow);
                    fileChooserButton.set_filename("None");
                }
            });
            let fileChooserRow = new PW.FrameBoxRow();
            let fileChooserLabel = new Gtk.Label({
                label: _('Browse for a custom icon'),
                use_markup: true,
                xalign: 0,
                hexpand: true
            });
            fileChooserButton.connect('file-set', (widget) => {
                resetButton.set_sensitive(true); 
                let iconFilepath = widget.get_filename();
                this._settings.set_string('custom-menu-button-icon', iconFilepath);
            
                store.clear();
                this.createIconList(store);
                menuButtonIconCombo.model = store;
                menuButtonIconCombo.show();
                menuButtonIconCombo.set_active(Constants.MENU_BUTTON_ICON.Custom);
            });
            fileChooserButton.set_current_folder(GLib.get_user_special_dir(GLib.UserDirectory.DIRECTORY_PICTURES));
            fileChooserRow.add(fileChooserLabel);
            fileChooserRow.add(fileChooserButton);
            let iconFilepath = this._settings.get_string('custom-menu-button-icon');
            if (iconFilepath && menuButtonIconCombo.get_active()==Constants.MENU_BUTTON_ICON.Custom) {
                fileChooserButton.set_filename(iconFilepath);
            }


            menuButtonIconRow.add(menuButtonIconLabel);
            menuButtonIconRow.add(menuButtonIconCombo);
            menuButtonIconFrame.add(menuButtonIconRow);
            if(menuButtonIconCombo.get_active()==Constants.MENU_BUTTON_ICON.Custom){
                menuButtonIconFrame.add(fileChooserRow);
            }
            vbox.add(menuButtonIconFrame);

            //  fourth row
            let menuButtonIconSizeFrame = new PW.FrameBox();
            let menuButtonIconSizeRow = new PW.FrameBoxRow();
            let iconSize = this._settings.get_double('custom-menu-button-icon-size');
            let menuButtonIconSizeLabel = new Gtk.Label({
                label: _('Icon Size'),
                use_markup: true,
                xalign: 0,
                hexpand: true
            });
            let menuButtonIconSizeScale = new Gtk.HScale({
                adjustment: new Gtk.Adjustment({
                    lower: 14,
                    upper: 64,
                    step_increment: 1,
                    page_increment: 1,
                    page_size: 0
                }),
                digits: 0,
                round_digits: 0,
                hexpand: true,
                value_pos: Gtk.PositionType.RIGHT
            });
            menuButtonIconSizeScale.connect('format-value', (scale, value) => { return value.toString() + ' px'; });
            menuButtonIconSizeScale.set_value(iconSize);
            menuButtonIconSizeScale.connect('value-changed', () => {
                resetButton.set_sensitive(true); 
                this._settings.set_double('custom-menu-button-icon-size', menuButtonIconSizeScale.get_value());
            });

            menuButtonIconSizeRow.add(menuButtonIconSizeLabel);
            menuButtonIconSizeRow.add(menuButtonIconSizeScale);
            menuButtonIconSizeFrame.add(menuButtonIconSizeRow);

            let menuButtonIconPaddingRow = new PW.FrameBoxRow();
            let iconPadding = this._settings.get_int('button-icon-padding');
            let menuButtonIconPaddingLabel = new Gtk.Label({
                label: _('Icon Padding'),
                use_markup: true,
                xalign: 0,
                hexpand: true
            });
            let paddingScale = new Gtk.HScale({
                adjustment: new Gtk.Adjustment({
                    lower: 0,
                    upper: 25,
                    step_increment: 1,
                    page_increment: 1,
                    page_size: 0
                }),
                digits: 0,
                round_digits: 0,
                hexpand: true,
                value_pos: Gtk.PositionType.RIGHT
            });
            paddingScale.connect('format-value', (scale, value) => { return value.toString() + ' px'; });
            paddingScale.set_value(iconPadding);
            paddingScale.connect('value-changed', () => {
                resetButton.set_sensitive(true); 
                this._settings.set_int('button-icon-padding', paddingScale.get_value());
            });

            menuButtonIconPaddingRow.add(menuButtonIconPaddingLabel);
            menuButtonIconPaddingRow.add(paddingScale);
            menuButtonIconSizeFrame.add(menuButtonIconPaddingRow);
            vbox.add(menuButtonIconSizeFrame);
            let menuButtonIconColorFrame = new PW.FrameBox();
            let menuButtonColorRow = new PW.FrameBoxRow();
            let menuButtonColorLabel = new Gtk.Label({
                label: _('Icon Color'),
                xalign:0,
                hexpand: true,
             });   
            let menuButtonColorChooser = new Gtk.ColorButton({use_alpha:false});   
            let color = new Gdk.RGBA();
            color.parse(this.menuButtonColor);
            menuButtonColorChooser.set_rgba(color);            
            menuButtonColorChooser.connect('color-set', ()=>{
                resetButton.set_sensitive(true); 
                this.menuButtonColor = menuButtonColorChooser.get_rgba().to_string();
                this._settings.set_string('menu-button-color',this.menuButtonColor);
                saveCSS(this._settings);
                this._settings.set_boolean('reload-theme',true);
            });
            menuButtonColorRow.add(menuButtonColorLabel);
            menuButtonColorRow.add(menuButtonColorChooser);
            menuButtonIconColorFrame.add(menuButtonColorRow);

            let menuButtonActiveColorRow = new PW.FrameBoxRow();
            let menuButtonActiveColorLabel = new Gtk.Label({
                label: _('Active Icon Color'),
                xalign:0,
                hexpand: true,
             });   
            let menuButtonActiveColorChooser = new Gtk.ColorButton({use_alpha:false});   
            color.parse(this.menuButtonActiveColor);
            menuButtonActiveColorChooser.set_rgba(color);            
            menuButtonActiveColorChooser.connect('color-set', ()=>{
                resetButton.set_sensitive(true); 
                this.menuButtonActiveColor = menuButtonActiveColorChooser.get_rgba().to_string();
                this._settings.set_string('menu-button-active-color',this.menuButtonActiveColor);
                saveCSS(this._settings);
                this._settings.set_boolean('reload-theme',true);
            });
            menuButtonActiveColorRow.add(menuButtonActiveColorLabel);
            menuButtonActiveColorRow.add(menuButtonActiveColorChooser);
            menuButtonIconColorFrame.add(menuButtonActiveColorRow);

            let textRow = new PW.FrameBoxRow();
            let textLabel = new Gtk.Label({
                label: _('Icon color options will only work with files ending with "-symbolic.svg"'),
                use_markup: true,
                xalign: 0,
                hexpand: true
            }); 
            textLabel.set_sensitive(false);
            textRow.add(textLabel);
            menuButtonIconColorFrame.add(textRow);
            // add the frames to the vbox
            vbox.add(menuButtonIconColorFrame);

            // Button Row -------------------------------------------------------
            let resetButton = new Gtk.Button({
                label: _("Reset"),
                xalign:0,
                hexpand: false
            });   
            resetButton.set_sensitive(this.checkIfResetButtonSensitive());
            resetButton.connect('clicked', ()=> {
                menuButtonAppearanceCombo.set_active(0);
                menuButtonCustomTextEntry.set_text('Applications');
                menuButtonIconCombo.set_active(0);
                fileChooserButton.set_filename('None');
                paddingScale.set_value(0);
                menuButtonIconSizeScale.set_value(20);
                color.parse('rgb(240,240,240)');
                menuButtonColorChooser.set_rgba(color);
                color.parse('rgb(214,214,214)');
                menuButtonActiveColorChooser.set_rgba(color);
                enableArrowIconSwitch.set_active(false);
                this._settings.set_string('menu-button-active-color','rgb(214,214,214)');
                this._settings.set_string('menu-button-color','rgb(240,240,240)');
                saveCSS(this._settings);
                this._settings.set_boolean('reload-theme',true);
  
                resetButton.set_sensitive(false);        
            });
            resetButton.set_halign(Gtk.Align.START);
            vbox.add(resetButton);
        }
        checkIfResetButtonSensitive(){
           if(  this._settings.get_string('menu-button-active-color') != 'rgb(214,214,214)' ||
                this._settings.get_string('menu-button-color') != 'rgb(240,240,240)' ||
                this._settings.get_double('custom-menu-button-icon-size') != 20 ||
                this._settings.get_int('button-icon-padding') != 0 ||
                this._settings.get_enum('menu-button-icon') != 0 ||
                this._settings.get_string('custom-menu-button-text') != 'Applications' ||
                this._settings.get_enum('menu-button-appearance') != 0 ||
                this._settings.get_boolean('enable-menu-button-arrow') != false )
                    return true;
            else
                return false;
        }
        createIconList(store){
            let pixbuf;

            pixbuf = getIconPixbuf(Me.path + Constants.ARC_MENU_ICON.path);
            store.set(store.append(),[0,1], [pixbuf, Constants.ARC_MENU_ICON.name]);
            
            var info = Gtk.IconTheme.get_default().lookup_icon ("start-here-symbolic", 25, 0);
            if(info)
                pixbuf = info.load_icon();
            else
                pixbuf = null;
            store.set(store.append(),[0,1], [pixbuf, _("System Icon")]);

            pixbuf = getIconPixbuf(this._settings.get_string('custom-menu-button-icon'));
            store.set(store.append(),[0,1], [pixbuf, _("Custom Icon")]);

            Constants.MENU_ICONS.forEach((icon)=>{
                pixbuf = getIconPixbuf(Me.path + icon.path);
                store.set(store.append(),[0,1], [pixbuf, _(icon.name)]);
            });
        }
});
//Appearance Page
var AppearancePage = GObject.registerClass(
    class ArcMenu_AppearancePage extends PW.NotebookPage {

        _init(settings) {
            super._init(_('Appearance'));
            this._settings = settings;
            this.separatorColor = this._settings.get_string('separator-color');
            this.verticalSeparator = this._settings.get_boolean('vert-separator');
            this.customArcMenu = this._settings.get_boolean('enable-custom-arc-menu');
            this.menuColor = this._settings.get_string('menu-color');
            this.menuForegroundColor = this._settings.get_string('menu-foreground-color');
            this.borderColor = this._settings.get_string('border-color');
            this.highlightColor = this._settings.get_string('highlight-color');
            this.fontSize = this._settings.get_int('menu-font-size');
            this.borderSize = this._settings.get_int('menu-border-size');
            this.cornerRadius = this._settings.get_int('menu-corner-radius');
            this.menuMargin = this._settings.get_int('menu-margin');
            this.menuArrowSize = this._settings.get_int('menu-arrow-size');
            this.checkIfPresetMatch();

            //Menu Icon Appearance Frame Box
            let menuButtonAppearanceFrame = new PW.FrameBox();
            let menuButtonAppearanceRow = new PW.FrameBoxRow();
            let menuButtonAppearanceLabel = new Gtk.Label({
                label: _("Arc Menu Icon Settings"),
                use_markup: true,
                xalign: 0,
                hexpand: true
            });
            let menuButtonAppearanceSettingsButton = new PW.IconButton({
                circular: true,
                icon_name: 'emblem-system-symbolic',
                tooltip_text: _("Customize Arc Menu's Icon")
            });

            // Extra settings for the appearance of the menu icon
            menuButtonAppearanceSettingsButton.connect('clicked', () => {
                let dialog = new MenuButtonCustomizationWindow(this._settings, this);
                dialog.show_all();
            });

            menuButtonAppearanceRow.add(menuButtonAppearanceLabel);
            menuButtonAppearanceRow.add(menuButtonAppearanceSettingsButton);
            
            menuButtonAppearanceFrame.add(menuButtonAppearanceRow);
            this.add(menuButtonAppearanceFrame);

            
            //CUSTOMIZE ARC MENU FRAME
            let customArcMenuFrame = new PW.FrameBox();
            let customArcMenuRow = new PW.FrameBoxRow();
            let customArcMenuLabel = new Gtk.Label({
                label: _("Customize Arc Menu Appearance"),
                use_markup: true,
                xalign: 0,
                hexpand: true
            });
            let customizeArcMenuButton = new PW.IconButton({
                circular: true,
                icon_name: 'emblem-system-symbolic',
                tooltip_text: _("Customize various elements of Arc Menu")
            });
            customizeArcMenuButton.connect('clicked', () => {
                let dialog = new ArcMenuCustomizationWindow(this._settings, this);
                dialog.show_all();
                dialog.connect('response', ()=> { 
                    if(dialog.get_response()) {
                        this._settings.set_int('menu-height', dialog.heightValue);
                        this._settings.set_int('right-panel-width', dialog.rightPanelWidth);
                        this._settings.set_string('separator-color',dialog.separatorColor);
                        this._settings.set_boolean('vert-separator',dialog.verticalSeparator);
                        this._settings.set_boolean('enable-custom-arc-menu', dialog.customArcMenu); 
                        this._settings.set_string('menu-color',dialog.menuColor);
                        this._settings.set_string('menu-foreground-color',dialog.menuForegroundColor);
                        this._settings.set_string('border-color',dialog.borderColor);
                        this._settings.set_string('highlight-color',dialog.highlightColor );
                        this._settings.set_int('menu-font-size',dialog.fontSize);
                        this._settings.set_int('menu-border-size',dialog.borderSize);
                        this._settings.set_int('menu-corner-radius',dialog.cornerRadius);
                        this._settings.set_int('menu-margin',dialog.menuMargin);
                        this._settings.set_int('menu-arrow-size',dialog.menuArrowSize);
                        this._settings.set_int('menu-width', dialog.menuWidth);
                        this._settings.set_boolean('enable-large-icons',dialog.largeIcons);
                        this._settings.set_int('gap-adjustment',dialog.gapAdjustment);
                        this._settings.set_boolean('enable-sub-menus', dialog.subMenus);
                        this._settings.set_boolean('disable-category-arrows', dialog.disableCategoryArrow);
                        this._settings.set_boolean('remove-menu-arrow', dialog.removeMenuArrow);
                        saveCSS(this._settings);
                        this._settings.set_boolean('reload-theme',true);
                        dialog.destroy();
                    }
                    else
                        dialog.destroy();
                }); 
            });
            
            customArcMenuRow.add(customArcMenuLabel);
            customArcMenuRow.add(customizeArcMenuButton);
            customArcMenuFrame.add(customArcMenuRow);
            this.add(customArcMenuFrame);
            
            //Override Arc Menu Theme
            let overrideArcMenuFrame = new PW.FrameBox();
            let overrideArcMenuRow = new PW.FrameBoxRow();
            let overrideArcMenuLabel = new Gtk.Label({
                label: _("Override Arc Menu Theme"),
                use_markup: true,
                xalign: 0,
                hexpand: true
            });
            let overrideArcMenuButton = new PW.IconButton({
                circular: true,
                icon_name: 'emblem-system-symbolic',
                tooltip_text: _("Create and manage your own custom themes for Arc Menu")
            });
            overrideArcMenuButton.set_sensitive(this._settings.get_boolean('enable-custom-arc-menu'));
            overrideArcMenuButton.connect('clicked', () => {
                let dialog = new OverrideArcMenuThemeWindow(this._settings, this);
                dialog.show_all();
                dialog.connect('response', (response) => {
                    if(dialog.get_response()) {
                        this._settings.set_int('menu-height', dialog.heightValue);
                        this._settings.set_int('right-panel-width', dialog.rightPanelWidth);
                        this._settings.set_string('separator-color',dialog.separatorColor);
                        this._settings.set_boolean('vert-separator',dialog.verticalSeparator);
                        this._settings.set_boolean('enable-custom-arc-menu', dialog.customArcMenu); 
                        this._settings.set_string('menu-color',dialog.menuColor);
                        this._settings.set_string('menu-foreground-color',dialog.menuForegroundColor);
                        this._settings.set_string('border-color',dialog.borderColor);
                        this._settings.set_string('highlight-color',dialog.highlightColor );
                        this._settings.set_int('menu-font-size',dialog.fontSize);
                        this._settings.set_int('menu-border-size',dialog.borderSize);
                        this._settings.set_int('menu-corner-radius',dialog.cornerRadius);
                        this._settings.set_int('menu-margin',dialog.menuMargin);
                        this._settings.set_int('menu-arrow-size',dialog.menuArrowSize);
                        this._settings.set_int('menu-width', dialog.menuWidth);
                        saveCSS(this._settings);
                        this._settings.set_boolean('reload-theme',true);
                        this.presetName = dialog.presetName;
                        currentPresetTextLabel.label = dialog.presetName;
                        dialog.destroy();
                    }
                    else{
                        this.checkIfPresetMatch();
                        currentPresetTextLabel.label = this.presetName;
                        dialog.destroy();
                    }   
                }); 
            });
            let overrideArcMenuSwitch = new Gtk.Switch({ 
                halign: Gtk.Align.END,
                tooltip_text: _("Override the shell theme for Arc Menu only")
            });
            overrideArcMenuSwitch.set_active(this._settings.get_boolean('enable-custom-arc-menu'));
            overrideArcMenuSwitch.connect('notify::active', (widget) => {
                this._settings.set_boolean('enable-custom-arc-menu',widget.get_active());
                overrideArcMenuButton.set_sensitive(widget.get_active());
                saveCSS(this._settings);
                this._settings.set_boolean('reload-theme',true);
                if(widget.get_active() && overrideArcMenuFrame.count==1) {
                    overrideArcMenuFrame.add(presetTextRow);
                    overrideArcMenuFrame.show();
                }
                if(!widget.get_active() && overrideArcMenuFrame.count==2) {
                    overrideArcMenuFrame.remove(presetTextRow);
                }
            });
            let presetTextRow = new PW.FrameBoxRow();
            let presetTextLabel = new Gtk.Label({
                label: _("Current Color Theme"),
                use_markup: true,
                xalign: 0,
                hexpand: true
            });
            let currentPresetTextLabel = new Gtk.Label({
                label: this.presetName,
                use_markup: true,
                xalign: 1,
                hexpand: false
            });
            presetTextRow.add(presetTextLabel);
            presetTextRow.add(currentPresetTextLabel);
            overrideArcMenuRow.add(overrideArcMenuLabel);
            overrideArcMenuRow.add(overrideArcMenuButton);
            overrideArcMenuRow.add(overrideArcMenuSwitch);
            overrideArcMenuFrame.add(overrideArcMenuRow);
            if(overrideArcMenuSwitch.get_active())
                overrideArcMenuFrame.add(presetTextRow);
            this.add(overrideArcMenuFrame);

            //Menu Layout
            let layoutFrame = new PW.FrameBox();
            let layoutRow = new PW.FrameBoxRow();
            let layoutLabel = new Gtk.Label({
                label: _("Menu Layout"),
                use_markup: true,
                xalign: 0,
                hexpand: true
            });
            let layoutButton = new PW.IconButton({
                circular: true,
                icon_name: 'emblem-system-symbolic',
                tooltip_text: _("Choose from a variety of menu layouts")
            });
            layoutButton.connect('clicked', () => {
                let dialog = new ArcMenuLayoutWindow(this._settings, this);
                dialog.show_all();
                dialog.connect('response', (response) => { 
                    if(dialog.get_response()) {
                        this._settings.set_enum('menu-layout', dialog.index);
                        saveCSS(this._settings);
                        this._settings.set_boolean('reload-theme',true);
                        currentStyleLabel.label = Constants.MENU_STYLE_CHOOSER.Styles[dialog.index].name;
                        tweaksLabel.label = currentStyleLabel.label +" " + _("Tweaks");
                        dialog.destroy();
                    }
                    else
                        dialog.destroy();
                }); 
            });
            layoutButton.set_sensitive(this._settings.get_boolean('enable-custom-arc-menu-layout'));
            let layoutSwitch = new Gtk.Switch({ 
                halign: Gtk.Align.END,
                tooltip_text: _("Enable the selection of different menu layouts")
            });
            layoutSwitch.set_active(this._settings.get_boolean('enable-custom-arc-menu-layout'));
            layoutSwitch.connect('notify::active', (widget) => { 
                this._settings.set_boolean('enable-custom-arc-menu-layout',widget.get_active());
                layoutButton.set_sensitive(widget.get_active());
                if(widget.get_active() && layoutFrame.count==1){
                    layoutFrame.add(currentLayoutRow);
                    layoutFrame.add(tweaksRow);
                    layoutFrame.show();
                }
                if(!widget.get_active() && layoutFrame.count>1){
                    layoutFrame.remove(currentLayoutRow);
                    layoutFrame.remove(tweaksRow);
                }

                if(widget.get_active()){
                    let index = this._settings.get_enum('menu-layout');
                    currentStyleLabel.label = Constants.MENU_STYLE_CHOOSER.Styles[index].name;
                    tweaksLabel.label = currentStyleLabel.label +" " + _("Tweaks");
                }
                if(!widget.get_active()){
                    this._settings.set_enum('menu-layout', 0);
                    currentStyleLabel.label = Constants.MENU_STYLE_CHOOSER.Styles[0].name;
                    tweaksLabel.label = currentStyleLabel.label +" " + _("Tweaks");
                }
                saveCSS(this._settings);
                this._settings.set_boolean('reload-theme',true);
                   
            });
            layoutRow.add(layoutLabel);
            layoutRow.add(layoutButton);
            layoutRow.add(layoutSwitch);
            layoutFrame.add(layoutRow);
    
            let currentLayoutRow = new PW.FrameBoxRow();
            let currentLayoutLabel = new Gtk.Label({
                label: _("Current Layout"),
                use_markup: true,
                xalign: 0,
                hexpand: true
            }); 
            let currentStyleLabel = new Gtk.Label({
                label: "",
                use_markup: true,
                xalign: 0,
                hexpand: false
            }); 
            let index = this._settings.get_enum('menu-layout');
            currentStyleLabel.label = Constants.MENU_STYLE_CHOOSER.Styles[index].name;
            currentLayoutRow.add(currentLayoutLabel);
            currentLayoutRow.add(currentStyleLabel);
            if(this._settings.get_boolean('enable-custom-arc-menu-layout'))
                layoutFrame.add(currentLayoutRow);


            let tweaksRow = new PW.FrameBoxRow();
            let tweaksLabel = new Gtk.Label({
                label: currentStyleLabel.label +" " + _("Tweaks"),
                use_markup: true,
                xalign: 0,
                hexpand: true
            }); 

            let menuTweaksButton = new PW.IconButton({
                circular: true,
                icon_name: 'emblem-system-symbolic',
                tooltip_text: _("Tweaks for the current menu layout")
            });
            menuTweaksButton.connect('clicked', () => {
                let dialog = new LayoutTweaks.tweaks.TweaksDialog(this._settings, this, currentStyleLabel.label +" " + _("Tweaks"));
                dialog.show_all();
                dialog.connect('response', (response) => { 
                    if(dialog.get_response()){
                        dialog.destroy();
                    }
                    else
                        dialog.destroy();
                }); 
            });
            tweaksRow.add(tweaksLabel);
            tweaksRow.add(menuTweaksButton);
            if(this._settings.get_boolean('enable-custom-arc-menu-layout'))
                layoutFrame.add(tweaksRow);

            this.add(layoutFrame);
    }
    checkIfPresetMatch(){
        this.presetName="Custom Theme";
        this.separatorColor = this._settings.get_string('separator-color');
        this.verticalSeparator = this._settings.get_boolean('vert-separator');
        this.menuColor = this._settings.get_string('menu-color');
        this.menuForegroundColor = this._settings.get_string('menu-foreground-color');
        this.borderColor = this._settings.get_string('border-color');
        this.highlightColor = this._settings.get_string('highlight-color');
        this.fontSize = this._settings.get_int('menu-font-size');
        this.borderSize = this._settings.get_int('menu-border-size');
        this.cornerRadius = this._settings.get_int('menu-corner-radius');
        this.menuMargin = this._settings.get_int('menu-margin');
        this.menuArrowSize = this._settings.get_int('menu-arrow-size');
        let currentSettingsArray = [this.menuColor, this.menuForegroundColor, this.borderColor, this.highlightColor, this.separatorColor, 
                                    this.fontSize.toString(), this.borderSize.toString(), this.cornerRadius.toString(), this.menuArrowSize.toString(), 
                                    this.menuMargin.toString(), this.verticalSeparator.toString()];
        let all_color_themes = this._settings.get_value('color-themes').deep_unpack();
        for(let i = 0;i < all_color_themes.length;i++){
            this.isEqual=true;
            for(let l = 0; l<currentSettingsArray.length;l++){
                if(currentSettingsArray[l] !=  all_color_themes[i][l+1]){
                    this.isEqual=false;
                    break; //If not equal then break out of inner loop
                }
            }
            if(this.isEqual){
                this.presetName = all_color_themes[i][0];
                break; //If equal we found match, break out of loops
            }      
        }
    }
});

//Dialog Window for Arc Menu Customization    
var ArcMenuLayoutWindow = GObject.registerClass(
    class ArcMenu_ArcMenuLayoutWindow extends PW.DialogWindow {

        _init(settings, parent) {
            this._settings = settings;
            this.addResponse = false;
            this.index = this._settings.get_enum('menu-layout');
            
            this._params = {
                title: _("Menu style chooser"),
                height: Constants.MENU_STYLE_CHOOSER.WindowHeight,
                width: Constants.MENU_STYLE_CHOOSER.WindowWidth,
                maxColumns: Constants.MENU_STYLE_CHOOSER.MaxColumns,
                thumbnailHeight: Constants.MENU_STYLE_CHOOSER.ThumbnailHeight,
                thumbnailWidth: Constants.MENU_STYLE_CHOOSER.ThumbnailWidth,
                styles: Constants.MENU_STYLE_CHOOSER.Styles
            };
            this._tileGrid = new PW.TileGrid(this._params.maxColumns);
            super._init(_('Arc Menu Layout'), parent);
            this.resize(725,480);
        }

        _createLayout(vbox) {         
            this._scrolled = new Gtk.ScrolledWindow();
            this._scrolled.overlay_scrolling = false;
            this._scrolled.set_policy(Gtk.PolicyType.NEVER, Gtk.PolicyType.AUTOMATIC);
            let index = 0;

            //Add each menu layout to frame
            this._params.styles.forEach((style) => {
                this._addTile(style.name, Me.path + style.thumbnail,index);
                index++;
            });
            this._scrolled.add(this._tileGrid);
            vbox.add(this._scrolled);

            this._tileGrid.connect('selected-children-changed', () => {
                    applyButton.set_sensitive(true);
            });

            //Apply Button
            let applyButton = new Gtk.Button({
                label: _("Apply"),
                halign: Gtk.Align.END
            });
            applyButton.connect('clicked', ()=> {
                let temp = this._tileGrid.get_selected_children();
                let array= this._tileGrid.get_children();
                for(let i = 0; i < array.length; i++){
                    if(array[i]==temp[0])
                            this.index=i;
                }
                this.addResponse = true;
                this.response(-10);
            });
            vbox.add(applyButton);
            this._tileGrid.set_selection_mode(Gtk.SelectionMode.SINGLE);
            this.show();
            let temp = this._tileGrid.get_child_at_index(this.index);
            this._tileGrid.select_child(temp);
            applyButton.set_sensitive(false); 
        }

        _addTile(name, thumbnail, index) {
            let tile = new PW.Tile(name, thumbnail, this._params.thumbnailWidth, this._params.thumbnailHeight);
            this._tileGrid.add(tile);
           
            tile.connect('clicked', ()=> {
                let temp = this._tileGrid.get_child_at_index(index);
                this._tileGrid.select_child(temp);  
            });
        }

        get_response(){
            return this.addResponse;
        }
});


//Dialog Window for Arc Menu Customization    
var ArcMenuCustomizationWindow = GObject.registerClass(
    class ArcMenu_ArcMenuCustomizationWindow extends PW.DialogWindow {

        _init(settings, parent) {
            this._settings = settings;
            this.addResponse = false;
            this.heightValue = this._settings.get_int('menu-height');
            this.rightPanelWidth = this._settings.get_int('right-panel-width');
            this.menuWidth = this._settings.get_int('menu-width');
            this.separatorColor = this._settings.get_string('separator-color');
            this.verticalSeparator = this._settings.get_boolean('vert-separator');
            this.customArcMenu = this._settings.get_boolean('enable-custom-arc-menu');
            this.menuColor = this._settings.get_string('menu-color');
            this.menuForegroundColor = this._settings.get_string('menu-foreground-color');
            this.borderColor = this._settings.get_string('border-color');
            this.highlightColor = this._settings.get_string('highlight-color');
            this.fontSize = this._settings.get_int('menu-font-size');
            this.borderSize = this._settings.get_int('menu-border-size');
            this.cornerRadius = this._settings.get_int('menu-corner-radius');
            this.menuMargin = this._settings.get_int('menu-margin');
            this.menuArrowSize = this._settings.get_int('menu-arrow-size');
            this.largeIcons = this._settings.get_boolean('enable-large-icons');
            this.gapAdjustment = this._settings.get_int('gap-adjustment');
            this.subMenus = this._settings.get_boolean('enable-sub-menus');
            this.disableCategoryArrow = this._settings.get_boolean('disable-category-arrows');
            this.removeMenuArrow = this._settings.get_boolean('remove-menu-arrow');
            super._init(_('Customize Arc Menu Appearance'), parent);
	        this.resize(450,250);
        }

        _createLayout(vbox) {
            let generalSettingsFrame = new PW.FrameBox();
            let generalRow = new PW.FrameBoxRow();
            let generalLabel = new Gtk.Label({
                label: _('General Settings'),
                xalign:0,
                hexpand: false,
            });   
            generalLabel.set_sensitive(false);
            generalRow.add(generalLabel);
            generalSettingsFrame.add(generalRow);
            let screen = Gdk.Screen.get_default();
            let rect = screen.get_monitor_geometry(0);
            let scaleFactor = screen.get_monitor_scale_factor(0);
            let screenHeight = rect.height * scaleFactor;
            //first row  - Name of Custom link
            let heightRow = new PW.FrameBoxRow();
            let heightLabel = new Gtk.Label({
                label: _('Menu Height'),
                use_markup: true,
                xalign: 0,
                hexpand: false,
                selectable: false
            });
            let hscale = new Gtk.HScale({
                adjustment: new Gtk.Adjustment({
                    lower: 300,
                    upper: (screenHeight * 8) / 10,
                    step_increment: 10,
                    page_increment: 10,
                    page_size: 0
                }),
                tooltip_text: _("Adjust the menu height") + "\n" +_("Certain menu layouts only"),
                digits: 0,
                round_digits: 0,
                hexpand: true,
                value_pos: Gtk.PositionType.RIGHT
            });
            hscale.connect('format-value', (scale, value) => { return value.toString() + ' px'; });
            hscale.set_value(this.heightValue);
            hscale.connect('value-changed', () => {
                this.heightValue = hscale.get_value();
                applyButton.set_sensitive(true);
                resetButton.set_sensitive(true);
            });
            heightRow.add(heightLabel);
            heightRow.add(hscale);
            generalSettingsFrame.add(heightRow);

            //ROW 3 - MENU WIDTH--------------------------------------------------   
            let menuWidthRow = new PW.FrameBoxRow();
            let menuWidthLabel = new Gtk.Label({
                label: _('Left-Panel Width'),
                xalign:0,
                hexpand: false,
             });   
            let menuWidthScale = new Gtk.HScale({
                adjustment: new Gtk.Adjustment({
                    lower: 200,upper: 500, step_increment: 1, page_increment: 1, page_size: 0,
                }),
                tooltip_text: _("Adjust the left-panel width") + "\n" +_("Certain menu layouts only"),
                digits: 0,round_digits: 0,hexpand: true,
                value_pos: Gtk.PositionType.RIGHT
            });
            menuWidthScale.connect('format-value', (scale, value) => { return value.toString() + 'px'; });
            menuWidthScale.set_value(this.menuWidth);
            menuWidthScale.connect('value-changed', () => {
                this.menuWidth = menuWidthScale.get_value();
                applyButton.set_sensitive(true);
                resetButton.set_sensitive(true);
            });
            menuWidthRow.add(menuWidthLabel);
            menuWidthRow.add(menuWidthScale);
            generalSettingsFrame.add(menuWidthRow);

            //ROW 3 - RightMENU WIDTH--------------------------------------------------   
            let rightPanelWidthRow = new PW.FrameBoxRow();
            let rightPanelWidthLabel = new Gtk.Label({
                label: _('Right-Panel Width'),
                xalign:0,
                hexpand: false,
             });   
            let rightPanelWidthScale = new Gtk.HScale({
                adjustment: new Gtk.Adjustment({
                    lower: 200,upper: 500, step_increment: 1, page_increment: 1, page_size: 0,
                }),
                tooltip_text: _("Adjust the right-panel width") + "\n" +_("Certain menu layouts only"),
                digits: 0,round_digits: 0,hexpand: true,
                value_pos: Gtk.PositionType.RIGHT
            });
            rightPanelWidthScale.connect('format-value', (scale, value) => { return value.toString() + 'px'; });
            rightPanelWidthScale.set_value(this.rightPanelWidth);
            rightPanelWidthScale.connect('value-changed', () => {
                this.rightPanelWidth = rightPanelWidthScale.get_value();
                applyButton.set_sensitive(true);
                resetButton.set_sensitive(true);
            });
            rightPanelWidthRow.add(rightPanelWidthLabel);
            rightPanelWidthRow.add(rightPanelWidthScale);
            generalSettingsFrame.add(rightPanelWidthRow);

            let tweakStyleRow = new PW.FrameBoxRow();
            let tweakStyleLabel = new Gtk.Label({
                label: _("Disable Menu Arrow"),
                use_markup: true,
                xalign: 0,
                hexpand: true
            });

            let tweakStyleSwitch = new Gtk.Switch({ 
                halign: Gtk.Align.END,
                tooltip_text: _("Disable current theme menu arrow pointer")
            });
            tweakStyleSwitch.set_active(this._settings.get_boolean('remove-menu-arrow'));
            tweakStyleSwitch.connect('notify::active', (widget) => {
                this.removeMenuArrow =  widget.get_active();
                applyButton.set_sensitive(true);
                resetButton.set_sensitive(true);
            });

            tweakStyleRow.add(tweakStyleLabel);
            tweakStyleRow.add(tweakStyleSwitch);
            generalSettingsFrame.add(tweakStyleRow);
            vbox.add(generalSettingsFrame);

            let miscFrame = new PW.FrameBox();
            let miscLabelRow = new PW.FrameBoxRow();
            let miscLabel = new Gtk.Label({
                label: _('Miscellaneous'),
                xalign:0,
                hexpand: false,
            });   
            miscLabel.set_sensitive(false);
            miscLabelRow.add(miscLabel);
            miscFrame.add(miscLabelRow);

            let largeIconsRow = new PW.FrameBoxRow();
            let largeIconsLabel = new Gtk.Label({
                label: _('Large Application Icons'),
                use_markup: true,
                xalign: 0,
                hexpand: true,
                selectable: false
             });   
            let largeIconsSwitch = new Gtk.Switch({ 
                halign: Gtk.Align.END,
                tooltip_text: _("Enable large application icons") + "\n" +_("Certain menu layouts only"),
            });
            largeIconsSwitch.set_active( this.largeIcons);
            largeIconsSwitch.connect('notify::active', (widget) => {
                 this.largeIcons = widget.get_active();
                 applyButton.set_sensitive(true);
                 resetButton.set_sensitive(true);
            });
            largeIconsRow.add(largeIconsLabel);            
            largeIconsRow.add(largeIconsSwitch);             
            miscFrame.add(largeIconsRow);

            let subMenusRow = new PW.FrameBoxRow();
            let subMenusLabel = new Gtk.Label({
                label: _('Category Sub Menus'),
                use_markup: true,
                xalign: 0,
                hexpand: true,
                selectable: false
             });   
            let subMenusSwitch = new Gtk.Switch({ 
                halign: Gtk.Align.END,
                tooltip_text: _("Show nested menus in categories") + "\n" +_("Certain menu layouts only"),
            });
            subMenusSwitch.set_active(this.subMenus);
            subMenusSwitch.connect('notify::active', (widget) => {
                 this.subMenus = widget.get_active();
                 applyButton.set_sensitive(true);
                 resetButton.set_sensitive(true);
            });
            subMenusRow.add(subMenusLabel);            
            subMenusRow.add(subMenusSwitch);  
            miscFrame.add(subMenusRow);  
            
            let disableCategoryArrowRow = new PW.FrameBoxRow();
            let disableCategoryArrowLabel = new Gtk.Label({
                label: _('Disable Category Arrows'),
                use_markup: true,
                xalign: 0,
                hexpand: true,
                selectable: false
             });   
            let disableCategoryArrowSwitch = new Gtk.Switch({ 
                halign: Gtk.Align.END,
                tooltip_text: _("Disable the arrow on category menu items") + "\n" +_("Certain menu layouts only"),
            });
            disableCategoryArrowSwitch.set_active(this.disableCategoryArrow);
            disableCategoryArrowSwitch.connect('notify::active', (widget) => {
                 this.disableCategoryArrow = widget.get_active();
                 applyButton.set_sensitive(true);
                 resetButton.set_sensitive(true);
            });
            disableCategoryArrowRow.add(disableCategoryArrowLabel);            
            disableCategoryArrowRow.add(disableCategoryArrowSwitch);  
            miscFrame.add(disableCategoryArrowRow);          
            

            let separatorFrame = new PW.FrameBox();
            let separatorLabelRow = new PW.FrameBoxRow();
            let separatorLabel = new Gtk.Label({
                label: _('Separator Settings'),
                xalign:0,
                hexpand: false,
            });   
            separatorLabel.set_sensitive(false);
            separatorLabelRow.add(separatorLabel);
            separatorFrame.add(separatorLabelRow);
            let vertSeparatorRow = new PW.FrameBoxRow();
            let vertSeparatorLabel = new Gtk.Label({
                label: _('Enable Vertical Separator'),
                use_markup: true,
                xalign: 0,
                hexpand: true,
                selectable: false
             });   
            let vertSeparatorSwitch = new Gtk.Switch({ 
                halign: Gtk.Align.END,
                tooltip_text: _("Enable a Vertical Separator") + "\n" +_("Certain menu layouts only"),
            });
            vertSeparatorSwitch.set_active(this.verticalSeparator);
            vertSeparatorSwitch.connect('notify::active', (widget) => { 
                 this.verticalSeparator = widget.get_active();
                 applyButton.set_sensitive(true);
                 resetButton.set_sensitive(true);
            });
            vertSeparatorRow.add(vertSeparatorLabel);            
            vertSeparatorRow.add(vertSeparatorSwitch);             
            separatorFrame.add(vertSeparatorRow);
            
            
            let separatorColorRow = new PW.FrameBoxRow();
            let separatorColorLabel = new Gtk.Label({
                label: _('Separator Color'),
                use_markup: true,
                xalign: 0,
                hexpand: true,
                selectable: false
            });
            let colorChooser = new Gtk.ColorButton({
                use_alpha:true,
                tooltip_text: _("Change the color of all separators")
            });     
            let color = new Gdk.RGBA();
            color.parse(this.separatorColor);
            colorChooser.set_rgba(color);    
            colorChooser.connect('color-set', ()=>{
                this.separatorColor = colorChooser.get_rgba().to_string();
                applyButton.set_sensitive(true);
                resetButton.set_sensitive(true);
            });
            separatorColorRow.add(separatorColorLabel);            
            separatorColorRow.add(colorChooser);             
            separatorFrame.add(separatorColorRow);
            vbox.add(separatorFrame);
            vbox.add(miscFrame);

            //GAP ADJUSTMENT--------------------------------------------------   
            let fineTuneFrame = new PW.FrameBox();
            let fineTuneLabelRow = new PW.FrameBoxRow();
            let fineTuneLabel = new Gtk.Label({
                label: _('Fine Tune'),
                xalign:0,
                hexpand: false,
            });   
            fineTuneLabel.set_sensitive(false);
            fineTuneLabelRow.add(fineTuneLabel);
            let gapAdjustmentRow = new PW.FrameBoxRow();
            let gapAdjustmentLabel = new Gtk.Label({
                label: _('Gap Adjustment'),
                xalign:0,
                hexpand: false,
            });   
            let gapAdjustmentScale = new Gtk.HScale({
                adjustment: new Gtk.Adjustment({
                    lower: -1,upper: 1, step_increment: 1, page_increment: 1, page_size: 0
                }),
                digits: 0,round_digits: 0,hexpand: true,
                value_pos: Gtk.PositionType.RIGHT,
                tooltip_text: _("Offset menu placement by 1px\nUseful if a gap or overlap is visible")
            });
            gapAdjustmentScale.connect('format-value', (scale, value) => { return value.toString() + 'px'; });
            gapAdjustmentScale.set_value(this.gapAdjustment);
            gapAdjustmentScale.connect('value-changed', () => {
                this.gapAdjustment = gapAdjustmentScale.get_value();
                applyButton.set_sensitive(true);
                resetButton.set_sensitive(true);
            });
            gapAdjustmentRow.add(gapAdjustmentLabel);
            gapAdjustmentRow.add(gapAdjustmentScale);
            fineTuneFrame.add(fineTuneLabelRow);
            fineTuneFrame.add(gapAdjustmentRow);
            // Button Row -------------------------------------------------------
            let buttonRow = new PW.FrameBoxRow();
            let resetButton = new Gtk.Button({
                label: _("Reset")
            });   
            resetButton.set_sensitive( this.checkIfResetButtonSensitive());
            resetButton.connect('clicked', ()=> {
                    this.gapAdjustment = 0;
                    this.heightValue = 550;
                    this.menuWidth = 290;
                    this.rightPanelWidth = 205;
                    this.separatorColor = "rgb(63,62,64)";
                    this.verticalSeparator = false;
                    this.largeIcons = false;
                    this.subMenus = false;
                    this.removeMenuArrow = false;
                    this.disableCategoryArrow = false;
                    hscale.set_value(this.heightValue);
                    menuWidthScale.set_value(this.menuWidth);
                    rightPanelWidthScale.set_value(this.rightPanelWidth);
                    gapAdjustmentScale.set_value(0);
                    subMenusSwitch.set_active(this.subMenus);
                    disableCategoryArrowSwitch.set_active(this.disableCategoryArrow);
                    vertSeparatorSwitch.set_active(this.verticalSeparator);
                    largeIconsSwitch.set_active(this.largeIcons);
                    tweakStyleSwitch.set_active(this.removeMenuArrow);
                    color.parse(this.separatorColor);
                    colorChooser.set_rgba(color);    

                    resetButton.set_sensitive(false);
                    applyButton.set_sensitive(true);               
            });
            let applyButton = new Gtk.Button({
                label: _("Apply"),
                hexpand: true
            });
            applyButton.connect('clicked', () => {
                this.addResponse = true;
                this.response(-10);
            });
            applyButton.set_halign(Gtk.Align.END);
            applyButton.set_sensitive(false);
            buttonRow.add(resetButton);
            buttonRow.add(applyButton);

            vbox.add(fineTuneFrame);
            vbox.add(buttonRow);
        }
        get_response(){
            return this.addResponse;
        }
        checkIfResetButtonSensitive(){
            return (this.heightValue != 550 ||
                this.menuWidth != 290 ||
                this.rightPanelWidth != 205 ||
                this.separatorColor != "rgb(63,62,64)"||
                this.verticalSeparator != false||
                this.subMenus != false ||
                this.disableCategoryArrow != false ||
                this.largeIcons != false||
                this.gapAdjustment != 0 ||
                this.removeMenuArrow != false) ? true : false
            
        }
   
});
//Dialog Window for Arc Menu Customization    
var ColorThemeDialogWindow = GObject.registerClass(
    class ArcMenu_ColorThemeDialogWindow extends PW.DialogWindow {

        _init(settings, parent, themeName="") {
            this._settings = settings;
            this.addResponse = false;
            this.themeName = themeName;
            super._init(_('Color Theme Name'), parent);
            //this.resize(450,250);
        }

        _createLayout(vbox) {        
            let nameFrameRow = new PW.FrameBoxRow();
            let nameFrameLabel = new Gtk.Label({
                label: _('Name:'),
                use_markup: true,
                xalign: 0,
                hexpand: true,
                selectable: false
            });
            nameFrameRow.add(nameFrameLabel);
            this.nameEntry = new Gtk.Entry();
            this.nameEntry.set_width_chars(35);
            
            nameFrameRow.add(this.nameEntry);
            this.nameEntry.grab_focus();
            if(this.themeName!=""){
                this.nameEntry.set_text(this.themeName);
            }
            this.nameEntry.connect('changed',()=>{
                if(this.nameEntry.get_text().length > 0)
                    saveButton.set_sensitive(true);
                else
                    saveButton.set_sensitive(false);
            });
        
            
            vbox.add(nameFrameRow);
            let saveButton = new Gtk.Button({
                label: _("Save Theme"),
                halign: Gtk.Align.END
            });   
            saveButton.set_sensitive(false);
            saveButton.connect('clicked', ()=> {
                this.themeName = this.nameEntry.get_text();
                this.addResponse=true;
                this.response(-10);
            });
            vbox.add(saveButton);
        }
        get_response(){
            return this.addResponse;
        }
});

//Dialog Window for Arc Menu Customization    
var ExportColorThemeDialogWindow = GObject.registerClass(
    class ArcMenu_ExportColorThemeDialogWindow extends PW.DialogWindow {

        _init(settings, parent, themes=null) {
            this._settings = settings;
            this._themes = themes;
            this.addResponse = false;
            this.selectedThemes = [];
            super._init(this._themes ? _('Select Themes to Import'): _('Select Themes to Export'), parent);
        }

        _createLayout(vbox) {  
            //create a scrolledwindow for list of all apps
            vbox.spacing = 0;
            this.checkButtonArray = [];
            this.shouldToggle =true;
            let themesListScrollWindow = new Gtk.ScrolledWindow();
            themesListScrollWindow.set_policy(Gtk.PolicyType.AUTOMATIC, Gtk.PolicyType.AUTOMATIC);
            themesListScrollWindow.set_max_content_height(300);
            themesListScrollWindow.set_min_content_height(300);
            themesListScrollWindow.set_min_content_width(500);
            themesListScrollWindow.set_min_content_width(500);
            this.mainFrame = new PW.FrameBox();

            //Label and button to add apps to list
            let themesListButton = new Gtk.Button({
                label: this._themes ?_("Import"): _("Export"),
                xalign:1
            });

            themesListButton.connect('clicked', () => {
                this.addResponse = true;
                this.response(-10);
            });
	        themesListButton.set_halign(Gtk.Align.END);
           
            themesListScrollWindow.add_with_viewport(this.mainFrame);
            this.checkAllButton = new Gtk.CheckButton({
                xalign:1,
                margin_right: 23
            });

            this.checkAllButton.set_halign(Gtk.Align.END);
            this.checkAllButton.set_active(true);
            this.checkAllButton.connect('toggled', () => {   
                let isActive = this.checkAllButton.get_active();
                if(this.shouldToggle){
                    for(let i = 0; i< this.checkButtonArray.length; i++){
                        this.checkButtonArray[i].set_active(isActive);
                    }
                }
            });
            let checkAllRow = new PW.FrameBoxRow();
            let checkAllLabel = new Gtk.Label({
                use_markup: false,
                xalign: 0,
                hexpand: true,
                label: _("Select All"),
                halign:Gtk.Align.END
            });
            checkAllRow.add(checkAllLabel);
            checkAllRow.add(this.checkAllButton);
            vbox.add(checkAllRow);
            vbox.add(themesListScrollWindow);
            vbox.add(new PW.FrameBoxRow());
            vbox.add(themesListButton);

            this.color_themes = this._themes ? this._themes : this._settings.get_value('color-themes').deep_unpack();
            for(let i = 0; i< this.color_themes.length; i++) {
                let theme = this.color_themes[i];
                let frameRow = new PW.FrameBoxRow();
                let frameLabel = new Gtk.Label({
                    use_markup: false,
                    xalign: 0,
                    hexpand: true
                });
    
                frameLabel.label = theme[0];
    
                frameRow.add(frameLabel);
    
                let checkButton = new Gtk.CheckButton({
                    margin_right: 20
                });
                checkButton.connect('toggled', () => {
                    if(checkButton.get_active()){
                        this.selectedThemes.push(theme);
                    }
                    else{
                        this.shouldToggle = false;
                        this.checkAllButton.set_active(false);
                        this.shouldToggle = true;
                        let index= this.selectedThemes.indexOf(theme);
                        this.selectedThemes.splice(index,1);
                    }
                });
                this.checkButtonArray.push(checkButton);
                frameRow.add(checkButton);
                this.mainFrame.add(frameRow);
                checkButton.set_active(true);
            }    
        }
        get_response(){
            return this.addResponse;
        }
});
//Dialog Window for Arc Menu Customization    
var ManageColorThemeDialogWindow = GObject.registerClass(
    class ArcMenu_ManageColorThemeDialogWindow extends PW.DialogWindow {

        _init(settings, parent) {
            this._settings = settings;
            this.addResponse = false;
            this.selectedThemes = [];
            super._init( _('Manage Themes'), parent);
        }

        _createLayout(vbox) {    
            //create a scrolledwindow for list of all apps
            let themesListScrollWindow = new Gtk.ScrolledWindow();
            themesListScrollWindow.set_policy(Gtk.PolicyType.AUTOMATIC, Gtk.PolicyType.AUTOMATIC);
            themesListScrollWindow.set_max_content_height(300);
            themesListScrollWindow.set_min_content_height(300);
            themesListScrollWindow.set_min_content_width(500);
            themesListScrollWindow.set_min_content_width(500);
            this.mainFrame = new PW.FrameBox();

            //Label and button to add apps to list
            let applyButton = new Gtk.Button({
                label: _("Apply"),
                xalign:1
            });
            applyButton.set_sensitive(false);
            applyButton.connect('clicked', () => {
                this.addResponse = true;
                this.response(-10);
            });
	        applyButton.set_halign(Gtk.Align.END);

            // add the frames to the vbox
           
            themesListScrollWindow.add_with_viewport(this.mainFrame);
            vbox.add(themesListScrollWindow);
            vbox.add(applyButton);

            this.color_themes = this._settings.get_value('color-themes').deep_unpack();
            for(let i = 0; i< this.color_themes.length; i++) {
                let theme = this.color_themes[i];
                let frameRow = new PW.FrameBoxRow();
                let frameLabel = new Gtk.Label({
                    use_markup: false,
                    xalign: 0,
                    hexpand: true
                });
    
                frameLabel.label = theme[0];
    
                frameRow.add(frameLabel);
    
                let buttonBox = new Gtk.Grid({
                    margin_top:0,
                    margin_bottom: 0,
                    vexpand: false,
                    hexpand: false,
                    margin_right: 15,
                    column_spacing: 2
                });
                //create the three buttons to handle the ordering of pinned apps
                //and delete pinned apps
                let editButton = new PW.IconButton({
                    circular: false,
                    icon_name: 'emblem-system-symbolic'
                });
                let upButton = new PW.IconButton({
                    circular: false,
                    icon_name: 'go-up-symbolic'
                });
                let downButton = new PW.IconButton({
                    circular: false,
                    icon_name: 'go-down-symbolic'
                });
                let deleteButton = new PW.IconButton({
                     circular: false,
                    icon_name: 'edit-delete-symbolic'
                });
                editButton.connect('clicked', () => {
                    let dialog = new ColorThemeDialogWindow(this._settings, this, theme[0]);
                    dialog.show_all();
                    dialog.connect('response', (response) => { 
                        if(dialog.get_response()) {
                            let index = frameRow.get_index();
                            let array = [dialog.themeName, theme[1], theme[2], theme[3], theme[4], theme[5], 
                                        theme[6], theme[7], theme[8], theme[9], theme[10], theme[11]];
                            this.color_themes.splice(index,1,array);
                            frameLabel.label = dialog.themeName;
                            dialog.destroy();
                        }
                        else
                            dialog.destroy();
                    }); 
                    applyButton.set_sensitive(true);
                });
                upButton.connect('clicked', () => {
                    //find index of frameRow in frame
                    //remove and reinsert at new position
                    let index = frameRow.get_index();
                    if(index!=0){
                        this.mainFrame.remove(frameRow);
                        this.mainFrame.insert(frameRow,index-1);
                        this.color_themes.splice(index,1);
                        this.color_themes.splice(index-1,0,theme);
                    }
                    this.mainFrame.show();
                    applyButton.set_sensitive(true);
                });

                downButton.connect('clicked', () => {
                    //find index of frameRow in frame
                    //remove and reinsert at new position
                    let index = frameRow.get_index();
                    if(index+1<this.mainFrame.count){
                        this.mainFrame.remove(frameRow);
                        this.mainFrame.insert(frameRow,index+1);
                        this.color_themes.splice(index,1);
                        this.color_themes.splice(index+1,0,theme);
                    }
                    this.mainFrame.show();
                    applyButton.set_sensitive(true);
                });

                deleteButton.connect('clicked', () => {
                    //remove frameRow
                    let index = frameRow.get_index();
                    this.mainFrame.remove(frameRow);
                    this.color_themes.splice(index,1);
                    this.mainFrame.show();
                    applyButton.set_sensitive(true);
                });
                //add everything to frame
                buttonBox.add(editButton);
                buttonBox.add(upButton);
                buttonBox.add(downButton);
                buttonBox.add(deleteButton);
                frameRow.add(buttonBox);
                this.mainFrame.add(frameRow);
            }    
        }
        get_response(){
            return this.addResponse;
        }
});
//Dialog Window for Arc Menu Customization    
var OverrideArcMenuThemeWindow = GObject.registerClass(
    class ArcMenu_OverrideArcMenuThemeWindow extends PW.DialogWindow {

        _init(settings, parent) {
            this._settings = settings;
            this.addResponse = false;
            this.heightValue = this._settings.get_int('menu-height');
            this.rightPanelWidth = this._settings.get_int('right-panel-width');
            this.separatorColor = this._settings.get_string('separator-color');
            this.verticalSeparator = this._settings.get_boolean('vert-separator');
            this.customArcMenu = this._settings.get_boolean('enable-custom-arc-menu');
            
            this.menuColor = this._settings.get_string('menu-color');
            this.menuForegroundColor = this._settings.get_string('menu-foreground-color');
            this.borderColor = this._settings.get_string('border-color');
            this.highlightColor = this._settings.get_string('highlight-color');
            this.fontSize = this._settings.get_int('menu-font-size');
            this.borderSize = this._settings.get_int('menu-border-size');
            this.cornerRadius = this._settings.get_int('menu-corner-radius');
            this.menuMargin = this._settings.get_int('menu-margin');
            this.menuArrowSize = this._settings.get_int('menu-arrow-size');
            this.menuWidth = this._settings.get_int('menu-width');
            this.updatePresetComboBox = true;
            super._init(_('Override Arc Menu Theme'), parent);
            this.resize(450,250);
            this.shouldDeselect = true; 
        }

        _createLayout(vbox) {         
            //OVERRIDE ARC MENUS THEME-----------------------------
            //OVERRIDE OPTIONS--------------------------------
            let customArcMenuOptionsFrame = new PW.FrameBox();
 
            this.colorPresetFrame = new PW.FrameBox();
            let colorPresetRow = new PW.FrameBoxRow();
            let colorPresetLabel = new Gtk.Label({
                label: _('Color Theme Presets'),
                xalign:0,
                hexpand: true,
            });   
            this.colorPresetCombo = new Gtk.ComboBoxText({ halign: Gtk.Align.END });
            this.color_themes = this._settings.get_value('color-themes').deep_unpack();
            for(let i= 0; i<this.color_themes.length; i++){
                this.colorPresetCombo.append_text(_(this.color_themes[i][0]));
            }
            this.saveButton = new Gtk.Button({
                label: _("Save as Preset"),
                hexpand: true,
                halign: Gtk.Align.END
            });   
            this.checkIfPresetMatch();
            this.colorPresetCombo.connect('changed', (widget) => { 
                if(this.updatePresetComboBox){
                    let index = widget.get_active();
                    /*let defaultArray = ["Theme Name","Background Color", "Foreground Color","Border Color", "Highlight Color", "Separator Color"
                                            , "Font Size", "Border Size", "Corner Radius", "Arrow Size", "Menu Displacement", "Vertical Separator"];*/
                    if(index>=0){
                        this.menuColor = this.color_themes[index][1];
                        this.menuForegroundColor = this.color_themes[index][2];
                        this.borderColor = this.color_themes[index][3];
                        this.highlightColor = this.color_themes[index][4];
                        this.separatorColor = this.color_themes[index][5];
                        this.fontSize = parseInt(this.color_themes[index][6]);
                        this.borderSize = parseInt(this.color_themes[index][7]);
                        this.cornerRadius = parseInt(this.color_themes[index][8]);
                        this.menuArrowSize = parseInt(this.color_themes[index][9]);
                        this.menuMargin = parseInt(this.color_themes[index][10]);
                        this.verticalSeparator = (this.color_themes[index][11] === 'true');
                        
                        this.shouldDeselect = false;
                        this.presetName=this.color_themes[index][0];
                        color.parse(this.menuColor);
                        menuBackgroudColorChooser.set_rgba(color);
        
                        color.parse(this.menuForegroundColor);
                        menuForegroundColorChooser.set_rgba(color); 
        
                        fontScale.set_value(this.fontSize); 
        
                        color.parse(this.borderColor);
                        borderColorChooser.set_rgba(color); 
        
                        borderScale.set_value(this.borderSize);
        
                        color.parse(this.highlightColor);
                        itemColorChooser.set_rgba(color);
        
                        cornerScale.set_value(this.cornerRadius);
                        marginScale.set_value(this.menuMargin);
                        arrowScale.set_value(this.menuArrowSize);

                        vertSeparatorSwitch.set_active(this.verticalSeparator);
                        color.parse(this.separatorColor);
                        colorChooser.set_rgba(color);  
                        this.saveButton.set_sensitive(false);
                        applyButton.set_sensitive(true);  
                        this.shouldDeselect = true;           
                    }         
                }    
            });
            colorPresetRow.add(colorPresetLabel);
            colorPresetRow.add(this.colorPresetCombo);
            this.colorPresetFrame.add(colorPresetRow);

            let presetsButtonRow = new PW.FrameBoxRow();
            
            
            this.saveButton.connect('clicked', () => {
                /*let defaultArray = ["Theme Name","Background Color", "Foreground Color","Border Color", "Highlight Color", "Separator Color"
                                , "Font Size", "Border Size", "Corner Radius", "Arrow Size", "Menu Displacement", "Vertical Separator"];*/
                let dialog = new ColorThemeDialogWindow(this._settings, this);
                dialog.show_all();
                dialog.connect('response', (response) => { 
                    if(dialog.get_response()){
                        let array = [dialog.themeName, this.menuColor, this.menuForegroundColor, this.borderColor, this.highlightColor, this.separatorColor, 
                                        this.fontSize.toString(), this.borderSize.toString(), this.cornerRadius.toString(), this.menuArrowSize.toString(), 
                                        this.menuMargin.toString(), this.verticalSeparator.toString()];
                        this.color_themes.push(array);
                        this._settings.set_value('color-themes',new GLib.Variant('aas',this.color_themes));
                        this.colorPresetCombo.append_text(_(array[0]));
                        this.checkIfPresetMatch();
                        dialog.destroy();
                    }
                    else
                        dialog.destroy();
                }); 
            });

                        
            let manageButton = new Gtk.Button({
                label: _("Manage Presets")
            });   
            manageButton.connect('clicked', ()=> {            
                let dialog = new ManageColorThemeDialogWindow(this._settings, this);
                dialog.show_all();
                dialog.connect('response', (response)=>{ 
                    if(dialog.get_response()){
                        this.color_themes = dialog.color_themes;
                        this._settings.set_value('color-themes',new GLib.Variant('aas',dialog.color_themes));
                        this.colorPresetCombo.remove_all();
                        
                        for(let i= 0; i<this.color_themes.length; i++){
                            this.colorPresetCombo.append_text(_(this.color_themes[i][0]));
                        }
                        this.checkIfPresetMatch();
                        dialog.destroy();
                    }
                    else
                        dialog.destroy();
                }); 
            });
            presetsButtonRow.add(manageButton);
            presetsButtonRow.add(this.saveButton);
            this.colorPresetFrame.add(presetsButtonRow);
            vbox.add(this.colorPresetFrame);

            //ROW 1 - MENU BACKGROUND COLOR--------------------------------------   
            let menuBackgroudColorRow = new PW.FrameBoxRow();
            let menuBackgroudColorLabel = new Gtk.Label({
                label: _('Menu Background Color'),
                xalign:0,
                hexpand: true,
            });   
            let menuBackgroudColorChooser = new Gtk.ColorButton({use_alpha:true});   
            let color = new Gdk.RGBA();
            color.parse(this.menuColor);
            menuBackgroudColorChooser.set_rgba(color);            
            menuBackgroudColorChooser.connect('color-set', () => {
                this.menuColor = menuBackgroudColorChooser.get_rgba().to_string();
                applyButton.set_sensitive(true);
                if(this.shouldDeselect)
                    this.checkIfPresetMatch();
                resetButton.set_sensitive(true);
            });
            menuBackgroudColorRow.add(menuBackgroudColorLabel);
            menuBackgroudColorRow.add(menuBackgroudColorChooser);
            customArcMenuOptionsFrame.add(menuBackgroudColorRow);

            //ROW 2 - MENU FOREGROUND COLOR--------------------------------------   
            let menuForegroundColorRow = new PW.FrameBoxRow();
            let menuForegroundColorLabel = new Gtk.Label({
                label: _('Menu Foreground Color'),
                xalign:0,
                hexpand: true,
             });   
            let menuForegroundColorChooser = new Gtk.ColorButton({use_alpha:true});     
            color.parse(this.menuForegroundColor);
            menuForegroundColorChooser.set_rgba(color);            
            menuForegroundColorChooser.connect('color-set', () => {
                this.menuForegroundColor = menuForegroundColorChooser.get_rgba().to_string();
                applyButton.set_sensitive(true);
                if(this.shouldDeselect)
                    this.checkIfPresetMatch();
                resetButton.set_sensitive(true);
            });
            menuForegroundColorRow.add(menuForegroundColorLabel);
            menuForegroundColorRow.add(menuForegroundColorChooser);
            customArcMenuOptionsFrame.add(menuForegroundColorRow);
            //ROW 2 - FONT SIZE--------------------------------------------------   
            let fontSizeRow = new PW.FrameBoxRow();
            let fontSizeLabel = new Gtk.Label({
                label: _('Font Size'),
                xalign:0,
                hexpand: true,
            });   
            let fontScale = new Gtk.HScale({
                    adjustment: new Gtk.Adjustment({
                        lower: 8,upper: 14, step_increment: 1, page_increment: 1, page_size: 0
                    }),
                    digits: 0,round_digits: 0,hexpand: true,
                    value_pos: Gtk.PositionType.RIGHT
            });
            fontScale.connect('format-value', (scale, value) => { return value.toString() + 'pt'; });
            fontScale.set_value(this.fontSize);
            fontScale.connect('value-changed', () => {
                this.fontSize = fontScale.get_value();
                applyButton.set_sensitive(true);
                if(this.shouldDeselect)
                    this.checkIfPresetMatch();
                resetButton.set_sensitive(true);
            });
            fontSizeRow.add(fontSizeLabel);
            fontSizeRow.add(fontScale);
            customArcMenuOptionsFrame.add(fontSizeRow);
            //ROW 3- Border Color-------------------------------------------------
            let borderColorRow = new PW.FrameBoxRow();
            let borderColorLabel = new Gtk.Label({
                label: _('Border Color'),
                xalign:0,
                hexpand: true,
            });   
            let borderColorChooser = new Gtk.ColorButton({use_alpha:true});     
            color = new Gdk.RGBA();
            color.parse(this.borderColor);
            borderColorChooser.set_rgba(color);            
            borderColorChooser.connect('color-set', ()=>{
                this.borderColor = borderColorChooser.get_rgba().to_string();
                applyButton.set_sensitive(true);
                if(this.shouldDeselect)
                    this.checkIfPresetMatch();
                resetButton.set_sensitive(true);
            });
            borderColorRow.add(borderColorLabel);
            borderColorRow.add(borderColorChooser);
            customArcMenuOptionsFrame.add(borderColorRow);
            //ROW 4 - Border Size-------------------------------------------------------
            let borderSizeRow = new PW.FrameBoxRow();
            let borderSizeLabel = new Gtk.Label({
                label: _('Border Size'),
                xalign:0,
                hexpand: true,
            });   
            let borderScale = new Gtk.HScale({
                adjustment: new Gtk.Adjustment({
                    lower: 0,upper: 4, step_increment: 1, page_increment: 1, page_size: 0
                }),
                digits: 0,round_digits: 0,hexpand: true,
                value_pos: Gtk.PositionType.RIGHT
            });
            borderScale.connect('format-value', (scale, value) => { return value.toString() + 'px'; });
            borderScale.set_value(this.borderSize);
            borderScale.connect('value-changed', () => {
                this.borderSize = borderScale.get_value();
                applyButton.set_sensitive(true);
                if(this.shouldDeselect)
                    this.checkIfPresetMatch();
                resetButton.set_sensitive(true);
            }); 
            borderSizeRow.add(borderSizeLabel);
            borderSizeRow.add(borderScale);
            customArcMenuOptionsFrame.add(borderSizeRow);
            //ROW 5- ITEM highlight Color-----------------------------------------------
            let itemColorRow = new PW.FrameBoxRow();
            let itemColorLabel = new Gtk.Label({
                label: _('Highlighted Item Color'),
                xalign:0,
                hexpand: true,
            });   
            let itemColorChooser = new Gtk.ColorButton({use_alpha:true});     
            color = new Gdk.RGBA();
            color.parse(this.highlightColor);
            itemColorChooser.set_rgba(color);            
            itemColorChooser.connect('color-set', () => {
                this.highlightColor = itemColorChooser.get_rgba().to_string();
                applyButton.set_sensitive(true);
                if(this.shouldDeselect)
                    this.checkIfPresetMatch();
                resetButton.set_sensitive(true);
            });
            itemColorRow.add(itemColorLabel);
            itemColorRow.add(itemColorChooser);
            customArcMenuOptionsFrame.add(itemColorRow);
            //ROW 6 - CORNER RADIUS-----------------------------------------------------
            let cornerRadiusRow = new PW.FrameBoxRow();
            let cornerRadiusLabel = new Gtk.Label({
                label: _('Corner Radius'),
                xalign:0,
                hexpand: true,
            }); 
            let cornerScale = new Gtk.HScale({
                adjustment: new Gtk.Adjustment({
                    lower: 0,upper: 20, step_increment: 1, page_increment: 1, page_size: 0
                }),
                digits: 0,round_digits: 0,hexpand: true,
                value_pos: Gtk.PositionType.RIGHT
            });
            cornerScale.connect('format-value', (scale, value) => { return value.toString() + 'px'; });
            cornerScale.set_value(this.cornerRadius);
            cornerScale.connect('value-changed', () => {
                this.cornerRadius = cornerScale.get_value();
                applyButton.set_sensitive(true);
                if(this.shouldDeselect)
                    this.checkIfPresetMatch();
                resetButton.set_sensitive(true);
            });   
            cornerRadiusRow.add(cornerRadiusLabel);
            cornerRadiusRow.add(cornerScale);
            customArcMenuOptionsFrame.add(cornerRadiusRow);
            //ROW 7 - MENU MARGINS-------------------------------------------------------
            let menuMarginRow = new PW.FrameBoxRow();
            let menuMarginLabel = new Gtk.Label({
                label: _('Menu Arrow Size'),
                xalign:0,
                hexpand: true,
            });   
            let marginScale = new Gtk.HScale({
                adjustment: new Gtk.Adjustment({
                    lower: 0,upper: 20, step_increment: 1, page_increment: 1, page_size: 0
                }),
                digits: 0,round_digits: 0,hexpand: true,
                value_pos: Gtk.PositionType.RIGHT
            });
            marginScale.connect('format-value', (scale, value) => { return value.toString() + 'px'; });
            marginScale.set_value(this.menuMargin);
            marginScale.connect('value-changed', () => {
                this.menuMargin = marginScale.get_value();
                applyButton.set_sensitive(true);
                if(this.shouldDeselect)
                    this.checkIfPresetMatch();
                resetButton.set_sensitive(true);
            });   
            menuMarginRow.add(menuMarginLabel);
            menuMarginRow.add(marginScale);
            customArcMenuOptionsFrame.add(menuMarginRow);
            //ROW 8 - MENU ARROW SIZE------------------------------------------------------
            let menuArrowRow = new PW.FrameBoxRow();
            let menuArrowLabel = new Gtk.Label({
                label: _('Menu Displacement'),
                xalign:0,
                hexpand: true,
            });   
            let arrowScale = new Gtk.HScale({
                adjustment: new Gtk.Adjustment({
                    lower: 0,upper: 20, step_increment: 1, page_increment: 1, page_size: 0
                }),
                digits: 0,round_digits: 0,hexpand: true,
                value_pos: Gtk.PositionType.RIGHT
            });
            arrowScale.connect('format-value', (scale,value) => { return value.toString() + 'px'; });
            arrowScale.set_value(this.menuArrowSize);
            arrowScale.connect('value-changed', () => {
                this.menuArrowSize = arrowScale.get_value();
                applyButton.set_sensitive(true);
                if(this.shouldDeselect)
                    this.checkIfPresetMatch();
                resetButton.set_sensitive(true);
            });   
            menuArrowRow.add(menuArrowLabel);
            menuArrowRow.add(arrowScale);
            customArcMenuOptionsFrame.add(menuArrowRow);
            let vertSeparatorRow = new PW.FrameBoxRow();
            let vertSeparatorLabel = new Gtk.Label({
                label: _('Enable Vertical Separator'),
                use_markup: true,
                xalign: 0,
                hexpand: true,
                selectable: false
             });   
            let vertSeparatorSwitch = new Gtk.Switch({ halign: Gtk.Align.END});
            vertSeparatorSwitch.set_active(this.verticalSeparator);
            vertSeparatorSwitch.connect('notify::active', (widget) => {
                this.verticalSeparator = widget.get_active();
                if(this.shouldDeselect)
                    this.checkIfPresetMatch();
                applyButton.set_sensitive(true);
                resetButton.set_sensitive(true);
            });
            vertSeparatorRow.add(vertSeparatorLabel);            
            vertSeparatorRow.add(vertSeparatorSwitch);             
            customArcMenuOptionsFrame.add(vertSeparatorRow);
            
            let separatorColorRow = new PW.FrameBoxRow();
            let separatorColorLabel = new Gtk.Label({
                label: _('Separator Color'),
                use_markup: true,
                xalign: 0,
                hexpand: true,
                selectable: false
            });
            let colorChooser = new Gtk.ColorButton({use_alpha:true});     
            color = new Gdk.RGBA();
            color.parse(this.separatorColor);
            colorChooser.set_rgba(color);    
            colorChooser.connect('color-set', ()=>{
                this.separatorColor = colorChooser.get_rgba().to_string();
                applyButton.set_sensitive(true);
                if(this.shouldDeselect)
                    this.checkIfPresetMatch();
                resetButton.set_sensitive(true);
            });
            separatorColorRow.add(separatorColorLabel);            
            separatorColorRow.add(colorChooser);             
            customArcMenuOptionsFrame.add(separatorColorRow);
            // Button Row -------------------------------------------------------
            let buttonRow = new PW.FrameBoxRow();
            let resetButton = new Gtk.Button({
                label: _("Reset")
            });   
            resetButton.set_sensitive( this.checkIfResetButtonSensitive());
            resetButton.connect('clicked', ()=> {
                 this.separatorColor = "rgb(63,62,64)";
                 this.verticalSeparator = false;
                 this.menuColor = "rgba(28, 28, 28, 0.98)";
                 this.menuForegroundColor = "rgba(211, 218, 227, 1)";
                 this.borderColor = "rgb(63,62,64)";
                 this.highlightColor = "rgba(238, 238, 236, 0.1)";
                 this.fontSize = 9;
                 this.borderSize = 0;
                 this.cornerRadius = 0;
                 this.menuMargin = 0;
                 this.menuArrowSize = 0;
                 color.parse(this.menuColor);
                 menuBackgroudColorChooser.set_rgba(color);
 
                 color.parse(this.menuForegroundColor);
                 menuForegroundColorChooser.set_rgba(color); 
 
                 fontScale.set_value(this.fontSize); 
 
                 color.parse(this.borderColor);
                 borderColorChooser.set_rgba(color); 
 
                 borderScale.set_value(this.borderSize);
 
                 color.parse("rgba(238, 238, 236, 0.1)");
                 itemColorChooser.set_rgba(color);
 
                 cornerScale.set_value(this.cornerRadius);
                 marginScale.set_value(this.menuMargin);
                 arrowScale.set_value(this.menuArrowSize);

                 vertSeparatorSwitch.set_active(this.verticalSeparator);
                 color.parse(this.separatorColor);
                 colorChooser.set_rgba(color);    
 
                 resetButton.set_sensitive(false);
                 applyButton.set_sensitive(true);               
            });
 
            
            let applyButton = new Gtk.Button({
                label: _("Apply"),
                hexpand: true
            });
            applyButton.connect('clicked', ()=> {
               this.addResponse = true;
               this.response(-10);
            });
            applyButton.set_halign(Gtk.Align.END);
            applyButton.set_sensitive(false);
            buttonRow.add(resetButton);
            buttonRow.add(applyButton);

            vbox.add(customArcMenuOptionsFrame);
            vbox.add(buttonRow);
            
        }
        get_response(){
            return this.addResponse;
        }
        checkIfPresetMatch(){
            this.presetName="Custom Theme";
            let currentSettingsArray = [this.menuColor, this.menuForegroundColor, this.borderColor, this.highlightColor, this.separatorColor, 
                                        this.fontSize.toString(), this.borderSize.toString(), this.cornerRadius.toString(), this.menuArrowSize.toString(), 
                                        this.menuMargin.toString(), this.verticalSeparator.toString()];
            let all_color_themes = this._settings.get_value('color-themes').deep_unpack();
            for(let i = 0;i < all_color_themes.length;i++){
                this.isEqual=true;
                for(let l = 0; l<currentSettingsArray.length;l++){
                    if(currentSettingsArray[l] !=  all_color_themes[i][l+1]){
                        this.isEqual=false;
                        break; //If not equal then break out of inner loop
                    }
                }
                if(this.isEqual){
                    this.presetName = all_color_themes[i][0];
                    this.updatePresetComboBox = false;
                    this.colorPresetCombo.set_active(i);
                    this.saveButton.set_sensitive(false);
                    this.updatePresetComboBox = true;
                    break; //If equal we found match, break out of loops
                }      
            }
            if(!this.isEqual){
                this.saveButton.set_sensitive(true);
                this.colorPresetCombo.set_active(-1);
            } 
        }
        checkIfResetButtonSensitive(){
            return (this.menuColor != "rgba(28, 28, 28, 0.98)"||
            this.menuForegroundColor != "rgba(211, 218, 227, 1)"||
            this.borderColor != "rgb(63,62,64)"||
            this.highlightColor != "rgba(238, 238, 236, 0.1)"||
            this.fontSize != 9||
            this.borderSize != 0||
            this.cornerRadius != 0||
            this.menuMargin != 0||
            this.menuArrowSize != 0 ||
            this.verticalSeparator != false ||
            this.separatorColor != "rgb(63,62,64)") ? true : false
        }
});
var ConfigureShortcuts = GObject.registerClass(
    class ArcMenu_ConfigureShortcutsDialog extends PW.DialogWindow {
        _init(settings, parent) {
            this._settings = settings;
            this.addResponse = false;
            super._init(_("Configure Shortcuts"), parent);
            this.resize(550,250);
        }
        _createLayout(vbox) {    
            let notebook = new PW.Notebook();

            let defautlDirectoriesPage = new DefaultDirectoriesPage(this._settings);
            notebook.append_page(defautlDirectoriesPage);
    
            let applicationShortcutsPage = new ApplicationShortcutsPage(this._settings);
            notebook.append_page(applicationShortcutsPage);
    
            let sessionButtonsPage = new SessionButtonsPage(this._settings);
            notebook.append_page(sessionButtonsPage);
    
            vbox.add(notebook);
        }
});
var DefaultDirectoriesPage = GObject.registerClass(
    class ArcMenu_DefaultDirectoriesPage extends PW.NotebookPage {
    _init(settings) {
        super._init(_('Directories'));
        this._settings = settings;
        let softwareShortcutsFrame = new PW.FrameBox();
        let softwareShortcutsScrollWindow = new Gtk.ScrolledWindow();
        softwareShortcutsScrollWindow.set_policy(Gtk.PolicyType.AUTOMATIC, Gtk.PolicyType.AUTOMATIC);
        softwareShortcutsScrollWindow.set_max_content_height(300);
        softwareShortcutsScrollWindow.set_min_content_height(300);
        softwareShortcutsScrollWindow.add(softwareShortcutsFrame);
        /*let all_color_themes = this._settings.get_value('color-themes').deep_unpack();
        this._settings.set_value('color-themes',new GLib.Variant('aas',this.color_themes));*/

        let applicationShortcuts = this._settings.get_value('directory-shortcuts-list').deep_unpack();

        this._loadPinnedApps(applicationShortcuts,softwareShortcutsFrame);
        this.add(softwareShortcutsScrollWindow);

        //third row - add more apps to pinned apps list
        let addPinnedAppsFrame = new PW.FrameBox();
        let addPinnedAppsFrameRow = new PW.FrameBoxRow();
        let addPinnedAppsFrameLabel = new Gtk.Label({
            label: _("Add Default User Directories"),
            use_markup: true,
            xalign: 0,
            hexpand: true
        });
        let addPinnedAppsButton = new PW.IconButton({
            circular: false,
            icon_name: 'list-add-symbolic',
            tooltip_text: _("Browse a list of all default User Directories to add to your Directories Shortcuts")
        });
        addPinnedAppsButton.connect('clicked', ()=> {
            let dialog = new AddAppsToPinnedListWindow(this._settings, this, Constants.DIALOG_TYPE.Directories_Shortcuts);
            dialog.show_all();
            dialog.connect('response', ()=> { 
                if(dialog.get_response()) {
                    //checked apps to add to pinned apps list - from dialog 'Add" button click event
                    let newPinnedApps = dialog.get_newPinnedAppsArray();
                    let array=[]; 
                    for(let i = 0;i<newPinnedApps.length;i++){
                        array.push([newPinnedApps[i]._name,newPinnedApps[i]._icon,newPinnedApps[i]._cmd]);
                    }
                    this._loadPinnedApps(array,softwareShortcutsFrame);
                    dialog.destroy();
                    softwareShortcutsFrame.show();
                    this.savePinnedAppsButton.set_sensitive(true);
                }
                else
                    dialog.destroy();
            }); 
        });
        addPinnedAppsFrameRow.add(addPinnedAppsFrameLabel);
        addPinnedAppsFrameRow.add(addPinnedAppsButton);
        addPinnedAppsFrame.add(addPinnedAppsFrameRow);
        this.add(addPinnedAppsFrame);
        
        //fourth row - add custom app to pinned list
        let addCustomAppFrame = new PW.FrameBox();
        let addCustomAppFrameRow = new PW.FrameBoxRow();
        let addCustomAppFrameLabel = new Gtk.Label({
            label: _("Add Custom Shortcut"),
            use_markup: true,
            xalign: 0,
            hexpand: true
        });
        let addCustomAppButton = new PW.IconButton({
            circular: false,
            icon_name: 'list-add-symbolic',
            tooltip_text: _("Create a custom shortcut to add to your Directories Shortcuts")
        });
        addCustomAppButton.connect('clicked', ()=> {
            let dialog = new AddCustomLinkDialogWindow(this._settings, this, Constants.DIALOG_TYPE.Directories_Shortcuts);
            dialog.show_all();
            dialog.connect('response', ()=> { 
                if(dialog.get_response()) {
                    let newPinnedApps = dialog.get_newPinnedAppsArray();
                    this._loadPinnedApps([newPinnedApps],softwareShortcutsFrame);
                    dialog.destroy();
                    softwareShortcutsFrame.show();
                    this.savePinnedAppsButton.set_sensitive(true);
                }
                else
                    dialog.destroy();
            }); 
        });
        addCustomAppFrameRow.add(addCustomAppFrameLabel);
        addCustomAppFrameRow.add(addCustomAppButton);
        addCustomAppFrame.add(addCustomAppFrameRow);
        this.add(addCustomAppFrame);


        let buttonRow = new PW.FrameBoxRow();
        let resetButton = new Gtk.Button({
            label: _("Restore Defaults"),
            tooltip_text: _("Restore the default Directory Shortcuts")
        });   
        resetButton.set_sensitive(true);
        resetButton.connect('clicked', ()=> {
            this.savePinnedAppsButton.set_sensitive(true);
            softwareShortcutsFrame.remove_all_children();
            this._loadPinnedApps(this._settings.get_default_value('directory-shortcuts-list').deep_unpack(), softwareShortcutsFrame);
            softwareShortcutsFrame.show();
        });

        //last row - save settings
        this.savePinnedAppsButton = new Gtk.Button({
            label: _("Save"),
            hexpand: true
        });
        this.savePinnedAppsButton.connect('clicked', ()=> {
            //iterate through each frame row (containing apps to pin) to create an array to save in settings
            let array = [];
            for(let i = 0; i < softwareShortcutsFrame.count; i++) {
                let frame = softwareShortcutsFrame.get_index(i);
                array.push([frame._name,frame._icon, frame._cmd]);
            }
            this._settings.set_value('directory-shortcuts-list', new GLib.Variant('aas', array));
            this.savePinnedAppsButton.set_sensitive(false);
        }); 
        this.savePinnedAppsButton.set_halign(Gtk.Align.END);
        this.savePinnedAppsButton.set_sensitive(false);
        buttonRow.add(resetButton);
        buttonRow.add(this.savePinnedAppsButton);
        this.add(buttonRow);
    }

    _loadPinnedApps(applicationShortcuts,softwareShortcutsFrame){
        for(let i = 0; i < applicationShortcuts.length; i++){
            let applicationName = _(applicationShortcuts[i][0]);
            let editable = true;
            if(applicationShortcuts[i][2].startsWith("ArcMenu_")){
                editable = false;
            }

            let frameRow = new PW.FrameBoxRow();
            frameRow._name = applicationName;
            frameRow._icon = getIconPath(applicationShortcuts[i]);   
       
            frameRow._cmd = applicationShortcuts[i][2];
            let applicationIcon = new Gtk.Image( {
                gicon: Gio.icon_new_for_string(frameRow._icon),
                pixel_size: 22
            });
            let applicationImageBox = new Gtk.VBox({
                margin_left:5,
                expand: false
            });
            applicationImageBox.add(applicationIcon);
            frameRow.add(applicationImageBox);

            let softwareShortcutsLabel = new Gtk.Label({
                label: _(applicationName),
                use_markup: true,
                xalign: 0,
                hexpand: true
            });
            let buttonBox = new Gtk.Grid({
                margin_top:0,
                margin_bottom: 0,
                vexpand: false,
                hexpand: false,
                margin_right: 15,
                column_spacing: 2
            });

            //create the buttons to handle the ordering of pinned apps
            //and delete pinned apps
            let editButton;
            if(editable){
                editButton = new PW.IconButton({
                    circular: false,
                    icon_name: 'emblem-system-symbolic',
                    tooltip_text: _('Modify')
                });
            }

            let upButton = new PW.IconButton({
                circular: false,
                icon_name: 'go-up-symbolic',
                tooltip_text: _('Move Up')
            });
            let downButton = new PW.IconButton({
                circular: false,
                icon_name: 'go-down-symbolic',
                tooltip_text: _('Move Down')
            });
            let deleteButton = new PW.IconButton({
                circular: false,
                icon_name: 'edit-delete-symbolic',
                tooltip_text: _('Delete')
            });
            if(editable){
                editButton.connect('clicked', ()=> {
                    let appArray = [frameRow._name,frameRow._icon,frameRow._cmd];
                    let dialog = new AddCustomLinkDialogWindow(this._settings, this, Constants.DIALOG_TYPE.Directories_Shortcuts, true, appArray);
                    dialog.show_all();
                    dialog.connect('response', ()=> { 
                        if(dialog.get_response()) {
                            let newApplicationShortcut = dialog.get_newPinnedAppsArray();
                            frameRow._name = newApplicationShortcut[0];
                            frameRow._icon = newApplicationShortcut[1];
                            frameRow._cmd = newApplicationShortcut[2];
                            softwareShortcutsLabel.label = _(frameRow._name);
                            applicationIcon.gicon = Gio.icon_new_for_string(frameRow._icon);
                            dialog.destroy();
                            softwareShortcutsFrame.show();
                            this.savePinnedAppsButton.set_sensitive(true);
                        }
                        else
                            dialog.destroy();
                    });  
                });
            }
            
            upButton.connect('clicked', ()=> {
                //find index of frameRow in frame
                //remove and reinsert at new position
                let index = frameRow.get_index();
                if(index!=0) {
                    softwareShortcutsFrame.remove(frameRow);
                    softwareShortcutsFrame.insert(frameRow,index-1);
                }
                softwareShortcutsFrame.show();
                this.savePinnedAppsButton.set_sensitive(true);
            });

            downButton.connect('clicked', ()=> {
                //find index of frameRow in frame
                //remove and reinsert at new position
                let index = frameRow.get_index();
                if(index+1 < softwareShortcutsFrame.count) {
                    softwareShortcutsFrame.remove(frameRow);
                    softwareShortcutsFrame.insert(frameRow,index+1);
                }
                softwareShortcutsFrame.show();
                this.savePinnedAppsButton.set_sensitive(true);
            });

            deleteButton.connect('clicked', ()=> {
                //remove frameRow
                softwareShortcutsFrame.remove(frameRow);
                softwareShortcutsFrame.show();
                this.savePinnedAppsButton.set_sensitive(true);
            });
            //add everything to frame
            if(editable)
                buttonBox.add(editButton);
            buttonBox.add(upButton);
            buttonBox.add(downButton);
            buttonBox.add(deleteButton);
            
            frameRow.add(softwareShortcutsLabel);
            frameRow.add(buttonBox);
            softwareShortcutsFrame.add(frameRow);
        }
    }
});
var ApplicationShortcutsPage = GObject.registerClass(
    class ArcMenu_ApplicationShortcutsPage extends PW.NotebookPage {
    _init(settings) {
        super._init(_('Applications'));
        this._settings = settings;
        let softwareShortcutsFrame = new PW.FrameBox();
        let softwareShortcutsScrollWindow = new Gtk.ScrolledWindow();
        softwareShortcutsScrollWindow.set_policy(Gtk.PolicyType.AUTOMATIC, Gtk.PolicyType.AUTOMATIC);
        softwareShortcutsScrollWindow.set_max_content_height(300);
        softwareShortcutsScrollWindow.set_min_content_height(300);
        softwareShortcutsScrollWindow.add(softwareShortcutsFrame);
        /*let all_color_themes = this._settings.get_value('color-themes').deep_unpack();
        this._settings.set_value('color-themes',new GLib.Variant('aas',this.color_themes));*/

        let applicationShortcuts = this._settings.get_value('application-shortcuts-list').deep_unpack();

        this._loadPinnedApps(applicationShortcuts,softwareShortcutsFrame);
        this.add(softwareShortcutsScrollWindow);

        //third row - add more apps to pinned apps list
        let addPinnedAppsFrame = new PW.FrameBox();
        let addPinnedAppsFrameRow = new PW.FrameBoxRow();
        let addPinnedAppsFrameLabel = new Gtk.Label({
            label: _("Add More Apps"),
            use_markup: true,
            xalign: 0,
            hexpand: true
        });
        let addPinnedAppsButton = new PW.IconButton({
            circular: false,
            icon_name: 'list-add-symbolic',
            tooltip_text: _("Browse a list of all applications to add to your Application Shortcuts")
        });
        addPinnedAppsButton.connect('clicked', ()=> {
            let dialog = new AddAppsToPinnedListWindow(this._settings, this, Constants.DIALOG_TYPE.Application_Shortcuts);
            dialog.show_all();
            dialog.connect('response', ()=> { 
                if(dialog.get_response()) {
                    //checked apps to add to pinned apps list - from dialog 'Add" button click event
                    let newPinnedApps = dialog.get_newPinnedAppsArray();
                    let array=[]; 
                    for(let i = 0;i<newPinnedApps.length;i++){
                        array.push([newPinnedApps[i]._name,newPinnedApps[i]._icon,newPinnedApps[i]._cmd]);
                    }
                    this._loadPinnedApps(array,softwareShortcutsFrame);
                    dialog.destroy();
                    softwareShortcutsFrame.show();
                    this.savePinnedAppsButton.set_sensitive(true);
                }
                else
                    dialog.destroy();
            }); 
        });
        addPinnedAppsFrameRow.add(addPinnedAppsFrameLabel);
        addPinnedAppsFrameRow.add(addPinnedAppsButton);
        addPinnedAppsFrame.add(addPinnedAppsFrameRow);
        this.add(addPinnedAppsFrame);
        
        //fourth row - add custom app to pinned list
        let addCustomAppFrame = new PW.FrameBox();
        let addCustomAppFrameRow = new PW.FrameBoxRow();
        let addCustomAppFrameLabel = new Gtk.Label({
            label: _("Add Custom Shortcut"),
            use_markup: true,
            xalign: 0,
            hexpand: true
        });
        let addCustomAppButton = new PW.IconButton({
            circular: false,
            icon_name: 'list-add-symbolic',
            tooltip_text: _("Create a custom shortcut to add to your Application Shortcuts")
        });
        addCustomAppButton.connect('clicked', ()=> {
            let dialog = new AddCustomLinkDialogWindow(this._settings, this, Constants.DIALOG_TYPE.Application_Shortcuts);
            dialog.show_all();
            dialog.connect('response', ()=> { 
                if(dialog.get_response()) {
                    let newPinnedApps = dialog.get_newPinnedAppsArray();
                    this._loadPinnedApps([newPinnedApps],softwareShortcutsFrame);
                    dialog.destroy();
                    softwareShortcutsFrame.show();
                    this.savePinnedAppsButton.set_sensitive(true);
                }
                else
                    dialog.destroy();
            }); 
        });
        addCustomAppFrameRow.add(addCustomAppFrameLabel);
        addCustomAppFrameRow.add(addCustomAppButton);
        addCustomAppFrame.add(addCustomAppFrameRow);
        this.add(addCustomAppFrame);

        let buttonRow = new PW.FrameBoxRow();
        let resetButton = new Gtk.Button({
            label: _("Restore Defaults"),
            tooltip_text: _("Restore the default Application Shortcuts")
        });   
        resetButton.set_sensitive(true);
        resetButton.connect('clicked', ()=> {
            this.savePinnedAppsButton.set_sensitive(true);
            softwareShortcutsFrame.remove_all_children();
            this._loadPinnedApps(this._settings.get_default_value('application-shortcuts-list').deep_unpack(), softwareShortcutsFrame);
            softwareShortcutsFrame.show();
        });

        //last row - save settings
        this.savePinnedAppsButton = new Gtk.Button({
            label: _("Save"),
            hexpand: true
        });
        this.savePinnedAppsButton.connect('clicked', ()=> {
            //iterate through each frame row (containing apps to pin) to create an array to save in settings
            let array = [];
            for(let i = 0; i < softwareShortcutsFrame.count; i++) {
                let frame = softwareShortcutsFrame.get_index(i);
                array.push([frame._name,frame._icon, frame._cmd]);
            }
            this._settings.set_value('application-shortcuts-list', new GLib.Variant('aas', array));
            this.savePinnedAppsButton.set_sensitive(false);
        }); 
        this.savePinnedAppsButton.set_halign(Gtk.Align.END);
        this.savePinnedAppsButton.set_sensitive(false);
        buttonRow.add(resetButton);
        buttonRow.add(this.savePinnedAppsButton);
        this.add(buttonRow);
    }

    _loadPinnedApps(applicationShortcuts,softwareShortcutsFrame){
        for(let i = 0; i < applicationShortcuts.length; i++){
            let applicationName = applicationShortcuts[i][0];

            let frameRow = new PW.FrameBoxRow();
            frameRow._name = applicationShortcuts[i][0];
            frameRow._icon = applicationShortcuts[i][1];
            frameRow._cmd = applicationShortcuts[i][2];
            if(frameRow._cmd == "ArcMenu_Software" && GLib.find_program_in_path('io.elementary.appcenter')){
                frameRow._icon = 'pop-shop';
            }
            let applicationIcon = new Gtk.Image( {
                gicon: Gio.icon_new_for_string(frameRow._icon),
                pixel_size: 22
            });
            let applicationImageBox = new Gtk.VBox({
                margin_left:5,
                expand: false
            });
            applicationImageBox.add(applicationIcon);
            frameRow.add(applicationImageBox);

            let softwareShortcutsLabel = new Gtk.Label({
                label: _(applicationName),
                use_markup: true,
                xalign: 0,
                hexpand: true
            });
            let buttonBox = new Gtk.Grid({
                margin_top:0,
                margin_bottom: 0,
                vexpand: false,
                hexpand: false,
                margin_right: 15,
                column_spacing: 2
            });

            //create the buttons to handle the ordering of pinned apps
            //and delete pinned apps
            let editButton = new PW.IconButton({
                circular: false,
                icon_name: 'emblem-system-symbolic',
                tooltip_text: _('Modify')
            });
            let upButton = new PW.IconButton({
                circular: false,
                icon_name: 'go-up-symbolic',
                tooltip_text: _('Move Up')
            });
            let downButton = new PW.IconButton({
                circular: false,
                icon_name: 'go-down-symbolic',
                tooltip_text: _('Move Down')
            });
            let deleteButton = new PW.IconButton({
                circular: false,
                icon_name: 'edit-delete-symbolic',
                tooltip_text: _('Delete')
            });
            editButton.connect('clicked', ()=> {
                let appArray = [frameRow._name,frameRow._icon,frameRow._cmd];
                let dialog = new AddCustomLinkDialogWindow(this._settings, this, Constants.DIALOG_TYPE.Application_Shortcuts, true, appArray);
                dialog.show_all();
                dialog.connect('response', ()=> { 
                    if(dialog.get_response()) {
                        let newApplicationShortcut = dialog.get_newPinnedAppsArray();
                        frameRow._name = newApplicationShortcut[0];
                        frameRow._icon = newApplicationShortcut[1];
                        frameRow._cmd = newApplicationShortcut[2];
                        softwareShortcutsLabel.label = _(frameRow._name);
                        applicationIcon.gicon = Gio.icon_new_for_string(frameRow._icon);
                        dialog.destroy();
                        softwareShortcutsFrame.show();
                        this.savePinnedAppsButton.set_sensitive(true);
                    }
                    else
                        dialog.destroy();
                });  
            });
            upButton.connect('clicked', ()=> {
                //find index of frameRow in frame
                //remove and reinsert at new position
                let index = frameRow.get_index();
                if(index!=0) {
                    softwareShortcutsFrame.remove(frameRow);
                    softwareShortcutsFrame.insert(frameRow,index-1);
                }
                softwareShortcutsFrame.show();
                this.savePinnedAppsButton.set_sensitive(true);
            });

            downButton.connect('clicked', ()=> {
                //find index of frameRow in frame
                //remove and reinsert at new position
                let index = frameRow.get_index();
                if(index+1 < softwareShortcutsFrame.count) {
                    softwareShortcutsFrame.remove(frameRow);
                    softwareShortcutsFrame.insert(frameRow,index+1);
                }
                softwareShortcutsFrame.show();
                this.savePinnedAppsButton.set_sensitive(true);
            });

            deleteButton.connect('clicked', ()=> {
                //remove frameRow
                softwareShortcutsFrame.remove(frameRow);
                softwareShortcutsFrame.show();
                this.savePinnedAppsButton.set_sensitive(true);
            });
            //add everything to frame
            buttonBox.add(editButton);
            buttonBox.add(upButton);
            buttonBox.add(downButton);
            buttonBox.add(deleteButton);
            
            frameRow.add(softwareShortcutsLabel);
            frameRow.add(buttonBox);
            softwareShortcutsFrame.add(frameRow);
        }
    }
});
var SessionButtonsPage = GObject.registerClass(
    class ArcMenu_SessionButtonsPage extends PW.NotebookPage {
    _init(settings) {
        super._init(_('Session Buttons'));
        this._settings = settings;
        //SUSPEND BUTTON
        let sessionButtonsFrame = new PW.FrameBox();
        let sessionButtonsScrollWindow = new Gtk.ScrolledWindow();
        sessionButtonsScrollWindow.set_policy(Gtk.PolicyType.AUTOMATIC, Gtk.PolicyType.AUTOMATIC);
        sessionButtonsScrollWindow.set_max_content_height(300);
        sessionButtonsScrollWindow.set_min_content_height(300);
        sessionButtonsScrollWindow.add(sessionButtonsFrame);
        let suspendRow = new PW.FrameBoxRow();
        let suspendLabel = new Gtk.Label({
            label: _("Suspend"),
            use_markup: true,
            xalign: 0,
            hexpand: true
        });
        let suspendButton = new Gtk.Switch();
        if(this._settings.get_boolean('show-suspend-button'))
            suspendButton.set_active(true);
        suspendButton.connect('notify::active', (widget) => {
            this._settings.set_boolean('show-suspend-button', widget.get_active());
        });
        suspendRow.add(suspendLabel);
        suspendRow.add(suspendButton);
        
        //LOCK BUTTON
        let lockRow = new PW.FrameBoxRow();
        let lockLabel = new Gtk.Label({
            label: _("Lock"),
            use_markup: true,
            xalign: 0,
            hexpand: true
        });
        let lockButton = new Gtk.Switch();
        if(this._settings.get_boolean('show-lock-button'))
            lockButton.set_active(true);
        lockButton.connect('notify::active', (widget) => {
            this._settings.set_boolean('show-lock-button', widget.get_active());
        });
        lockRow.add(lockLabel);
        lockRow.add(lockButton);
        
        //LOG OUT BUTTON
        let logOffRow = new PW.FrameBoxRow();
        let logOffLabel = new Gtk.Label({
            label: _("Log Out"),
            use_markup: true,
            xalign: 0,
            hexpand: true
        });
        let logOffButton = new Gtk.Switch();
        if(this._settings.get_boolean('show-logout-button'))
            logOffButton.set_active(true);
        logOffButton.connect('notify::active', (widget) => {
            this._settings.set_boolean('show-logout-button', widget.get_active());
        });   
        logOffRow.add(logOffLabel);
        logOffRow.add(logOffButton);

        //POWER BUTTON
        let powerRow = new PW.FrameBoxRow();
        let powerLabel = new Gtk.Label({
            label: _("Power Off"),
            use_markup: true,
            xalign: 0,
            hexpand: true
        });
        let powerButton = new Gtk.Switch();
        if(this._settings.get_boolean('show-power-button'))
            powerButton.set_active(true);
        powerButton.connect('notify::active', (widget) => {
            this._settings.set_boolean('show-power-button', widget.get_active());
        });   
        powerRow.add(powerLabel);
        powerRow.add(powerButton);

        //ADD TO FRAME
        sessionButtonsFrame.add(suspendRow);
        sessionButtonsFrame.add(logOffRow);
        sessionButtonsFrame.add(lockRow);
        sessionButtonsFrame.add(powerRow);
        this.add(sessionButtonsScrollWindow);
    }
});
var ShortcutsPage = GObject.registerClass(
    class ArcMenu_ShortcutsPage extends PW.NotebookPage {
    _init(settings) {
        super._init(_('Shortcuts'));
        this._settings = settings;
        let configureShortcutsFrame = new PW.FrameBox();
        let configureShortcutsRow = new PW.FrameBoxRow();
        let configureShortcutsLabel = new Gtk.Label({
            label: _("Configure Shortcuts"),
            use_markup: true,
            xalign: 0,
            hexpand: true
        });
        let configureShortcutsSwitch = new Gtk.Switch({tooltip_text:_("Add, Remove, or Modify Arc Menu shortcuts")});
        
        let configureShortcutsButton = new PW.IconButton({
            circular: true,
            icon_name: 'emblem-system-symbolic',
            tooltip_text:_("Add, Remove, or Modify Arc Menu shortcuts")
        });
        configureShortcutsSwitch.connect('notify::active', (widget) => {
            configureShortcutsButton.set_sensitive(widget.get_active());
            this._settings.set_boolean('enable-custom-shortcuts',widget.get_active());
        });
        configureShortcutsSwitch.set_active(this._settings.get_boolean('enable-custom-shortcuts'));
        configureShortcutsButton.set_sensitive(configureShortcutsSwitch.get_active());
        configureShortcutsButton.connect('clicked', () => {
            let dialog = new ConfigureShortcuts(this._settings, this);
            dialog.show_all();
            dialog.connect('response', (response) => { 
                if(dialog.get_response()) {
               
                }
                else
                    dialog.destroy();
            }); 
        });
        configureShortcutsRow.add(configureShortcutsLabel);
        configureShortcutsRow.add(configureShortcutsButton);
        configureShortcutsRow.add(configureShortcutsSwitch);
        configureShortcutsFrame.add(configureShortcutsRow);

        this.add(configureShortcutsFrame);
        
        //EXTERNAL DEVICES/BOOKMARKS--------------------------------------------------------------
        let placesFrame = new PW.FrameBox();
        let externalDeviceRow = new PW.FrameBoxRow();
        let externalDeviceLabel = new Gtk.Label({
            label: _("External Devices"),
            use_markup: true,
            xalign: 0,
            hexpand: true
        });
        
        let externalDeviceButton = new Gtk.Switch({tooltip_text:_("Show all connected external devices in Arc Menu")});
        if(this._settings.get_boolean('show-external-devices'))
            externalDeviceButton.set_active(true);
        externalDeviceButton.connect('notify::active', (widget) => {
            this._settings.set_boolean('show-external-devices', widget.get_active());
        });   
        externalDeviceRow.add(externalDeviceLabel);
        externalDeviceRow.add(externalDeviceButton);

        //ADD TO FRAME
        placesFrame.add(externalDeviceRow);
        this.add(placesFrame);
        
        //BOOKMARKS LIST       
        let bookmarksRow = new PW.FrameBoxRow();
        let bookmarksLabel = new Gtk.Label({
            label: _("Bookmarks"),
            use_markup: true,
            xalign: 0,
            hexpand: true
        });
        
        let bookmarksButton = new Gtk.Switch({tooltip_text:_("Show all Nautilus bookmarks in Arc Menu")});
        if(this._settings.get_boolean('show-bookmarks'))
            bookmarksButton.set_active(true);
        bookmarksButton.connect('notify::active', (widget) => {
            this._settings.set_boolean('show-bookmarks', widget.get_active());
        });   
        bookmarksRow.add(bookmarksLabel);
        bookmarksRow.add(bookmarksButton);

        //ADD TO FRAME
        placesFrame.add(bookmarksRow);    
    }
});

// Misc Page
var MiscPage = GObject.registerClass(
    class ArcMenu_MiscPage extends PW.NotebookPage {
        _init(settings) {
            super._init(_('Misc'));
            this._settings = settings;

            let importFrame = new PW.FrameBox();
            let importRow = new PW.FrameBoxRow();
            let importLabel = new Gtk.Label({
                label: _("Export and Import Arc Menu Settings"),
                use_markup: true,
                xalign: 0,
                hexpand: true
            });
            let importTextRow = new PW.FrameBoxRow();
            let importTextLabel = new Gtk.Label({
                label: _("Importing settings from file may replace ALL saved settings.\nThis includes all saved pinned apps."),
                use_markup: true,
                xalign: 0,
                hexpand: true
            }); 
            importTextLabel.set_sensitive(false);
            importTextRow.add(importTextLabel);
            let importButtonsRow = new PW.FrameBoxRow();
            let importButton = new Gtk.Button({
                label: _("Import from File"),
                xalign:.5,
                expand:true,
                tooltip_text: _("Import Arc Menu settings from a file")  
            });
            importButton.connect('clicked', ()=> {
                this._showFileChooser(
                    _('Import settings'),
                    { action: Gtk.FileChooserAction.OPEN },
                    Gtk.STOCK_OPEN,
                    filename => {
                        let settingsFile = Gio.File.new_for_path(filename);
                        let [ , pid, stdin, stdout, stderr] = 
                            GLib.spawn_async_with_pipes(
                                null,
                                ['dconf', 'load', SCHEMA_PATH],
                                null,
                                GLib.SpawnFlags.SEARCH_PATH | GLib.SpawnFlags.DO_NOT_REAP_CHILD,
                                null
                            );
            
                        stdin = new Gio.UnixOutputStream({ fd: stdin, close_fd: true });
                        GLib.close(stdout);
                        GLib.close(stderr);
                                            
                        let [ , , , retCode] = GLib.spawn_command_line_sync(GSET + ' -d ' + Me.uuid);
                                            
                        if (retCode == 0) {
                            GLib.child_watch_add(GLib.PRIORITY_DEFAULT, pid, () => GLib.spawn_command_line_sync(GSET + ' -e ' + Me.uuid));
                        }
    
                        stdin.splice(settingsFile.read(null), Gio.OutputStreamSpliceFlags.CLOSE_SOURCE | Gio.OutputStreamSpliceFlags.CLOSE_TARGET, null);
                    }
                );
            });
            let exportButton = new Gtk.Button({
                label: _("Export to File"),
                xalign:.5,
                expand:true,
                tooltip_text: _("Export and save all your Arc Menu settings to a file")  
            });
            exportButton.connect('clicked', ()=> {
                
                this._showFileChooser(
                    _('Export settings'),
                    { action: Gtk.FileChooserAction.SAVE,
                      do_overwrite_confirmation: true },
                    Gtk.STOCK_SAVE,
                    filename => {
                        let file = Gio.file_new_for_path(filename);
                        let raw = file.replace(null, false, Gio.FileCreateFlags.NONE, null);
                        let out = Gio.BufferedOutputStream.new_sized(raw, 4096);
    
                        out.write_all(GLib.spawn_command_line_sync('dconf dump ' + SCHEMA_PATH)[1], null);
                        out.close(null);
                    }
                );

            
            });
       
            
            importRow.add(importLabel);
            importButtonsRow.add(exportButton);
            importButtonsRow.add(importButton);
            importFrame.add(importRow);     
            importFrame.add(importTextRow);
            importFrame.add(importButtonsRow);




            let importColorPresetFrame = new PW.FrameBox();
            let importColorPresetRow = new PW.FrameBoxRow();
            let importColorPresetLabel = new Gtk.Label({
                label: _("Color Theme Presets - Export/Import"),
                use_markup: true,
                xalign: 0,
                hexpand: true
            });
            let imgPath = Me.path + Constants.COLOR_PRESET.Path;
            let [imageWidth, imageHeight] = Constants.COLOR_PRESET.Size;
            let pixbuf = GdkPixbuf.Pixbuf.new_from_file_at_size(imgPath, imageWidth, imageHeight);
            let colorPresetImage = new Gtk.Image({ pixbuf: pixbuf });
            let colorPresetBox = new Gtk.VBox({
                margin_top: 5,
                margin_bottom: 0,
                expand: false
            });
            colorPresetBox.add(colorPresetImage);
            

            let importColorPresetTextRow = new PW.FrameBoxRow();
            let importColorPresetTextLabel = new Gtk.Label({
                label: _("Imported theme presets are located on the Appearance Tab\nin Override Arc Menu Theme"),
                use_markup: true,
                xalign: 0,
                hexpand: true
            }); 
            importColorPresetTextLabel.set_sensitive(false);
            importColorPresetTextRow.add(importColorPresetTextLabel);
           

            let importColorPresetButtonsRow = new PW.FrameBoxRow();
            let importColorPresetButton = new Gtk.Button({
                label: _("Import Theme Preset"),
                xalign:.5,
                expand:true,
                tooltip_text: _("Import Arc Menu Theme Presets from a file")  
            });
            importColorPresetButton.connect('clicked', ()=> {
                this._showFileChooser(
                    _('Import Theme Preset'),
                    { action: Gtk.FileChooserAction.OPEN },
                    Gtk.STOCK_OPEN,
                    filename => {
                        let settingsFile = Gio.File.new_for_path(filename);
                        let [ success, content, etags] = settingsFile.load_contents(null);
                        let string = content.toString();
                        let themes = string.split("\n")
                        themes.pop(); //remove last blank array 
                        this.color_themes = [];
                        for(let i = 0; i < themes.length; i++){
                            let array = themes[i].split('//')
                            array.pop();
                            this.color_themes.push(array);
                        }
                        let dialog = new ExportColorThemeDialogWindow(this._settings, this, this.color_themes);
                        dialog.show_all();
                        dialog.connect('response', (response) => { 
                            if(dialog.get_response()){
                                let selectedThemes = dialog.selectedThemes;
                                this.color_themes = this._settings.get_value('color-themes').deep_unpack();
                                for(let i = 0; i < selectedThemes.length; i++){
                                    this.color_themes.push(selectedThemes[i]);
                                }
                                
                                this._settings.set_value('color-themes',new GLib.Variant('aas',this.color_themes));
                        
                                dialog.destroy();
                            }
                            else
                                dialog.destroy();
                        }); 
                        
                    }
                );
            });
            let exportColorPresetButton = new Gtk.Button({
                label: _("Export Theme Preset"),
                xalign:.5,
                expand:true,
                tooltip_text: _("Export and save your Arc Menu Theme Presets to a file")  
            });
            exportColorPresetButton.connect('clicked', ()=> {
                let dialog = new ExportColorThemeDialogWindow(this._settings, this);
                dialog.show_all();
                dialog.connect('response', (response) => { 
                    if(dialog.get_response()){
                       this.selectedThemes = dialog.selectedThemes;
                       this._showFileChooser(
                            _('Export Theme Preset'),
                                { action: Gtk.FileChooserAction.SAVE,
                                    do_overwrite_confirmation: true },
                                    Gtk.STOCK_SAVE,
                                    filename => {
                                        let file = Gio.file_new_for_path(filename);
                                        let raw = file.replace(null, false, Gio.FileCreateFlags.NONE, null);
                                        let out = Gio.BufferedOutputStream.new_sized(raw, 4096);
                                        for(let i = 0; i<this.selectedThemes.length; i++){
                                            for(let x = 0; x<this.selectedThemes[i].length;x++){
                                                out.write_all((this.selectedThemes[i][x]).toString()+"//", null);
                                            }
                                            out.write_all("\n", null);
                                        }
                                        
                                        out.close(null);
                                    }
                        );
                        dialog.destroy();
                    }
                    else
                        dialog.destroy();
                }); 
            });

            importColorPresetRow.add(importColorPresetLabel);
            importColorPresetRow.add(colorPresetBox);
            importColorPresetButtonsRow.add(exportColorPresetButton);
            importColorPresetButtonsRow.add(importColorPresetButton);
            importColorPresetFrame.add(importColorPresetRow);   
            importColorPresetFrame.add(importColorPresetTextRow);
            importColorPresetFrame.add(importColorPresetButtonsRow);

            this.add(importFrame);
            this.add(importColorPresetFrame);
        }
        _showFileChooser(title, params, acceptBtn, acceptHandler) {
            let dialog = new Gtk.FileChooserDialog(mergeObjects({ title: title, transient_for: this.get_toplevel() }, params));
    
            dialog.add_button(Gtk.STOCK_CANCEL, Gtk.ResponseType.CANCEL);
            dialog.add_button(acceptBtn, Gtk.ResponseType.ACCEPT);
    
            if (dialog.run() == Gtk.ResponseType.ACCEPT) {
                try {
                    acceptHandler(dialog.get_filename());
                } catch(e) {
                    log('error from arc-menu filechooser: ' + e);
                }
            }
            dialog.destroy();
        }
    });
    function mergeObjects(main, bck) {
        for (var prop in bck) {
            if (!main.hasOwnProperty(prop) && bck.hasOwnProperty(prop)) {
                main[prop] = bck[prop];
            }
        }
        return main;
    };

// About Page
var AboutPage = GObject.registerClass(
    class ArcMenu_AboutPage extends PW.NotebookPage {
        _init(settings) {
            super._init(_('About'));
            this._settings = settings;

            // Use meta information from metadata.json
            let releaseVersion;
            if(Me.metadata.version){
                releaseVersion = Me.metadata.version == "-1" ? Constants.VERSION + "-" + _("Development") : Me.metadata.version;
            }
            else
                releaseVersion = 'unknown';
            let projectUrl = Me.metadata.url;

            // Create GUI elements
            // Create the image box
            let logoPath = Me.path + Constants.ARC_MENU_LOGO.Path;
            let [imageWidth, imageHeight] = Constants.ARC_MENU_LOGO.Size;
            let pixbuf = GdkPixbuf.Pixbuf.new_from_file_at_size(logoPath, imageWidth, imageHeight);
            let arcMenuImage = new Gtk.Image({ pixbuf: pixbuf });
            let arcMenuImageBox = new Gtk.VBox({
                margin_top: 5,
                margin_bottom: 0,
                expand: false
            });
            arcMenuImageBox.add(arcMenuImage);

            // Create the info box
            let arcMenuInfoBox = new Gtk.VBox({
                margin_top: 0,
                margin_bottom: 5,
                expand: false
            });
            let arcMenuLabel = new Gtk.Label({
                label: '<b>' + _('Arc Menu') + '</b>',
                use_markup: true,
                expand: false
            });
            let versionLabel = new Gtk.Label({
                label: _('Version: ') + releaseVersion,
                expand: false
            });
            let projectDescriptionLabel = new Gtk.Label({
                label: _('A Traditional Application Menu for GNOME'),
                expand: false
            });
            let projectLinkButton = new Gtk.LinkButton({
                label: _('GitLab Page'),
                uri: projectUrl,
                expand: false
            });
            this.creditsScrollWindow = new Gtk.ScrolledWindow();
            this.creditsScrollWindow.set_policy(Gtk.PolicyType.AUTOMATIC, Gtk.PolicyType.AUTOMATIC);
            this.creditsScrollWindow.set_max_content_height(150);
            this.creditsScrollWindow.set_min_content_height(150);
            this.creditsFrame = new Gtk.Frame();
            this.creditsFrame.set_shadow_type(Gtk.ShadowType.NONE);
            this.creditsScrollWindow.add_with_viewport(this.creditsFrame);
  	        let creditsLabel = new Gtk.Label({
		        label: _(Constants.CREDITS),
		        use_markup: true,
		        justify: Gtk.Justification.CENTER,
		        expand: false
            });
            this.creditsFrame.add(creditsLabel);
            
            arcMenuInfoBox.add(arcMenuLabel);
            arcMenuInfoBox.add(versionLabel);
            arcMenuInfoBox.add(projectDescriptionLabel);
            arcMenuInfoBox.add(projectLinkButton);
            arcMenuInfoBox.add(this.creditsScrollWindow);

            // Create the GNU software box
            let gnuSofwareLabel = new Gtk.Label({
                label: _(Constants.GNU_SOFTWARE),
                use_markup: true,
                justify: Gtk.Justification.CENTER,
                expand: true
            });
            let gnuSofwareLabelBox = new Gtk.Box({
                orientation: Gtk.Orientation.VERTICAL
            });
            gnuSofwareLabelBox.add(gnuSofwareLabel);

            this.add(arcMenuImageBox);
            this.add(arcMenuInfoBox);
            this.add(gnuSofwareLabelBox);
        }
    });



// Arc Menu Preferences Widget
var ArcMenuPreferencesWidget = GObject.registerClass(
class ArcMenu_ArcMenuPreferencesWidget extends Gtk.Box{
    _init() {
        super._init({
            orientation: Gtk.Orientation.VERTICAL,
            spacing: 5,
            border_width: 5
        });
        this._settings = Convenience.getSettings(Me.metadata['settings-schema']);
        
        let notebook = new PW.Notebook();
        notebook.connect('switch-page', (notebook, tab, index)=>{
            if(index==3){
                pinnedAppsPage.frame._listBox.foreach ((element) => pinnedAppsPage.frame.remove(element));
                pinnedAppsPage._loadPinnedApps(this._settings.get_strv('pinned-app-list'));
                pinnedAppsPage.frame.show();
            }
        });
        let generalPage = new GeneralPage(this._settings);
        notebook.append_page(generalPage);

        let appearancePage = new AppearancePage(this._settings);
        notebook.append_page(appearancePage);

        let shortcutsPage = new ShortcutsPage(this._settings);
        notebook.append_page(shortcutsPage);
        
        let pinnedAppsPage = new PinnedAppsPage(this._settings);
        notebook.append_page(pinnedAppsPage);
   
        let miscPage = new MiscPage(this._settings);
        notebook.append_page(miscPage);

        let aboutPage = new AboutPage(this._settings);
        notebook.append_page(aboutPage);

        this.add(notebook);
    }
});

// Initialize menu language translations
function init() {
    Convenience.initTranslations(Me.metadata['gettext-domain']);
}

function buildPrefsWidget() {
    let widget = new ArcMenuPreferencesWidget();
    widget.show_all();
    return widget;
}
function getIconPath(listing){
    let path, icon;
        
    if(listing[2]=="ArcMenu_Home")
        path = GLib.get_home_dir();
    else if(listing[2].startsWith("ArcMenu_")){
        let string = listing[2];
        path = string.replace("ArcMenu_",'');
        if(path === "Documents")
            path = GLib.get_user_special_dir(GLib.UserDirectory.DIRECTORY_DOCUMENTS);
        else if(path === "Downloads")
            path = GLib.get_user_special_dir(GLib.UserDirectory.DIRECTORY_DOWNLOAD);
        else if(path === "Music")
            path = GLib.get_user_special_dir(GLib.UserDirectory.DIRECTORY_MUSIC);
        else if(path === "Pictures")
            path = GLib.get_user_special_dir(GLib.UserDirectory.DIRECTORY_PICTURES);
        else if(path === "Videos")
            path = GLib.get_user_special_dir(GLib.UserDirectory.DIRECTORY_VIDEOS);
        else
            path = null;
    }
    else if(listing[1] == listing[2])
        path = listing[2];
    else if(listing[1] == "ArcMenu_Folder"){
        path = listing[2];
    }
    else
        path = null;

    if(path){
        let file = Gio.File.new_for_path(path);
        try {
            let info = file.query_info('standard::symbolic-icon', 0, null);
            icon = info.get_symbolic_icon();
        } catch (e) {
            if (e instanceof Gio.IOErrorEnum) {
                if (!file.is_native()) {
                    icon = new Gio.ThemedIcon({ name: 'folder-remote-symbolic' });
                } else {
                    icon = new Gio.ThemedIcon({ name: 'folder-symbolic' });
                }
            }
        }                            
        return icon.to_string();
    }
    else{
        if(listing[2]=="ArcMenu_Network")
            return  'network-workgroup-symbolic';
        else if(listing[2]=="ArcMenu_Computer")
            return  'drive-harddisk-symbolic';
        else
            return listing[1];
    }
}

function lighten_rgb(colorString, percent, modifyAlpha){ // implemented from https://stackoverflow.com/a/141943
	//creates a nice effect when items are selected
	if(colorString.includes('rgba'))
		colorString = colorString.replace('rgba(','');
	if(colorString.includes('rgb'))
		colorString = colorString.replace('rgb(','');
	colorString = colorString.replace(')','');
    let rgbaColor = colorString.split(",");

    let r = parseFloat(rgbaColor[0]) + 255 * percent;
    let g = parseFloat(rgbaColor[1]) + 255 * percent;
    let b = parseFloat(rgbaColor[2]) + 255 * percent;
	let a;
	if(rgbaColor[3] != undefined)
		a = parseFloat(rgbaColor[3]); 
	else
        a =1;
    if(modifyAlpha)
        a=0.4;
	let m = Math.max(r,g,b);
	let threshold = 255.9999;
	r = Math.round(r);
	g = Math.round(g);
    b = Math.round(b);
    if(r<0) r=0;
    if(g<0) g=0;
    if(b<0) b=0;
	if(m<=threshold){
		return "rgba("+r+","+g+","+b+","+a+")";
	}
	let total = r + g + b;
	if(total >= 3 * threshold){
		return "rgba(255,255,255,"+a+")";
	}
	let x = (3 * threshold - total) / (3 * m - total);
	let gray = threshold - x * m;
	r = gray + x * r;
	g = gray + x * g;
	b = gray + x * b;
	r = Math.round(r);
	g = Math.round(g);
	b = Math.round(b);
	return "rgba("+r+","+g+","+b+","+a+")";
};
function saveCSS(settings){
    this._settings= settings;
    let customArcMenu = this._settings.get_boolean('enable-custom-arc-menu');
    let separatorColor = this._settings.get_string('separator-color');
    let menuColor = this._settings.get_string('menu-color');
    let menuForegroundColor = this._settings.get_string('menu-foreground-color');
    let borderColor = this._settings.get_string('border-color');
    let highlightColor = this._settings.get_string('highlight-color');
    let fontSize = this._settings.get_int('menu-font-size');
    let borderSize = this._settings.get_int('menu-border-size');
    let cornerRadius = this._settings.get_int('menu-corner-radius');
    let menuMargin = this._settings.get_int('menu-margin');
    let menuArrowSize = this._settings.get_int('menu-arrow-size');
    let menuWidth = this._settings.get_int('menu-width');
    let avatarStyle =  this._settings.get_enum('avatar-style');
    let avatarRadius = avatarStyle == 0 ? 999 : 0;
    let menuButtonColor = this._settings.get_string('menu-button-color');
    let menuButtonActiveColor =  this._settings.get_string('menu-button-active-color');
    let gapAdjustment = this._settings.get_int('gap-adjustment');
    let tooltipForegroundColor = customArcMenu ? "\n color:"+  menuForegroundColor+";\n" : "";
    let tooltipBackgroundColor = customArcMenu ? "\n background-color:"+lighten_rgb(menuColor,0.05)+";\n" : "";
        
    let tooltipStyle = customArcMenu ?   
        ("#tooltip-menu-item{border-color:"+  borderColor+ ";\n border: 1px;\nfont-size:"+fontSize+"pt;\n padding: 2px 5px;\n min-height: 0px;"
        + tooltipForegroundColor + tooltipBackgroundColor+"\nmax-width:550px;\n}") 
        : ("#tooltip-menu-item{\n padding: 2px 5px;\nmax-width:550px;\n min-height: 0px;\n}");

    let css ="#arc-search{width: "+  menuWidth+"px;} \n.arc-menu-status-text{\ncolor:"+  menuForegroundColor+";\nfont-size:" + fontSize+"pt;\n}\n "+                                                      
        ".search-statustext {font-size:11pt;}\n "+    
        ".left-scroll-area{ \nwidth:"+  menuWidth+"px;\n}\n"   
    	+".arc-empty-dash-drop-target{\nwidth: "+  menuWidth+"px; \nheight: 2px; \nbackground-color:"+  separatorColor+"; \npadding: 0 0; \nmargin:0;\n}\n"     
        +".left-box{\nwidth:"+  menuWidth+"px;\n}" + "\n.vert-sep{\nwidth:11px;\n}\n"
        +"#search-entry{\nmax-width: 17.667em;\n}\n#search-entry:focus { \nborder-color:"+  separatorColor+";\n}\n"
        +"#arc-search-entry{\nmax-width: 17.667em;\nfont-size:" + fontSize+"pt;\n border-color:"+  separatorColor+";\n"
        +" color:"+  menuForegroundColor+";\n background-color:" +  menuColor + ";\n}\n"
        +"#arc-search-entry:focus { \nborder-color:"+ lighten_rgb( separatorColor,0.25)+";\n}\n"

        +".arc-menu-icon{\ncolor: "+menuButtonColor+";\n}\n"
        +"\n.arc-menu-icon:hover,\n.arc-menu-icon:active{\ncolor: "+menuButtonActiveColor+";\n}\n"
        
        +".arc-menu-button{ -st-icon-style: symbolic;  border-radius: 32px; border: 0; padding: 13px;\n background-color:transparent;}"
        +".arc-menu-button:hover, .arc-menu-button:focus{ background-color: rgba(146, 146, 146, 0.25);}"

        +".arc-menu-action{background-color:transparent;\ncolor:"+  menuForegroundColor+";\n}\n"
        +".arc-menu-action:hover, .arc-menu-action:focus {\ncolor:"+ lighten_rgb( menuForegroundColor,0.15)+";\n background-color:"+  highlightColor+";\n}\n"

        +tooltipStyle

        +".arc-menu{\n-boxpointer-gap: "+gapAdjustment+"px;\nmin-width: 15em;\ncolor: #D3DAE3;\nborder-image: none;\nbox-shadow: none;\nfont-size:" + fontSize+"pt;\n}\n"
        +".arc-menu .popup-sub-menu {\npadding-bottom: 1px;\nbackground-color: "+lighten_rgb( menuColor,0.04)+";\n}\n"
        +".arc-menu .popup-menu-content {padding: 1em 0em;}\n .arc-menu .popup-menu-item {\nspacing: 12px; \nborder: 0;\ncolor:"+  menuForegroundColor+";\n }\n" 
        +".arc-menu .popup-menu-item:ltr {padding: .4em 1.75em .4em 0em; }\n.arc-menu .popup-menu-item:rtl {padding: .4em 0em .4em 1.75em;}\n"
        +".arc-menu .popup-menu-item:checked {\nbackground-color:"+lighten_rgb( menuColor,0.04)+";\n box-shadow: 0;\nfont-weight: bold;\n border-color: "+lighten_rgb( menuColor,0.15)+";\n border-top-width:1px;\n}\n"
        +".arc-menu .popup-menu-item.selected, .arc-menu .popup-menu-item:active{\nbackground-color:"+  highlightColor+"; \ncolor: "+ lighten_rgb( menuForegroundColor,0.15)+";\n }\n" 
        +".arc-menu .popup-menu-item:disabled {color: rgba(238, 238, 236, 0.5); }\n"
        +".arc-menu-boxpointer{ \n-arrow-border-radius:"+  cornerRadius+"px;\n"
        +"-arrow-background-color:" +  menuColor + ";\n"
        +"-arrow-border-color:"+  borderColor+ ";\n"
        +"-arrow-border-width:"+  borderSize+"px;\n"
        +"-arrow-base:"+  menuMargin+"px;\n"
        +"-arrow-rise:"+  menuArrowSize+"px;\n"
        +"-arrow-box-shadow: 0 1px 3px black;\n }"
        +"\n.arc-menu .popup-menu-content\n {\nmargin: 0;\nbackground-color: transparent;\nborder-radius: 0px;\nbox-shadow: 0;\n}\n"
        
        +"\n.arc-menu-sep {\nheight: 1px;\nmargin: 5px 20px;\nbackground-color: transparent;"
        +"\nborder-color:"+  separatorColor+";\n border-bottom-width: 1px;\nborder-bottom-style: solid;\n }"

        +".menu-user-avatar {\n background-size: contain; \n border: none;\n border-radius: "+avatarRadius+"px;\n }"
        + "#rightClickMenu{max-width:350px;}"
        +".arc-right-click{\nmax-width:350px;\nmin-width: 15em;\ncolor: #D3DAE3;\nborder-image: none;\nfont-size:" + fontSize+"pt;\nmargin:2px;\npadding:2px;"
        +"\nspacing:2px;\nbox-shadow: 1px 1px 4px rgb(53, 52, 52);\n}\n"
        +".arc-right-click .popup-sub-menu {\npadding-bottom: 1px;\nbackground-color: #3a393b;\nbox-shadow: inset 0 -1px 0px #323233;\n }\n"
        +".arc-right-click .popup-menu-content {padding: 2px;}\n .arc-right-click .popup-menu-item {\nspacing: 12px; \nborder: 0;\ncolor:"+  menuForegroundColor+";\n }\n" 
        +".arc-right-click .popup-menu-item:ltr {padding: .4em 1.75em .4em 0em; }\n.arc-right-click .popup-menu-item:rtl {padding: .4em 0em .4em 1.75em;}\n"
        +".arc-right-click .popup-menu-item:checked {\nbackground-color: #3a393b;\n box-shadow: inset 0 1px 0px #323233;\nfont-weight: bold;\n }\n"
        +".arc-right-click .popup-menu-item.selected, .arc-right-click .popup-menu-item:active{\nbackground-color:"+  highlightColor+"; \ncolor: "+ lighten_rgb( menuForegroundColor,0.15)+";\n }\n" 
        +".arc-right-click .popup-menu-item:disabled {color: rgba(238, 238, 236, 0.5); }\n"
        +".arc-right-click .popup-menu-item:insensitive {color:" +  lighten_rgb( menuForegroundColor,-0.30) + "; }\n"
        +".arc-right-click-boxpointer{ \n-arrow-border-radius:"+  cornerRadius+"px;\n"
        +"-arrow-background-color:" +  lighten_rgb( menuColor,0.05) + ";\n"
        +"-arrow-border-color:"+  borderColor+ ";\n"
        +"-arrow-border-width:"+  "1px;\n"
        +"-arrow-base:"+  menuMargin+"px;\n"
        +"-arrow-rise:"+  menuArrowSize+"px;\n"
        +"-arrow-box-shadow: 0 1px 3px black;\n }"
        +"\n.arc-right-click .popup-menu-content\n {\nmargin: 0;\nbackground-color: transparent;\nborder-radius: 0px;\nbox-shadow: 0;\n}\n"
        
        +"\n.app-right-click-sep {\nheight: 1px;\nmargin: 2px 35px;\nbackground-color: transparent;"
        +"\nborder-color:"+  lighten_rgb(separatorColor,0.05) +";\nborder-bottom-width: 1px;\nborder-bottom-style: solid; \n}";
    
    let stylesheetFile = Gio.File.new_for_path(GLib.get_home_dir() + "/.local/share/arc-menu/stylesheet.css");

    let exists = stylesheetFile.query_exists(null);
    if(!exists){
        GLib.spawn_command_line_sync("mkdir " + GLib.get_home_dir() + "/.local/share/arc-menu");
        GLib.spawn_command_line_sync("touch " + GLib.get_home_dir() + "/.local/share/arc-menu/stylesheet.css");
        stylesheetFile = Gio.File.new_for_path(GLib.get_home_dir() + "/.local/share/arc-menu/stylesheet.css");
    }
    stylesheetFile.replace_contents(css,null,false,Gio.FileCreateFlags.REPLACE_DESTINATION,null);
}

