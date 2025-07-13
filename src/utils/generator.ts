
export class Generator {
    fibonacciMod(n: number): number {
        let t = 0, i = 1;
        for (let s = 0; s < n; s++) {
            [t, i] = [i, t + i];
        }
        return t % 20;
    }

    transformBs(text: string): string {
        return text.split('').map((char, index) =>
            String.fromCharCode(char.charCodeAt(0) + this.fibonacciMod(index))
        ).join('');
    }

    transformRs(text: string): string {
        return text.split('').map((char, index) =>
            String.fromCharCode((char.charCodeAt(0) ^ (index % 256)) & 255)
        ).join('');
    }

    transformSs(text: string): string {
        const chars = text.split('');
        for (let i = 0; i < chars.length - 1; i += 2) {
            [chars[i], chars[i + 1]] = [chars[i + 1], chars[i]];
        }
        return chars.join('');
    }

    generatePayload(data: any): string {
        const jsonStr = JSON.stringify(data);
        let transformed = this.transformBs(jsonStr);
        transformed = this.transformRs(transformed);
        transformed = this.transformSs(transformed);
        return Buffer.from(transformed).toString('base64');
    }

    createRegisterPayload(userId: string, timestamp: number): any {
        return {
            user_id: userId,
            device_info: {
                cpu_cores: 1,
                memory_gb: 0,
                screen_width_px: 375,
                screen_height_px: 600,
                color_depth: 30,
                scale_factor: 1,
                browser_name: "chrome",
                device_type: "extension",
                language: "en-US",
                timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            },
            browser_name: "chrome",
            device_type: "extension",
            timestamp: timestamp
        };
    }

    createUptimePayload(userId: string, deviceId: string, timestamp: number): any {
        return {
            duration: 600000,
            user_id: userId,
            device_id: deviceId,
            device_type: "extension",
            timestamp: timestamp
        };
    }

    static extractUserIdFromToken(token: string): string {
        try {
            const parts = token.split('.');
            if (parts.length >= 2) {
                const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
                return payload.sub || payload.user_id || payload.id || "default_user";
            }
        } catch (error: any) {
            console.log(`Could not extract user_id from token: ${error.message}`);
        }
        return "default_user";
    }

    static generatePayloadsFromToken(refreshToken: string): { registerPayload: string; uptimePayload: string } | null {
        try {
            const generator = new Generator();
            const userId = Generator.extractUserIdFromToken(refreshToken);
            const deviceId = `${userId}-device-${Date.now()}`;
            const timestamp = Date.now();
            const registerData = generator.createRegisterPayload(userId, timestamp);
            const uptimeData = generator.createUptimePayload(userId, deviceId, timestamp);
            const registerPayload = generator.generatePayload(registerData);
            const uptimePayload = generator.generatePayload(uptimeData);
            return { registerPayload, uptimePayload };
        } catch (error: any) {
            console.log(`Error generating payloads: ${error.message}`);
            return null;
        }
    }
}