"use strict";

/*
 * Created with @iobroker/create-adapter v2.1.1
 */

// The adapter-core module gives you access to the core ioBroker functions
// you need to create an adapter
const utils = require("@iobroker/adapter-core");

const axios = require("axios").default;

class Voltoplus extends utils.Adapter {
    /**
     * @param {Partial<utils.AdapterOptions>} [options={}]
     */
    constructor(options) {
        super({
            ...options,
            name: "voltoplus",
        });
        this.on("ready", this.onReady.bind(this));
        // this.on("stateChange", this.onStateChange.bind(this));
        // this.on("objectChange", this.onObjectChange.bind(this));
        this.on("unload", this.onUnload.bind(this));
        this.connectionError = false;
        this.connectionErrorCount = 0;
    }

    /**
     * Is called when databases are connected and adapter received configuration.
     */
    async onReady() {
        await this.collectAndSetValues();
    }

    /**
     * Is called when adapter shuts down - callback has to be called under any circumstances!
     * @param {() => void} callback
     */
    onUnload(callback) {
        try {
            // Here you must clear all timeouts or intervals that may still be active
            // clearTimeout(timeout1);
            // clearTimeout(timeout2);
            // ...
            // clearInterval(interval1);

            callback();
        } catch (e) {
            callback();
        }
    }

    // If you need to react to object changes, uncomment the following block and the corresponding line in the constructor.
    // You also need to subscribe to the objects with `this.subscribeObjects`, similar to `this.subscribeStates`.
    // /**
    //  * Is called if a subscribed object changes
    //  * @param {string} id
    //  * @param {ioBroker.Object | null | undefined} obj
    //  */
    // onObjectChange(id, obj) {
    //     if (obj) {
    //         // The object was changed
    //         this.log.info(`object ${id} changed: ${JSON.stringify(obj)}`);
    //     } else {
    //         // The object was deleted
    //         this.log.info(`object ${id} deleted`);
    //     }
    // }

    // /**
    //  * Is called if a subscribed state changes
    //  * @param {string} id
    //  * @param {ioBroker.State | null | undefined} state
    //  */
    // onStateChange(id, state) {
    //     if (state) {
    //         // The state was changed
    //         this.log.info(`state ${id} changed: ${state.val} (ack = ${state.ack})`);
    //     } else {
    //         // The state was deleted
    //         this.log.info(`state ${id} deleted`);
    //     }
    // }

    async collectAndSetValues() {
        const values = await this.getValues();
        if (values !== null) {
            await this.setValues(values);
        }

        setTimeout(() => {
            this.collectAndSetValues();
        }, 1000);
    }

    /**
     * Get the json with values from the Voltoplus
     * @returns {Promise<null|object>}
     */
    async getValues() {
        const url = `http://${this.config.ip}/api/v1/values`;
        try {
            const response = await axios.get(url);
            this.connectionError = false;
            this.setStateChanged("info.connection", {
                val: true,
                ack: true,
            });

            if (this.connectionErrorCount > 0) {
                this.connectionErrorCount = 0;
            }

            return response.data["json_values"];
        } catch (error) {
            this.connectionErrorCount += 1;
            if (this.connectionErrorCount === 30) {
                this.log.error(
                    `There was an error while connecting, please check the device and network connection: ${error}`
                );
                this.connectionError = true;
                this.setStateChanged("info.connection", {
                    val: false,
                    ack: true,
                });
            }
            return null;
        }
    }

    async setValues(values) {
        await this.setStateAsync("phase_1.voltage", {
            val: this.getFixedNumber(values[0].value / 100, 2),
            ack: true,
        });
        await this.setStateAsync("phase_1.current", {
            val: this.getFixedNumber(values[3].value / 1000, 3),
            ack: true,
        });
        await this.setStateAsync("phase_1.power", {
            val: this.getFixedNumber(
                (values[0].value / 100) * (values[3].value / 1000),
                0
            ),
            ack: true,
        });
        await this.setStateAsync("phase_2.voltage", {
            val: this.getFixedNumber(values[1].value / 100, 2),
            ack: true,
        });
        await this.setStateAsync("phase_2.current", {
            val: this.getFixedNumber(values[4].value / 1000, 3),
            ack: true,
        });
        await this.setStateAsync("phase_2.power", {
            val: this.getFixedNumber(
                (values[1].value / 100) * (values[4].value / 1000),
                0
            ),
            ack: true,
        });
        await this.setStateAsync("phase_3.voltage", {
            val: this.getFixedNumber(values[2].value / 100, 2),
            ack: true,
        });
        await this.setStateAsync("phase_3.current", {
            val: this.getFixedNumber(values[5].value / 1000, 3),
            ack: true,
        });
        await this.setStateAsync("phase_3.power", {
            val: this.getFixedNumber(
                (values[2].value / 100) * (values[5].value / 1000),
                0
            ),
            ack: true,
        });
        await this.setStateAsync("power", {
            val: values[6].value,
            ack: true,
        });
        await this.setStateAsync("energy_purchased", {
            val: values[7].value,
            ack: true,
        });
        await this.setStateAsync("energy_supplied", {
            val: values[8].value,
            ack: true,
        });
    }

    /**
     * Get back number with fixed number of decimals
     * @param {number} number
     * @param {number} decimals
     * @returns {number}
     */
    getFixedNumber(number, decimals) {
        return parseFloat(number.toFixed(decimals));
    }
}

if (require.main !== module) {
    // Export the constructor in compact mode
    /**
     * @param {Partial<utils.AdapterOptions>} [options={}]
     */
    module.exports = (options) => new Voltoplus(options);
} else {
    // otherwise start the instance directly
    new Voltoplus();
}
