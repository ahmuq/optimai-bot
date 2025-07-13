import axios, { AxiosResponse } from "axios";
import chalk from "chalk";
import { Generator } from "../utils/generator";
import { logMessage } from "../utils/logger";
import { ProxyManager } from "./proxy";

export class optimAi {
    private proxyManager: ProxyManager;
    private proxy: string | null;
    private account: any;
    private axiosConfig: any;
    private currentNum: number;
    private token: string | null = null;
    private total: number;
    private generator: Generator;

    constructor(account: any, proxy: string | null = null, currentNum: number, total: number) {
        this.account = account;
        this.proxy = proxy;
        this.currentNum = currentNum;
        this.total = total;
        this.proxyManager = new ProxyManager();
        this.generator = new Generator();
        this.axiosConfig = {
            ...(this.proxy && { httpsAgent: this.proxyManager.getProxyAgent(this.proxy, this.currentNum, this.total) }),
            headers: {
                "Content-Type": "application/json"
            }
        };
    } async makeRequest(method: string, url: string, config: any = {}, retries: number = 3): Promise<AxiosResponse | null> {
        for (let i = 0; i < retries; i++) {
            try {
                const response = await axios({
                    method,
                    url,
                    ...this.axiosConfig,
                    ...config,
                });
                return response;
            } catch (error: any) {
                if (i === retries - 1) {
                    logMessage(this.currentNum, this.total, `Request failed: ${(error as any).message}`, "error");
                    return null;
                }

                const isRateLimit = error.response?.status === 429;
                const retryDelay = isRateLimit ? Math.max(2000, 2000 + (i * 1000)) : 2000;

                logMessage(this.currentNum, this.total, `Retrying... (${i + 1}/${retries})${isRateLimit ? ' - Rate limited' : ''}`, "error");
                await new Promise((resolve) => setTimeout(resolve, retryDelay));
            }
        }
        return null;
    }

    async makeRequestWithHighRetry(method: string, url: string, config: any = {}): Promise<AxiosResponse | null> {
        const maxRetries = 50;
        const minTimeout = 2000;
        let retryCount = 0;

        while (retryCount < maxRetries) {
            try {
                const response = await axios({
                    method,
                    url,
                    ...this.axiosConfig,
                    ...config,
                });
                return response;
            } catch (error: any) {
                retryCount++;

                const isRateLimit = error.response?.status === 429;
                const statusCode = error.response?.status || 'unknown';
                const errorMessage = error.response?.data?.message || error.message;

                logMessage(this.currentNum, this.total, `Request failed with status ${statusCode}: ${errorMessage}`, "error");

                const shouldContinueRetry = retryCount < maxRetries;

                if (!shouldContinueRetry) {
                    logMessage(this.currentNum, this.total, `Request failed after ${maxRetries} retries: ${error.message}`, "error");
                    return null;
                }

                const retryDelay = isRateLimit ?
                    Math.max(minTimeout, minTimeout * Math.pow(2, Math.min(retryCount, 5))) :
                    minTimeout + (retryCount * 500);

                logMessage(this.currentNum, this.total, `Retrying... (${retryCount}/${maxRetries})${isRateLimit ? ' - Rate limited' : ''}`, "error");
                await new Promise((resolve) => setTimeout(resolve, retryDelay));
            }
        }
        return null;
    }

    async getdetailNetwork() {
        try {
            const response = await this.makeRequest("GET", "http://ip-api.com/json/");
            return response?.data;
        } catch (error: any) {
            logMessage(this.currentNum, this.total, `Error get detail network`, "error");
        }
    }

    decodeResponseData(data: string): any {
        try {

            const decoded = Buffer.from(data, 'base64').toString('utf-8');
            const filtered = decoded.split('').filter((char, index) => (index + 1) % 5 !== 0).join('');
            const reversedStr = filtered.split('').reverse().join('');
            const a = 7;

            let result = '';
            const hexPairs = reversedStr.match(/.{1,2}/g) || [];
            for (let i = 0; i < hexPairs.length; i++) {
                const hexValue = hexPairs[i];
                const charCode = parseInt(hexValue, 16) ^ (a + i);
                result += String.fromCharCode(charCode);
            }

            return JSON.parse(result);
        } catch (error: any) {
            logMessage(this.currentNum, this.total, `Error decoding response: ${error.message}`, "error");
            return null;
        }
    }

