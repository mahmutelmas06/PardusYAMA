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

const GObject = imports.gi.GObject;
const MW = Me.imports.menuWidgets;

function createTooltip(button, widget, label, description){
    let lbl = label.clutter_text;
    lbl.get_allocation_box();
    let isEllipsized = lbl.get_layout().is_ellipsized();
    if(isEllipsized || description){
        let tooltipText = "";
        if(isEllipsized && description)
            tooltipText = label.text.replace(/\n/g, " ") + "\n" + description;
        else if(isEllipsized && !description)
            tooltipText = label.text.replace(/\n/g, " ");
        else if(!isEllipsized && description)
            tooltipText = description;
        else if(!isEllipsized && !description)
            tooltipText = '';
        widget.tooltip = new MW.Tooltip(button, widget.actor, tooltipText);
        widget.tooltip._onHover();
    } 
}

var defineClass = function (classDef) {
    let parentProto = classDef.Extends ? classDef.Extends.prototype : null;
    
    if (imports.misc.config.PACKAGE_VERSION < '3.31.9') {
        if (parentProto && (classDef.Extends.name || classDef.Extends.toString()).indexOf('ArcMenu_') < 0) {
            classDef.callParent = function() {
                let args = Array.prototype.slice.call(arguments);
                let func = args.shift();

                classDef.Extends.prototype[func].apply(this, args);
            };
        }

        return new imports.lang.Class(classDef);
    }

    let isGObject = parentProto instanceof GObject.Object;
    let needsSuper = parentProto && !isGObject;
    let getParentArgs = function(args) {
        let parentArgs = [];

        (classDef.ParentConstrParams || parentArgs).forEach(p => {
            if (p.constructor === Array) {
                let param = args[p[0]];
                
                parentArgs.push(p[1] ? param[p[1]] : param);
            } else {
                parentArgs.push(p);
            }
        });

        return parentArgs;
    };
    
    let C = eval(
        '(class C ' + (needsSuper ? 'extends Object' : '') + ' { ' +
        '     constructor(...args) { ' +
                  (needsSuper ? 'super(...getParentArgs(args));' : '') +
                  (needsSuper || !parentProto ? 'this._init(...args);' : '') +
        '     }' +
        '     callParent(...args) { ' +
        '         let func = args.shift(); ' +
        '         if (!(func === \'_init\' && needsSuper))' +
        '             super[func](...args); ' +
        '     }' +    
        '})'
    );

    if (parentProto) {
        Object.setPrototypeOf(C.prototype, parentProto);
        Object.setPrototypeOf(C, classDef.Extends);
    } 
    
    Object.defineProperty(C, 'name', { value: classDef.Name });
    Object.keys(classDef)
          .filter(k => classDef.hasOwnProperty(k) && classDef[k] instanceof Function)
          .forEach(k => C.prototype[k] = classDef[k]);

    if (isGObject) { 
        C = GObject.registerClass({ Signals: classDef.Signals || {} }, C);
    }
    
    return C;
};

var createClass = function (classDef) {
    let parentProto = classDef.Extends ? classDef.Extends.prototype : null;
    if (imports.misc.config.PACKAGE_VERSION < '3.31.9') {
        if (parentProto && (classDef.Extends.name || classDef.Extends.toString()).indexOf('ArcMenu_') < 0) {
            classDef.callParent = function() {
                let args = Array.prototype.slice.call(arguments);
                let func = args.shift();

                classDef.Extends.prototype[func].apply(this, args);
            };
        }

        return new imports.lang.Class(classDef);
    }
    else if (imports.misc.config.PACKAGE_VERSION < '3.33') {
        let isGObject = parentProto instanceof GObject.Object;
        let needsSuper = parentProto && !isGObject;
        let getParentArgs = function(args) {
            let parentArgs = [];

            (classDef.ParentConstrParams || parentArgs).forEach(p => {
                if (p.constructor === Array) {
                    let param = args[p[0]];
                    
                    parentArgs.push(p[1] ? param[p[1]] : param);
                } else {
                    parentArgs.push(p);
                }
            });

            return parentArgs;
        };
        
        let C = eval(
            '(class C ' + (needsSuper ? 'extends Object' : '') + ' { ' +
            '     constructor(...args) { ' +
                    (needsSuper ? 'super(...getParentArgs(args));' : '') +
                    (needsSuper || !parentProto ? 'this._init(...args);' : '') +
            '     }' +
            '     callParent(...args) { ' +
            '         let func = args.shift(); ' +
            '         if (!(func === \'_init\' && needsSuper))' +
            '             super[func](...args); ' +
            '     }' +    
            '})'
        );


        if (parentProto) {
            Object.setPrototypeOf(C.prototype, parentProto);
            Object.setPrototypeOf(C, classDef.Extends);
        } 
        
        Object.defineProperty(C, 'name', { value: classDef.Name });
        Object.keys(classDef)
            .filter(k => classDef.hasOwnProperty(k) && classDef[k] instanceof Function)
            .forEach(k => C.prototype[k] = classDef[k]);

        C = ({ Signals: classDef.Signals || {} }, C);

            
          
        return C;
    }
    else if (imports.misc.config.PACKAGE_VERSION >= '3.33') {
        let isGObject = parentProto instanceof GObject.Object;
        let needsSuper = parentProto && !isGObject;
        let getParentArgs = function(args) {
            let parentArgs = [];

            (classDef.ParentConstrParams || parentArgs).forEach(p => {
                if (p.constructor === Array) {
                    let param = args[p[0]];
                    
                    parentArgs.push(p[1] ? param[p[1]] : param);
                } else {
                    parentArgs.push(p);
                }
            });

            return parentArgs;
        };
        
        let C = eval(
            '(class C ' + (needsSuper ? 'extends Object' : '') + ' { ' +
            '     _init(...args) { ' +
                    (needsSuper ? 'super._init(...getParentArgs(args));' : '') +
                    (needsSuper || !parentProto ? 'this._init(...args);' : '') +
            '     }' +
            '     callParent(...args) { ' +
            '         let func = args.shift(); ' +
            '         if (!(func === \'_init\' && needsSuper))' +
            '             super[func](...args); ' +
            '     }' +    
            '})'
        );


        if (parentProto) {
            Object.setPrototypeOf(C.prototype, parentProto);
            Object.setPrototypeOf(C, classDef.Extends);
        } 
        
        Object.defineProperty(C, 'name', { value: classDef.Name });
        Object.keys(classDef)
            .filter(k => classDef.hasOwnProperty(k) && classDef[k] instanceof Function)
            .forEach(k => C.prototype[k] = classDef[k]);

        C = GObject.registerClass({ Signals: classDef.Signals || {} }, C);
  
        return C;

    }
};
