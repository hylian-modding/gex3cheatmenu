import gex3CheatmenuClient from "./gex3CheatmenuClient";
import { ProxySide, SidedProxy } from 'modloader64_api/SidedProxy/SidedProxy';
import { IModLoaderAPI } from "modloader64_api/IModLoaderAPI";
import { finalizeViRelodables, setupViReloadables } from "./LifeCycle";
import { InjectCore } from "modloader64_api/CoreInjection";
import { Igex3core } from "gex3core/API/Igex3core";

export default class gex3Cheatmenu {
    ModLoader!: IModLoaderAPI;
    @SidedProxy(ProxySide.CLIENT, gex3CheatmenuClient)
    client!: gex3CheatmenuClient;
    @InjectCore()
    core!: Igex3core;

    postinit() {
        setupViReloadables(this.client!, this.ModLoader, this.core);
        finalizeViRelodables();
    }
}