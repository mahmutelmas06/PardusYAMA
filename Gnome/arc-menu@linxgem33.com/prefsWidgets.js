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
const {GdkPixbuf, Gio, GLib, GObject, Gtk} = imports.gi;
const Params = imports.misc.params;



//Arc Menu Notebook
var Notebook = GObject.registerClass(
    class ArcMenu_Notebook extends Gtk.Notebook{

    _init() {
        super._init({
            margin_left: 6,
            margin_right: 6
        });
    }

    append_page(notebookPage) {
        Gtk.Notebook.prototype.append_page.call(
            this,
            notebookPage,
            notebookPage.getTitleLabel()
        );
    }
});


// Arc Menu Notebook Page
var NotebookPage =GObject.registerClass(
    class ArcMenu_NotebookPage extends Gtk.Box {

    _init(title) {
        super._init({
            orientation: Gtk.Orientation.VERTICAL,
            margin: 24,
            spacing: 20,
            homogeneous: false
        });
        this._title = new Gtk.Label({
            label: "<b>" + title + "</b>",
            use_markup: true,
            xalign: 0
        });
    }

    getTitleLabel() {
        return this._title;
    }
});

//Icon Button
var IconButton = GObject.registerClass(
    class ArcMenu_IconButton extends Gtk.Button {

    _init(params) {
        super._init();
        this._params = Params.parse(params, {
            circular: true,
            icon_name: '',
            tooltip_text: ''
        });
        if (this._params.circular) {
            let context = this.get_style_context();
            context.add_class('circular');
        }
        if (this._params.icon_name) {
            let image = new Gtk.Image({
                icon_name: this._params.icon_name,
                xalign: 0.5
            });
            this.add(image);
        }
        if (this._params.tooltip_text){
            this.set_tooltip_text(this._params.tooltip_text);
        }
    }
});

//Arc Menu Dialog Window
var DialogWindow = GObject.registerClass(
    class ArcMenu_DialogWindow extends Gtk.Dialog {
        _init(title, parent) {
            super._init({
                title: title,
                transient_for: parent.get_toplevel(),
                use_header_bar: true,
                modal: true
            });
            let vbox = new Gtk.Box({
                orientation: Gtk.Orientation.VERTICAL,
                spacing: 20,
                homogeneous: false,
                margin: 5
            });

            this._createLayout(vbox);
            this.get_content_area().add(vbox);
        }

        _createLayout(vbox) {
            throw "Not implemented!";
        }
    });

//Arc Menu Frame Box
var FrameBox = GObject.registerClass(
    class ArcMenu_FrameBox extends Gtk.Frame {
        _init() {
            super._init({ label_yalign: 0.50 });
            this._listBox = new Gtk.ListBox();
            this._listBox.set_selection_mode(Gtk.SelectionMode.NONE);
            this.count=0;
            Gtk.Frame.prototype.add.call(this, this._listBox);
        }

        add(boxRow) {
            this._listBox.add(boxRow);
            this.count++;
        }
        show() {
            this._listBox.show_all();
        }
        length() {
            return this._listBox.length;
        }
        remove(boxRow) {
            this._listBox.remove(boxRow);
            this.count = this.count -1;
        }
        remove_all_children() {
            let children = this._listBox.get_children();
            for(let i = 0; i < children.length; i++){
                let child = children[i];
                this._listBox.remove(child);
            }
            this.count = 0;
            this._listBox.show_all();
        }
        get_index(index){
            return this._listBox.get_row_at_index(index);
        }
        insert(row,pos){
            this._listBox.insert(row,pos);
            this.count++;
        }
    });


//Arc Menu Frame Box Row
var FrameBoxRow = GObject.registerClass(
    class ArcMenu_FrameBoxRow extends Gtk.ListBoxRow {
        _init() {
            super._init({});
            this._grid = new Gtk.Grid({
                margin: 5,
                column_spacing: 20,
                row_spacing: 20
            });
            Gtk.ListBoxRow.prototype.add.call(this, this._grid);
        }

        add(widget) {
            this._grid.add(widget);
        }
    });



//Arc Menu Tile Grid
var TileGrid = GObject.registerClass(
    class ArcMenu_TileGrid extends Gtk.FlowBox{

    _init(maxColumns) {
        super._init({
            row_spacing: 5,
            column_spacing: 5,
            max_children_per_line: maxColumns,
            vexpand: true,
            valign: Gtk.Align.START,
            selection_mode: Gtk.SelectionMode.NONE
        });
    }
});


//Arc Menu Tile Grid
var Tile =  GObject.registerClass(
    class ArcMenu_Tile extends Gtk.Button{

     _init(label, file, width, height) {
        super._init();
        let pixbuf = GdkPixbuf.Pixbuf.new_from_file_at_size(file, width, height);
        this._image = new Gtk.Image({ pixbuf: pixbuf });
        this._label = new Gtk.Label({ label: label });

        this._vbox = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL });
        this._vbox.add(this._image);
        this._vbox.add(this._label);
        this.add(this._vbox);
        this.margin=1;
    }
});
