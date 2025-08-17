const fs = require('fs');
const path = require('path');

class Logger {
    constructor() {
        this.logDir = path.join(process.cwd(), 'logs');
        this.ensureLogDir();
    }

    ensureLogDir() {
        if (!fs.existsSync(this.logDir)) {
            fs.mkdirSync(this.logDir, { recursive: true });
        }
    }

    formatMessage(level, message) {
        const timestamp = new Date().toISOString();
        return `[${timestamp}] ${level.toUpperCase()}: ${message}\n`;
    }

    writeToFile(level, message) {
        const logFile = path.join(this.logDir, `${level}.log`);
        const formattedMessage = this.formatMessage(level, message);

        fs.appendFileSync(logFile, formattedMessage);
    }

    info(message) {
        console.log(`INFO: ${message}`);
        this.writeToFile('info', message);
    }

    error(message) {
        console.error(`ERROR: ${message}`);
        this.writeToFile('error', message);
    }

    warn(message) {
        console.warn(`WARN: ${message}`);
        this.writeToFile('warn', message);
    }

    debug(message) {
        if (process.env.NODE_ENV === 'development') {
            console.log(`DEBUG: ${message}`);
            this.writeToFile('debug', message);
        }
    }
}

module.exports = new Logger();
