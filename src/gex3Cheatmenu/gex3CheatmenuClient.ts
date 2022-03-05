import { IModLoaderAPI } from 'modloader64_api/IModLoaderAPI';
import { onViUpdate } from 'modloader64_api/PluginLifecycle';
import { ModLoaderAPIInject } from 'modloader64_api/ModLoaderAPIInjector';
import { onViUpdateReloadable } from './LifeCycle';
import path from 'path';
import { Igex3core } from 'gex3core/API/Igex3core';
import { InjectCore } from 'modloader64_api/CoreInjection';
import bitwise from 'bitwise';
import { UInt8, Byte } from 'bitwise/types';

class LevelRemoteHandler {

    ModLoader: IModLoaderAPI;
    levelName: string;
    tasks: string[];
    remotes: number;
    fly_remote_bitfield: number;
    fly_bit_key: number;
    fly_byte_index: number;
    bonus_coins: number;
    paws: number;

    constructor(ModLoader: IModLoaderAPI, levelName: string, tasks: string[], remotes: number, fly_remote_bitfield: number, fly_bit_key: number, fly_byte_index: number, bonus_coins: number, paws: number) {
        this.ModLoader = ModLoader;
        this.levelName = levelName;
        this.tasks = tasks;
        this.remotes = remotes;
        this.fly_remote_bitfield = fly_remote_bitfield;
        this.fly_bit_key = fly_bit_key;
        this.fly_byte_index = fly_byte_index;
        this.bonus_coins = bonus_coins;
        this.paws = paws;
    }

    onVi() {
        // Make level folder.
        if (this.ModLoader.ImGui.beginMenu(this.levelName)) {
            let makeCheckbox = (bits: Byte, bit: number, taskstr: string) => {
                let task = [bits[bit] === 0 ? false : true];
                // Spawn checkbox. If statement executed if user clicks it.
                if (this.ModLoader.ImGui.checkbox(taskstr, task)) {
                    // Make the boolref back into a bit.
                    bits[bit] = task[0] ? 1 : 0;
                }
            };
            // Create a buffer that is two bytes long.
            let buf = Buffer.alloc(0x8);
            // Make unique level remotes folder.
            if (this.ModLoader.ImGui.beginMenu(`Level Remotes###${this.levelName.replace(" ", "")}_Remotes`)) {
                // Break remote bitfield into bits.
                let bits = bitwise.byte.read(this.remotes as UInt8);
                // Make the bit (1 or 0) into a bool_ref ([true] or [false]).
                makeCheckbox(bits, 7, this.tasks[0]);
                makeCheckbox(bits, 6, this.tasks[1]);
                makeCheckbox(bits, 5, this.tasks[2]);
                // Make bits back into bitfield.
                this.remotes = bitwise.byte.write(bits);
                // Write fly remote value into buffer.
                buf.writeUInt16BE(this.fly_remote_bitfield);
                // Break the correct half of the value into bits.
                let fly_bits: Byte = bitwise.byte.read(buf[this.fly_byte_index] as UInt8);
                // Same as before.
                let task4 = [fly_bits[this.fly_bit_key] === 0 ? false : true];
                if (this.ModLoader.ImGui.checkbox(`Fly Remote###${this.levelName.replace(" ", "")}_FlyRemote`, task4)) {
                    fly_bits[this.fly_bit_key] = task4[0] ? 1 : 0;
                }
                buf[this.fly_byte_index] = bitwise.byte.write(fly_bits);
                // Retrieve the fly remotes complete value.
                this.fly_remote_bitfield = buf.readUInt16BE(0);
                this.ModLoader.ImGui.endMenu();
            }
            if (this.ModLoader.ImGui.beginMenu(`Level Coins###${this.levelName.replace(" ", "")}_Coins`)) {
                let bits = bitwise.byte.read(this.bonus_coins as UInt8);
                makeCheckbox(bits, 7, "Bonus Coin 1");
                makeCheckbox(bits, 6, "Bonus Coin 2");
                makeCheckbox(bits, 5, "Bonus Coin 3");
                this.bonus_coins = bitwise.byte.write(bits);
                this.ModLoader.ImGui.endMenu();
            }
            if (this.ModLoader.ImGui.beginMenu(`Level Paws###${this.levelName.replace(" ", "")}_Paws`)) {
                let makePawCheck = (bits: Byte, byte_index: number, index: number, bit_index: number) => {
                    let paws = [bits[bit_index] === 0 ? false : true];
                    if (this.ModLoader.ImGui.checkbox(`Paw Coin ${index}###${this.levelName.replace(" ", "")}_Paw_Coin_${index}`, paws)) {
                        bits[bit_index] = paws[0] ? 1 : 0;
                        buf[byte_index] = bitwise.byte.write(bits);
                        this.paws = buf.readUInt16BE(0);
                    }
                };
                buf.writeUInt16BE(this.paws);
                let paw_bits1 = bitwise.byte.read(buf[0] as UInt8);
                let paw_bits2 = bitwise.byte.read(buf[1] as UInt8);
                makePawCheck(paw_bits1, 0, 1, 7);
                makePawCheck(paw_bits1, 0, 2, 6);
                makePawCheck(paw_bits1, 0, 3, 5);
                makePawCheck(paw_bits1, 0, 4, 4);
                makePawCheck(paw_bits1, 0, 5, 3);
                makePawCheck(paw_bits1, 0, 6, 2);
                makePawCheck(paw_bits1, 0, 7, 1);
                makePawCheck(paw_bits1, 0, 8, 0);
                makePawCheck(paw_bits2, 1, 9, 7);
                makePawCheck(paw_bits2, 1, 10, 6);
                this.ModLoader.ImGui.endMenu();
            }
            this.ModLoader.ImGui.endMenu();
        }
        return { remotes: this.remotes, fly: this.fly_remote_bitfield, bonus_coins: this.bonus_coins, paws: this.paws };
    }
}


