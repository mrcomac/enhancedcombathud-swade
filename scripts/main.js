import {initConfig} from "./config.js";

export const MODULE_ID = "enhancedcombathud-swade";

Hooks.on("setup", () => {
    //registerSettings();
    initConfig();
});

