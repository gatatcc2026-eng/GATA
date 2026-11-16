require("dotenv").config();

const jwt = require("jsonwebtoken");
const crypto = require("crypto");

/* A chave vem do .env e o servidor não sobe sem ela.
   Gere uma com:
   node -e "console.log(require('crypto').randomBytes(48).toString('hex'))" */
const SEGREDO = process.env.JWT_SECRET;

if (!SEGREDO || SEGREDO.length < 32) {
    throw new Error(
        "JWT_SECRET não definido (ou com menos de 32 caracteres) no arquivo .env"
    );
}

/* Validade do token em segundos (padrão: 8 horas) */
const VALIDADE_SEGUNDOS =
    Number(process.env.JWT_EXPIRA_SEGUNDOS) || 60 * 60 * 8;


module.exports = class MeuTokenJWT {

    #key;
    #alg;
    #payload;


    // =========================================================
    // CONSTRUTOR
    // =========================================================

    constructor() {

        this.#key = SEGREDO;

        this.#alg = "HS256";

        this.#payload = null;
    }


    // =========================================================
    // GERAR TOKEN
    // =========================================================

    gerarToken = (usuario) => {

        const ehCoordenador =
            Number(usuario.coordenador) === 1 ||
            usuario.coordenador === true;

        let cursoCoordenado = null;

        if (ehCoordenador) {

            cursoCoordenado =
                usuario.cursoCoordenado ??
                usuario.CursoCoordenado_idCurso ??
                null;
        }

        const agora = Math.floor(Date.now() / 1000);

        const payload = {

            // Controle do token
            iat: agora,
            exp: agora + VALIDADE_SEGUNDOS,
            jti: crypto.randomBytes(16).toString("hex"),

            // Identificação
            registro: usuario.registro ?? null,
            matricula: usuario.matricula ?? null,
            nome: usuario.nome ?? null,
            email: usuario.email1 ?? usuario.email ?? null,

            // Tipo
            role: usuario.role ?? "aluno",

            // Coordenador
            coordenador: ehCoordenador ? 1 : 0,
            cursoCoordenado: cursoCoordenado
        };

        return jwt.sign(
            payload,
            this.#key,
            { algorithm: this.#alg }
        );
    };


    // =========================================================
    // VALIDAR TOKEN
    // =========================================================

    validarToken = (tokenString) => {

        if (!tokenString) {
            return false;
        }

        try {

            const token = tokenString
                .replace(/^Bearer\s+/i, "")
                .trim();

            if (!token) {
                return false;
            }

            this.#payload = jwt.verify(
                token,
                this.#key,
                { algorithms: [this.#alg] }
            );

            return true;

        } catch (error) {

            console.log("❌ JWT inválido:", error.name);

            this.#payload = null;

            return false;
        }
    };


    // =========================================================
    // PAYLOAD
    // =========================================================

    get payload() {

        return this.#payload;
    }

};