    async getAccessToken() {
        logMessage(this.currentNum, this.total, "Getting access token...", "info");
        const payload = {
            refresh_token: this.account.refreshToken,
        }
        try {
            const response = await this.makeRequest("POST", "https://api.optimai.network/auth/refresh", { data: payload });
            if (response?.status === 200) {
                logMessage(this.currentNum, this.total, "Access token retrieved successfully", "success");
                this.token = response.data.access_token;
                return response.data.access_token;
            }
            return null
        } catch (error: any) {
            logMessage(this.currentNum, this.total, `Error: ${error.message}`, "error");
            return null;
        }
    }

    async registerNode() {
        logMessage(this.currentNum, this.total, "Registering node...", "info");
        if (!this.token) {
            await this.getAccessToken();
        }

        let registerPayload = this.account.registerPayload;
        if (!registerPayload) {
            const payloads = await this.generatePayloadsFromToken();
            if (!payloads) {
                logMessage(this.currentNum, this.total, "Failed to generate payloads", "error");
                return false;
            }
            registerPayload = payloads.registerPayload;
        }

        const payload = {
            data: registerPayload
        };

        logMessage(this.currentNum, this.total, `Sending payload with length: ${registerPayload.length}`, "info");
        const requestConfig = {
            data: payload,
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${this.token}`
            }
        };

        try {
            const response = await this.makeRequestWithHighRetry("POST", "https://api.optimai.network/devices/register-v2", requestConfig);
            if (response?.status === 200) {
                logMessage(this.currentNum, this.total, `Register response received: ${JSON.stringify(response.data)}`, "info");
                const registerResponse = response.data?.data;
                if (registerResponse) {
                    logMessage(this.currentNum, this.total, `Attempting to decode response data...`, "info");
                    const registerResult = this.decodeResponseData(registerResponse);
                    logMessage(this.currentNum, this.total, `Decoded result: ${JSON.stringify(registerResult)}`, "info");
                    if (registerResult && registerResult.device_id) {
                        logMessage(this.currentNum, this.total, "Node registered successfully", "success");
                        return true;
                    } else {
                        logMessage(this.currentNum, this.total, "No device_id found in decoded response", "error");
                    }
                } else {
                    logMessage(this.currentNum, this.total, "No data field in response", "error");
                }
            } else {
                logMessage(this.currentNum, this.total, `Register failed with status: ${response?.status}`, "error");
            }
            return false;
        } catch (error: any) {
            logMessage(this.currentNum, this.total, `Failed to register node: ${error.message}`, "error");
            return false;
        }
    }

    async updateUptime() {
        logMessage(this.currentNum, this.total, "Updating uptime...", "info");
        if (!this.token) {
            await this.getAccessToken();
        }


        let uptimePayload = this.account.uptimePayload;
        if (!uptimePayload) {
            const payloads = await this.generatePayloadsFromToken();
            if (!payloads) {
                logMessage(this.currentNum, this.total, "Failed to generate payloads", "error");
                return false;
            }
            uptimePayload = payloads.uptimePayload;
        }

        const headers = {
            Authorization: `Bearer ${this.token}`,
            "Content-Type": "application/json"
        };

        const payload = {
            data: uptimePayload
        };

        try {
            const response = await this.makeRequest("POST", "https://api.optimai.network/uptime/online", { headers, data: payload });
            if (response?.status === 200) {
                const updatedResponse = response.data?.data;
                if (updatedResponse) {
                    const updatedResult = this.decodeResponseData(updatedResponse);
                    if (updatedResult && updatedResult.reward) {
                        const reward = updatedResult.reward;
                        logMessage(this.currentNum, this.total, `Uptime updated successfully - Reward: +${reward} OPI`, "success");
                        return true;
                    }
                }
            }
            return false;
        } catch (error: any) {
            logMessage(this.currentNum, this.total, `Error: ${error.message}`, "error");
            return false;
        }
    }

    async startUptimeLoop() {
        while (true) {
            logMessage(this.currentNum, this.total, "Waiting 10 minutes for uptime update...", "info");
            await new Promise(resolve => setTimeout(resolve, 10 * 60 * 1000));
            await this.updateUptime();
        }
    }

    async getStatsAccount() {
        logMessage(this.currentNum, this.total, "Getting account stats...", "process");
        if (!this.token) {
            await this.getAccessToken();
        }

        const headers = {
            Authorization: `Bearer ${this.token}`
        };

        try {
            const response = await this.makeRequest("GET", 'https://api.optimai.network/dashboard/stats', { headers: headers });
            if (response?.status === 200) {
                console.log(chalk.white("-".repeat(85)));
                logMessage(this.currentNum, this.total, `Stats Account : `, "info");
                logMessage(this.currentNum, this.total, `Total Points : ${response.data.stats.total_rewards}`, "info");
                logMessage(this.currentNum, this.total, `Total Uptime : ${response.data.stats.total_uptime}`, "info");
                console.log(chalk.white("-".repeat(85)));
            }
            return null;
        } catch (error: any) {
            logMessage(this.currentNum, this.total, `Error: ${error.message}`, "error");
            return null;
        }
    }

    async startCheckinLoop() {
        while (true) {
            const result = await this.checkinDaily();
            if (result) {
                logMessage(this.currentNum, this.total, "Check-in completed successfully", "success");
            }

            await new Promise(resolve => setTimeout(resolve, 12 * 60 * 60 * 1000));
        }
    }


    async checkinDaily() {
        logMessage(this.currentNum, this.total, "Checking in daily...", "info");
        if (!this.token) {
            await this.getAccessToken();
        }

        const headers = {
            Authorization: `Bearer ${this.token}`,
            "Content-Type": "application/json"
        }

        try {
            const response = await this.makeRequest("POST", 'https://api.optimai.network/daily-tasks/check-in', { headers: headers, data: {} });
            if (response?.status === 200) {
                const result = response.data;
                if (result.message === "Check-in successful") {
                    const reward = result.reward;
                    logMessage(this.currentNum, this.total, `Check-in successful - Reward: +${reward} OPI`, "success");
                    return true;
                } else if (result.message === "Check-in already completed for today") {
                    logMessage(this.currentNum, this.total, "Already checked in today", "info");
                    return true;
                }
            }
            return false;
        } catch (error: any) {
            logMessage(this.currentNum, this.total, `Error: ${error.message}`, "error");
            return false;
        }
    }

    async processAccount() {
        try {
            await this.getAccessToken();
            const delay = this.getRandomDelay(3000, 10000);
            logMessage(this.currentNum, this.total, `Waiting ${Math.floor(delay / 1000)} seconds before registering node...`, "info");
            await new Promise(resolve => setTimeout(resolve, delay));

            const checkinPromise = this.startCheckinLoop();
            const registerSuccess = await this.registerNode();
            if (registerSuccess) {
                const uptimePromise = this.startUptimeLoop();
                await Promise.all([checkinPromise, uptimePromise]);
            } else {
                logMessage(this.currentNum, this.total, "Failed to register node", "error");
                return false;
            }

            return true;
        } catch (error: any) {
            logMessage(this.currentNum, this.total, `Error: ${error.message}`, "error");
            return false;
        }
    }

    async generatePayloadsFromToken(): Promise<{ registerPayload: string; uptimePayload: string } | null> {
        try {
            if (!this.token) {
                await this.getAccessToken();
            }
            const payloads = Generator.generatePayloadsFromToken(this.token!);
            if (!payloads) {
                logMessage(this.currentNum, this.total, "Failed to generate payloads", "error");
                return null;
            }

            logMessage(this.currentNum, this.total, "Payloads generated successfully", "success");
            return payloads;
        } catch (error: any) {
            logMessage(this.currentNum, this.total, `Error generating payloads: ${error.message}`, "error");
            return null;
        }
    }

    private getRandomDelay(min: number, max: number): number {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

}