export default class gex3CheatmenuClient {

    @ModLoaderAPIInject()
    ModLoader!: IModLoaderAPI;
    @InjectCore()
    core!: Igex3core;

    @onViUpdateReloadable(path.resolve(__filename))
    onVi() {
        if (this.ModLoader.ImGui.beginMainMenuBar()) {
            if (this.ModLoader.ImGui.beginMenu("Mods")) {
                if (this.ModLoader.ImGui.beginMenu("Gex 3 Cheat Menu")) {
                    if (this.ModLoader.ImGui.beginMenu("Global Progress")) {
                        let remotes = [this.core.save.remote_count];
                        if (this.ModLoader.ImGui.sliderInt("Remotes", remotes, 0, 99)) {
                            this.core.save.remote_count = remotes[0];
                        }
                        let bonus_coin = [this.core.save.bonus_coins];
                        if (this.ModLoader.ImGui.sliderInt("Bonus Coins", bonus_coin, 0, 99)) {
                            this.core.save.bonus_coins = bonus_coin[0];
                        }
                        let paw_coin = [this.core.save.paw_coins];
                        if (this.ModLoader.ImGui.sliderInt("Paw Coins", paw_coin, 0, 99)) {
                            this.core.save.paw_coins = paw_coin[0];
                        }
                        let life_counter = [this.core.save.life_counter];
                        if (this.ModLoader.ImGui.sliderInt("Lives", life_counter, 0, 99)) {
                            this.core.save.life_counter = life_counter[0];
                        }
                        let health_counter = [this.core.save.health_counter]
                        if (this.ModLoader.ImGui.sliderInt("Health", health_counter, 0, 8)) {
                            this.core.save.health_counter = health_counter[0];
                        }
                        this.ModLoader.ImGui.endMenu();
                    }
                    if (this.ModLoader.ImGui.beginMenu("Level Progress")) {
                        {
                            let scrooged = new LevelRemoteHandler(this.ModLoader, "Totally Scrooged", ["Create Five Ice Scupltures", "Whack the Snowboarding Elves", "Defeat Evil Santa"], this.core.save.totally_scrooged, this.core.save.fly_tv_remotes, 7, 1, this.core.save.totally_scrooged_bonus_coins, this.core.save.totally_scrooged_paw_coins);
                            let result = scrooged.onVi();
                            this.core.save.totally_scrooged = result.remotes;
                            this.core.save.fly_tv_remotes = result.fly;
                            this.core.save.totally_scrooged_bonus_coins = result.bonus_coins;
                            this.core.save.totally_scrooged_paw_coins = result.paws;
                        }
                        {
                            let clueless = new LevelRemoteHandler(this.ModLoader, "Clueless in Seattle", ["Survive the Hedge Maze", "Break the Three blood Coolers, Again!", "Find and Beat the Three Mini-Games"], this.core.save.clueless_in_seattle, this.core.save.fly_tv_remotes, 6, 1, this.core.save.clueless_in_seattle_bonus_coins, this.core.save.clueless_in_seattle_paw_coins);
                            let result = clueless.onVi();
                            this.core.save.clueless_in_seattle = result.remotes;
                            this.core.save.fly_tv_remotes = result.fly;
                            this.core.save.clueless_in_seattle_bonus_coins = result.bonus_coins;
                            this.core.save.clueless_in_seattle_paw_coins = result.paws;
                        }
                        {
                            let holyMoses = new LevelRemoteHandler(this.ModLoader, "Holy Moses", ["Recover the 3 Staffs of RA", "Release the Spirits From Three Lost Arks", "Ride the Camel to the Ancient Temple"], this.core.save.holy_moses, this.core.save.fly_tv_remotes, 5, 1, this.core.save.holy_moses_bonus_coins, this.core.save.holy_moses_paw_coins);
                            let result = holyMoses.onVi();
                            this.core.save.holy_moses = result.remotes;
                            this.core.save.fly_tv_remotes = result.fly;
                            this.core.save.holy_moses_bonus_coins = result.bonus_coins;
                            this.core.save.holy_moses = result.paws;
                        }
                        {
                            let war = new LevelRemoteHandler(this.ModLoader, "War Is Heck", ["Shoot the Search Lights", "Whack 5 Tents", "Survive the Maze"], this.core.save.war_is_heck, this.core.save.fly_tv_remotes, 4, 1, this.core.save.war_is_heck_bonus_coins, this.core.save.war_is_heck_paw_coins);
                            let result = war.onVi();
                            this.core.save.war_is_heck = result.remotes;
                            this.core.save.fly_tv_remotes = result.fly;
                            this.core.save.war_is_heck_bonus_coins = result.bonus_coins;
                            this.core.save.war_is_heck_paw_coins = result.paws;
                        }
                        {
                            let oregon = new LevelRemoteHandler(this.ModLoader, "The Oregon Trail", ["Visit the Worlds Leargest Mound of Poo", "Climb the Mountain", "Collect 5 of a Kind"], this.core.save.the_oregon_trail, this.core.save.fly_tv_remotes, 3, 1, this.core.save.the_oregon_trail_bonus_coins, this.core.save.the_oregon_trail_paw_coins);
                            let result = oregon.onVi();
                            this.core.save.the_oregon_trail = result.remotes;
                            this.core.save.fly_tv_remotes = result.fly;
                            this.core.save.the_oregon_trail_bonus_coins = result.bonus_coins;
                            this.core.save.the_oregon_trail_paw_coins = result.paws;
                        }
                        {
                            let cutCheese = new LevelRemoteHandler(this.ModLoader, "CutCheese Island", ["Survive the Wall of Death. Den: As you do", "Sink 4 Pirate Ships", "Zip on Down to the TV"], this.core.save.cutcheese_island, this.core.save.fly_tv_remotes, 2, 1, this.core.save.cutcheese_island_bonus_coins, this.core.save.cutcheese_island_paw_coins);
                            let result = cutCheese.onVi();
                            this.core.save.cutcheese_island = result.remotes;
                            this.core.save.fly_tv_remotes = result.fly;
                            this.core.save.cutcheese_island_bonus_coins = result.bonus_coins;
                            this.core.save.cutcheese_island_paw_coins = result.paws;
                        }
                        {
                            let etTy = new LevelRemoteHandler(this.ModLoader, "Et Ty Gecko?", ["Break the Arms Off Five Statues", "Collect the Three Golden Apples", "Find the Tv at the End of the Rainbow"], this.core.save.et_ty_gecko, this.core.save.fly_tv_remotes, 1, 1, this.core.save.et_ty_gecko_bonus_coins, this.core.save.et_ty_gecko_paw_coins);
                            let result = etTy.onVi();
                            this.core.save.et_ty_gecko = result.remotes;
                            this.core.save.fly_tv_remotes = result.fly;
                            this.core.save.et_ty_gecko = result.bonus_coins;
                            this.core.save.et_ty_gecko_paw_coins = result.paws;
                        }
                        {
                            let beanStalker = new LevelRemoteHandler(this.ModLoader, "BeanStalker", ["Climb the Beanstalk", "Destroy the Three Little Pigs", "Jump over the Three Candlesticks"], this.core.save.beanStalker, this.core.save.fly_tv_remotes, 0, 1, this.core.save.beanStalker_bonus_coins, this.core.save.beanStalker_paw_coins);
                            let result = beanStalker.onVi();
                            this.core.save.beanStalker = result.remotes;
                            this.core.save.fly_tv_remotes = result.fly;
                            this.core.save.beanStalker_bonus_coins = result.bonus_coins;
                            this.core.save.beanStalker_paw_coins = result.paws;
                        }
                        {
                            let sushi = new LevelRemoteHandler(this.ModLoader, "When Sushi Goes Bad", ["Demolish the Three Protoculture Tubes", "Deactivate the Planet Destroyer", "Find and Destroy the Five Rogue Mechs"], this.core.save.when_sushi_goes_bad, this.core.save.fly_tv_remotes, 7, 0, this.core.save.when_sushi_goes_bad_bonus_coins, this.core.save.when_sushi_goes_bad_paw_coins);
                            let result = sushi.onVi();
                            this.core.save.when_sushi_goes_bad = result.remotes;
                            this.core.save.fly_tv_remotes = result.fly;
                            this.core.save.when_sushi_goes_bad_bonus_coins = result.bonus_coins;
                            this.core.save.when_sushi_goes_bad_paw_coins = result.paws;
                        }
                        {
                            let myThreeGoons = new LevelRemoteHandler(this.ModLoader, "My Three Goons", ["Burn Five Bundles of Funny Money", "Destroy Five Root Beer Barrels", "Save Cuz from the Mob"], this.core.save.my_three_goons, this.core.save.fly_tv_remotes, 6, 0, this.core.save.my_three_goons_bonus_coins, this.core.save.my_three_goons_paw_coins);
                            let result = myThreeGoons.onVi();
                            this.core.save.my_three_goons = result.remotes;
                            this.core.save.fly_tv_remotes = result.fly;
                            this.core.save.my_three_goons_bonus_coins = result.bonus_coins;
                            this.core.save.my_three_goons_paw_coins = result.paws;
                        }
                        {
                            let SuperZeros = new LevelRemoteHandler(this.ModLoader, "SuperZeros", ["Defeat the Mad Bomber", "Get the Three Stray Cats", "Find the Five Escaped Convits"], this.core.save.super_zeros, this.core.save.fly_tv_remotes, 5, 0, this.core.save.super_zeros_bonus_coins, this.core.save.super_zeros_paw_coins);
                            let result = SuperZeros.onVi();
                            this.core.save.super_zeros = result.remotes;
                            this.core.save.fly_tv_remotes = result.fly;
                            this.core.save.super_zeros_bonus_coins = result.bonus_coins;
                            this.core.save.super_zeros_paw_coins = result.paws;
                        }
                        this.ModLoader.ImGui.endMenu();
                    }
                }
                this.ModLoader.ImGui.endMenu();
            }
            this.ModLoader.ImGui.endMainMenuBar();
        }
    }
}