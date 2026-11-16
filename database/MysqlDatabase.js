const mysql = require("mysql2/promise");

module.exports = class MysqlDatabase {
    static #pool;

    #host;
    #user;
    #password;
    #database;
    #port;
    #waitForConnections;
    #connectionLimit;
    #queueLimit;

    /**
     * Construtor recebe dados de conexão e do pool.
     * Ordem de prioridade: config > variáveis do .env > padrão (XAMPP local).
     * .env: DB_HOST, DB_USER, DB_PASSWORD, DB_NAME, DB_PORT
     */

    constructor(config = {}) {
        this.#host = config.host || process.env.DB_HOST || "127.0.0.1";
        this.#user = config.user || process.env.DB_USER || "root";
        this.#password = config.password ?? process.env.DB_PASSWORD ?? "";
        this.#database = config.database || process.env.DB_NAME || "gata";
        this.#port = config.port || Number(process.env.DB_PORT) || 3306;
        this.#waitForConnections = config.waitForConnections ?? true;
        this.#connectionLimit = config.connectionLimit || 10;
        this.#queueLimit = config.queueLimit || 10;
    }

    /**
     * Cria e retorna o pool de conexões MySQL.
     * Se o pool já existir, reutiliza o mesmo (singleton).
     */

    async connect() {
        if (!MysqlDatabase.#pool) {
            MysqlDatabase.#pool = mysql.createPool({
                host: this.#host,
                user: this.#user,
                password: this.#password,
                database: this.#database,
                port: this.#port,
                waitForConnections: this.#waitForConnections,
                connectionLimit: this.#connectionLimit,
                queueLimit: this.#queueLimit
            });

            try {
                const connection = await MysqlDatabase.#pool.getConnection();
                console.log("✅  Conectado ao MySQL com sucesso!");
                connection.release();
            } catch (error) {
                console.error("❌ Falha ao conectar ao MySQL:", error.message);
                process.exit(1);
            }
        }
        return MysqlDatabase.#pool;
    }

    /**
     * Retorna o pool já existente ou cria se não existir.
     */
    async getPool() {
        return await this.connect();
    }

}