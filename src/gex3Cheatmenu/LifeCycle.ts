import { IModLoaderAPI } from "modloader64_api/IModLoaderAPI";
import { lifecyclebus, LifecycleEventBus, LifeCycleEvents } from "modloader64_api/PluginLifecycle";
import fs from 'fs';
import { setupMLInjects } from "modloader64_api/ModLoaderAPIInjector";
import { setupCoreInject } from "modloader64_api/CoreInjection";

// Container class for individual VI reloadables.
class ViReloadable {
    vikey: string;
    tickkey: string | undefined;
    file: string;
    instance: any;
    vibind: any;
    tickbind: Function | undefined;

    constructor(vikey: string, file: string) {
        this.vikey = vikey;
        this.file = file;
    }
}

// This is the decorator.
export function onViUpdateReloadable(file: string) {
    return function (
        this: any,
        target: any,
        propertyKey: string,
        descriptor: PropertyDescriptor
    ) {
        if (target.ModLoader === undefined) {
            target['ModLoader'] = {};
        }
        if (target.ModLoader.Lifecycle === undefined) {
            target.ModLoader['Lifecycle'] = {};
        }
        if (target.ModLoader.Lifecycle.onViUpdateReloadable === undefined) {
            target.ModLoader.Lifecycle['onViUpdateReloadable'] = new Map<
                string,
                ViReloadable
            >();
        }
        target.ModLoader.Lifecycle.onViUpdateReloadable.set("onViUpdateReloadable", new ViReloadable(propertyKey, file));
    };
}

export function onTickReloadable() {
    return function (
        this: any,
        target: any,
        propertyKey: string,
        descriptor: PropertyDescriptor
    ) {
        if (target.ModLoader === undefined) {
            target['ModLoader'] = {};
        }
        if (target.ModLoader.Lifecycle === undefined) {
            target.ModLoader['Lifecycle'] = {};
        }
        if (target.ModLoader.Lifecycle.onViUpdateReloadable === undefined) {
            target.ModLoader.Lifecycle['onViUpdateReloadable'] = new Map<
                string,
                ViReloadable
            >();
        }
        if (target.ModLoader.Lifecycle.onViUpdateReloadable.has("onViUpdateReloadable")){
            target.ModLoader.Lifecycle.onViUpdateReloadable.get("onViUpdateReloadable").tickkey = propertyKey;
        }
    };
}

// This is the 'mod' that ML will see for the purposes of managing its VI.
class ViReloadableContainer {
    ModLoader!: IModLoaderAPI;
    core: any;
    stack: Map<string, ViReloadable> = new Map();

    // Nukes Node's require cache and reloads the file.
    reloadCode(value: ViReloadable) {
        Object.keys(require.cache).forEach((key: string) => {
            delete require.cache[key];
        });
        let t = require(value.file);
        let d = t["default"];
        let test = new d();
        setupMLInjects(test, this.ModLoader);
        setupCoreInject(test, this.core);
        value.vibind = test[value.vikey].bind(test);
        value.instance = test;
        if (value.tickkey !== undefined){
            value.tickbind = test[value.tickkey].bind(test);
        }
    }

    // Sets up every reloadable VI handler.
    setup(){
        this.stack.forEach((value: ViReloadable)=>{
            fs.watchFile(value.file, ()=>{
                this.reloadCode(value);
            });
            this.reloadCode(value);
        });
    }

    // The actual VI loop.
    masterVI() {
        this.stack.forEach((value: ViReloadable) => {
            value.vibind();
        });
    }

    masterTick(){
        this.stack.forEach((value: ViReloadable) => {
            if (value.tickbind !== undefined){
                value.tickbind();
            }
        });
    }
}

// contains reloadable VI handlers.
const container: ViReloadableContainer = new ViReloadableContainer();

// Reads decorators and puts the info in the container.
export function setupViReloadables(instance: any, ModLoader: IModLoaderAPI, core: any) {
    let p = Object.getPrototypeOf(instance);
    if (!p.hasOwnProperty("ModLoader")) return;
    if (p.ModLoader.Lifecycle.hasOwnProperty("onViUpdateReloadable")) {
        p.ModLoader.Lifecycle.onViUpdateReloadable.forEach(function (value: ViReloadable) {
            let a = instance[value.vikey].bind(instance);
            value.instance = instance;
            value.vibind = a;
            container.ModLoader = ModLoader;
            container.core = core;
            container.stack.set(instance.toString(), value);
        });
    }
}

// Hooks the fake mod to ML's lifecycle system.
export function finalizeViRelodables() {
    lifecyclebus.emit(LifeCycleEvents.ONVIUPDATE, container.masterVI.bind(container));
    lifecyclebus.emit(LifeCycleEvents.ONTICK, container.masterTick.bind(container));
    container.setup();
}